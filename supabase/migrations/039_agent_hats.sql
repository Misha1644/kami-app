-- 039: агент новинок может добавлять головные уборы: h:<форма>~#ОСНОВНОЙ~#АКЦЕНТ
-- (не чаще одного раза в 3 дня; формы нарисованы в src/components/Kami.js → HATS)
CREATE OR REPLACE FUNCTION public.add_new_item(p_kind text, p_title_ru text, p_title_en text, p_title_ar text, p_value text, p_price integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET "TimeZone" TO 'Europe/Madrid'
AS $function$
declare
  v_id text;
  v_n int;
  v_hex text := '#[0-9A-Fa-f]{6}';
  v_patterns text := '(oranges|stars|confetti|notes|numbers|leaves|ocean|space|galaxy|dots|stripes|checks|hearts|clouds|zigzag)';
  v_animals text := '(cat-grey|cat-black|cat-white|tiger|dog|dalmatian|bunny|bunny-brown|mouse|hamster|panda|koala|lion|monkey|bear-brown|polar-bear|pig|cow|sheep|frog|penguin|chick|duck|hedgehog|fox-arctic)';
  v_hats text := '(cap|beanie|grad|party|chef|crown|tophat|beret|wizard|bow|flower|viking)';
begin
  if p_kind not in ('color', 'bg', 'avatar', 'hat') then raise exception 'kind: color, bg, avatar или hat'; end if;
  if p_kind = 'color' and p_value !~ ('^' || v_hex || '$') then raise exception 'цвет: #RRGGBB'; end if;
  if p_kind = 'bg' and p_value !~ ('^(' || v_hex || '|pattern:' || v_patterns || ':' || v_hex || ')$') then
    raise exception 'фон: #RRGGBB или pattern:<узор>:#RRGGBB'; end if;
  if p_kind = 'avatar' and p_value !~ ('^a:' || v_animals || '~' || v_hex || '~' || v_hex || '$') then
    raise exception 'аватар: a:<зверёк>~#ОКРАС~#ФОН'; end if;
  if p_kind = 'hat' and p_value !~ ('^h:' || v_hats || '~' || v_hex || '~' || v_hex || '$') then
    raise exception 'головной убор: h:<форма>~#ОСНОВНОЙ~#АКЦЕНТ, формы: cap, beanie, grad, party, chef, crown, tophat, beret, wizard, bow, flower, viking'; end if;
  if p_kind = 'hat' and exists (select 1 from public.shop_items where kind = 'hat' and source = 'agent'
                                 and added_at > now() - interval '3 days') then
    raise exception 'головной убор уже добавлялся за последние 3 дня — выбери цвет, фон или аватар'; end if;
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
$function$;
