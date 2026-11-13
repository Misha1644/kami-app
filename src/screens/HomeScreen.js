// Главная: серия, монеты, цель дня и подготовка к следующему учебному дню по расписанию.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import FactCard from '../components/FactCard';
import Chest from '../components/Chest';
import Teacher from '../components/Teacher';
import { teacherFor, TEACHERS } from '../data/teachers';
import { greeting, kamiSays, kamiFact } from '../data/kami';
import { Flame, Coin, Snowflake } from '../components/icons';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount, nextSchoolDay, subjectByCode, plural } from '../data/content';

const DAY_LETTERS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HomeScreen({
  topics, student, kamiColor, learned, streakInfo, wordsToday, goalBanner, schedule,
  onStartTopic, onOpenTask, onOpenSchedule, onOpenChest, refreshing, onRefresh,
  currentTopics, onOpenTopics, dueCount, onStartReview,
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

  // Текущая тема предмета: выбранная учеником, иначе первая невыученная по программе.
  const currentFor = (code) => {
    const list = topicsFor(code);
    return (
      list.find((t) => t.id === currentTopics?.[code]) ||
      list.find((t) => learnedCount(t, learned) < t.words.length) ||
      list[list.length - 1]
    );
  };
  const shownTopics = shownCodes.map(currentFor).filter(Boolean);
  const firstUnfinished = shownTopics.find((t) => learnedCount(t, learned) < t.words.length) || shownTopics[0];

  // Основная реплика зависит от ситуации, а по нажатию Ками рассказывает факт о себе или Испании.
  const [hello] = useState(() => greeting());
  const [tapLine, setTapLine] = useState(null);
  let bubble;
  let mood = hello.mood;
  if (!hasSchedule) bubble = `${hello.text} Заполни расписание, и я буду готовить тебя к нужным урокам.`;
  else if (!subjects.length) bubble = kamiSays('emptyDay');
  else bubble = `${next.label}: ${subjects.map((c) => subjectByCode(c).es).join(', ')}. Подготовимся?`;
  if (hasSchedule && !streakInfo.today_done && streakInfo.streak > 0) mood = 'worried';
  if (streakInfo.today_done) mood = 'excited';
  const [riskLine] = useState(() => kamiSays('streakRisk'));
  const [doneLine] = useState(() => kamiSays('streakDone'));
  if (hasSchedule && streakInfo.streak > 0) {
    bubble = `${streakInfo.today_done ? doneLine : riskLine} ${bubble}`;
  } else if (hasSchedule) {
    bubble = `${hello.text} ${bubble}`;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>Hola, {student.nickname}!</Text>
        <View style={styles.chips}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Обновить"
            onPress={onRefresh}
            disabled={refreshing}
            style={styles.refresh}
          >
            {refreshing ? <ActivityIndicator size="small" color={colors.green} /> : <Text style={styles.refreshText}>↻</Text>}
          </Pressable>
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
        {!streakInfo.today_done && (
          <Text style={styles.hint}>Пройди сегодня хотя бы один урок до конца, чтобы продлить серию.</Text>
        )}
        {streakInfo.today_done && <Text style={styles.hintDone}>Серия на сегодня продлена!</Text>}
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

      {dueCount > 0 && (
        <Card style={styles.review}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.reviewTitle}>Повторение: {dueCount} {plural(dueCount, 'слово', 'слова', 'слов')}</Text>
            <Text style={styles.small}>Слова, которые пора освежить, чтобы не забылись.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onStartReview} style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Повторить</Text>
          </Pressable>
        </Card>
      )}

      <View style={styles.kamiRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Нажми на Ками — он что-нибудь расскажет"
          onPress={() => setTapLine(kamiFact())}
        >
          <Kami size={88} color={kamiColor} mood={tapLine ? 'excited' : mood} />
        </Pressable>
        <Pressable style={styles.bubble} onPress={() => setTapLine(kamiFact())} accessibilityRole="button">
          <Text style={styles.bubbleText}>{tapLine || bubble}</Text>
          <Text style={styles.bubbleHint}>{tapLine ? 'Нажми ещё — расскажу другое' : 'Нажми на меня!'}</Text>
        </Pressable>
      </View>

      <FactCard kamiColor={kamiColor} />

      {(student.chests_lesson > 0 || student.chests_skin > 0) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenChest(student.chests_lesson > 0 ? 'lesson' : 'skin')}
          style={styles.chestCard}
        >
          <Chest type={student.chests_lesson > 0 ? 'lesson' : 'skin'} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chestTitle}>
              {student.chests_lesson > 0 ? `Сундуки за уроки: ${student.chests_lesson}` : `Сундуки со скинами: ${student.chests_skin}`}
            </Text>
            <Text style={styles.small}>Нажми, чтобы открыть</Text>
          </View>
          <Text style={styles.chestArrow}>›</Text>
        </Pressable>
      )}

      {!hasSchedule && <Button title="Заполнить расписание" variant="secondary" onPress={onOpenSchedule} />}

      <Text style={styles.h2}>{hasSchedule ? `${next.label} в школе` : 'Темы'}</Text>
      {hasSchedule && subjects.length === 0 && (
        <Text style={styles.muted}>В расписании на этот день пусто.</Text>
      )}
      {shownCodes.map((code) => {
        const subj = subjectByCode(code);
        const current = currentFor(code);
        const count = topicsFor(code).length;
        const blocks = [current].filter(Boolean);
        return (
          <Card key={code} style={{ gap: 10 }}>
            <View style={styles.subjectRow}>
              <Teacher teacher={teacherFor(code)} size={36} kamiColor={kamiColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subject}>{subj.es}</Text>
                {!!TEACHERS[code] && <Text style={styles.small}>Ведёт {TEACHERS[code].name}</Text>}
              </View>
            </View>
            {blocks.length === 0 && (
              <Text style={styles.small}>
                {subj.custom ? 'Свой предмет — готовых слов для него нет.' : 'Слова по этому предмету скоро появятся.'}
              </Text>
            )}
            {blocks.map((t) => {
              const done = learnedCount(t, learned);
              return (
                <View key={t.id} style={{ gap: 6 }}>
                  <Text style={styles.muted}>Тема: {t.title} · {t.titleRu}</Text>
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
            {count > 1 && (
              <Text style={styles.link} onPress={() => onOpenTopics(code)} accessibilityRole="button">
                Все темы ({count})
              </Text>
            )}
          </Card>
        );
      })}

      {firstUnfinished && <Button title="Начать подготовку" onPress={() => onStartTopic(firstUnfinished.id)} />}
      {!!onOpenTask && <Button title="Разобрать задание" variant="secondary" onPress={onOpenTask} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text, flexShrink: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refresh: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 20, fontWeight: '700', color: colors.green, marginTop: -2 },
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
  hint: { fontSize: 13, color: colors.orangeText },
  hintDone: { fontSize: 13, fontWeight: '700', color: colors.greenDark },
  kamiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: '#4A90D9', backgroundColor: '#EEF5FC' },
  reviewTitle: { fontSize: 16, fontWeight: '800', color: '#1D5A9E' },
  reviewButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: '#2F6FB7', justifyContent: 'center' },
  reviewButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  bubble: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, borderBottomLeftRadius: 4, padding: 12 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  chestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 2, borderColor: '#D9A92B', backgroundColor: '#FFFBEB' },
  chestTitle: { fontSize: 16, fontWeight: '800', color: '#7A5200' },
  chestArrow: { fontSize: 26, color: '#7A5200' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubbleHint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  link: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 6 },
});
