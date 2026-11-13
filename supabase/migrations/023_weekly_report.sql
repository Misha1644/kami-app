-- Еженедельный отчёт родителю на почту (только Ками Плюс).
-- Письма отправляет Edge Function weekly-report через почтовый сервис (Resend).
-- Её раз в неделю вызывает pg_cron; вызов подписан случайным секретом из Vault,
-- который никто не видит: функция сверяет его через check_cron_secret().

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Настройка родителя: присылать ли отчёт. По умолчанию — да (если есть Плюс).
create table if not exists public.report_prefs (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  weekly_email boolean not null default true,
  last_sent_at timestamptz
);
alter table public.report_prefs enable row level security;
create policy "own report prefs" on public.report_prefs for select using (parent_id = auth.uid());
revoke insert, update, delete on public.report_prefs from anon, authenticated;

create or replace function public.set_weekly_email(p_on boolean)
returns void language sql security definer set search_path = '' as $$
  insert into public.report_prefs (parent_id, weekly_email) values (auth.uid(), p_on)
  on conflict (parent_id) do update set weekly_email = excluded.weekly_email;
$$;
revoke all on function public.set_weekly_email(boolean) from public, anon;
grant execute on function public.set_weekly_email(boolean) to authenticated;

-- Данные для писем: родители с Плюсом, у которых отчёт включён и не отправлялся 6 дней.
create or replace function public.weekly_report_batch()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(r), '[]'::jsonb) from (
    select u.id as parent_id, u.email,
      (select jsonb_agg(jsonb_build_object(
          'nickname', s.nickname,
          'grade', s.grade,
          'lang', s.native_lang,
          'days', (select count(*) from public.activity_days a
                    where a.student_id = s.id and a.day > current_date - 7 and (a.lessons_done > 0 or a.words_done > 0)),
          'lessons', (select coalesce(sum(a.lessons_done), 0) from public.activity_days a
                       where a.student_id = s.id and a.day > current_date - 7),
          'new_words', (select count(*) from public.progress p
                         where p.student_id = s.id and p.learned_at > now() - interval '7 days'),
          'total_words', (select count(*) from public.progress p
                           where p.student_id = s.id and p.learned_at is not null),
          'hard', (select coalesce(jsonb_agg(jsonb_build_object('es', w.es, 'ru', w.ru, 'en', w.en)), '[]'::jsonb) from (
                     select w.es, w.ru, w.en from public.progress p join public.words w on w.id = p.word_id
                      where p.student_id = s.id and p.wrong_count > 0 and p.last_seen > now() - interval '14 days'
                      order by p.wrong_count - p.correct_count desc, p.wrong_count desc limit 5) w),
          'exams', (select coalesce(jsonb_agg(jsonb_build_object('subject', e.subject_code, 'date', e.exam_date,
                       'score', e.best_score) order by e.exam_date), '[]'::jsonb)
                     from public.exams e where e.student_id = s.id
                      and e.exam_date between current_date - 7 and current_date + 14)
        ) order by s.created_at)
        from public.students s where s.parent_id = u.id) as students
    from auth.users u
    join public.parent_plans pp on pp.parent_id = u.id and pp.plan = 'plus'
         and (pp.expires_at is null or pp.expires_at > now())
    left join public.report_prefs rp on rp.parent_id = u.id
    where coalesce(rp.weekly_email, true)
      and (rp.last_sent_at is null or rp.last_sent_at < now() - interval '6 days')
      and u.email is not null
      and exists (select 1 from public.students s where s.parent_id = u.id)
  ) r;
$$;

create or replace function public.mark_report_sent(p_parent uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.report_prefs (parent_id, last_sent_at) values (p_parent, now())
  on conflict (parent_id) do update set last_sent_at = now();
$$;

-- Секрет для вызова из pg_cron: создаётся случайным и хранится только в Vault.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'weekly_report_cron') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'weekly_report_cron');
  end if;
end $$;

create or replace function public.check_cron_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets
                  where name = 'weekly_report_cron' and decrypted_secret = p_secret);
$$;

-- Эти три функции — только для сервера (service_role).
revoke all on function public.weekly_report_batch() from public, anon, authenticated;
revoke all on function public.mark_report_sent(uuid) from public, anon, authenticated;
revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.weekly_report_batch() to service_role;
grant execute on function public.mark_report_sent(uuid) to service_role;
grant execute on function public.check_cron_secret(text) to service_role;

-- Каждое воскресенье в 17:00 UTC (18:00/19:00 по Мадриду).
select cron.unschedule('weekly-report') where exists (select 1 from cron.job where jobname = 'weekly-report');
select cron.schedule('weekly-report', '0 17 * * 0', $cron$
  select net.http_post(
    url := 'https://xaeditsttxhpcyigbuio.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_report_cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
