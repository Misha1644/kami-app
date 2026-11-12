-- Версия 0.4: свои предметы в расписании.
-- Свой предмет хранится прямо в schedule.subject_code с приставкой "x:", например "x:Robótica".
-- Ограничиваем длину, чтобы туда нельзя было записать что-то огромное.
alter table public.schedule
  add constraint schedule_subject_code_len check (char_length(subject_code) between 1 and 60);
