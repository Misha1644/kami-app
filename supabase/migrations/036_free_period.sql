-- Бесплатный период (решение пользователя, 16 ноя 2026): первая версия выходит без оплаты,
-- всё открыто бесплатно; после подключения покупок Плюс включается, а ~2 недели после выхода
-- всё ещё бесплатно для всех.
-- Управление — одной датой в базе, без обновления приложения:
--   update public.app_settings set plus_free_until = '2027-01-15' where id = 1;
-- Пока дата в будущем, у всех действует Плюс (разбор фото, отчёты, вещи «только с Плюсом»).
-- В приложении PLUS_ENABLED = false прячет всё про подписку; когда будет оплата — PLUS_ENABLED = true.

create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  plus_free_until timestamptz
);
insert into public.app_settings (id, plus_free_until) values (1, '2027-12-31 23:59:59+01')
  on conflict (id) do nothing;
alter table public.app_settings enable row level security; -- читается только функциями

create or replace function public.free_period_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select plus_free_until > now() from public.app_settings where id = 1), false)
$$;
revoke all on function public.free_period_active() from public, anon, authenticated;

create or replace function public.student_has_plus(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.free_period_active() or exists (
    select 1 from public.students s
      join public.parent_plans p on p.parent_id = s.parent_id
     where s.id = p_student and p.plan = 'plus' and (p.expires_at is null or p.expires_at > now())
  );
$$;
revoke execute on function public.student_has_plus(uuid) from public, anon, authenticated;

create or replace function public.plan_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plus', public.free_period_active() or exists (
              select 1 from public.parent_plans p where p.parent_id = auth.uid() and p.plan = 'plus'
                and (p.expires_at is null or p.expires_at > now())),
    'source', case when public.free_period_active()
                     and not exists (select 1 from public.parent_plans p where p.parent_id = auth.uid() and p.plan = 'plus'
                                     and (p.expires_at is null or p.expires_at > now()))
                   then 'free_period'
                   else (select p.source from public.parent_plans p where p.parent_id = auth.uid()) end,
    'expires_at', case when public.free_period_active()
                         then (select plus_free_until from public.app_settings where id = 1)
                       else (select p.expires_at from public.parent_plans p where p.parent_id = auth.uid()) end,
    'trial_used', exists (select 1 from public.plan_trials t where t.parent_id = auth.uid())
  )
$$;
revoke all on function public.plan_status() from public;
grant execute on function public.plan_status() to authenticated;
