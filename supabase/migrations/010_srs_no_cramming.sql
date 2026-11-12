-- Повторение: интервал растёт, только если слово уже «созрело» (due_at наступил).
-- Повторный урок в тот же день не отодвигает слово дальше.

create or replace function public.srs_interval(p_correct boolean, p_days int, p_due timestamptz)
returns int language sql stable set search_path = '' as $$
  select case
    when not p_correct then 0
    when p_due is null or p_due <= now() then public.next_interval(p_days)
    else p_days end;
$$;

create or replace function public.srs_due(p_correct boolean, p_days int, p_due timestamptz)
returns timestamptz language sql stable set search_path = '' as $$
  select case
    when not p_correct then now()
    when p_due is null or p_due <= now() then now() + make_interval(days => public.next_interval(p_days))
    else p_due end;
$$;

create or replace function public.record_answer(p_student uuid, p_word text, p_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_done int;
  v_goal int;
  v_bonus int := 0;
  v_coins int;
  v_next int := public.next_interval(0);
begin
  perform public.assert_own_student(p_student);

  insert into public.progress (student_id, word_id, correct_count, wrong_count, learned_at, last_seen,
                               interval_days, due_at)
  values (p_student, p_word,
          case when p_correct then 1 else 0 end,
          case when p_correct then 0 else 1 end,
          case when p_correct then now() else null end,
          now(),
          case when p_correct then v_next else 0 end,
          case when p_correct then now() + make_interval(days => v_next) else now() end)
  on conflict (student_id, word_id) do update set
    correct_count = public.progress.correct_count + case when p_correct then 1 else 0 end,
    wrong_count   = public.progress.wrong_count + case when p_correct then 0 else 1 end,
    learned_at    = coalesce(public.progress.learned_at, excluded.learned_at),
    last_seen     = now(),
    interval_days = public.srs_interval(p_correct, public.progress.interval_days, public.progress.due_at),
    due_at        = public.srs_due(p_correct, public.progress.interval_days, public.progress.due_at);

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

create or replace function public.record_custom_answer(p_student uuid, p_word uuid, p_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_first boolean := false;
  v_done int;
  v_goal int;
  v_bonus int := 0;
  v_coins int;
begin
  perform public.assert_own_student(p_student);

  select p_correct and learned_at is null into v_first
    from public.custom_words where id = p_word and student_id = p_student for update;
  if not found then raise exception 'word not found'; end if;

  update public.custom_words set
    correct_count = correct_count + case when p_correct then 1 else 0 end,
    wrong_count   = wrong_count + case when p_correct then 0 else 1 end,
    learned_at    = case when p_correct and learned_at is null then now() else learned_at end,
    interval_days = public.srs_interval(p_correct, interval_days, due_at),
    due_at        = public.srs_due(p_correct, interval_days, due_at)
  where id = p_word;

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
     set coins = coins + (case when v_first then 1 else 0 end) + v_bonus
   where id = p_student
  returning coins into v_coins;

  return jsonb_build_object('coins', v_coins, 'words_today', v_done, 'daily_goal', v_goal,
                            'goal_bonus', v_bonus, 'coin', v_first);
end; $$;
