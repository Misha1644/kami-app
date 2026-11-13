-- Сундуки.
--   Сундук урока: за пройденный урок (нужно ≥5 верных ответов с прошлого сундука, не больше 10 в день).
--     99% — от 1 до 15 монет; 1% — случайная вещь из магазина; 0,005% — легендарная вещь (от 10 000).
--   Сундук со скинами: покупается за 600 монет. Только вещи; 1% — легендарная (от 10 000).
-- Всё случайное считается на сервере. Вещи, которые уже есть, не выпадают.
-- Сундуки нельзя купить за настоящие деньги — только за монеты, заработанные учёбой.

alter table public.students add column if not exists chests_lesson int not null default 0 check (chests_lesson >= 0);
alter table public.students add column if not exists chests_skin int not null default 0 check (chests_skin >= 0);
alter table public.activity_days add column if not exists chests_given int not null default 0;

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in ('freeze', 'color', 'avatar', 'bg', 'chest'));

insert into public.shop_items (id, kind, title_ru, price, value, sort, plus_only) values
  ('chest-skins', 'chest', 'Сундук со скинами', 600, 'skins', 2, false),
  -- Новые узорные фоны
  ('bg-notes',    'bg', 'Ноты',               6000,  'pattern:notes:#FFF0F7',   60, false),
  ('bg-numbers',  'bg', 'Цифры Doctor Pi',    6000,  'pattern:numbers:#F3F0FF', 61, false),
  ('bg-leaves',   'bg', 'Парк Турия',         7000,  'pattern:leaves:#ECF8F1',  62, false),
  ('bg-ocean',    'bg', 'Океан',              8000,  'pattern:ocean:#E3F4FB',   63, false),
  ('bg-space',    'bg', 'Космос',             15000, 'pattern:space:#E7E5FA',   64, false),
  ('bg-galaxy',   'bg', 'Галактика',          30000, 'pattern:galaxy:#EEE6FF',  65, false)
on conflict (id) do update set kind = excluded.kind, title_ru = excluded.title_ru, price = excluded.price,
  value = excluded.value, sort = excluded.sort, plus_only = excluded.plus_only;

-- Покупка: сундук попадает в запас, остальное — как раньше.
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
  if v_item.plus_only and not public.student_has_plus(p_student) then raise exception 'plus only'; end if;
  if v_item.kind not in ('freeze', 'chest') and (public.is_default_item(p_item) or exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item)) then
    raise exception 'already owned';
  end if;
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 2 then raise exception 'max freezes'; end if;
  if v_st.coins < v_item.price then raise exception 'not enough coins'; end if;

  update public.students set coins = coins - v_item.price where id = p_student;
  if v_item.kind = 'freeze' then
    update public.students set streak_freezes = streak_freezes + 1 where id = p_student;
  elsif v_item.kind = 'chest' then
    update public.students set chests_skin = chests_skin + 1 where id = p_student;
  else
    insert into public.student_items (student_id, item_id) values (p_student, p_item);
    update public.students set
      kami_color = case when v_item.kind = 'color' then p_item else kami_color end,
      avatar     = case when v_item.kind = 'avatar' then p_item else avatar end,
      bg         = case when v_item.kind = 'bg' then p_item else bg end
    where id = p_student;
  end if;
  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
    'kami_color', v_st.kami_color, 'avatar', v_st.avatar, 'bg', v_st.bg,
    'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$$;

-- Надеть можно только вещи (не заморозку и не сундук).
create or replace function public.equip_item(p_student uuid, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_kind text;
begin
  perform public.assert_own_student(p_student);
  select kind into v_kind from public.shop_items where id = p_item;
  if v_kind is null or v_kind in ('freeze', 'chest') then raise exception 'item not found'; end if;
  if not public.is_default_item(p_item) and not exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item) then
    raise exception 'not owned';
  end if;
  update public.students set
    kami_color = case when v_kind = 'color' then p_item else kami_color end,
    avatar     = case when v_kind = 'avatar' then p_item else avatar end,
    bg         = case when v_kind = 'bg' then p_item else bg end
  where id = p_student;
