-- Арабские переводы: название темы и перевод слова (интерфейс на арабском).
alter table public.topics add column if not exists title_ar text;
alter table public.words add column if not exists ar text;
