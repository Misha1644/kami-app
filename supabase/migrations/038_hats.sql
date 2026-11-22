-- 038: головные уборы для Ками. По умолчанию Ками без шапки; шапки всегда в магазине.
alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check
  check (kind = any (array['freeze', 'color', 'avatar', 'bg', 'chest', 'music', 'hat']));
alter table public.students add column if not exists hat text references public.shop_items(id);

insert into public.shop_items (id, kind, title_ru, title_en, title_ar, price, value, sort) values
 ('hat-party',  'hat', 'Праздничный колпак', 'Party hat',      'قبعة الحفلة',     250,  'party',  600),
 ('hat-cap',    'hat', 'Кепка',              'Cap',            'قبعة رياضية',     300,  'cap',    601),
 ('hat-beanie', 'hat', 'Шапка с помпоном',   'Bobble hat',     'قبعة صوفية',      400,  'beanie', 602),
 ('hat-chef',   'hat', 'Колпак шефа',        'Chef''s hat',    'قبعة الطاهي',     450,  'chef',   603),
 ('hat-grad',   'hat', 'Шапочка выпускника', 'Graduation cap', 'قبعة التخرج',     600,  'grad',   604),
 ('hat-crown',  'hat', 'Корона',             'Crown',          'تاج',             5000, 'crown',  605)
on conflict (id) do nothing;

create or replace function public.equip_item(p_student uuid, p_item text)
 returns void language plpgsql security definer set search_path to '' as $function$
declare v_kind text;
begin
  perform public.assert_own_student(p_student);
  if p_item = 'music-off' then
    update public.students set music = null where id = p_student;
    return;
  end if;
  if p_item = 'hat-off' then
    update public.students set hat = null where id = p_student;
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
    music      = case when v_kind = 'music' then p_item else music end,
    hat        = case when v_kind = 'hat' then p_item else hat end
  where id = p_student;
end;
$function$;

create or replace function public.buy_item(p_student uuid, p_item text)
 returns jsonb language plpgsql security definer set search_path to '' set "TimeZone" to 'Europe/Madrid' as $function$
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
      music      = case when v_item.kind = 'music' then p_item else music end,
      hat        = case when v_item.kind = 'hat' then p_item else hat end
    where id = p_student;
  end if;
  select * into v_st from public.students where id = p_student;
  return jsonb_build_object('coins', v_st.coins, 'freezes', v_st.streak_freezes,
    'kami_color', v_st.kami_color, 'avatar', v_st.avatar, 'bg', v_st.bg, 'music', v_st.music, 'hat', v_st.hat,
    'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$function$;

-- шапка друзей в списке друзей и в лиге
create or replace function public.list_friends(p_student uuid)
 returns jsonb language plpgsql security definer set search_path to '' set "TimeZone" to 'Europe/Madrid' as $function$
begin
  perform public.assert_own_student(p_student);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'nickname', o.nickname,
      'avatar', (select value from public.shop_items where id = o.avatar),
      'kami_color', (select value from public.shop_items where id = o.kami_color),
      'hat_value', (select value from public.shop_items where id = o.hat),
      'status', case when f.status = 'pending' and f.requested_by = p_student then 'outgoing'
                     when f.status = 'pending' then 'incoming' else 'friend' end,
      'learned', case when f.status = 'accepted' then
                   (select count(*) from public.progress p where p.student_id = o.id and p.learned_at is not null) end,
      'active_today', case when f.status = 'accepted' then
                   exists (select 1 from public.activity_days d where d.student_id = o.id and d.day = current_date and d.lessons_done > 0) end
    ) order by f.status, o.nickname)
    from public.friendships f
    join public.students o on o.id = case when f.a = p_student then f.b else f.a end
    where (f.a = p_student or f.b = p_student) and f.status in ('pending', 'accepted')
      and o.friends_enabled
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.league_status(p_student uuid)
 returns jsonb language plpgsql security definer set search_path to '' set "TimeZone" to 'Europe/Madrid' as $function$
declare
  v_week date := date_trunc('week', current_date)::date;
  v_last date := v_week - 7;
  v_prev jsonb;
  v_claimed boolean;
begin
  perform public.assert_own_student(p_student);
  if not public.friends_allowed(p_student) then
    return jsonb_build_object('enabled', false);
  end if;
  v_prev := public.league_place(p_student, v_last);
  v_claimed := exists (select 1 from public.league_rewards where student_id = p_student and week_start = v_last);
  return jsonb_build_object(
    'enabled', true,
    'week_start', v_week,
    'ends_at', (v_week + 7)::timestamp at time zone 'Europe/Madrid',
    'table', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nickname', t.nickname, 'avatar', t.avatar,
                         'kami_color', t.kami_color, 'score', t.score, 'me', t.is_me,
                         'hat_value', (select i.value from public.students s join public.shop_items i on i.id = s.hat where s.id = t.id))
                         order by t.score desc, t.nickname)
                       from public.league_table(p_student, v_week) t), '[]'::jsonb),
    'last_week', jsonb_build_object(
      'place', v_prev->'place', 'players', v_prev->'players',
      'reward', case when (v_prev->>'players')::int >= 2 and (v_prev->>'place')::int <= 3 and not v_claimed
                     then case when (v_prev->>'place')::int = 1 then 'skin' else 'lesson' end end)
  );
end;
$function$;
