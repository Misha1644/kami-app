// «Успехи» — для ученика и для родителя (вход в тот же аккаунт со своего телефона).
// Бесплатно: серия, слова, цель дня. С Ками Плюс: предметы, активность за 2 недели, трудные слова.
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Card, ProgressBar } from '../components/ui';
import { Flame } from '../components/icons';
import { colors, radius } from '../theme';
import { learnedCount, subjectByCode } from '../data/content';
import { loadHardWords, loadActivity } from '../lib/api';
import { PLUS_ENABLED } from '../config';
import Teacher from '../components/Teacher';
import { teacherFor } from '../data/teachers';
import { daysUntil, whenText } from '../lib/exams';
import { tr } from '../i18n';

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function Locked({ title, text, plan, onOpenPlus }) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.locked}>
      <Text style={styles.lockIcon}>🔒</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.lockTitle}>{title}</Text>
        <Text style={styles.small}>{text}</Text>
        <Text style={styles.lockCta}>{plan.trialUsed ? tr('Открыть с Ками Плюс ›') : tr('Попробовать 3 дня бесплатно ›')}</Text>
      </View>
    </Pressable>
  );
}

export default function ProgressScreen({
  topics, exams = [], student, learned, streakInfo, wordsToday, plan, kamiColor, onOpenPlus, refreshing, onRefresh,
}) {
  const open = plan.plus || !PLUS_ENABLED;
  const en = !['ru', 'uk'].includes(student.native_lang);
  const [hard, setHard] = useState(null);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    if (!open) return;
    loadHardWords(student.id).then(setHard).catch(() => setHard([]));
    loadActivity(student.id, 14).then(setActivity).catch(() => setActivity([]));
  }, [open, student.id, refreshing]);

  const totalLearned = Object.keys(learned).length;
  const goal = student.daily_goal || 10;

  // Готовность по предметам: выучено / всего слов.
  const bySubject = {};
  for (const t of topics) {
    if (!bySubject[t.subjectCode]) bySubject[t.subjectCode] = { done: 0, total: 0, topics: 0, ready: 0 };
    const s = bySubject[t.subjectCode];
    const d = learnedCount(t, learned);
    s.done += d;
    s.total += t.words.length;
    s.topics += 1;
    if (d === t.words.length && t.words.length) s.ready += 1;
  }
  const subjects = Object.entries(bySubject).filter(([, s]) => s.total > 0).sort((a, b) => b[1].done / b[1].total - a[1].done / a[1].total);

  // Две недели по дням.
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const row = activity?.find((a) => a.day === key);
    days.push({ key, wd: tr(WD[d.getDay()]), words: row?.words || 0, lessons: row?.lessons || 0 });
  }
  const maxWords = Math.max(goal, ...days.map((d) => d.words));
  const activeDays = days.filter((d) => d.lessons > 0).length;
  const weekWords = days.slice(7).reduce((n, d) => n + d.words, 0);

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      <View>
        <Text style={styles.h1}>{tr('Успехи')}</Text>
        <Text style={styles.small}>{student.nickname} · {student.grade}</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Flame size={20} color={streakInfo.today_done ? '#E8833A' : '#A3ABB5'} />
            <Text style={styles.statValue}>{streakInfo.streak}</Text>
          </View>
          <Text style={styles.small}>{streakInfo.today_done ? tr('дней подряд') : tr('сегодня ещё нет урока')}</Text>
        </Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{totalLearned}</Text><Text style={styles.small}>{tr('слов выучено')}</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{Math.min(wordsToday, goal)}/{goal}</Text><Text style={styles.small}>{tr('цель на сегодня')}</Text></Card>
      </View>

      {exams.length > 0 && (
        <>
          <Text style={styles.h2}>{tr('Контрольные')}</Text>
          <Card style={{ gap: 10 }}>
            {exams.map((e) => (
              <View key={e.id} style={styles.rowBetween}>
                <Text style={styles.body}>
                  {subjectByCode(e.subject_code).es} · {daysUntil(e.exam_date) >= 0 ? whenText(daysUntil(e.exam_date)) : e.exam_date.split('-').reverse().slice(0, 2).join('.')}
                </Text>
                <Text style={styles.small}>
                  {e.best_score != null ? tr('пробная: {0}', String(e.best_score / 10).replace('.', ',')) : tr('пробной ещё не было')}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <Text style={styles.h2}>{tr('Последние 2 недели')}</Text>
      {open ? (
        <Card style={{ gap: 10 }}>
          <View style={styles.chart}>
            {days.map((d) => (
              <View key={d.key} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(d.words ? 6 : 0, (d.words / maxWords) * 100)}%` }, d.words >= goal && styles.barGoal]} />
                </View>
                <Text style={[styles.barLabel, d.lessons > 0 && { color: colors.greenDark, fontWeight: '700' }]}>{d.wd}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.small}>{tr('Занимался {0} из 14 дней · за эту неделю {1} слов. Зелёный столбик — цель дня выполнена.', activeDays, weekWords)}</Text>
        </Card>
      ) : (
        <Locked plan={plan} onOpenPlus={onOpenPlus} title={tr('Активность по дням')} text={tr('Сколько слов и уроков было в каждый из последних 14 дней.')} />
      )}

      <Text style={styles.h2}>{tr('Предметы')}</Text>
      {open ? (
        <Card style={{ gap: 12 }}>
          {subjects.map(([code, s]) => (
            <View key={code} style={styles.subjRow}>
              <Teacher teacher={teacherFor(code)} size={36} kamiColor={kamiColor} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.body} numberOfLines={1}>{subjectByCode(code).es}</Text>
                  <Text style={styles.small}>{s.done}/{s.total}</Text>
                </View>
                <ProgressBar value={s.done / s.total} />
                <Text style={styles.small}>{tr('Тем готово: {0} из {1}', s.ready, s.topics)}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Locked plan={plan} onOpenPlus={onOpenPlus} title={tr('Готовность по предметам')} text={tr('Сколько слов выучено по каждому предмету и какие темы готовы к уроку.')} />
      )}

      <Text style={styles.h2}>{tr('Трудные слова')}</Text>
      {open ? (
        <Card style={{ paddingVertical: 4 }}>
          {hard === null && <Text style={[styles.small, { paddingVertical: 12 }]}>{tr('Загружаем…')}</Text>}
          {hard?.length === 0 && <Text style={[styles.small, { paddingVertical: 12 }]}>{tr('Ошибок пока нет — отлично!')}</Text>}
          {hard?.map((w, i) => (
            <View key={`${w.es}-${i}`} style={[styles.rowBetween, styles.hardRow, i < hard.length - 1 && styles.rowBorder]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{w.es}</Text>
                <Text style={styles.small}>{en ? ((student.native_lang === 'ar' && w.ar) || w.en || w.ru) : w.ru}</Text>
              </View>
              <Text style={styles.mistakes}>{tr('ошибок: {0}', w.wrong)}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Locked plan={plan} onOpenPlus={onOpenPlus} title={tr('Трудные слова')} text={tr('Слова, в которых чаще всего ошибки, — чтобы повторить их вместе.')} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 14, paddingHorizontal: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.track, borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: '#9BD3B5', borderRadius: 4 },
  barGoal: { backgroundColor: colors.greenBar },
  barLabel: { fontSize: 10, color: colors.muted },
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hardRow: { paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  mistakes: { fontSize: 13, fontWeight: '700', color: colors.orangeText },
  locked: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#D9C8F5', backgroundColor: '#F7F2FD', alignItems: 'flex-start' },
  lockIcon: { fontSize: 22 },
  lockTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  lockCta: { fontSize: 14, fontWeight: '800', color: '#6B3FB8', marginTop: 4 },
});
