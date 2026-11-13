#!/usr/bin/env python3
"""Генерирует supabase/migrations/025_content_primaria.sql из content/primaria_topics.py."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'content'))
from primaria_topics import TOPICS_PRIMARIA, PRIMARIA_SUBJECTS  # noqa: E402

data = [[tid, grade, code, PRIMARIA_SUBJECTS[code], t, ru, en, [list(w) for w in words]]
        for tid, grade, code, t, ru, en, words in TOPICS_PRIMARIA]
js = json.dumps(data, ensure_ascii=False).replace("'", "''")
sql = f"""-- Контент Primaria 1º–6º. Сгенерировано scripts/build_primaria_sql.py.
with d as (select value v, ordinality o from jsonb_array_elements('{js}'::jsonb) with ordinality),
t as (insert into public.topics (id,grade,subject,subject_code,title,title_ru,title_en,sort)
  select v->>0, v->>1, v->>3, v->>2, v->>4, v->>5, v->>6, 200 + o from d
  on conflict (id) do update set grade=excluded.grade, subject=excluded.subject, subject_code=excluded.subject_code,
    title=excluded.title, title_ru=excluded.title_ru, title_en=excluded.title_en, sort=excluded.sort
  returning id)
insert into public.words (id,topic_id,es,ru,en,teacher,sort)
select (d.v->>0) || '-' || w.o, d.v->>0, w.x->>0, w.x->>1, w.x->>2, w.x->>3, w.o
from d, jsonb_array_elements(d.v->7) with ordinality w(x, o)
where exists (select 1 from t where t.id = d.v->>0)
on conflict (id) do update set es=excluded.es, ru=excluded.ru, en=excluded.en, teacher=excluded.teacher, sort=excluded.sort;
"""
open(os.path.join(ROOT, 'supabase/migrations/025_content_primaria.sql'), 'w', encoding='utf-8').write(sql)
print(len(data), 'topics,', sum(len(x[7]) for x in data), 'words,', len(sql), 'bytes')
