-- Профиль: аватары и фоны за монеты, цель дня; пробный период Плюса на 3 дня.

-- 1. Новые виды товаров
alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in ('freeze', 'color', 'avatar', 'bg'));

insert into public.shop_items (id, kind, title_ru, price, value, sort, plus_only) values
  ('avatar-person',  'avatar', 'Человечек',             0,   'person',  30, false),
  ('avatar-kami',    'avatar', 'Ками',                  150, 'kami',    31, false),
  ('avatar-turtle',  'avatar', 'Flora',                 200, 'turtle',  32, false),
  ('avatar-cat',     'avatar', 'Capitán Rumbo',         200, 'cat',     33, false),
  ('avatar-bird',    'avatar', 'Mimí',                  200, 'bird',    34, false),
  ('avatar-bear',    'avatar', 'Abuela Mora',           250, 'bear',    35, false),
  ('avatar-corgi',   'avatar', 'Sir Biscuit',           300, 'corgi',   36, false),
  ('avatar-cheetah', 'avatar', 'Coach Rayo',            300, 'cheetah', 37, false),
  ('avatar-fox',     'avatar', 'Doña Letra',            400, 'fox',     38, false),
  ('avatar-octopus', 'avatar', 'Tinta',                 400, 'octopus', 39, false),
  ('avatar-raccoon', 'avatar', 'Chispa',                500, 'raccoon', 40, false),
  ('avatar-robot',   'avatar', 'Tuerca',                500, 'robot',   41, false),
  ('avatar-bat',     'avatar', 'Ratpenat',              600, 'bat',     42, false),
  ('avatar-owl',     'avatar', 'Doctor Pi',             800, 'owl',     43, false),
  ('bg-default',     'bg',     'Светлый',               0,   '#F6F7F4', 50, false),
  ('bg-sand',        'bg',     'Песок',                 150, '#FBF3E4', 51, false),
  ('bg-sky',         'bg',     'Небо',                  150, '#EAF3FB', 52, false),
  ('bg-mint',        'bg',     'Мята',                  150, '#E6F6EE', 53, false),
  ('bg-lavender',    'bg',     'Лаванда',               300, '#F1ECFB', 54, false),
  ('bg-peach',       'bg',     'Персик',                300, '#FDEDE6', 55, false),
  ('bg-plus',        'bg',     'Звёздный (Плюс)',       0,   '#EFEAFB', 56, true)
on conflict (id) do update set kind = excluded.kind, title_ru = excluded.title_ru, price = excluded.price,
  value = excluded.value, sort = excluded.sort, plus_only = excluded.plus_only;

-- 2. Что надето у ученика
alter table public.students add column if not exists avatar text not null default 'avatar-person';
alter table public.students add column if not exists bg text not null default 'bg-default';
-- Цель дня ученик меняет сам (ограничение 3–50 уже есть).
grant update (daily_goal) on public.students to authenticated;

-- Бесплатные вещи по умолчанию
create or replace function public.is_default_item(p_item text)
returns boolean language sql immutable set search_path = '' as $$
  select p_item in ('color-green', 'avatar-person', 'bg-default')
$$;

-- 3. Покупка: любые вещи (цвет, аватар, фон) — купить и сразу надеть
create or replace function public.buy_item(p_student uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item public.shop_items;
  v_st public.students;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;
  select * into v_item from public.shop_items where id = p_item;
  if not found then raise exception 'item not found'; end if;
  if v_item.plus_only and not public.student_has_plus(p_student) then raise exception 'plus only'; end if;
  if v_item.kind <> 'freeze' and (public.is_default_item(p_item) or exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item)) then
    raise exception 'already owned';
  end if;
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 2 then raise exception 'max freezes'; end if;
  if v_st.coins < v_item.price then raise exception 'not enough coins'; end if;

  update public.students set coins = coins - v_item.price where id = p_student;
  if v_item.kind = 'freeze' then
    update public.students set streak_freezes = streak_freezes + 1 where id = p_student;
  else
    insert into public.student_items (student_id, item_id) values (p_student, p_item);
    update public.students set
      kami_color = case when v_item.kind = 'color' then p_item else kami_color end,
      avatar     = case when v_item.kind = 'avatar' then p_item else avatar end,
      bg         = case when v_item.kind = 'bg' then p_item else bg end
    where id = p_student;
  end if;
  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
    'kami_color', v_st.kami_color, 'avatar', v_st.avatar, 'bg', v_st.bg);
