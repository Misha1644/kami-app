-- Режим «Контрольная»: ученик отмечает дату контрольной, предмет и темы —
-- приложение составляет план подготовки по дням и пробную контрольную накануне.
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_code text not null check (char_length(subject_code) between 1 and 40),
  topic_ids text[] not null check (cardinality(topic_ids) between 1 and 12),
  exam_date date not null,
  best_score int check (best_score between 0 and 100),   -- лучший результат пробной контрольной, %
  created_at timestamptz not null default now()
);
create index if not exists exams_student on public.exams (student_id, exam_date);
alter table public.exams enable row level security;

drop policy if exists "own exams select" on public.exams;
drop policy if exists "own exams insert" on public.exams;
drop policy if exists "own exams delete" on public.exams;
create policy "own exams select" on public.exams for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
create policy "own exams insert" on public.exams for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid()))
              and exam_date between current_date and current_date + 60
              and best_score is null);
create policy "own exams delete" on public.exams for delete to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = (select auth.uid())));
grant select, insert, delete on public.exams to authenticated;

-- Результат пробной контрольной (сохраняется лучший).
create or replace function public.save_exam_score(p_exam uuid, p_score int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_best int;
begin
  select student_id into v_student from public.exams where id = p_exam;
  if v_student is null then raise exception 'not found'; end if;
  perform public.assert_own_student(v_student);
  update public.exams set best_score = greatest(coalesce(best_score, 0), least(greatest(p_score, 0), 100))
    where id = p_exam returning best_score into v_best;
  return v_best;
end;
$$;
revoke all on function public.save_exam_score(uuid, int) from public, anon;
grant execute on function public.save_exam_score(uuid, int) to authenticated;

-- Изменять строки напрямую нельзя (результат — только через save_exam_score).
revoke update, truncate, references, trigger on public.exams from authenticated, anon;
revoke all on public.exams from anon;
