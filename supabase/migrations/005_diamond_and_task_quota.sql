-- Версия 0.6: самый дорогой предмет в магазине и лимит разборов заданий по фото/файлу.

insert into public.shop_items (id, kind, title_ru, price, value, sort)
values ('color-diamond', 'color', 'Алмазный Ками', 100000, '#7FD6E8', 20);

-- Каждый разбор фото стоит денег (запрос к ИИ), поэтому — не больше 15 в день на ученика.
-- Сами фото и файлы нигде не сохраняются: функция обрабатывает их и забывает.
create table public.task_requests (
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index task_requests_student_idx on public.task_requests(student_id, created_at);
alter table public.task_requests enable row level security;
-- Политик нет: таблица доступна только функции ниже.

create or replace function public.use_task_quota(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_limit int := 15;
begin
  perform public.assert_own_student(p_student);
  select count(*) into v_used from public.task_requests
   where student_id = p_student and created_at >= date_trunc('day', now());
  if v_used >= v_limit then
    return jsonb_build_object('ok', false, 'left', 0);
  end if;
  insert into public.task_requests (student_id) values (p_student);
  return jsonb_build_object('ok', true, 'left', v_limit - v_used - 1);
end; $$;

revoke execute on function public.use_task_quota(uuid) from public, anon;
grant execute on function public.use_task_quota(uuid) to authenticated;
