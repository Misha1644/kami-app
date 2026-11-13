-- Витрина: «вернулось спустя …» и долгие перерывы.
-- 1) Метки для ВСЕХ вещей (не только от агента):
--      «НОВИНКА»                — вещи ещё ни разу не было на витрине;
--      «ВЕРНУЛОСЬ спустя N дней» — была раньше и вернулась после перерыва (away_days).
--    Вещь, которая просто осталась со вчера, метки не получает.
-- 2) Перерывы: когда вещь стоит на витрине, ей назначается случайный минимальный «отдых» (rest_until).
--    Пока отдыхает — на витрину не попадает. Обычные: 70% — 4–12 дней, 22% — 2–4 недели, 8% — 1,5–3 месяца.
--    Дорогие (от 5 000): 80% — 5–12 дней, 20% — 1–2 месяца. Это минимум: среди отдохнувших выбор случайный,
--    поэтому чем больше вещей в магазине (агент добавляет по 2 в день), тем дольше реальные перерывы.
--    Если отдохнувших не хватает на все места, берутся те, у кого отдых кончается раньше.
--    Проверка на 120 днях (116 вещей): возврат обычно через ~11 дней, 10% — через 26+ дней, максимум ~3 месяца.

alter table public.shop_rotation add column if not exists away_days int;
alter table public.shop_items add column if not exists rest_until date;

create or replace function public.shop_rest_days(p_price int)
returns int language plpgsql volatile set search_path = '' as $$
declare r double precision := random();
begin
  if p_price >= 5000 then
    if r < 0.8 then return 5 + floor(random() * 8)::int; end if;    -- 5–12 дней
    return 30 + floor(random() * 31)::int;                           -- 1–2 месяца
  end if;
  if r < 0.7 then return 4 + floor(random() * 9)::int; end if;      -- 4–12 дней
  if r < 0.92 then return 14 + floor(random() * 17)::int; end if;   -- 2–4 недели
  return 45 + floor(random() * 46)::int;                             -- 1,5–3 месяца
end;
$$;
revoke all on function public.shop_rest_days(int) from public, anon, authenticated;

create or replace function public.ensure_shop_rotation(p_day date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_slots int;
  v_keep int;
  v_have int;
  v_day_start timestamptz := p_day::timestamp at time zone 'Europe/Madrid';
begin
  if exists (select 1 from public.shop_rotation where day = p_day) then return; end if;
  perform pg_advisory_xact_lock(hashtext('kami-shop-rotation'));
  if exists (select 1 from public.shop_rotation where day = p_day) then return; end if;

  -- 0) свежие новинки (добавлены за 3 дня до этого дня, ещё не были на витрине) — сверх обычных мест
  insert into public.shop_rotation (day, item_id, tag)
    select p_day, i.id, 'new' from public.shop_items i
    where i.kind in ('avatar', 'color', 'bg') and i.price > 0 and not i.plus_only and not i.exclusive
      and not public.is_default_item(i.id)
      and i.added_at >= v_day_start - interval '3 days' and i.added_at < v_day_start
      and not exists (select 1 from public.shop_rotation s where s.item_id = i.id)
    order by i.added_at
    limit 4;

  for v_kind, v_slots in select * from (values ('avatar', 4), ('color', 3), ('bg', 3)) as t(k, n) loop
    v_keep := v_slots / 2;
    -- 1) остаются со вчера (без метки)
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, y.item_id, null from public.shop_rotation y join public.shop_items i on i.id = y.item_id
      where y.day = p_day - 1 and not y.featured and i.kind = v_kind
        and not exists (select 1 from public.shop_rotation s where s.day = p_day and s.item_id = y.item_id)
      order by random() limit v_keep;
    -- 2) остальные места: сначала отдохнувшие вещи, случайно; «НОВИНКА», если вещи ещё не было
    select count(*) into v_have from public.shop_rotation r join public.shop_items i on i.id = r.item_id
      where r.day = p_day and i.kind = v_kind
        and not (r.tag = 'new' and i.added_at >= v_day_start - interval '3 days' and i.added_at < v_day_start);
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, i.id,
             case when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' else 'new' end
      from public.shop_items i
      where i.kind = v_kind and i.price between 1 and 4999 and not i.plus_only and not i.exclusive
        and not public.is_default_item(i.id)
        and not exists (select 1 from public.shop_rotation s where s.day in (p_day, p_day - 1) and s.item_id = i.id)
      order by (i.rest_until is null or i.rest_until <= p_day) desc,
               case when i.rest_until is null or i.rest_until <= p_day then random() end, i.rest_until
      limit greatest(v_slots - v_have, 0);
  end loop;

  -- 3) вещь дня (от 5 000): не вчерашняя, не сегодняшняя новинка; сначала отдохнувшие
  insert into public.shop_rotation (day, item_id, tag, featured)
    select p_day, i.id,
           case when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' else 'new' end,
           true
    from public.shop_items i
    where i.kind in ('avatar', 'color', 'bg') and i.price >= 5000 and not i.plus_only and not i.exclusive
      and not exists (select 1 from public.shop_rotation s where s.day in (p_day, p_day - 1) and s.item_id = i.id)
    order by (i.rest_until is null or i.rest_until <= p_day) desc,
               case when i.rest_until is null or i.rest_until <= p_day then random() end, i.rest_until
    limit 1;

  -- 4) сколько дней вещь не было на витрине (для «вернулось спустя …»)
  update public.shop_rotation r
     set away_days = p_day - (select max(s.day) from public.shop_rotation s where s.item_id = r.item_id and s.day < p_day)
   where r.day = p_day and r.tag = 'back';

  -- 5) всем, кто сегодня на витрине, — новый отдых после ухода
  update public.shop_items i
     set rest_until = p_day + 1 + public.shop_rest_days(i.price)
   where i.id in (select item_id from public.shop_rotation where day = p_day);
end;
$$;
revoke all on function public.ensure_shop_rotation(date) from public, anon, authenticated;

-- Витрина на сегодня для приложения: + away_days.
create or replace function public.shop_today()
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
begin
  perform public.ensure_shop_rotation(current_date);
  return jsonb_build_object(
    'day', current_date,
    'next_at', (current_date + 1)::timestamp at time zone 'Europe/Madrid',
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'tag', tag, 'featured', featured, 'away', away_days))
                       from public.shop_rotation where day = current_date), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.shop_today() from public, anon;
grant execute on function public.shop_today() to authenticated;

-- Тем, кто уже стоит на сегодняшней витрине, — отдых после ухода.
update public.shop_items set rest_until = (now() at time zone 'Europe/Madrid')::date + 1 + public.shop_rest_days(price)
 where id in (select item_id from public.shop_rotation where day = (now() at time zone 'Europe/Madrid')::date);