end;
$$;

-- Урок пройден: серия + сундук (если урок настоящий).
create or replace function public.complete_lesson(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_lessons int;
  v_words int;
  v_given int;
  v_chest boolean := false;
begin
  perform public.assert_own_student(p_student);
  update public.activity_days set lessons_done = lessons_done + 1, frozen = false
    where student_id = p_student and day = current_date and words_done > 0
    returning lessons_done, words_done, chests_given into v_lessons, v_words, v_given;
  if not found then return jsonb_build_object('ok', false); end if;
  -- Сундук: нужно минимум 5 верных ответов на каждый сундук и не больше 10 сундуков в день.
  if v_given < 10 and v_words >= (v_given + 1) * 5 then
    update public.activity_days set chests_given = chests_given + 1 where student_id = p_student and day = current_date;
    update public.students set chests_lesson = chests_lesson + 1 where id = p_student;
    v_chest := true;
  end if;
  return jsonb_build_object('ok', true, 'lessons_today', v_lessons, 'chest', v_chest);
end;
$$;

-- Случайная вещь, которой у ученика ещё нет. legendary: цена от 10 000.
create or replace function public.random_unowned_item(p_student uuid, p_legendary boolean)
returns public.shop_items language sql volatile security definer set search_path = '' as $$
  select i.* from public.shop_items i
  where i.kind in ('color', 'avatar', 'bg') and not i.plus_only and i.price > 0
    and not public.is_default_item(i.id)
    and (case when p_legendary then i.price >= 10000 else i.price < 10000 end)
    and not exists (select 1 from public.student_items s where s.student_id = p_student and s.item_id = i.id)
  order by random() limit 1
$$;
revoke all on function public.random_unowned_item(uuid, boolean) from public, authenticated, anon;

-- Открыть сундук: p_type = 'lesson' | 'skin'.
create or replace function public.open_chest(p_student uuid, p_type text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_st public.students;
  v_roll double precision := random();
  v_item public.shop_items;
  v_legend boolean := false;
  v_amount int;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;

  if p_type = 'lesson' then
    if v_st.chests_lesson < 1 then raise exception 'no chest'; end if;
    update public.students set chests_lesson = chests_lesson - 1 where id = p_student;
    if v_roll < 0.00005 then
      v_item := public.random_unowned_item(p_student, true);
      v_legend := v_item.id is not null;
    elsif v_roll < 0.01005 then
      v_item := public.random_unowned_item(p_student, false);
    end if;
    if v_item.id is null then
      v_amount := 1 + floor(random() * 15)::int;
    end if;
  elsif p_type = 'skin' then
    if v_st.chests_skin < 1 then raise exception 'no chest'; end if;
    update public.students set chests_skin = chests_skin - 1 where id = p_student;
    if v_roll < 0.01 then
      v_item := public.random_unowned_item(p_student, true);
      v_legend := v_item.id is not null;
    end if;
    if v_item.id is null then
      v_item := public.random_unowned_item(p_student, false);
    end if;
    if v_item.id is null then
      v_amount := 600; -- все обычные вещи уже есть — возвращаем монеты
    end if;
  else
    raise exception 'bad chest';
  end if;

  if v_item.id is not null then
    insert into public.student_items (student_id, item_id) values (p_student, v_item.id);
  else
    update public.students set coins = coins + v_amount where id = p_student;
  end if;

  select * into v_st from public.students where id = p_student;
  return jsonb_build_object(
    'type', case when v_item.id is not null then 'item' else 'coins' end,
    'amount', v_amount,
    'item', case when v_item.id is not null then jsonb_build_object('id', v_item.id, 'kind', v_item.kind,
      'title', v_item.title_ru, 'value', v_item.value, 'price', v_item.price) end,
    'legendary', v_legend,
    'coins', v_st.coins, 'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$$;
revoke all on function public.open_chest(uuid, text) from public, anon;
grant execute on function public.open_chest(uuid, text) to authenticated;
