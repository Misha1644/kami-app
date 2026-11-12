-- Версия 0.9: умное повторение (интервалы 1 → 3 → 7 → 14 → 30 → 60 дней).
-- Верный ответ отодвигает слово дальше, ошибка возвращает его в повторение сразу.

alter table public.progress
  add column interval_days int not null default 0,
  add column due_at timestamptz;
alter table public.custom_words
  add column interval_days int not null default 0,
  add column due_at timestamptz;

create index progress_due_idx on public.progress(student_id, due_at);
create index custom_words_due_idx on public.custom_words(student_id, due_at);

-- Следующий интервал после верного ответа.
create or replace function public.next_interval(p_days int)
returns int language sql immutable set search_path = '' as $$
  select case
    when p_days <= 0 then 1
    when p_days = 1 then 3
    when p_days <= 3 then 7
    when p_days <= 7 then 14
    when p_days <= 14 then 30
    else 60 end;
$$;

-- Уже выученные слова: первое повторение — завтра.
update public.progress set interval_days = 1, due_at = coalesce(learned_at, now()) + interval '1 day'
 where learned_at is not null and due_at is null;
update public.custom_words set interval_days = 1, due_at = coalesce(learned_at, now()) + interval '1 day'
 where learned_at is not null and due_at is null;

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
    interval_days = case when p_correct then public.next_interval(public.progress.interval_days) else 0 end,
    due_at        = case when p_correct
                         then now() + make_interval(days => public.next_interval(public.progress.interval_days))
                         else now() end;

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
    interval_days = case when p_correct then public.next_interval(interval_days) else 0 end,
    due_at        = case when p_correct then now() + make_interval(days => public.next_interval(interval_days))
                         else now() end
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
