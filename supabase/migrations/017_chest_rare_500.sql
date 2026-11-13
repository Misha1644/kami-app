-- Новые шансы сундуков: всё дороже 500 монет — редкое, шанс 0,005%.
--   Сундук за урок:      0,005% — вещь дороже 500; ~1% — вещь до 500; остальное — 1–15 монет.
--   Сундук со скинами:   0,005% — вещь дороже 500; 99,995% — вещь до 500.
create or replace function public.random_unowned_item(p_student uuid, p_legendary boolean)
returns public.shop_items language sql volatile security definer set search_path = '' as $$
  select i.* from public.shop_items i
  where i.kind in ('color', 'avatar', 'bg') and not i.plus_only and i.price > 0
    and not public.is_default_item(i.id)
    and (case when p_legendary then i.price > 500 else i.price <= 500 end)
    and not exists (select 1 from public.student_items s where s.student_id = p_student and s.item_id = i.id)
  order by random() limit 1
$$;
revoke all on function public.random_unowned_item(uuid, boolean) from public, authenticated, anon;

create or replace function public.open_chest(p_student uuid, p_type text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_st public.students;
  v_roll double precision := random();
  v_item public.shop_items;
  v_rare boolean := false;
  v_amount int;
begin
  perform public.assert_own_student(p_student);
  select * into v_st from public.students where id = p_student for update;

  if p_type = 'lesson' then
    if v_st.chests_lesson < 1 then raise exception 'no chest'; end if;
    update public.students set chests_lesson = chests_lesson - 1 where id = p_student;
    if v_roll < 0.00005 then
      v_item := public.random_unowned_item(p_student, true);
      v_rare := v_item.id is not null;
    elsif v_roll < 0.01005 then
      v_item := public.random_unowned_item(p_student, false);
    end if;
    if v_item.id is null then
      v_amount := 1 + floor(random() * 15)::int;
    end if;
  elsif p_type = 'skin' then
    if v_st.chests_skin < 1 then raise exception 'no chest'; end if;
    update public.students set chests_skin = chests_skin - 1 where id = p_student;
    if v_roll < 0.00005 then
      v_item := public.random_unowned_item(p_student, true);
      v_rare := v_item.id is not null;
    end if;
    if v_item.id is null then
      v_item := public.random_unowned_item(p_student, false);
    end if;
    if v_item.id is null then
      v_amount := 600; -- все вещи до 500 уже есть — возвращаем монеты
    end if;
  else
    raise exception 'bad chest';
  end if;

  if v_item.id is not null then
    insert into public.student_items (student_id, item_id) values (p_student, v_item.id);
  else
    update public.students set coins = coins + v_amount where id = p_student;
  end if;

  select * into v_st from public.students where id = p_student;
  return jsonb_build_object(
    'type', case when v_item.id is not null then 'item' else 'coins' end,
    'amount', v_amount,
    'item', case when v_item.id is not null then jsonb_build_object('id', v_item.id, 'kind', v_item.kind,
      'title', v_item.title_ru, 'value', v_item.value, 'price', v_item.price) end,
    'legendary', v_rare,
    'coins', v_st.coins, 'chests_lesson', v_st.chests_lesson, 'chests_skin', v_st.chests_skin);
end;
$$;
revoke all on function public.open_chest(uuid, text) from public, anon;
grant execute on function public.open_chest(uuid, text) to authenticated;