end;
$$;

-- 4. Надеть купленную вещь
create or replace function public.equip_item(p_student uuid, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_kind text;
begin
  perform public.assert_own_student(p_student);
  select kind into v_kind from public.shop_items where id = p_item;
  if v_kind is null or v_kind = 'freeze' then raise exception 'item not found'; end if;
  if not public.is_default_item(p_item) and not exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item) then
    raise exception 'not owned';
  end if;
  update public.students set
    kami_color = case when v_kind = 'color' then p_item else kami_color end,
    avatar     = case when v_kind = 'avatar' then p_item else avatar end,
    bg         = case when v_kind = 'bg' then p_item else bg end
  where id = p_student;
end;
$$;

create or replace function public.equip_color(p_student uuid, p_item text)
returns void language sql security definer set search_path = '' as $$
  select public.equip_item(p_student, p_item)
$$;

revoke all on function public.equip_item(uuid, text) from public;
grant execute on function public.equip_item(uuid, text) to authenticated;
revoke all on function public.is_default_item(text) from public;

-- 5. Пробный период: 3 дня Плюса, один раз на аккаунт родителя
alter table public.parent_plans drop constraint if exists parent_plans_source_check;
alter table public.parent_plans add constraint parent_plans_source_check
  check (source in ('comp', 'app_store', 'google_play', 'trial'));

create table if not exists public.plan_trials (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table public.plan_trials enable row level security;
drop policy if exists "own trial" on public.plan_trials;
create policy "own trial" on public.plan_trials for select to authenticated using (parent_id = (select auth.uid()));

create or replace function public.plan_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plus', exists (select 1 from public.parent_plans p where p.parent_id = auth.uid() and p.plan = 'plus'
                    and (p.expires_at is null or p.expires_at > now())),
    'source', (select p.source from public.parent_plans p where p.parent_id = auth.uid()),
    'expires_at', (select p.expires_at from public.parent_plans p where p.parent_id = auth.uid()),
    'trial_used', exists (select 1 from public.plan_trials t where t.parent_id = auth.uid())
  )
$$;

create or replace function public.start_trial()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz := now() + interval '3 days';
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.plan_trials where parent_id = v_uid) then raise exception 'trial used'; end if;
  if exists (select 1 from public.parent_plans where parent_id = v_uid and plan = 'plus'
             and (expires_at is null or expires_at > now())) then
    raise exception 'already plus';
  end if;
  insert into public.plan_trials (parent_id) values (v_uid);
  insert into public.parent_plans (parent_id, plan, source, expires_at)
    values (v_uid, 'plus', 'trial', v_until)
    on conflict (parent_id) do update set plan = 'plus', source = 'trial', expires_at = v_until, updated_at = now();
  return public.plan_status();
end;
$$;

revoke all on function public.plan_status() from public;
revoke all on function public.start_trial() from public;
grant execute on function public.plan_status() to authenticated;
grant execute on function public.start_trial() to authenticated;

-- 6. Разбор заданий по фото — только с Плюсом (в том числе пробным): 15 в день.
create or replace function public.use_task_quota(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare v_used int; v_plus boolean; v_limit int;
begin
  perform public.assert_own_student(p_student);
  v_plus := public.student_has_plus(p_student);
  v_limit := case when v_plus then 15 else 0 end;
  select count(*) into v_used from public.task_requests
    where student_id = p_student and created_at >= date_trunc('day', now());
  if v_used >= v_limit then
    return jsonb_build_object('ok', false, 'left', 0, 'plus', v_plus);
  end if;
  insert into public.task_requests (student_id) values (p_student);
  return jsonb_build_object('ok', true, 'left', v_limit - v_used - 1, 'plus', v_plus);
end;
$$;
