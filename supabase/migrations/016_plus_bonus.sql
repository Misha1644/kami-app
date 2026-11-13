-- Бонус за подписку: +500 монет каждому ребёнку аккаунта, когда родитель оформляет
-- ПЛАТНЫЙ Ками Плюс (App Store / Google Play). Один раз на аккаунт — продления и
-- повторные подписки бонус не дают. Пробный период и подарок (comp) бонус не дают.
create table if not exists public.plan_bonuses (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.plan_bonuses enable row level security;
drop policy if exists "own bonus" on public.plan_bonuses;
create policy "own bonus" on public.plan_bonuses for select to authenticated using (parent_id = (select auth.uid()));

create or replace function public.grant_plus_bonus()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan = 'plus'
     and new.source in ('app_store', 'google_play')
     and (new.expires_at is null or new.expires_at > now()) then
    insert into public.plan_bonuses (parent_id) values (new.parent_id)
      on conflict (parent_id) do nothing;
    if found then
      update public.students set coins = coins + 500 where parent_id = new.parent_id;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.grant_plus_bonus() from public, anon, authenticated;

drop trigger if exists plus_bonus on public.parent_plans;
create trigger plus_bonus after insert or update on public.parent_plans
  for each row execute function public.grant_plus_bonus();
