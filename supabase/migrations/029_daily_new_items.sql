-- Новинки каждый день. Агент (запланированная задача Claude) каждый вечер добавляет 2 новые вещи
-- через add_new_item(). На следующий день они попадают на витрину ДОПОЛНИТЕЛЬНО к обычным
-- 4 аватарам / 3 цветам / 3 фонам / вещи дня, с меткой «НОВИНКА». Дальше — как все вещи:
-- уходят с витрины и потом случайно возвращаются с меткой «ВЕРНУЛОСЬ»
-- (дешёвые — в обычные места, от 5 000 — как «вещь дня»).
--
-- Новые вещи собираются только из того, что приложение уже умеет рисовать:
--   цвет Ками  — '#RRGGBB';
--   фон        — '#RRGGBB' или 'pattern:<узор>:#RRGGBB';
--   аватар     — 'a:<зверёк>~#ОКРАС~#ФОН' (готовый зверёк в новых цветах).

alter table public.shop_items add column if not exists title_en text;
alter table public.shop_items add column if not exists title_ar text;
alter table public.shop_items add column if not exists source text not null default 'manual';

-- Добавить новую вещь (только для агента: у приложения доступа нет). Возвращает id.
create or replace function public.add_new_item(
  p_kind text, p_title_ru text, p_title_en text, p_title_ar text, p_value text, p_price int)
returns text language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_id text;
  v_n int;
  v_hex text := '#[0-9A-Fa-f]{6}';
  v_patterns text := '(oranges|stars|confetti|notes|numbers|leaves|ocean|space|galaxy|dots|stripes|checks|hearts|clouds|zigzag)';
  v_animals text := '(cat-grey|cat-black|cat-white|tiger|dog|dalmatian|bunny|bunny-brown|mouse|hamster|panda|koala|lion|monkey|bear-brown|polar-bear|pig|cow|sheep|frog|penguin|chick|duck|hedgehog|fox-arctic)';
begin
  if p_kind not in ('color', 'bg', 'avatar') then raise exception 'kind: color, bg или avatar'; end if;
  if p_kind = 'color' and p_value !~ ('^' || v_hex || '$') then raise exception 'цвет: #RRGGBB'; end if;
  if p_kind = 'bg' and p_value !~ ('^(' || v_hex || '|pattern:' || v_patterns || ':' || v_hex || ')$') then
    raise exception 'фон: #RRGGBB или pattern:<узор>:#RRGGBB'; end if;
  if p_kind = 'avatar' and p_value !~ ('^a:' || v_animals || '~' || v_hex || '~' || v_hex || '$') then
    raise exception 'аватар: a:<зверёк>~#ОКРАС~#ФОН'; end if;
  if p_price not between 100 and 30000 then raise exception 'цена: от 100 до 30 000'; end if;
  if char_length(coalesce(p_title_ru, '')) not between 2 and 24
     or char_length(coalesce(p_title_en, '')) not between 2 and 30
     or char_length(coalesce(p_title_ar, '')) not between 2 and 30 then
    raise exception 'название: ru 2–24, en/ar 2–30 символов'; end if;
  if exists (select 1 from public.shop_items where lower(title_ru) = lower(p_title_ru)) then
    raise exception 'такое название уже есть: %', p_title_ru; end if;
  if exists (select 1 from public.shop_items where kind = p_kind and lower(value) = lower(p_value)) then
    raise exception 'такая вещь уже есть: %', p_value; end if;
  select count(*) into v_n from public.shop_items
   where source = 'agent' and (added_at at time zone 'Europe/Madrid')::date = current_date;
  if v_n >= 2 then raise exception 'сегодня уже добавлено 2 новинки'; end if;

  v_id := 'new-' || p_kind || '-' || to_char(current_date, 'YYYYMMDD') || '-' || (v_n + 1);
  insert into public.shop_items (id, kind, title_ru, title_en, title_ar, price, value, sort, plus_only, source, added_at)
  values (v_id, p_kind, p_title_ru, p_title_en, p_title_ar, p_price, p_value,
          1000 + (select count(*) from public.shop_items where source = 'agent')::int, false, 'agent', now());
  return v_id;
end;
$$;
revoke all on function public.add_new_item(text, text, text, text, text, int) from public, anon, authenticated;

-- Витрина дня (как в 020) + шаг 0: новинки сверху обычных мест.
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

  -- 0) новинки: добавлены за последние 3 дня до начала этого дня и ещё ни разу не были на витрине.
  --    Идут ДОПОЛНИТЕЛЬНО к обычным местам (до 4 штук).
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
    -- 1) остаются со вчера (случайные, кроме «вещи дня»)
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, y.item_id, null from public.shop_rotation y join public.shop_items i on i.id = y.item_id
      where y.day = p_day - 1 and not y.featured and i.kind = v_kind
        and not exists (select 1 from public.shop_rotation s where s.day = p_day and s.item_id = y.item_id)
      order by random() limit v_keep;
    -- 2) недавно добавленные вручную и ещё не бывавшие на витрине (до 2 за день)
    select count(*) into v_have from public.shop_rotation r join public.shop_items i on i.id = r.item_id
      where r.day = p_day and i.kind = v_kind and r.tag is distinct from 'new';
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, i.id, 'new' from public.shop_items i
      where i.kind = v_kind and i.price between 1 and 4999 and not i.plus_only and not i.exclusive
        and not public.is_default_item(i.id)
        and i.added_at > now() - interval '14 days'
        and not exists (select 1 from public.shop_rotation s where s.item_id = i.id)
      order by i.sort limit least(2, greatest(v_slots - v_have, 0));
    -- 3) остальное — случайные вещи, которых не было вчера (новинки шага 0 места не занимают)
    select count(*) into v_have from public.shop_rotation r join public.shop_items i on i.id = r.item_id
      where r.day = p_day and i.kind = v_kind
        and not (r.tag = 'new' and i.added_at >= v_day_start - interval '3 days' and i.added_at < v_day_start);
    insert into public.shop_rotation (day, item_id, tag)
      select p_day, i.id,
             case when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' end
      from public.shop_items i
      where i.kind = v_kind and i.price between 1 and 4999 and not i.plus_only and not i.exclusive
        and not public.is_default_item(i.id)
        and not exists (select 1 from public.shop_rotation s where s.day in (p_day, p_day - 1) and s.item_id = i.id)
      order by random() limit greatest(v_slots - v_have, 0);
  end loop;

  -- 4) вещь дня: дорогая (от 5 000), не та, что вчера, и не новинка, которая уже стоит сегодня
  insert into public.shop_rotation (day, item_id, tag, featured)
    select p_day, i.id,
           case when exists (select 1 from public.shop_rotation s where s.item_id = i.id) then 'back' end,
           true
    from public.shop_items i
    where i.kind in ('avatar', 'color', 'bg') and i.price >= 5000 and not i.plus_only and not i.exclusive
      and not exists (select 1 from public.shop_rotation s where s.day in (p_day, p_day - 1) and s.item_id = i.id)
    order by random()
    limit 1;
end;
$$;
revoke all on function public.ensure_shop_rotation(date) from public, anon, authenticated;
