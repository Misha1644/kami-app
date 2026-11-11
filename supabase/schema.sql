-- Схема базы данных Kami для Supabase (Postgres).
-- Запускается один раз в Supabase → SQL Editor.
--
-- Принципы:
-- 1. Аккаунт заводит РОДИТЕЛЬ (auth.users). Ребёнок — профиль внутри аккаунта родителя.
--    О ребёнке храним минимум: псевдоним, класс, родной язык. Без фамилии, фото, даты рождения.
-- 2. Учебный контент (темы, слова) общий для всех и только читается из приложения.
-- 3. Прогресс хранится строкой «ученик × слово» и обновляется на месте —
--    таблица растёт с числом выученных слов, а не с числом попыток, поэтому не тормозит.
-- 4. Row Level Security: родитель видит только своих детей и их прогресс.

-- Учебный контент ------------------------------------------------------------

create table public.topics (
  id          text primary key,              -- например 'mat-fracciones'
  grade       text not null,                 -- '1º ESO'
  subject     text not null,                 -- 'Matemáticas'
  title       text not null,                 -- 'las fracciones'
  title_ru    text,
  title_en    text,
  sort        int  not null default 0
);

create table public.words (
  id          text primary key,              -- например 'w-denominador'
  topic_id    text not null references public.topics(id) on delete cascade,
  es          text not null,
  ru          text,
  en          text,
  uk          text,
  ar          text,
  teacher     text,                          -- фраза, как её скажет учитель
  sort        int  not null default 0
);
create index words_topic_idx on public.words(topic_id, sort);

-- Ученики и прогресс ---------------------------------------------------------

create table public.students (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 30),
  grade       text not null,
  native_lang text not null default 'ru' check (native_lang in ('ru','en','uk','ar')),
  created_at  timestamptz not null default now()
);
create index students_parent_idx on public.students(parent_id);

create table public.progress (
  student_id    uuid not null references public.students(id) on delete cascade,
  word_id       text not null references public.words(id) on delete cascade,
  correct_count int  not null default 0,
  wrong_count   int  not null default 0,
  learned_at    timestamptz,
  last_seen     timestamptz not null default now(),
  primary key (student_id, word_id)
);

-- Дни занятий: для серии «N дней подряд» и отчёта родителям.
create table public.activity_days (
  student_id uuid not null references public.students(id) on delete cascade,
  day        date not null,
  words_done int  not null default 0,
  primary key (student_id, day)
);

-- Права доступа --------------------------------------------------------------

alter table public.topics        enable row level security;
alter table public.words         enable row level security;
alter table public.students      enable row level security;
alter table public.progress      enable row level security;
alter table public.activity_days enable row level security;

create policy "content readable" on public.topics for select to authenticated using (true);
create policy "content readable" on public.words  for select to authenticated using (true);

create policy "parent owns students" on public.students
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "parent owns progress" on public.progress
  for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid()));

create policy "parent owns activity" on public.activity_days
  for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid()));
