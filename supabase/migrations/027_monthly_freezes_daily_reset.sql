-- 1) Заморозки серии: у каждого по 5, и 1-го числа каждого месяца (по Мадриду) их снова становится 5.
--    Пополнение «ленивое»: срабатывает при первом get_streak в новом месяце
--    (до того как заморозки тратятся на пропущенные дни). Если заморозок больше 5 не бывает:
--    максимум — 5, докупить в магазине или получить в ежедневной награде можно только до 5.
-- 2) Ежедневная награда: если пропустить день, календарь начинается заново с 1-го дня.

alter table public.students drop constraint if exists students_streak_freezes_check;
alter table public.students add constraint students_streak_freezes_check check (streak_freezes between 0 and 5);
alter table public.students alter column streak_freezes set default 5;
alter table public.students add column if not exists freezes_month date; -- месяц последнего пополнения

-- Пополнить заморозки до 5, если в этом месяце ещё не пополняли.
create or replace function public.refill_freezes(p_student uuid)
returns void language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
begin
  update public.students
     set streak_freezes = greatest(streak_freezes, 5),
         freezes_month = date_trunc('month', current_date)::date
   where id = p_student
     and (freezes_month is null or freezes_month < date_trunc('month', current_date)::date);
end;
$$;
revoke all on function public.refill_freezes(uuid) from public, anon, authenticated;

-- Серия (как в 006), но сначала — пополнение заморозок.
create or replace function public.get_streak(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_freezes int;
  v_last date;
  v_gap int;
  v_used int := 0;
  v_streak int := 0;
  v_day date;
  v_week jsonb;
  v_today boolean;
begin
  perform public.assert_own_student(p_student);
  perform public.refill_freezes(p_student);
  select streak_freezes into v_freezes from public.students where id = p_student for update;

  select max(day) into v_last from public.activity_days
   where student_id = p_student and (lessons_done > 0 or frozen);

  if v_last is not null then
    v_gap := (current_date - 1) - v_last;
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

  v_today := exists (select 1 from public.activity_days
                      where student_id = p_student and day = current_date and lessons_done > 0);
  v_day := case when v_today then current_date else current_date - 1 end;
  while exists (select 1 from public.activity_days
                 where student_id = p_student and day = v_day and (lessons_done > 0 or frozen)) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', g.d::date,
           'status', case when a.lessons_done > 0 then 'done'
                          when a.frozen then 'frozen'
                          else 'none' end) order by g.d), '[]'::jsonb)
    into v_week
    from generate_series(current_date - 6, current_date, interval '1 day') as g(d)
    left join public.activity_days a on a.student_id = p_student and a.day = g.d::date;

  return jsonb_build_object('streak', v_streak, 'freezes', v_freezes, 'used_freezes', v_used,
                            'week', v_week, 'today_done', v_today);
end; $$;

-- Покупка заморозки — до 5 (остальное как в 026).
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
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 5 then raise exception 'max freezes'; end if;
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

-- День календаря: если вчера забирал награду — следующий день (после 7-го снова 1-й),
-- если пропустил хотя бы день (или ни разу не забирал) — 1-й.
create or replace function public.daily_cycle_day(p_student uuid)
returns int language sql stable security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
  select coalesce((
    select case when r.day = current_date - 1 then r.cycle_day % 7 + 1 else 1 end
      from public.daily_rewards r
     where r.student_id = p_student and r.day < current_date
     order by r.day desc limit 1
  ), 1)
$$;
revoke all on function public.daily_cycle_day(uuid) from public, anon, authenticated;

-- Состояние наград: + reset — календарь сбросился из-за пропуска (чтобы показать это в окне).
create or replace function public.rewards_status(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_today_cycle int;
  v_last date;
begin
  perform public.assert_own_student(p_student);
  select cycle_day into v_today_cycle from public.daily_rewards where student_id = p_student and day = current_date;
  select max(day) into v_last from public.daily_rewards where student_id = p_student and day < current_date;
  return jsonb_build_object(
    'daily', jsonb_build_object(
      'claimed_today', v_today_cycle is not null,
      'day', coalesce(v_today_cycle, public.daily_cycle_day(p_student)),
      'reset', v_today_cycle is null and v_last is not null and v_last < current_date - 1),
    'streak_claimed', coalesce((select jsonb_agg(days order by days) from public.streak_rewards where student_id = p_student), '[]'::jsonb)
  );
end;
$$;

-- Ежедневная награда: заморозка в 3-й день — если их меньше 5, иначе 25 монет.
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
  perform public.refill_freezes(p_student);
  select * into v_st from public.students where id = p_student for update;
  if exists (select 1 from public.daily_rewards where student_id = p_student and day = current_date) then
    raise exception 'already claimed';
  end if;
  v_day := public.daily_cycle_day(p_student);

  case v_day
    when 1 then v_coins := 5;
    when 2 then v_coins := 10;
    when 3 then if v_st.streak_freezes < 5 then v_freeze := 1; else v_coins := 25; end if;
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
