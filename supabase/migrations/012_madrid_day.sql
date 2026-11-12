-- «Сегодня» считается по времени Мадрида, а не по UTC:
-- иначе занятие с 00:00 до 01:00 (02:00 летом) засчитывалось во вчерашний день.
alter function public.get_streak(uuid) set timezone = 'Europe/Madrid';
alter function public.complete_lesson(uuid) set timezone = 'Europe/Madrid';
alter function public.use_task_quota(uuid) set timezone = 'Europe/Madrid';
alter function public.record_answer(uuid, text, boolean) set timezone = 'Europe/Madrid';
alter function public.record_custom_answer(uuid, uuid, boolean) set timezone = 'Europe/Madrid';

-- Текущая дата по Мадриду — для клиента (счётчик «слов сегодня»).
create or replace function public.kami_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Europe/Madrid')::date $$;

revoke all on function public.kami_today() from public;
grant execute on function public.kami_today() to authenticated;
