-- «Фразы для школы» (решение пользователя, 15 ноя 2026): дополнительные уроки.
-- Ответы дают монеты, а урок — сундук (как обычный урок), но НЕ продлевают огонёк дней:
-- они не трогают words_done / lessons_done (по ним считается серия), а копятся в extra_words.
-- Сами фразы лежат в приложении (src/data/classroom.js), прогресс по ним в progress не пишется.

alter table public.activity_days add column if not exists extra_words int not null default 0;
alter table public.activity_days add column if not exists extra_chests int not null default 0;

-- Ответ во «Фразах для школы»: +1 монета за верный.
create or replace function public.record_extra_answer(p_student uuid, p_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare v_coins int;
begin
  perform public.assert_own_student(p_student);
  insert into public.activity_days (student_id, day, words_done, extra_words)
  values (p_student, current_date, 0, case when p_correct then 1 else 0 end)
  on conflict (student_id, day) do update set
    extra_words = public.activity_days.extra_words + case when p_correct then 1 else 0 end;
  update public.students set coins = coins + case when p_correct then 1 else 0 end
   where id = p_student returning coins into v_coins;
  return jsonb_build_object('coins', v_coins);
end;
$$;
revoke all on function public.record_extra_answer(uuid, boolean) from public, anon;
grant execute on function public.record_extra_answer(uuid, boolean) to authenticated;

-- Конец урока «Фраз для школы»: сундук за каждые 5 верных ответов (общий дневной лимит сундуков — 10).
create or replace function public.complete_extra_lesson(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_row public.activity_days;
  v_chest boolean := false;
begin
  perform public.assert_own_student(p_student);
  select * into v_row from public.activity_days where student_id = p_student and day = current_date for update;
  if not found then return jsonb_build_object('ok', false, 'chest', false); end if;
  if v_row.chests_given < 10 and v_row.extra_words >= (v_row.extra_chests + 1) * 5 then
    update public.activity_days set chests_given = chests_given + 1, extra_chests = extra_chests + 1
     where student_id = p_student and day = current_date;
    update public.students set chests_lesson = chests_lesson + 1 where id = p_student;
    v_chest := true;
  end if;
  return jsonb_build_object('ok', true, 'chest', v_chest);
end;
$$;
revoke all on function public.complete_extra_lesson(uuid) from public, anon;
grant execute on function public.complete_extra_lesson(uuid) to authenticated;
