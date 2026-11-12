#!/usr/bin/env python3
"""Собирает SQL-миграцию с контентом из content/eso_topics.py.

Запуск: python3 scripts/build_content_sql.py  → supabase/migrations/009_content_eso.sql
Вставка идемпотентна (on conflict do update), можно перезапускать после правок.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'content'))
from eso_topics import TOPICS, SUBJECT_NAMES  # noqa: E402
from eso_topics_more import MORE_TOPICS  # noqa: E402

SUBJECT_NAMES = {**SUBJECT_NAMES, 'val': 'Valencià', 'ing': 'Inglés', 'ef': 'Educación Física',
                 'mus': 'Música', 'tec': 'Tecnología', 'pla': 'Plástica', 'tut': 'Tutoría'}

# Порядок тем внутри предмета: существующие темы встраиваются в программу.
ORDER = {
    'mat-naturales': 1, 'mat-divisibilidad': 2, 'mat-enteros': 3, 'mat-fracciones': 4,
    'mat-decimales': 5, 'mat-algebra': 6, 'mat-geometria': 7,
    'bio-seres-vivos': 1, 'bio-celula': 2, 'bio-clasificacion': 3, 'bio-plantas': 4, 'bio-tierra': 5,
}


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def main(topics=TOPICS, out_name='009_content_eso.sql', start=0, header=True):
    lines = [] if not header else [
        '-- Контент 1º и 2º ESO. Сгенерировано scripts/build_content_sql.py из content/eso_topics.py.',
        '-- Требует проверки учителем.',
        '',
        "update public.topics set subject = 'Biología y Geología' where id = 'bio-celula';",
        "update public.topics set sort = 4 where id = 'mat-fracciones';",
        "update public.topics set sort = 2 where id = 'bio-celula';",
        '',
    ]
    seen_words = set()
    topic_rows, word_rows = [], []
    for i, (tid, grade, code, title, ru, en, words) in enumerate(topics):
        sort = ORDER.get(tid, 100 + start + i)
        topic_rows.append(f'({q(tid)},{q(grade)},{q(SUBJECT_NAMES[code])},{q(code)},{q(title)},{q(ru)},{q(en)},{sort})')
        for n, (es, w_ru, w_en, teacher) in enumerate(words, start=1):
            wid = f'{tid}-{n}'
            assert wid not in seen_words, wid
            seen_words.add(wid)
            word_rows.append(f'({q(wid)},{q(tid)},{q(es)},{q(w_ru)},{q(w_en)},{q(teacher)},{n})')
    lines.append('insert into public.topics (id,grade,subject,subject_code,title,title_ru,title_en,sort) values\n'
                 + ',\n'.join(topic_rows)
                 + '\non conflict (id) do update set grade=excluded.grade, subject=excluded.subject, '
                   'subject_code=excluded.subject_code, title=excluded.title, title_ru=excluded.title_ru, '
                   'title_en=excluded.title_en, sort=excluded.sort;')
    lines.append('insert into public.words (id,topic_id,es,ru,en,teacher,sort) values\n'
                 + ',\n'.join(word_rows)
                 + '\non conflict (id) do update set es=excluded.es, ru=excluded.ru, en=excluded.en, '
                   'teacher=excluded.teacher, sort=excluded.sort;')
    out = os.path.join(ROOT, 'supabase', 'migrations', out_name)
    open(out, 'w', encoding='utf-8').write('\n'.join(lines))
    print('written', out, '| topics:', len(topics), '| words:', len(seen_words))


if __name__ == '__main__':
    main()
    main(MORE_TOPICS, '011_content_all_subjects.sql', start=len(TOPICS), header=False)
