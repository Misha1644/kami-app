-- «Что сейчас проходим в школе» (решение пользователя 16 ноя 2026): у каждой школы своя программа,
-- поэтому ученик (или родитель) отмечает текущую тему по каждому предмету.
-- Раньше выбор хранился только на телефоне (AsyncStorage) — теперь в базе: виден на всех устройствах семьи.
create table if not exists public.student_topics (
  student_id uuid not null references public.students(id) on delete cascade,
  subject_code text not null,
  topic_id text not null,
  set_at timestamptz not null default now(),
  primary key (student_id, subject_code)
);
alter table public.student_topics enable row level security; -- только через функции

create or replace function public.get_current_topics(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_own_student(p_student);
  return coalesce((select jsonb_object_agg(subject_code, topic_id) from public.student_topics where student_id = p_student), '{}'::jsonb);
end;
$$;
revoke all on function public.get_current_topics(uuid) from public, anon;
grant execute on function public.get_current_topics(uuid) to authenticated;

-- p_topic = null — «не знаю, по порядку программы».
create or replace function public.set_current_topic(p_student uuid, p_subject text, p_topic text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_own_student(p_student);
  if p_subject is null or length(p_subject) > 60 or length(coalesce(p_topic, '')) > 120 then
    raise exception 'bad input';
  end if;
  if p_topic is null then
    delete from public.student_topics where student_id = p_student and subject_code = p_subject;
  else
    insert into public.student_topics (student_id, subject_code, topic_id) values (p_student, p_subject, p_topic)
      on conflict (student_id, subject_code) do update set topic_id = excluded.topic_id, set_at = now();
  end if;
end;
$$;
revoke all on function public.set_current_topic(uuid, text, text) from public, anon;
grant execute on function public.set_current_topic(uuid, text, text) to authenticated;
