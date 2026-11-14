-- Серия с «выходным блоком» (решение пользователя).
--   Пн, Вт, Ср, Чт — каждый день нужен урок (как раньше).
--   Пт + Сб + Вс — один блок: достаточно ОДНОГО урока за эти три дня (например, в пятницу вечером
--   подготовиться к понедельнику). Если блок закрыт, в серию идут все его дни.
-- Заморозка спасает пропущенный «блок» целиком: пропущенный будний день = 1 заморозка,
-- пропущенные выходные = тоже 1 заморозка.
-- Серия считается в календарных днях, так что награды за 10/50/100… дней остаются прежними.
-- today_done = текущий блок (сегодняшний день или выходные) уже закрыт уроком.

-- Начало и конец блока, в который входит день (dow: 0 — Вс, 5 — Пт, 6 — Сб).
create or replace function public.streak_unit_start(p_day date)
returns date language sql immutable set search_path = '' as $$
  select case when extract(dow from p_day)::int in (5, 6, 0)
              then p_day - ((extract(dow from p_day)::int + 2) % 7)
              else p_day end
$$;

create or replace function public.streak_unit_end(p_day date)
returns date language sql immutable set search_path = '' as $$
  select case when extract(dow from p_day)::int in (5, 6, 0)
              then public.streak_unit_start(p_day) + 2
              else p_day end
$$;

create or replace function public.get_streak(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_freezes int;
  v_cur_start date := public.streak_unit_start(current_date);
  v_weekend boolean := extract(dow from current_date)::int in (5, 6, 0);
  v_today boolean;
  v_last date;
  v_last_start date;
  v_u date;
  v_missed date[] := '{}';
  v_used int := 0;
  v_streak int := 0;
  v_week jsonb;
  i int;
begin
  perform public.assert_own_student(p_student);
  perform public.refill_freezes(p_student);
  select streak_freezes into v_freezes from public.students where id = p_student for update;

  -- 1) Пропущенные блоки между последним закрытым и текущим — закрываем заморозками, если хватает.
  select max(day) into v_last from public.activity_days
   where student_id = p_student and day < v_cur_start and (lessons_done > 0 or frozen);
  if v_last is not null then
    v_last_start := public.streak_unit_start(v_last);
    v_u := public.streak_unit_start(v_cur_start - 1);
    i := 0;
    while v_u > v_last_start and i < 400 loop
      v_missed := v_missed || v_u;
      v_u := public.streak_unit_start(v_u - 1);
      i := i + 1;
    end loop;
    if coalesce(array_length(v_missed, 1), 0) between 1 and v_freezes then
      insert into public.activity_days (student_id, day, words_done, frozen)
      select p_student, d, 0, true from unnest(v_missed) as d
      on conflict (student_id, day) do update set frozen = true;
      v_used := array_length(v_missed, 1);
      update public.students set streak_freezes = streak_freezes - v_used where id = p_student;
      v_freezes := v_freezes - v_used;
    end if;
  end if;

  -- 2) Закрыт ли текущий блок уроком.
  v_today := exists (select 1 from public.activity_days
                      where student_id = p_student and day between v_cur_start and current_date and lessons_done > 0);

  -- 3) Считаем дни серии: текущий блок (если закрыт) — до сегодняшнего дня, дальше назад — блоки целиком.
  if v_today then
    v_streak := current_date - v_cur_start + 1;
  end if;
  v_u := public.streak_unit_start(v_cur_start - 1);
  i := 0;
  while i < 5000 and exists (select 1 from public.activity_days
                where student_id = p_student and day between v_u and public.streak_unit_end(v_u)
                  and (lessons_done > 0 or frozen)) loop
    v_streak := v_streak + (public.streak_unit_end(v_u) - v_u + 1);
    v_u := public.streak_unit_start(v_u - 1);
    i := i + 1;
  end loop;

  -- 4) Неделя для полоски на главной: done — был урок, frozen — заморозка,
  --    covered — выходной без урока, но выходные закрыты, none — пусто.
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', g.d::date,
           'status', case when a.lessons_done > 0 then 'done'
                          when a.frozen then 'frozen'
                          when extract(dow from g.d)::int in (5, 6, 0) and exists (
                            select 1 from public.activity_days b
                             where b.student_id = p_student
                               and b.day between public.streak_unit_start(g.d::date) and public.streak_unit_end(g.d::date)
                               and (b.lessons_done > 0 or b.frozen)) then 'covered'
                          else 'none' end) order by g.d), '[]'::jsonb)
    into v_week
    from generate_series(current_date - 6, current_date, interval '1 day') as g(d)
    left join public.activity_days a on a.student_id = p_student and a.day = g.d::date;

  return jsonb_build_object('streak', v_streak, 'freezes', v_freezes, 'used_freezes', v_used,
                            'week', v_week, 'today_done', v_today,
                            'weekend', v_weekend, 'unit_end', public.streak_unit_end(current_date));
end; $$;
