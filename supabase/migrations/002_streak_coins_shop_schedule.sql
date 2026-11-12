-- Версия 0.3: серия с заморозками, монеты, магазин, расписание.
--
-- Защита от накруток: монеты, заморозки и прогресс меняются ТОЛЬКО через функции ниже
-- (security definer + проверка, что ученик принадлежит вошедшему родителю).
-- Напрямую из приложения эти поля менять нельзя: права на запись в них отозваны.

-- Ученик: монеты, заморозки, цвет Ками, дневная цель ---------------------------
alter table public.students
  add column coins          int  not null default 0 check (coins >= 0),
  add column streak_freezes int  not null default 0 check (streak_freezes between 0 and 2),
  add column kami_color     text not null default 'color-green',
  add column daily_goal     int  not null default 10 check (daily_goal between 3 and 50);

revoke insert, update on public.students from authenticated, anon;
grant insert (parent_id, nickname, grade, native_lang) on public.students to authenticated;
grant update (nickname, grade, native_lang) on public.students to authenticated;

-- Дни занятий: отметка «спасён заморозкой»
alter table public.activity_days add column frozen boolean not null default false;

-- Прогресс и дни теперь только читаются из приложения, пишутся функциями.
drop policy "parent owns progress" on public.progress;
drop policy "parent owns activity" on public.activity_days;
create policy "parent reads progress" on public.progress for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
create policy "parent reads activity" on public.activity_days for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));

-- Магазин ---------------------------------------------------------------------
create table public.shop_items (
  id       text primary key,
  kind     text not null check (kind in ('freeze', 'color')),
  title_ru text not null,
  price    int  not null check (price >= 0),
  value    text,               -- для цвета: hex
  sort     int  not null default 0
);
alter table public.shop_items enable row level security;
create policy "shop readable" on public.shop_items for select to authenticated using (true);

insert into public.shop_items (id, kind, title_ru, price, value, sort) values
  ('freeze',       'freeze', 'Заморозка серии', 20,  null,      1),
  ('color-green',  'color',  'Зелёный Ками',    0,   '#3DB37F', 10),
  ('color-blue',   'color',  'Синий Ками',      40,  '#4A90D9', 11),
  ('color-purple', 'color',  'Фиолетовый Ками', 60,  '#8E6FD8', 12),
  ('color-coral',  'color',  'Коралловый Ками', 60,  '#E8735A', 13),
  ('color-gold',   'color',  'Золотой Ками',    150, '#D9A92B', 14);

create table public.student_items (
  student_id  uuid not null references public.students(id) on delete cascade,
  item_id     text not null references public.shop_items(id),
  acquired_at timestamptz not null default now(),
  primary key (student_id, item_id)
);
alter table public.student_items enable row level security;
create policy "parent reads items" on public.student_items for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
create index student_items_item_idx on public.student_items(item_id);

-- Расписание ------------------------------------------------------------------
create table public.schedule (
  student_id   uuid     not null references public.students(id) on delete cascade,
  weekday      smallint not null check (weekday between 1 and 5),  -- 1 = понедельник
  slot         smallint not null check (slot between 1 and 8),     -- номер урока
  subject_code text     not null,
  primary key (student_id, weekday, slot)
);
alter table public.schedule enable row level security;
create policy "parent owns schedule" on public.schedule for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));

-- Предмет темы — код, общий с расписанием.
alter table public.topics add column subject_code text;
update public.topics set subject_code = 'mat' where id = 'mat-fracciones';
update public.topics set subject_code = 'bio' where id = 'bio-celula';

-- Функции ---------------------------------------------------------------------

create or replace function public.assert_own_student(p_student uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.students where id = p_student and parent_id = auth.uid()) then
    raise exception 'student not found' using errcode = '42501';
  end if;
end; $$;

drop function if exists public.record_answer(uuid, text, boolean);

