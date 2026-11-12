#!/usr/bin/env python3
"""Собирает всё приложение в один App.js для Expo Snack.

Snack не умеет импортировать приватный репозиторий, поэтому для просмотра
весь код склеивается в один файл: каждый модуль оборачивается в функцию,
чтобы одинаковые имена (например, styles) не конфликтовали.

Запуск:  python3 scripts/build_snack.py   → dist-snack/App.js
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Порядок важен: модуль идёт после всех, от которых зависит.
MODULES = [
    ('src/theme.js', ['colors', 'radius']),
    ('src/data/content.js', ['GRADE', 'GRADES', 'topics', 'learnedCount', 'SUBJECTS', 'subjectByCode',
                             'KAMI_COLORS', 'WEEKDAYS', 'nextSchoolDay', 'plural',
                             'CUSTOM_PREFIX', 'CUSTOM_MAX', 'customCode', 'isCustom', 'customTopics']),
    ('src/components/Kami.js', ['Kami']),
    ('src/components/icons.js', ['Flame', 'Coin', 'Snowflake']),
    ('src/components/ui.js', ['ProgressBar', 'Button', 'Card']),
    ('src/lib/supabase.js', ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'supabase']),
    ('src/lib/speech.js', ['speak', 'checkTyped']),
    ('src/lib/reminders.js', ['remindersSupported', 'remindersEnabled', 'rescheduleReminders', 'setRemindersEnabled']),
    ('src/lib/api.js', ['loadTopics', 'getStudent', 'createStudent', 'loadLearned', 'recordAnswer',
                        'loadStreak', 'loadWordsToday', 'loadShop', 'buyItem', 'equipColor',
                        'loadSchedule', 'saveScheduleDay', 'loadCustomWords', 'addCustomWord',
                        'deleteCustomWord', 'recordCustomAnswer', 'explainTask', 'completeLesson',
                        'loadPlan', 'loadHardWords', 'updateGrade', 'loadDueWords']),
    ('src/screens/AuthScreen.js', ['AuthScreen']),
    ('src/screens/StudentSetupScreen.js', ['StudentSetupScreen']),
    ('src/screens/HomeScreen.js', ['HomeScreen']),
    ('src/screens/LessonScreen.js', ['LessonScreen']),
    ('src/screens/TaskScreen.js', ['TaskScreen']),
    ('src/screens/ParentsScreen.js', ['ParentsScreen']),
    ('src/screens/ScheduleScreen.js', ['ScheduleScreen']),
    ('src/screens/ShopScreen.js', ['ShopScreen']),
    ('src/screens/WordsScreen.js', ['WordsScreen']),
    ('src/screens/PlusScreen.js', ['PlusScreen']),
    ('src/screens/TopicsScreen.js', ['TopicsScreen']),
]

# В Snack (веб) этот полифил не нужен и мешает загрузке.
SKIP_SIDE_EFFECT_IMPORTS = {'react-native-url-polyfill/auto'}


def split_imports(src):
    imports, body, lines, i = [], [], src.split('\n'), 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('import '):
            stmt = line
            while not stmt.rstrip().endswith(';'):
                i += 1
                stmt += ' ' + lines[i]
            imports.append(stmt)
        else:
            body.append(line)
        i += 1
    return imports, '\n'.join(body)


def main():
    external, aliases, side_effects = {}, {}, []

    def collect(stmt, path):
        m = re.match(r"import\s+'([^']+)';", stmt)
        if m:
            if m.group(1) not in SKIP_SIDE_EFFECT_IMPORTS:
                side_effects.append(m.group(1))
            return
        m = re.match(r"import\s+(.*?)\s+from\s+'([^']+)';", stmt)
        spec, mod = m.group(1), m.group(2)
        named = re.search(r"\{([^}]*)\}", spec)
        if mod.startswith('.'):
            # Локальный импорт: имена уже есть снаружи; переименования запоминаем.
            if named:
                for n in named.group(1).split(','):
                    parts = [p.strip() for p in n.split(' as ')]
                    if len(parts) == 2:
                        aliases.setdefault(path, []).append(parts)
            return
        entry = external.setdefault(mod, {'default': None, 'named': set(), 'ns': None})
        ns = re.match(r"^\*\s+as\s+([A-Za-z_$][\w$]*)$", spec.strip())
        if ns:
            entry['ns'] = ns.group(1)
            return
        default = re.match(r"^([A-Za-z_$][\w$]*)\s*(,|$)", spec)
        if default and not spec.startswith('{'):
            entry['default'] = default.group(1)
        if named:
            for n in named.group(1).split(','):
                if n.strip():
                    entry['named'].add(n.strip())

    blocks = []
    for path, names in MODULES:
        imports, body = split_imports(open(os.path.join(ROOT, path), encoding='utf-8').read())
        for stmt in imports:
            collect(stmt, path)
        body = re.sub(r"export default function ", "function ", body)
        body = re.sub(r"^export (async function|function|const) ", r"\1 ", body, flags=re.M)
        alias_lines = ''.join(f"const {local} = {orig};\n" for orig, local in aliases.get(path, []))
        blocks.append(
            f"// ===== {path} =====\nconst {{ {', '.join(names)} }} = (() => {{\n"
            f"{alias_lines}{body.strip()}\n  return {{ {', '.join(names)} }};\n}})();\n"
        )

    imports, app_body = split_imports(open(os.path.join(ROOT, 'App.js'), encoding='utf-8').read())
    for stmt in imports:
        collect(stmt, 'App.js')

    out = [
        '// Kami — всё приложение в одном файле для Expo Snack.',
        '// Собрано scripts/build_snack.py из репозитория. Правки делаются в репозитории, не здесь.',
    ]
    out += [f"import '{s}';" for s in side_effects]
    for mod, e in external.items():
        if e.get('ns'):
            out.append(f"import * as {e['ns']} from '{mod}';")
            if not e['default'] and not e['named']:
                continue
        parts = ([e['default']] if e['default'] else []) + (['{ ' + ', '.join(sorted(e['named'])) + ' }'] if e['named'] else [])
        out.append(f"import {', '.join(parts)} from '{mod}';")
    out.append('')
    out += blocks
    out.append('// ===== App.js =====\n' + app_body.strip() + '\n')

    os.makedirs(os.path.join(ROOT, 'dist-snack'), exist_ok=True)
    target = os.path.join(ROOT, 'dist-snack', 'App.js')
    open(target, 'w', encoding='utf-8').write('\n'.join(out))
    print('written', target)


if __name__ == '__main__':
    main()
