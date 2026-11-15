-- Лига друзей на неделю (решение пользователя, 15 ноя 2026): ТОЛЬКО среди друзей, без общего рейтинга.
-- Очки недели = верные ответы с понедельника по воскресенье (по Мадриду): уроки + «Фразы для школы».
-- Видно только то же, что и в списке друзей: прозвище, аватар, цвет Ками + очки недели.
-- Награда за прошлую неделю (забрать один раз): 1-е место — сундук со скинами, 2–3-е — сундук за урок.
-- Чтобы награды нельзя было «нафармить» с пустыми аккаунтами: в лиге считаются только те,
-- у кого за неделю 10+ очков, и наградa есть, только если таких участников хотя бы двое.

create table if not exists public.league_rewards (
  student_id uuid not null references public.students(id) on delete cascade,
  week_start date not null,
  place int not null,
  claimed_at timestamptz not null default now(),
  primary key (student_id, week_start)
);
alter table public.league_rewards enable row level security; -- только через функции

-- Участники лиги: я + принятые друзья (у кого друзья включены) и их очки за неделю.
create or replace function public.league_table(p_student uuid, p_week date)
returns table (id uuid, nickname text, avatar text, kami_color text, score int, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with members as (
    select p_student as sid
    union
    select case when f.a = p_student then f.b else f.a end
      from public.friendships f
     where (f.a = p_student or f.b = p_student) and f.status = 'accepted'
  )
  select s.id, s.nickname,
         (select value from public.shop_items where id = s.avatar),
         (select value from public.shop_items where id = s.kami_color),
         coalesce((select sum(d.words_done + d.extra_words)::int from public.activity_days d
                    where d.student_id = s.id and d.day between p_week and p_week + 6), 0),
         s.id = p_student
    from members m join public.students s on s.id = m.sid
   where s.id = p_student or s.friends_enabled
$$;
revoke all on function public.league_table(uuid, date) from public, anon, authenticated;

create or replace function public.league_place(p_student uuid, p_week date)
returns jsonb language sql stable security definer set search_path = '' as $$
  with t as (select * from public.league_table(p_student, p_week) where score >= 10),
       r as (select *, rank() over (order by score desc) as place from t)
  select jsonb_build_object(
    'players', (select count(*) from t),
    'place', (select place from r where is_me),
    'score', (select score from r where is_me))
$$;
revoke all on function public.league_place(uuid, date) from public, anon, authenticated;

-- Лига на эту неделю + итог прошлой недели (и можно ли забрать награду).
create or replace function public.league_status(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_week date := date_trunc('week', current_date)::date;   -- понедельник
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
    'table', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nickname', nickname, 'avatar', avatar,
                         'kami_color', kami_color, 'score', score, 'me', is_me) order by score desc, nickname)
                       from public.league_table(p_student, v_week)), '[]'::jsonb),
    'last_week', jsonb_build_object(
      'place', v_prev->'place', 'players', v_prev->'players',
      'reward', case when (v_prev->>'players')::int >= 2 and (v_prev->>'place')::int <= 3 and not v_claimed
                     then case when (v_prev->>'place')::int = 1 then 'skin' else 'lesson' end end)
  );
end;
$$;
revoke all on function public.league_status(uuid) from public, anon;
grant execute on function public.league_status(uuid) to authenticated;

-- Забрать награду за прошлую неделю.
create or replace function public.claim_league_reward(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'Europe/Madrid' as $$
declare
  v_last date := date_trunc('week', current_date)::date - 7;
  v_prev jsonb;
  v_place int;
  v_st public.students;
begin
  perform public.assert_own_student(p_student);
  if not public.friends_allowed(p_student) then raise exception 'friends disabled'; end if;
  select * into v_st from public.students where id = p_student for update;
  if exists (select 1 from public.league_rewards where student_id = p_student and week_start = v_last) then
    raise exception 'already claimed';
  end if;
  v_prev := public.league_place(p_student, v_last);
  v_place := (v_prev->>'place')::int;
  if coalesce((v_prev->>'players')::int, 0) < 2 or v_place is null or v_place > 3 then raise exception 'no reward'; end if;
  insert into public.league_rewards (student_id, week_start, place) values (p_student, v_last, v_place);
  if v_place = 1 then
    update public.students set chests_skin = chests_skin + 1 where id = p_student returning * into v_st;
  else
    update public.students set chests_lesson = chests_lesson + 1 where id = p_student returning * into v_st;
  end if;
  return jsonb_build_object('place', v_place, 'chest', case when v_place = 1 then 'skin' else 'lesson' end,
                            'chests_skin', v_st.chests_skin, 'chests_lesson', v_st.chests_lesson);
end;
$$;
revoke all on function public.claim_league_reward(uuid) from public, anon;
grant execute on function public.claim_league_reward(uuid) to authenticated;
