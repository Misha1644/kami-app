-- Версия 0.8: подписка «Ками Плюс» для родителей.
--
-- Подписка привязана к аккаунту родителя. Записывать её может только сервер
-- (позже — проверка покупки из App Store / Google Play), из приложения — только читать.
-- Преимущества Плюса проверяются в базе, а не в приложении, поэтому их нельзя «включить» самому.
--
-- Бесплатно:  3 разбора фото в день, до 50 своих слов.
-- Ками Плюс: 15 разборов в день, свои слова без лимита, эксклюзивный цвет Ками,
--            подробный отчёт для родителей (трудные слова).

create table public.parent_plans (
  parent_id  uuid primary key references auth.users(id) on delete cascade,
  plan       text not null check (plan in ('plus')),
  source     text not null check (source in ('comp', 'app_store', 'google_play')),
  expires_at timestamptz,           -- null = бессрочно
  updated_at timestamptz not null default now()
);
alter table public.parent_plans enable row level security;
create policy "parent reads own plan" on public.parent_plans for select to authenticated
  using (parent_id = (select auth.uid()));

-- Есть ли сейчас Плюс у родителя ученика.
create or replace function public.student_has_plus(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
      join public.parent_plans p on p.parent_id = s.parent_id
     where s.id = p_student and p.plan = 'plus' and (p.expires_at is null or p.expires_at > now())
  );
$$;
revoke execute on function public.student_has_plus(uuid) from public, anon, authenticated;

-- Лимит разборов: 3 бесплатно, 15 с Плюсом.
create or replace function public.use_task_quota(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_plus boolean;
  v_limit int;
begin
  perform public.assert_own_student(p_student);
  v_plus := public.student_has_plus(p_student);
  v_limit := case when v_plus then 15 else 3 end;
  select count(*) into v_used from public.task_requests
   where student_id = p_student and created_at >= date_trunc('day', now());
  if v_used >= v_limit then
    return jsonb_build_object('ok', false, 'left', 0, 'plus', v_plus);
  end if;
  insert into public.task_requests (student_id) values (p_student);
  return jsonb_build_object('ok', true, 'left', v_limit - v_used - 1, 'plus', v_plus);
end; $$;

-- Свои слова: до 50 бесплатно, без лимита с Плюсом.
create or replace function public.check_custom_words_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.student_has_plus(new.student_id)
     and (select count(*) from public.custom_words where student_id = new.student_id) >= 50 then
    raise exception 'free words limit';
  end if;
  return new;
end; $$;
revoke execute on function public.check_custom_words_limit() from public, anon, authenticated;

create trigger custom_words_limit before insert on public.custom_words
  for each row execute function public.check_custom_words_limit();

-- Эксклюзивный цвет только для Плюса.
alter table public.shop_items add column plus_only boolean not null default false;
insert into public.shop_items (id, kind, title_ru, price, value, sort, plus_only)
values ('color-plus', 'color', 'Ками Плюс', 0, '#B07CE8', 5, true);

-- Самый дешёвый цвет — примерно 5 дней учёбы (~20 монет в день).
update public.shop_items set price = 100 where id = 'color-blue';

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

  if v_item.plus_only and not public.student_has_plus(p_student) then
    raise exception 'plus only';
  end if;
  if v_item.kind = 'color' and (p_item = 'color-green' or exists (
       select 1 from public.student_items where student_id = p_student and item_id = p_item)) then
    raise exception 'already owned';
  end if;
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 2 then
    raise exception 'max freezes';
  end if;
  if v_st.coins < v_item.price then
    raise exception 'not enough coins';
  end if;

  update public.students set coins = coins - v_item.price where id = p_student;
  if v_item.kind = 'freeze' then
    update public.students set streak_freezes = streak_freezes + 1 where id = p_student;
  else
    insert into public.student_items (student_id, item_id) values (p_student, p_item);
    update public.students set kami_color = p_item where id = p_student;
  end if;

  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
                            'kami_color', v_st.kami_color);
end; $$;

-- Подарок владельцу приложения: Плюс навсегда для единственного (его) аккаунта.
-- Выдаётся по id, а не по email, чтобы не хранить почту в миграции.
insert into public.parent_plans (parent_id, plan, source, expires_at)
values ('08b52aa8-71e7-46d6-8114-2f84d7f91ebb', 'plus', 'comp', null);
