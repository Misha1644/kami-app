// Главная: серия, монеты, цель дня и подготовка к следующему учебному дню по расписанию.
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Flame, Coin, Snowflake } from '../components/icons';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount, nextSchoolDay, subjectByCode, plural } from '../data/content';

const DAY_LETTERS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HomeScreen({
  topics, student, kamiColor, learned, streakInfo, wordsToday, goalBanner, schedule,
  onStartTopic, onOpenTask, onOpenSchedule, onOpenWords,
}) {
  const next = nextSchoolDay();
  const codes = schedule[next.weekday] || [];
  const hasSchedule = Object.values(schedule).some((d) => d.length);
  const goal = student.daily_goal || 10;
  const goalDone = wordsToday >= goal;

  // Уникальные предметы следующего дня в порядке уроков.
  const subjects = [...new Set(codes)];
  const topicsFor = (code) => topics.filter((t) => t.subjectCode === code);
  const allCodes = [...new Set(topics.map((t) => t.subjectCode))];
  const shownCodes = hasSchedule ? subjects : allCodes;
  const shownTopics = shownCodes.flatMap(topicsFor);
  const firstUnfinished = shownTopics.find((t) => learnedCount(t, learned) < t.words.length) || shownTopics[0];

  let bubble;
  if (!hasSchedule) bubble = 'Заполни расписание, и я буду готовить тебя к нужным урокам.';
  else if (!subjects.length) bubble = `${next.label} уроков нет в расписании. Можно повторить слова!`;
  else bubble = `${next.label}: ${subjects.map((c) => subjectByCode(c).es).join(', ')}. Подготовимся?`;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>Hola, {student.nickname}!</Text>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: colors.orangeLight }]}>
            <Flame size={16} />
            <Text style={[styles.chipText, { color: colors.orangeText }]}>{streakInfo.streak}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: '#FBF1D6' }]}>
            <Coin size={16} />
            <Text style={[styles.chipText, { color: '#7A5200' }]}>{student.coins}</Text>
          </View>
        </View>
      </View>

      {!!goalBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{goalBanner}</Text>
        </View>
      )}

      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>
            {streakInfo.streak > 0
              ? `${streakInfo.streak} ${plural(streakInfo.streak, 'день', 'дня', 'дней')} подряд`
              : 'Начни серию сегодня'}
          </Text>
          {streakInfo.freezes > 0 && (
            <View style={styles.freezeChip}>
              <Snowflake size={14} />
              <Text style={styles.freezeText}>{streakInfo.freezes}</Text>
            </View>
          )}
        </View>
        <View style={styles.week}>
          {streakInfo.week.map((d, i) => {
            const date = new Date(d.day + 'T12:00:00');
            const isToday = i === streakInfo.week.length - 1;
            return (
              <View key={d.day} style={styles.dayCol}>
                <Text style={[styles.dayLetter, isToday && { color: colors.text, fontWeight: '700' }]}>
                  {DAY_LETTERS[date.getDay()]}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    d.status === 'done' && styles.dayDone,
                    d.status === 'frozen' && styles.dayFrozen,
                    isToday && d.status === 'none' && styles.dayToday,
                  ]}
                >
                  {d.status === 'done' && <Flame size={14} color="#FFFFFF" />}
                  {d.status === 'frozen' && <Snowflake size={12} color="#FFFFFF" />}
                </View>
              </View>
            );
          })}
        </View>
        {!!streakInfo.used_freezes && (
          <Text style={styles.small}>
            Заморозка спасла твою серию: {streakInfo.used_freezes} {plural(streakInfo.used_freezes, 'день', 'дня', 'дней')}.
          </Text>
        )}
        <View style={{ gap: 6 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Цель дня</Text>
            <Text style={[styles.muted, goalDone && { color: colors.green, fontWeight: '700' }]}>
              {goalDone ? 'выполнена' : `${wordsToday} из ${goal} слов`}
            </Text>
          </View>
          <ProgressBar value={wordsToday / goal} />
        </View>
      </Card>

      <View style={styles.kamiRow}>
        <Kami size={88} color={kamiColor} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{bubble}</Text>
        </View>
      </View>

      {!hasSchedule && <Button title="Заполнить расписание" variant="secondary" onPress={onOpenSchedule} />}

      <Text style={styles.h2}>{hasSchedule ? `${next.label} в школе` : 'Темы'}</Text>
      {hasSchedule && subjects.length === 0 && (
        <Text style={styles.muted}>В расписании на этот день пусто.</Text>
      )}
      {shownCodes.map((code) => {
        const subj = subjectByCode(code);
        const list = topicsFor(code);
        return (
          <Card key={code} style={{ gap: 10 }}>
            <Text style={styles.subject}>{subj.es}</Text>
            {list.length === 0 && (
              <Text style={styles.small}>
                {subj.custom ? 'Добавь слова с урока, и Ками поможет их выучить.' : 'Готовые слова по этому предмету скоро появятся. Пока можно добавить свои.'}
              </Text>
            )}
            {list.map((t) => {
              const done = learnedCount(t, learned);
              return (
                <View key={t.id} style={{ gap: 6 }}>
                  <Text style={styles.muted}>{t.custom ? 'Мои слова' : `Тема: ${t.title} · ${t.titleRu}`}</Text>
                  <ProgressBar value={done / t.words.length} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.small}>{done} из {t.words.length} слов</Text>
                    <Text style={styles.link} onPress={() => onStartTopic(t.id)} accessibilityRole="button">
                      {done === t.words.length ? 'Повторить' : 'Учить'}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.link} onPress={() => onOpenWords(code)} accessibilityRole="button">
              + Свои слова
            </Text>
          </Card>
        );
      })}

      {firstUnfinished && <Button title="Начать подготовку" onPress={() => onStartTopic(firstUnfinished.id)} />}
      <Button title="Разобрать задание" variant="secondary" onPress={onOpenTask} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text, flexShrink: 1 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontWeight: '800', fontSize: 15 },
  banner: { backgroundColor: '#FBF1D6', borderRadius: radius.md, padding: 12 },
  bannerText: { color: '#7A5200', fontWeight: '700', fontSize: 15 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  freezeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F0FB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  freezeText: { color: '#1D5A9E', fontWeight: '700', fontSize: 13 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayLetter: { fontSize: 12, color: colors.muted },
  dayDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: colors.orange },
  dayFrozen: { backgroundColor: '#4A90D9' },
  dayToday: { borderWidth: 2, borderColor: colors.orange, backgroundColor: colors.card },
  kamiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, borderBottomLeftRadius: 4, padding: 12 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  link: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 6 },
});
