-- Версия 0.7:
-- 1) Серия засчитывается только за день, в который пройден хотя бы один урок целиком
--    (раньше хватало одного верного ответа). Цель дня и монеты считаются как раньше.
-- 2) Цены в магазине выше: при ~20 монетах в день (10 слов + 10 за цель)
--    синий Ками — около 2 недель, золотой — около 2,5 месяцев.

alter table public.activity_days add column lessons_done int not null default 0;

-- Чтобы не обнулить уже набранные серии, прошлые дни с верными ответами считаем пройденными.
update public.activity_days set lessons_done = 1 where words_done > 0 and lessons_done = 0;

-- Урок пройден до конца. Засчитывается, только если сегодня был хотя бы один верный ответ.
create or replace function public.complete_lesson(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lessons int;
begin
  perform public.assert_own_student(p_student);
  update public.activity_days
     set lessons_done = lessons_done + 1, frozen = false
   where student_id = p_student and day = current_date and words_done > 0
  returning lessons_done into v_lessons;
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'lessons_today', v_lessons);
end; $$;

revoke execute on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

-- Серия теперь считает дни с пройденным уроком (или спасённые заморозкой).
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
  v_today boolean;
begin
  perform public.assert_own_student(p_student);
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

-- Новые цены.
update public.shop_items set price = 50   where id = 'freeze';
update public.shop_items set price = 300  where id = 'color-blue';
update public.shop_items set price = 500  where id in ('color-purple', 'color-coral');
update public.shop_items set price = 1500 where id = 'color-gold';
