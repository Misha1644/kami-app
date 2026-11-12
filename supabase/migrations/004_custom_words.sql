-- Версия 0.5: свои слова ученика к любому предмету.
-- Монета за своё слово начисляется один раз — когда слово выучено впервые,
-- чтобы нельзя было накручивать монеты, добавляя и повторяя одно и то же.
-- Верные ответы засчитываются в цель дня и серию так же, как обычные.

create table public.custom_words (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  subject_code  text not null check (char_length(subject_code) between 1 and 60),
  es            text not null check (char_length(es) between 1 and 80),
  translation   text not null check (char_length(translation) between 1 and 80),
  example       text check (example is null or char_length(example) <= 200),
  correct_count int  not null default 0,
  wrong_count   int  not null default 0,
  learned_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index custom_words_student_idx on public.custom_words(student_id, subject_code, created_at);

alter table public.custom_words enable row level security;

-- Родитель видит, добавляет и удаляет слова своих детей. Счётчики меняет только функция ниже.
create policy "parent reads custom words" on public.custom_words for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
create policy "parent adds custom words" on public.custom_words for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
create policy "parent deletes custom words" on public.custom_words for delete to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));

revoke insert, update on public.custom_words from authenticated, anon;
grant insert (student_id, subject_code, es, translation, example) on public.custom_words to authenticated;

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
    learned_at    = case when p_correct and learned_at is null then now() else learned_at end
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

revoke execute on function public.record_custom_answer(uuid, uuid, boolean) from public, anon;
grant execute on function public.record_custom_answer(uuid, uuid, boolean) to authenticated;
