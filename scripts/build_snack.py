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
    ('src/i18n_dict.js', ['DICT']),
    ('src/i18n.js', ['UI_LANGS', 'uiLangFor', 'deviceLang', 'getLang', 'isRTL', 'setLang', 'tr']),
    ('src/config.js', ['PLUS_ENABLED', 'PAYMENTS_ENABLED', 'TRIAL_DAYS', 'SUPPORT_EMAIL', 'PRIVACY_UPDATED']),
    ('src/data/privacy.js', ['PRIVACY']),
    ('src/data/kami.js', ['greeting', 'kamiSays', 'kamiFact']),
    ('src/data/teachers.js', ['TEACHERS', 'KAMI_TEACHER', 'teacherFor', 'pickLine']),
    ('src/data/facts.js', ['FACTS', 'DATED', 'dayKey', 'factOfDay']),
    ('src/data/content.js', ['GRADE', 'GRADES', 'isPrimaria', 'setGradeContext', 'subjectsForGrade', 'topics', 'learnedCount', 'SUBJECTS', 'subjectByCode',
                             'KAMI_COLORS', 'WEEKDAYS', 'nextSchoolDay', 'plural',
                             'CUSTOM_PREFIX', 'CUSTOM_MAX', 'customCode', 'isCustom', 'customTopics']),
    ('src/components/Kami.js', ['Kami']),
    ('src/components/Teacher.js', ['Teacher']),
    ('src/components/Animals.js', ['ANIMALS', 'AnimalFace']),
    ('src/components/TabIcons.js', ['TabIcon']),
    ('src/components/Background.js', ['parseBg', 'PatternLayer', 'BgSwatch']),
    ('src/components/Chest.js', ['Chest']),
    ('src/components/icons.js', ['Flame', 'Coin', 'Snowflake']),
    ('src/components/ui.js', ['ProgressBar', 'Button', 'Card']),
    ('src/components/ErrorBoundary.js', ['ErrorBoundary']),
    ('src/components/ParentalGate.js', ['ParentalGate']),
    ('src/lib/supabase.js', ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'supabase']),
    ('src/lib/speech.js', ['setVoiceSlow', 'speak', 'checkTyped', 'checkSpoken', 'phraseTokens', 'tokenKey']),
    ('src/lib/exams.js', ['daysUntil', 'whenText', 'examWords', 'todayTask', 'isDoneToday', 'markDoneToday', 'isoDay']),
    ('src/lib/prefs.js', ['DEFAULT_PREFS', 'loadPrefs', 'savePrefs']),
    ('src/lib/voice.js', ['useVoiceRecorder', 'canAutoCheck', 'recognizeOnce']),
    ('src/components/FactCard.js', ['FactCard']),
    ('src/lib/reminders.js', ['remindersSupported', 'remindersEnabled', 'rescheduleReminders', 'setRemindersEnabled']),
    ('src/lib/api.js', ['loadTopics', 'getStudent', 'createStudent', 'loadLearned', 'recordAnswer',
                        'loadStreak', 'loadWordsToday', 'loadShop', 'buyItem', 'equipColor',
                        'loadSchedule', 'saveScheduleDay', 'loadCustomWords', 'addCustomWord',
                        'deleteCustomWord', 'recordCustomAnswer', 'explainTask', 'completeLesson',
                        'loadPlan', 'loadHardWords', 'updateGrade', 'loadDueWords',
                        'langFor', 'taskHelpAvailable', 'deleteAccount', 'startTrial', 'equipItem',
                        'updateStudent', 'loadActivity', 'openChest',
                        'CHEERS', 'myFriendCode', 'addFriend', 'friendAction', 'listFriends', 'sendCheer',
                        'myCheers', 'setFriendsEnabled', 'loadExams', 'createExam', 'deleteExam', 'saveExamScore',
                        'loadWeeklyEmail', 'setWeeklyEmail', 'loadRewards', 'claimDailyReward', 'claimStreakReward']),
    ('src/screens/PrivacyScreen.js', ['PrivacyScreen']),
    ('src/screens/AuthScreen.js', ['AuthScreen']),
    ('src/screens/StudentSetupScreen.js', ['StudentSetupScreen']),
    ('src/components/Rewards.js', ['DAILY', 'streakReward', 'milestones', 'claimableStreak', 'rewardText', 'DailyRewardModal']),
    ('src/screens/HomeScreen.js', ['HomeScreen']),
    ('src/screens/LessonScreen.js', ['LessonScreen']),
    ('src/screens/TaskScreen.js', ['TaskScreen']),
    ('src/components/UserAvatar.js', ['UserAvatar', 'PersonIcon']),
    ('src/screens/ProgressScreen.js', ['ProgressScreen']),
    ('src/screens/ProfileScreen.js', ['ProfileScreen']),
    ('src/components/RewardReveal.js', ['RewardReveal']),
    ('src/screens/StreakRewardsScreen.js', ['StreakRewardsScreen']),
    ('src/screens/ChestScreen.js', ['ChestScreen']),
    ('src/screens/FriendsScreen.js', ['FriendsScreen']),
    ('src/screens/ExamScreen.js', ['ExamScreen']),
    ('src/screens/ScheduleScreen.js', ['ScheduleScreen']),
    ('src/screens/ShopScreen.js', ['ShopScreen']),
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
        body = re.sub(r"export default class ", "class ", body)
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
