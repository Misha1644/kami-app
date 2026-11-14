-- Музыка в магазине (решение пользователя, 14 ноя 2026).
-- Треки — оригинальные 8-битные мелодии, сочинённые для Ками (scripts/make_music.py → assets/music/*.m4a),
-- чужих авторских прав нет. value = имя файла трека.
-- Купленный трек играет в меню (на уроках — тишина). «Тема Ками» — бесплатная.
-- Музыка всегда в продаже (не участвует в витрине дня) и не выпадает из сундуков.

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check
  check (kind in ('freeze', 'color', 'avatar', 'bg', 'chest', 'music'));

alter table public.students add column if not exists music text; -- выбранный трек (null — без музыки)

insert into public.shop_items (id, kind, title_ru, title_en, title_ar, price, value, sort, plus_only, exclusive) values
  ('music-kami',       'music', 'Тема Ками',              'Kami Theme',             'لحن كامي',             0,    'kami-theme',       500, false, false),
  ('music-recess',     'music', 'Перемена',               'Recess',                 'الاستراحة',            200,  'recess',           501, false, false),
  ('music-orange',     'music', 'Апельсиновый бульвар',   'Orange Boulevard',       'شارع البرتقال',        300,  'orange-boulevard', 502, false, false),
  ('music-malvarrosa', 'music', 'Пляж Мальварроса',       'Malvarrosa Beach',       'شاطئ مالفاروسا',       350,  'malvarrosa',       503, false, false),
  ('music-space',      'music', 'Космическое повторение', 'Space Review',           'مراجعة فضائية',        450,  'space-review',     504, false, false),
  ('music-fallas',     'music', 'Фальяс',                 'Fallas',                 'فاياس',                5000, 'fallas',           505, false, false)
on conflict (id) do update set kind = excluded.kind, title_ru = excluded.title_ru, title_en = excluded.title_en,
  title_ar = excluded.title_ar, price = excluded.price, value = excluded.value, sort = excluded.sort;

create or replace function public.is_default_item(p_item text)
returns boolean language sql immutable set search_path = '' as $$
  select p_item in ('color-green', 'avatar-person', 'bg-default', 'music-kami')
$$;

-- Надеть вещь / включить трек. p_item = 'music-off' — выключить музыку.
create or replace function public.equip_item(p_student uuid, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_kind text;
begin
  perform public.assert_own_student(p_student);
  if p_item = 'music-off' then
    update public.students set music = null where id = p_student;
    return;
  end if;
  select kind into v_kind from public.shop_items where id = p_item;
  if v_kind is null or v_kind in ('freeze', 'chest') then raise exception 'item not found'; end if;
  if not public.is_default_item(p_item) and not exists (
      select 1 from public.student_items where student_id = p_student and item_id = p_item) then
    raise exception 'not owned';
  end if;
  update public.students set
    kami_color = case when v_kind = 'color' then p_item else kami_color end,
    avatar     = case when v_kind = 'avatar' then p_item else avatar end,
    bg         = case when v_kind = 'bg' then p_item else bg end,
    music      = case when v_kind = 'music' then p_item else music end
  where id = p_student;
end;
$$;

-- Покупка (как в 027) + музыка: сразу включается.
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
  if v_item.exclusive then raise exception 'not for sale'; end if;
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
  if v_item.kind = 'freeze' and v_st.streak_freezes >= 5 then raise exception 'max freezes'; end if;
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
      bg         = case when v_item.kind = 'bg' then p_item else bg end,
      music      = case when v_item.kind = 'music' then p_item else music end
    where id = p_student;
  end if;
  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
    'kami_color', v_st.kami_color, 'avatar', v_st.avatar, 'bg', v_st.bg, 'music', v_st.music,
    'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$$;
