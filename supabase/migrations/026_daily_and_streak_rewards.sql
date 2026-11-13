-- Ежедневная награда (как в Brawl Stars) и награды за серию.
--
-- 1) Ежедневная награда — за то, что зашёл в приложение. Календарь из 7 дней по кругу:
--      1: 5 монет · 2: 10 монет · 3: заморозка серии (если уже 2 — 25 монет) · 4: 10 монет
--      5: сундук за урок · 6: 15 монет · 7: 30 монет + сундук за урок
--    Пропустил день — календарь НЕ сгорает, просто продолжается со следующего дня
--    (детей не наказываем дважды: за пропуск и так теряется серия).
--    Награда маленькая (~70 монет в неделю против ~150–200 за учёбу), чтобы не обесценивать магазин.
--
-- 2) Награды за серию — за 10, 50, 100, 200, 300 дней и дальше каждые 100.
--    Каждую можно забрать один раз (если серия сгорела и снова дошла до 10 — второй раз не дают,
--    иначе награду можно «фармить»). Вещи за серию — эксклюзивные: их нельзя купить
--    и нельзя выбить из сундука, поэтому они не обесценивают магазин и показывают, кто учится долго.
--      10:  50 монет
--      50:  200 монет + сундук со скинами
--      100: цвет «Ками-огонёк» + 300 монет
--      200: фон «Пламя серии» + 2 сундука со скинами
--      300: аватар «Ками-чемпион» + 500 монет + 2 сундука со скинами
--      400, 500, …: 500 монет + сундук со скинами

-- Эксклюзивные вещи --------------------------------------------------------------
alter table public.shop_items add column if not exists exclusive boolean not null default false;

insert into public.shop_items (id, kind, title_ru, price, value, sort, plus_only, exclusive) values
  ('color-streak',  'color',  'Ками-огонёк',  0, '#FF6A00',                900, false, true),
  ('bg-streak',     'bg',     'Пламя серии',  0, 'pattern:flames:#FFF1E6', 901, false, true),
  ('avatar-streak', 'avatar', 'Ками-чемпион', 0, 'kami-streak',            902, false, true)
on conflict (id) do update set kind = excluded.kind, title_ru = excluded.title_ru, price = excluded.price,
  value = excluded.value, sort = excluded.sort, plus_only = excluded.plus_only, exclusive = excluded.exclusive;

