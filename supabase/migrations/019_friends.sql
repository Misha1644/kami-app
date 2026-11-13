-- Друзья (безопасный вариант для детей):
--   • добавить можно только по коду друга (поиска по имени нет);
--   • заявку нужно подтвердить; удалить или заблокировать — в один клик;
--   • общение — только готовыми реакциями из списка (без свободного текста);
--   • родитель может выключить друзей (students.friends_enabled);
--   • друзья видят только: имя/прозвище, аватар, цвет Ками, выучено слов, занимался ли сегодня.

alter table public.students add column if not exists friend_code text unique;
alter table public.students add column if not exists friends_enabled boolean not null default true;
grant update (friends_enabled) on public.students to authenticated;

create table if not exists public.friendships (
  a uuid not null references public.students(id) on delete cascade,   -- меньший id
  b uuid not null references public.students(id) on delete cascade,   -- больший id
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  requested_by uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.friendships enable row level security;  -- прямого доступа нет, только функции

create table if not exists public.friend_cheers (
  id bigint generated always as identity primary key,
  from_student uuid not null references public.students(id) on delete cascade,
  to_student uuid not null references public.students(id) on delete cascade,
  cheer text not null check (cheer in ('hola', 'animo', 'bravo', 'fuego', 'genial', 'vamos', 'gracias', 'chocala')),
  created_at timestamptz not null default now(),
  seen boolean not null default false
);
create index if not exists friend_cheers_to on public.friend_cheers (to_student, created_at desc);
alter table public.friend_cheers enable row level security;  -- прямого доступа нет, только функции

-- Код друга: 6 символов без похожих букв (0/O, 1/I).
create or replace function public.my_friend_code(p_student uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_try int := 0;
begin
  perform public.assert_own_student(p_student);
  select friend_code into v_code from public.students where id = p_student;
  while v_code is null loop
    v_try := v_try + 1;
    v_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
               from generate_series(1, 6));
    begin
      update public.students set friend_code = v_code where id = p_student;
    exception when unique_violation then
      v_code := null;
      if v_try > 10 then raise exception 'code failed'; end if;
    end;
  end loop;
  return v_code;
end;
$$;

create or replace function public.friends_allowed(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select friends_enabled from public.students where id = p_student), false)
$$;

-- Отправить заявку по коду.
create or replace function public.add_friend(p_student uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_other uuid; v_a uuid; v_b uuid; v_row public.friendships; v_today int;
begin
  perform public.assert_own_student(p_student);
  if not public.friends_allowed(p_student) then raise exception 'friends disabled'; end if;
  -- не больше 10 заявок в день (защита от перебора кодов)
  select count(*) into v_today from public.friendships
    where requested_by = p_student and created_at > now() - interval '1 day';
  if v_today >= 10 then raise exception 'too many'; end if;

  select id into v_other from public.students where friend_code = upper(trim(p_code));
  if v_other is null or not public.friends_allowed(v_other) then raise exception 'not found'; end if;
  if v_other = p_student then raise exception 'self'; end if;
  v_a := least(p_student, v_other); v_b := greatest(p_student, v_other);

  select * into v_row from public.friendships where a = v_a and b = v_b;
  if found then
    if v_row.status = 'blocked' then raise exception 'not found'; end if;     -- не выдаём, что заблокирован
    if v_row.status = 'accepted' then raise exception 'already'; end if;
    if v_row.requested_by <> p_student then                                 -- встречная заявка = дружба
      update public.friendships set status = 'accepted' where a = v_a and b = v_b;
      return jsonb_build_object('status', 'accepted');
    end if;
    raise exception 'already';
  end if;
  insert into public.friendships (a, b, status, requested_by) values (v_a, v_b, 'pending', p_student);
  return jsonb_build_object('status', 'pending');
end;
$$;

-- Принять / отклонить заявку, удалить или заблокировать друга.
--   p_action: 'accept' | 'decline' | 'remove' | 'block'
create or replace function public.friend_action(p_student uuid, p_other uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_a uuid := least(p_student, p_other); v_b uuid := greatest(p_student, p_other); v_row public.friendships;
begin
  perform public.assert_own_student(p_student);
  select * into v_row from public.friendships where a = v_a and b = v_b;
  if p_action = 'block' then
    insert into public.friendships (a, b, status, requested_by) values (v_a, v_b, 'blocked', p_student)
      on conflict (a, b) do update set status = 'blocked', requested_by = p_student;
    delete from public.friend_cheers where (from_student = p_other and to_student = p_student);
    return;
  end if;
  if not found then raise exception 'not found'; end if;
  if p_action = 'accept' then
    if v_row.status <> 'pending' or v_row.requested_by = p_student then raise exception 'not found'; end if;
    update public.friendships set status = 'accepted' where a = v_a and b = v_b;
  elsif p_action in ('decline', 'remove') then
    if v_row.status = 'blocked' and v_row.requested_by <> p_student then raise exception 'not found'; end if;
    delete from public.friendships where a = v_a and b = v_b;
  else
    raise exception 'bad action';
  end if;
end;
$$;

-- Список: друзья, входящие и исходящие заявки. Только безопасные поля.
create or replace function public.list_friends(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
begin
  perform public.assert_own_student(p_student);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'nickname', o.nickname,
      'avatar', (select value from public.shop_items where id = o.avatar),
      'kami_color', (select value from public.shop_items where id = o.kami_color),
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
$$;

-- Отправить реакцию другу (только из списка; не больше 10 одному другу в день).
create or replace function public.send_cheer(p_student uuid, p_friend uuid, p_cheer text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform public.assert_own_student(p_student);
  if not public.friends_allowed(p_student) or not public.friends_allowed(p_friend) then raise exception 'friends disabled'; end if;
  if not exists (select 1 from public.friendships where a = least(p_student, p_friend) and b = greatest(p_student, p_friend) and status = 'accepted') then
    raise exception 'not friends';
  end if;
  select count(*) into v_n from public.friend_cheers
    where from_student = p_student and to_student = p_friend and created_at > now() - interval '1 day';
  if v_n >= 10 then raise exception 'too many'; end if;
  insert into public.friend_cheers (from_student, to_student, cheer) values (p_student, p_friend, p_cheer);
end;
$$;

-- Полученные реакции за 7 дней (от тех, кто сейчас в друзьях). p_mark_seen — отметить прочитанными.
create or replace function public.my_cheers(p_student uuid, p_mark_seen boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.assert_own_student(p_student);
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'from', s.nickname,
           'avatar', (select value from public.shop_items where id = s.avatar),
           'cheer', c.cheer, 'at', c.created_at, 'seen', c.seen) order by c.created_at desc), '[]'::jsonb)
    into v
    from public.friend_cheers c join public.students s on s.id = c.from_student
    where c.to_student = p_student and c.created_at > now() - interval '7 days'
      and exists (select 1 from public.friendships f where f.a = least(c.from_student, p_student)
                  and f.b = greatest(c.from_student, p_student) and f.status = 'accepted');
  if p_mark_seen then update public.friend_cheers set seen = true where to_student = p_student and not seen; end if;
  return v;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['my_friend_code(uuid)', 'add_friend(uuid, text)', 'friend_action(uuid, uuid, text)',
                           'list_friends(uuid)', 'send_cheer(uuid, uuid, text)', 'my_cheers(uuid, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  execute 'revoke all on function public.friends_allowed(uuid) from public, anon, authenticated';
end $$;