-- Ответ ученика: прогресс по слову, день занятий, монеты.
-- +1 монета за верный ответ, +10 за выполнение дневной цели (один раз в день).
create function public.record_answer(p_student uuid, p_word text, p_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_done int;
  v_goal int;
  v_bonus int := 0;
  v_coins int;
begin
  perform public.assert_own_student(p_student);

  insert into public.progress (student_id, word_id, correct_count, wrong_count, learned_at, last_seen)
  values (p_student, p_word,
          case when p_correct then 1 else 0 end,
          case when p_correct then 0 else 1 end,
          case when p_correct then now() else null end,
          now())
  on conflict (student_id, word_id) do update set
    correct_count = public.progress.correct_count + case when p_correct then 1 else 0 end,
    wrong_count   = public.progress.wrong_count + case when p_correct then 0 else 1 end,
    learned_at    = coalesce(public.progress.learned_at, excluded.learned_at),
    last_seen     = now();

  insert into public.activity_days (student_id, day, words_done)
  values (p_student, current_date, case when p_correct then 1 else 0 end)
  on conflict (student_id, day) do update set
    words_done = public.activity_days.words_done + case when p_correct then 1 else 0 end,
    frozen = false
  returning words_done into v_done;

  select daily_goal into v_goal from public.students where id = p_student;
  if p_correct and v_done = v_goal then
    v_bonus := 10;
  end if;

  update public.students
     set coins = coins + (case when p_correct then 1 else 0 end) + v_bonus
   where id = p_student
  returning coins into v_coins;

  return jsonb_build_object('coins', v_coins, 'words_today', v_done, 'daily_goal', v_goal,
                            'goal_bonus', v_bonus);
end; $$;

-- Серия: если пропущенных дней не больше, чем заморозок, — заморозки тратятся
-- и серия сохраняется. Возвращает серию, остаток заморозок и последние 7 дней.
create or replace function public.get_streak(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_freezes int;
  v_last date;
  v_gap int;
  v_used int := 0;
  v_streak int := 0;
  v_day date;
  v_week jsonb;
begin
  perform public.assert_own_student(p_student);
  select streak_freezes into v_freezes from public.students where id = p_student for update;

  select max(day) into v_last from public.activity_days
   where student_id = p_student and (words_done > 0 or frozen);

  if v_last is not null then
    v_gap := (current_date - 1) - v_last;  -- сколько дней пропущено до вчерашнего включительно
    if v_gap > 0 and v_gap <= v_freezes then
      insert into public.activity_days (student_id, day, words_done, frozen)
      select p_student, d::date, 0, true
        from generate_series(v_last + 1, current_date - 1, interval '1 day') as d
      on conflict (student_id, day) do update set frozen = true;
      v_used := v_gap;
      update public.students set streak_freezes = streak_freezes - v_gap where id = p_student;
      v_freezes := v_freezes - v_gap;
    end if;
  end if;

  v_day := current_date;
  if not exists (select 1 from public.activity_days
                  where student_id = p_student and day = v_day and (words_done > 0 or frozen)) then
    v_day := v_day - 1;
  end if;
  while exists (select 1 from public.activity_days
                 where student_id = p_student and day = v_day and (words_done > 0 or frozen)) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', g.d::date,
           'status', case when a.frozen then 'frozen'
                          when a.words_done > 0 then 'done'
                          else 'none' end) order by g.d), '[]'::jsonb)
    into v_week
    from generate_series(current_date - 6, current_date, interval '1 day') as g(d)
    left join public.activity_days a on a.student_id = p_student and a.day = g.d::date;

  return jsonb_build_object('streak', v_streak, 'freezes', v_freezes, 'used_freezes', v_used,
                            'week', v_week);
end; $$;

-- Покупка в магазине. Цвет сразу надевается.
create or replace function public.buy_item(p_student uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item public.shop_items;
  v_st public.students;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;
  select * into v_item from public.shop_items where id = p_item;
  if not found then raise exception 'item not found'; end if;

  if v_item.kind = 'color' and (v_item.price = 0 or exists (
       select 1 from public.student_items where student_id = p_student and item_id = p_item)) then
    raise exception 'already owned';
  end if;
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 2 then
    raise exception 'max freezes';
  end if;
  if v_st.coins < v_item.price then
    raise exception 'not enough coins';
  end if;

  update public.students set coins = coins - v_item.price where id = p_student;
  if v_item.kind = 'freeze' then
    update public.students set streak_freezes = streak_freezes + 1 where id = p_student;
  else
    insert into public.student_items (student_id, item_id) values (p_student, p_item);
    update public.students set kami_color = p_item where id = p_student;
  end if;

  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
                            'kami_color', v_st.kami_color);
end; $$;

-- Надеть купленный цвет (зелёный доступен всегда).
create or replace function public.equip_color(p_student uuid, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_own_student(p_student);
  if p_item <> 'color-green' and not exists (
       select 1 from public.student_items where student_id = p_student and item_id = p_item) then
    raise exception 'not owned';
  end if;
  update public.students set kami_color = p_item where id = p_student;
end; $$;

revoke execute on function public.assert_own_student(uuid) from public, anon, authenticated;
revoke execute on function public.record_answer(uuid, text, boolean) from public, anon;
revoke execute on function public.get_streak(uuid) from public, anon;
revoke execute on function public.buy_item(uuid, text) from public, anon;
revoke execute on function public.equip_color(uuid, text) from public, anon;
grant execute on function public.record_answer(uuid, text, boolean) to authenticated;
grant execute on function public.get_streak(uuid) to authenticated;
grant execute on function public.buy_item(uuid, text) to authenticated;
grant execute on function public.equip_color(uuid, text) to authenticated;
