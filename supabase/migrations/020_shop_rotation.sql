-- Витрина дня (как в Fortnite): каждый день в 00:00 по Мадриду — 11 вещей:
--   4 аватара, 3 цвета Ками, 3 фона (до 5 000) + 1 «вещь дня» (от 5 000).
-- Часть вещей остаётся со вчера, остальные — вернувшиеся («ВЕРНУЛОСЬ») и новые («НОВОЕ»).
-- «НОВОЕ» — вещь впервые на витрине и добавлена в магазин недавно (за 14 дней); новинки ставятся в первую очередь.
-- Всегда доступны: заморозка, сундук, бесплатные вещи и вещи «с Плюсом».
-- Купить можно только то, что сегодня на витрине (проверяет buy_item).

alter table public.shop_items add column if not exists added_at timestamptz not null default now();
-- Всё, что уже есть, — «старое» (без метки «НОВОЕ» при запуске).
update public.shop_items set added_at = '2026-10-01' where added_at > '2026-10-01';

create table if not exists public.shop_rotation (
  day date not null,
  item_id text not null references public.shop_items(id) on delete cascade,
  tag text check (tag in ('new', 'back')),
  featured boolean not null default false,
  primary key (day, item_id)
);
alter table public.shop_rotation enable row level security;
drop policy if exists "read rotation" on public.shop_rotation;
create policy "read rotation" on public.shop_rotation for select to authenticated using (true);

-- Собрать витрину на день (если ещё не собрана).
create or replace function public.ensure_shop_rotation(p_day date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_slots int;
  v_keep int;
  v_have int;
  r record;
begin
  if exists (select 1 from public.shop_rotation where day = p_day) then return; end if;
  perform pg_advisory_xact_lock(hashtext('kami-shop-rotation'));
  if exists (select 1 from public.shop_rotation where day = p_day) then return; end if;

  for v_kind, v_slots in select * from (values ('avatar', 4), ('color', 3), ('bg', 3)) as t(k, n) loop
    v_keep := v_slots / 2; -- примерно половина остаётся со вчера
    -- 1) остаются со вчера (случайные, кроме «вещи дня»)
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, y.item_id, null from public.shop_rotation y join public.shop_items i on i.id = y.item_id
      where y.day = p_day - 1 and not y.featured and i.kind = v_kind
      order by random() limit v_keep;
    -- 2) новинки: недавно добавленные и ещё не бывавшие на витрине (до 2 за день)
    select count(*) into v_have from public.shop_rotation where day = p_day and item_id in (select id from public.shop_items where kind = v_kind);
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, i.id, 'new' from public.shop_items i
      where i.kind = v_kind and i.price between 1 and 4999 and not i.plus_only and not public.is_default_item(i.id)
        and i.added_at > now() - interval '14 days'
        and not exists (select 1 from public.shop_rotation s where s.item_id = i.id)
      order by i.sort limit least(2, greatest(v_slots - v_have, 0));
    -- 3) остальное — случайные вещи, которых не было вчера
    select count(*) into v_have from public.shop_rotation where day = p_day and item_id in (select id from public.shop_items where kind = v_kind);
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, i.id,
             case when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' end
      from public.shop_items i
      where i.kind = v_kind and i.price between 1 and 4999 and not i.plus_only and not public.is_default_item(i.id)
        and not exists (select 1 from public.shop_rotation s where s.day in (p_day, p_day - 1) and s.item_id = i.id)
      order by random() limit greatest(v_slots - v_have, 0);
  end loop;

  -- 4) вещь дня: дорогая (от 5 000), не та, что вчера
  insert into public.shop_rotation (day, item_id, tag, featured)
    select p_day, i.id,
           case when not exists (select 1 from public.shop_rotation s where s.item_id = i.id)
                     and i.added_at > now() - interval '14 days' then 'new'
                when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' end,
           true
    from public.shop_items i
    where i.kind in ('avatar', 'color', 'bg') and i.price >= 5000 and not i.plus_only
      and not exists (select 1 from public.shop_rotation s where s.day = p_day - 1 and s.item_id = i.id)
    order by (i.added_at > now() - interval '14 days' and not exists (select 1 from public.shop_rotation s where s.item_id = i.id)) desc,
             random()
    limit 1;
end;
$$;
revoke all on function public.ensure_shop_rotation(date) from public, anon, authenticated;

-- Витрина на сегодня для приложения: вещи, метки и когда обновится.
create or replace function public.shop_today()
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
begin
  perform public.ensure_shop_rotation(current_date);
  return jsonb_build_object(
    'day', current_date,
    'next_at', (current_date + 1)::timestamp at time zone 'Europe/Madrid',
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'tag', tag, 'featured', featured))
                       from public.shop_rotation where day = current_date), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.shop_today() from public, anon;
grant execute on function public.shop_today() to authenticated;

-- Покупка: вещи (не бесплатные и не «с Плюсом») — только с сегодняшней витрины.
create or replace function public.buy_item(p_student uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_item public.shop_items;
  v_st public.students;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;
  select * into v_item from public.shop_items where id = p_item;
  if not found then raise exception 'item not found'; end if;
  if v_item.plus_only and not public.student_has_plus(p_student) then raise exception 'plus only'; end if;
  if v_item.kind in ('color', 'avatar', 'bg') and v_item.price > 0 and not v_item.plus_only then
    perform public.ensure_shop_rotation(current_date);
    if not exists (select 1 from public.shop_rotation where day = current_date and item_id = p_item) then
      raise exception 'not in shop';
    end if;
  end if;
  if v_item.kind not in ('freeze', 'chest') and (public.is_default_item(p_item) or exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item)) then
    raise exception 'already owned';
  end if;
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 2 then raise exception 'max freezes'; end if;
  if v_st.coins < v_item.price then raise exception 'not enough coins'; end if;

  update public.students set coins = coins - v_item.price where id = p_student;
  if v_item.kind = 'freeze' then
    update public.students set streak_freezes = streak_freezes + 1 where id = p_student;
  elsif v_item.kind = 'chest' then
    update public.students set chests_skin = chests_skin + 1 where id = p_student;
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
    'kami_color', v_st.kami_color, 'avatar', v_st.avatar, 'bg', v_st.bg,
    'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$$;
