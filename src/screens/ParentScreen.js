// «Как дела у ребёнка» — для родителя, за родительским замком в Профиле.
// Простыми словами: занимается ли, сколько выучил, что впереди, что даётся трудно и о чём спросить ребёнка.
// Бесплатно: итог недели, серия, контрольные, вопрос для ребёнка. С Ками Плюс: трудные слова и предметы.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount, subjectByCode, plural } from '../data/content';
import { loadHardWords, loadActivity } from '../lib/api';
import { PLUS_ENABLED } from '../config';
import { daysUntil, whenText } from '../lib/exams';
import { tr } from '../i18n';

function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ParentScreen({ student, topics, learned, streakInfo, exams = [], plan, onOpenPlus, onBack }) {
  const open = plan?.plus || !PLUS_ENABLED;
  const en = !['ru', 'uk'].includes(student.native_lang);
  const [activity, setActivity] = useState(null);
  const [hard, setHard] = useState(null);

  useEffect(() => {
    loadActivity(student.id, 14).then(setActivity).catch(() => setActivity([]));
    loadHardWords(student.id).then(setHard).catch(() => setHard([]));
  }, [student.id]);

  const name = student.nickname || tr('Ребёнок');
  const byDay = Object.fromEntries((activity || []).map((a) => [a.day, a]));
  const week = (shift) => {
    let days = 0; let words = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i - shift);
      const row = byDay[isoDay(d)];
      if (row?.words > 0 || row?.lessons > 0) days += 1;
      words += row?.words || 0;
    }
    return { days, words };
  };
  const now = week(0);
  const before = week(7);
  const total = Object.keys(learned).length;

  const mood = now.days >= 4 ? 'good' : now.days >= 2 ? 'ok' : 'low';
  const verdict = {
    good: { icon: '🌟', title: tr('Всё отлично!'), text: tr('{0} занимается регулярно. Похвалите — это очень помогает.', name) },
    ok: { icon: '🙂', title: tr('Неплохо'), text: tr('{0} занимается, но не каждый день. Хватает 5 минут в день — например, по дороге в школу.', name) },
    low: { icon: '⏰', title: tr('Пора вернуться'), text: tr('На этой неделе занятий почти не было. Предложите сделать один короткий урок вместе.') },
  }[mood];

  // Где больше всего уже выучено.
  const bySubject = {};
  for (const t of topics) {
    if (t.extra) continue;
    if (!bySubject[t.subjectCode]) bySubject[t.subjectCode] = { done: 0, total: 0 };
    const s = bySubject[t.subjectCode];
    s.done += learnedCount(t, learned);
    s.total += t.words.length;
  }
  const subjects = Object.entries(bySubject).filter(([, s]) => s.total > 0).sort((a, b) => b[1].done - a[1].done).slice(0, 5);

  const nextExam = exams.filter((e) => daysUntil(e.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  const ask = hard?.[0] || null;
  const askMeaning = ask && ((en && ask.en) || ask.ru);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ {tr('Назад')}</Text></Pressable>
      <Text style={styles.h1}>{tr('Как дела у ребёнка')}</Text>
      <Text style={styles.small}>{name} · {student.grade}</Text>

      <View style={[styles.verdict, styles[`v_${mood}`]]}>
        <Text style={styles.verdictIcon}>{verdict.icon}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.verdictTitle}>{verdict.title}</Text>
          <Text style={styles.body}>{verdict.text}</Text>
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.h2}>{tr('Эта неделя')}</Text>
        <Text style={styles.body}>
          {activity == null ? tr('Загрузка…') : tr('Занятия {0} {1} из 7, повторено и выучено {2} {3}.', now.days, plural(now.days, tr('день'), tr('дня'), tr('дней')), now.words, plural(now.words, tr('слово'), tr('слова'), tr('слов')))}
        </Text>
        {activity != null && (
          <Text style={styles.small}>
            {now.days > before.days ? tr('Больше, чем на прошлой неделе ({0}) ↑', before.days)
              : now.days < before.days ? tr('Меньше, чем на прошлой неделе ({0}) ↓', before.days)
                : tr('Так же, как на прошлой неделе')}
          </Text>
        )}
        <Text style={styles.body}>🔥 {tr('Серия: {0} {1} подряд', streakInfo?.streak || 0, plural(streakInfo?.streak || 0, tr('день'), tr('дня'), tr('дней')))}</Text>
        <Text style={styles.body}>📚 {tr('Всего выучено слов: {0}', total)}</Text>
      </Card>

      {nextExam && (
        <Card style={{ gap: 6 }}>
          <Text style={styles.h2}>{tr('Скоро контрольная')}</Text>
          <Text style={styles.body}>{subjectByCode(nextExam.subject_code).es} · {whenText(daysUntil(nextExam.exam_date))}</Text>
          <Text style={styles.small}>
            {nextExam.best_score != null
              ? tr('Пробная контрольная в приложении: {0} из 10.', String(nextExam.best_score / 10).replace('.', ','))
              : tr('Пробную контрольную в приложении ещё не проходил(а) — её стоит сделать за пару дней до.')}
          </Text>
        </Card>
      )}

      {open ? (
        <>
          {ask && (
            <Card style={{ gap: 6 }}>
              <Text style={styles.h2}>{tr('Спросите за ужином')}</Text>
              <Text style={styles.body}>{tr('Как по-испански «{0}»?', askMeaning)}</Text>
              <Text style={styles.small}>{tr('Ответ: {0}. Это слово пока даётся трудно — один вопрос дома помогает запомнить.', ask.es)}</Text>
            </Card>
          )}
          {hard?.length > 1 && (
            <Card style={{ gap: 8 }}>
              <Text style={styles.h2}>{tr('Трудные слова')}</Text>
              {hard.map((w) => (
                <View key={w.es} style={styles.rowBetween}>
                  <Text style={styles.body}>{w.es}</Text>
                  <Text style={styles.small}>{(en && w.en) || w.ru}</Text>
                </View>
              ))}
            </Card>
          )}
          {subjects.length > 0 && (
            <Card style={{ gap: 8 }}>
              <Text style={styles.h2}>{tr('По предметам')}</Text>
              {subjects.map(([code, s]) => (
                <View key={code} style={styles.rowBetween}>
                  <Text style={styles.body}>{subjectByCode(code).es}</Text>
                  <Text style={styles.small}>{tr('{0} из {1} слов', s.done, s.total)}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.locked}>
          <Text style={{ fontSize: 24 }}>🔒</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.verdictTitle}>{tr('Трудные слова и предметы')}</Text>
            <Text style={styles.small}>{tr('Какие слова даются трудно, о чём спросить ребёнка и как идут дела по каждому предмету — в Ками Плюс.')}</Text>
          </View>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 26, fontWeight: '900', color: colors.text },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  verdict: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 2 },
  v_good: { backgroundColor: colors.greenLight, borderColor: colors.green },
  v_ok: { backgroundColor: '#FFFBEB', borderColor: '#F5C443' },
  v_low: { backgroundColor: colors.dangerLight, borderColor: '#F3A7A0' },
  verdictIcon: { fontSize: 34 },
  verdictTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  locked: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
});
