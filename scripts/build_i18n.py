#!/usr/bin/env python3
"""Собирает словарь интерфейса src/i18n_dict.js из content/i18n/ui.tsv (русский \t английский \t арабский).

Проверяет, что у перевода те же {0}, {1}…, что у русской строки, и показывает строки без перевода:
    python3 scripts/build_i18n.py            → собрать
    python3 scripts/build_i18n.py --missing  → только список недостающих (нужен node)
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TSV = os.path.join(ROOT, 'content/i18n/ui.tsv')

rows = {}
for n, line in enumerate(open(TSV, encoding='utf-8'), 1):
    line = line.rstrip('\n')
    if not line or line.startswith('#'):
        continue
    parts = line.split('\t')
    if len(parts) != 3:
        sys.exit(f'ui.tsv:{n}: нужно 3 колонки, а их {len(parts)}')
    ru, en, ar = (p.replace('\\n', '\n') for p in parts)
    ph = sorted(set(re.findall(r'\{\d+\}', ru)))
    for lang, t in (('en', en), ('ar', ar)):
        if sorted(set(re.findall(r'\{\d+\}', t))) != ph:
            sys.exit(f'ui.tsv:{n}: в переводе {lang} другие {{0}}: {ru!r} → {t!r}')
    rows[ru] = (en, ar)

keys = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'scripts/i18n_keys.js')]))
missing = [k for k in keys if k not in rows]
if '--missing' in sys.argv:
    print('\n'.join(missing))
    sys.exit(0)

dict_en = {k: v[0] for k, v in rows.items()}
dict_ar = {k: v[1] for k, v in rows.items()}
js = ('// Сгенерировано scripts/build_i18n.py из content/i18n/ui.tsv — не редактировать вручную.\n'
      f'export const DICT = {{\n  en: {json.dumps(dict_en, ensure_ascii=False)},\n  ar: {json.dumps(dict_ar, ensure_ascii=False)},\n}};\n')
open(os.path.join(ROOT, 'src/i18n_dict.js'), 'w', encoding='utf-8').write(js)
print(f'i18n: {len(rows)} строк, без перевода: {len(missing)}')
for k in missing[:20]:
    print('  нет перевода:', k)
