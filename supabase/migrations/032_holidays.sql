-- Каникулы (решения пользователя, 14 ноя 2026).
-- Ученик или родитель указывает каникулы в расписании (приложение подсказывает даты Валенсии).
--   kind = 'short'  — Рождество, Пасха и т. п.;
--   kind = 'summer' — лето.
-- Серия на каникулах:
--   будний день (Пн–Чт) каникул — хватит повторить хотя бы 1 слово (words_done > 0);
--   выходные (Пт–Вс) — одно задание за три дня: если в понедельник после них ещё каникулы —
--     хватит повторения, если в понедельник учёба — нужен урок (подготовиться к понедельнику).
-- В учебное время всё как раньше (миграция 031).
-- Что именно повторять (повторение / летнее повторение года по расписанию / подготовка
-- к новому классу в последние 2 недели лета) решает приложение по полю holiday.mode.

create table if not exists public.student_holidays (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (kind in ('short', 'summer')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 120)
);
create index if not exists student_holidays_student on public.student_holidays (student_id, start_date);
alter table public.student_holidays enable row level security;
drop policy if exists "parent owns holidays" on public.student_holidays;
create policy "parent owns holidays" on public.student_holidays for all
  using (exists (select 1 from public.students s where s.id = student_holidays.student_id and s.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.students s where s.id = student_holidays.student_id and s.parent_id = (select auth.uid())));

-- Каникулы, в которые попадает день (или null).
create or replace function public.holiday_on(p_student uuid, p_day date)
returns public.student_holidays language sql stable security definer set search_path = '' as $$
  select * from public.student_holidays
   where student_id = p_student and p_day between start_date and end_date
   order by start_date desc limit 1
$$;
revoke all on function public.holiday_on(uuid, date) from public, anon, authenticated;

-- Что нужно, чтобы закрыть блок, начинающийся в p_start: 'lesson' или 'word'.
create or replace function public.streak_need(p_student uuid, p_start date)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when extract(dow from p_start)::int = 5
      then case when (public.holiday_on(p_student, p_start + 3)).id is not null then 'word' else 'lesson' end
    else case when (public.holiday_on(p_student, p_start)).id is not null then 'word' else 'lesson' end
  end
$$;
revoke all on function public.streak_need(uuid, date) from public, anon, authenticated;

-- Закрыт ли блок (p_upto — до какого дня смотреть; для текущего блока это сегодня).
-- p_real = true — считать только настоящие занятия, без заморозок.
create or replace function public.streak_unit_ok(p_student uuid, p_start date, p_upto date, p_real boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activity_days a
     where a.student_id = p_student
       and a.day between p_start and least(public.streak_unit_end(p_start), p_upto)
       and ((not p_real and a.frozen)
            or a.lessons_done > 0
            or (public.streak_need(p_student, p_start) = 'word' and a.words_done > 0)))
$$;
revoke all on function public.streak_unit_ok(uuid, date, date, boolean) from public, anon, authenticated;

create or replace function public.get_streak(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_freezes int;
  v_cur_start date := public.streak_unit_start(current_date);
  v_weekend boolean := extract(dow from current_date)::int in (5, 6, 0);
  v_need text := public.streak_need(p_student, public.streak_unit_start(current_date));
  v_today boolean;
  v_first date;
  v_u date;
  v_missed date[] := '{}';
  v_found boolean := false;
  v_used int := 0;
  v_streak int := 0;
  v_week jsonb;
  v_h public.student_holidays;
  v_next public.student_holidays;
  v_mode text;
  i int;
begin
  perform public.assert_own_student(p_student);
  perform public.refill_freezes(p_student);
  select streak_freezes into v_freezes from public.students where id = p_student for update;
  select min(day) into v_first from public.activity_days where student_id = p_student;

  -- 1) Пропущенные блоки между последним закрытым и текущим — закрываем заморозками, если хватает.
  if v_first is not null then
    v_u := public.streak_unit_start(v_cur_start - 1);
    i := 0;
    while v_u >= public.streak_unit_start(v_first) and i < 400 loop
      if public.streak_unit_ok(p_student, v_u, public.streak_unit_end(v_u), false) then
        v_found := true;
        exit;
      end if;
      v_missed := v_missed || v_u;
      v_u := public.streak_unit_start(v_u - 1);
      i := i + 1;
    end loop;
    if v_found and coalesce(array_length(v_missed, 1), 0) between 1 and v_freezes then
      insert into public.activity_days (student_id, day, words_done, frozen)
      select p_student, d, 0, true from unnest(v_missed) as d
      on conflict (student_id, day) do update set frozen = true;
      v_used := array_length(v_missed, 1);
      update public.students set streak_freezes = streak_freezes - v_used where id = p_student;
      v_freezes := v_freezes - v_used;
    end if;
  end if;

  -- 2) Закрыт ли текущий блок настоящим занятием.
  v_today := public.streak_unit_ok(p_student, v_cur_start, current_date, true);

  -- 3) Дни серии: текущий блок (если закрыт) — до сегодня, дальше назад — блоки целиком.
  if v_today then
    v_streak := current_date - v_cur_start + 1;
  end if;
  v_u := public.streak_unit_start(v_cur_start - 1);
  i := 0;
  while i < 5000 and public.streak_unit_ok(p_student, v_u, public.streak_unit_end(v_u), false) loop
    v_streak := v_streak + (public.streak_unit_end(v_u) - v_u + 1);
    v_u := public.streak_unit_start(v_u - 1);
    i := i + 1;
  end loop;

  -- 4) Неделя для полоски: done — день сам закрыл свой блок, frozen — заморозка,
  --    covered — выходной, блок закрыт в другой день, none — пусто.
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', g.d::date,
           'status', case
             when a.lessons_done > 0
               or (a.words_done > 0 and public.streak_need(p_student, public.streak_unit_start(g.d::date)) = 'word') then 'done'
             when a.frozen then 'frozen'
             when extract(dow from g.d)::int in (5, 6, 0)
              and public.streak_unit_ok(p_student, public.streak_unit_start(g.d::date), public.streak_unit_end(g.d::date), false) then 'covered'
             else 'none' end) order by g.d), '[]'::jsonb)
    into v_week
    from generate_series(current_date - 6, current_date, interval '1 day') as g(d)
    left join public.activity_days a on a.student_id = p_student and a.day = g.d::date;

  -- 5) Каникулы сегодня (или ближайшие в будущем — для подсказки на главной).
  v_h := public.holiday_on(p_student, current_date);
  if v_h.id is not null then
    v_mode := case
      when v_h.kind = 'summer' and current_date > v_h.end_date - 14 then 'summer_prep'
      when v_h.kind = 'summer' then 'summer_review'
      else 'review' end;
    -- последние выходные перед учёбой — обычный режим (урок к понедельнику)
    if v_need = 'lesson' then v_mode := 'back_to_school'; end if;
  end if;
  select * into v_next from public.student_holidays
   where student_id = p_student and start_date > current_date order by start_date limit 1;

  return jsonb_build_object('streak', v_streak, 'freezes', v_freezes, 'used_freezes', v_used,
                            'week', v_week, 'today_done', v_today, 'need', v_need,
                            'weekend', v_weekend, 'unit_end', public.streak_unit_end(current_date),
                            'holiday', case when v_h.id is null then null else jsonb_build_object(
                              'kind', v_h.kind, 'start', v_h.start_date, 'end', v_h.end_date, 'mode', v_mode) end,
                            'next_holiday', case when v_next.id is null then null else jsonb_build_object(
                              'kind', v_next.kind, 'start', v_next.start_date, 'end', v_next.end_date) end);
end; $$;