-- Витрина берёт вещи с ценой от 1, сундуки — с ценой > 0, так что цена 0 уже исключает их оттуда.
-- Покупку закрываем явно: buy_item из 020 + проверка exclusive.
create or replace function public.buy_item(p_student uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_item public.shop_items;
  v_st public.students;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;
  select * into v_item from public.shop_items where id = p_item;
  if not found then raise exception 'item not found'; end if;
  if v_item.exclusive then raise exception 'not for sale'; end if;
  if v_item.plus_only and not public.student_has_plus(p_student) then raise exception 'plus only'; end if;
  if v_item.kind in ('color', 'avatar', 'bg') and v_item.price > 0 and not v_item.plus_only then
    perform public.ensure_shop_rotation(current_date);
    if not exists (select 1 from public.shop_rotation where day = current_date and item_id = p_item) then
      raise exception 'not in shop';
    end if;
  end if;
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

-- Таблицы -------------------------------------------------------------------------
create table if not exists public.daily_rewards (
  student_id uuid not null references public.students(id) on delete cascade,
  day date not null,
  cycle_day int not null check (cycle_day between 1 and 7),
  claimed_at timestamptz not null default now(),
  primary key (student_id, day)
);
alter table public.daily_rewards enable row level security; -- доступ только через функции

create table if not exists public.streak_rewards (
  student_id uuid not null references public.students(id) on delete cascade,
  days int not null,
  claimed_at timestamptz not null default now(),
  primary key (student_id, days)
);
alter table public.streak_rewards enable row level security;

-- Какой день календаря сейчас (1–7): по числу уже полученных наград.
create or replace function public.daily_cycle_day(p_student uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (count(*) % 7)::int + 1 from public.daily_rewards where student_id = p_student
$$;
revoke all on function public.daily_cycle_day(uuid) from public, anon, authenticated;

-- Награда за серию: что положено за p_days дней (null — не веха).
create or replace function public.streak_milestone(p_days int)
returns jsonb language sql immutable set search_path = '' as $$
  select case
    when p_days = 10  then jsonb_build_object('coins', 50)
    when p_days = 50  then jsonb_build_object('coins', 200, 'chests_skin', 1)
    when p_days = 100 then jsonb_build_object('coins', 300, 'item', 'color-streak')
    when p_days = 200 then jsonb_build_object('chests_skin', 2, 'item', 'bg-streak')
    when p_days = 300 then jsonb_build_object('coins', 500, 'chests_skin', 2, 'item', 'avatar-streak')
    when p_days > 300 and p_days % 100 = 0 then jsonb_build_object('coins', 500, 'chests_skin', 1)
  end
$$;

-- Состояние наград для приложения.
create or replace function public.rewards_status(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_today_cycle int;
begin
  perform public.assert_own_student(p_student);
  select cycle_day into v_today_cycle from public.daily_rewards where student_id = p_student and day = current_date;
  return jsonb_build_object(
    'daily', jsonb_build_object(
      'claimed_today', v_today_cycle is not null,
      'day', coalesce(v_today_cycle, public.daily_cycle_day(p_student))),
    'streak_claimed', coalesce((select jsonb_agg(days order by days) from public.streak_rewards where student_id = p_student), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.rewards_status(uuid) from public, anon;
grant execute on function public.rewards_status(uuid) to authenticated;

-- Забрать ежедневную награду (один раз в день по Мадриду).
create or replace function public.claim_daily_reward(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_st public.students;
  v_day int;
  v_coins int := 0;
  v_freeze int := 0;
  v_chest int := 0;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;
  if exists (select 1 from public.daily_rewards where student_id = p_student and day = current_date) then
    raise exception 'already claimed';
  end if;
  v_day := public.daily_cycle_day(p_student);

  case v_day
    when 1 then v_coins := 5;
    when 2 then v_coins := 10;
    when 3 then if v_st.streak_freezes < 2 then v_freeze := 1; else v_coins := 25; end if;
    when 4 then v_coins := 10;
    when 5 then v_chest := 1;
    when 6 then v_coins := 15;
    else v_coins := 30; v_chest := 1;
  end case;

  insert into public.daily_rewards (student_id, day, cycle_day) values (p_student, current_date, v_day);
  update public.students set
    coins = coins + v_coins,
    streak_freezes = streak_freezes + v_freeze,
    chests_lesson = chests_lesson + v_chest
  where id = p_student
  returning * into v_st;

  return jsonb_build_object('day', v_day, 'coins_added', v_coins, 'freeze_added', v_freeze, 'chest_added', v_chest,
    'coins', v_st.coins, 'freezes', v_st.streak_freezes, 'chests_lesson', v_st.chests_lesson);
end;
$$;
revoke all on function public.claim_daily_reward(uuid) from public, anon;
grant execute on function public.claim_daily_reward(uuid) to authenticated;

-- Забрать награду за серию. Серию считает сервер (get_streak), вещь — эксклюзивная.
create or replace function public.claim_streak_reward(p_student uuid, p_days int)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_st public.students;
  v_reward jsonb := public.streak_milestone(p_days);
  v_streak int;
  v_coins int;
  v_chests int;
  v_item public.shop_items;
begin
  perform public.assert_own_student(p_student);
  if v_reward is null then raise exception 'not a milestone'; end if;
  v_streak := (public.get_streak(p_student) ->> 'streak')::int;
  select * into v_st from public.students where id = p_student for update;
  if v_streak < p_days then raise exception 'streak too short'; end if;
  if exists (select 1 from public.streak_rewards where student_id = p_student and days = p_days) then
    raise exception 'already claimed';
  end if;

  v_coins := coalesce((v_reward ->> 'coins')::int, 0);
  v_chests := coalesce((v_reward ->> 'chests_skin')::int, 0);
  insert into public.streak_rewards (student_id, days) values (p_student, p_days);
  if v_reward ? 'item' then
    select * into v_item from public.shop_items where id = v_reward ->> 'item';
    insert into public.student_items (student_id, item_id) values (p_student, v_item.id)
      on conflict do nothing;
  end if;
  update public.students set coins = coins + v_coins, chests_skin = chests_skin + v_chests
    where id = p_student returning * into v_st;

  return jsonb_build_object('days', p_days, 'coins_added', v_coins, 'chests_skin_added', v_chests,
    'item', case when v_item.id is null then null else jsonb_build_object(
      'id', v_item.id, 'kind', v_item.kind, 'title_ru', v_item.title_ru, 'value', v_item.value,
      'price', v_item.price, 'exclusive', true) end,
    'coins', v_st.coins, 'chests_skin', v_st.chests_skin);
end;
$$;
revoke all on function public.claim_streak_reward(uuid, int) from public, anon;
grant execute on function public.claim_streak_reward(uuid, int) to authenticated;
