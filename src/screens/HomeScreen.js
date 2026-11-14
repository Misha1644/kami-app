// Главная: серия, монеты, цель дня и подготовка к следующему учебному дню по расписанию.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import FactCard from '../components/FactCard';
import Chest from '../components/Chest';
import { milestones, claimableStreak, streakReward, rewardText } from '../components/Rewards';
import { fmtDate, nextGrade, todayCodes } from '../data/holidays';
import UserAvatar from '../components/UserAvatar';
import Teacher from '../components/Teacher';
import { teacherFor, TEACHERS } from '../data/teachers';
import { daysUntil, whenText } from '../lib/exams';
import { greeting, kamiSays, kamiFact } from '../data/kami';
import { Flame, Coin, Snowflake } from '../components/icons';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount, nextSchoolDay, subjectByCode, plural } from '../data/content';
import { tr } from '../i18n';

const DAY_LETTERS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HomeScreen({
  topics, student, kamiColor, learned, streakInfo, wordsToday, goalBanner, schedule,
  onStartTopic, onOpenTask, onOpenSchedule, onOpenChest, exams = [], examsDone = {}, onOpenExams, onStartExam, newCheers = [], cheerLabels = {}, onOpenFriends, refreshing, onRefresh,
  rewards, onOpenStreakRewards, onOpenDaily, onStartHoliday,
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
  if (!hasSchedule) bubble = tr('{0} Заполни расписание, и я буду готовить тебя к нужным урокам.', hello.text);
  else if (!subjects.length) bubble = kamiSays('emptyDay');
  else bubble = tr('{0}: {1}. Подготовимся?', next.label, subjects.map((c) => subjectByCode(c).es).join(', '));
  if (hasSchedule && !streakInfo.today_done && streakInfo.streak > 0 && !streakInfo.weekend) mood = 'worried';
  if (streakInfo.today_done) mood = 'excited';
  const [riskLine] = useState(() => kamiSays('streakRisk'));
  const [doneLine] = useState(() => kamiSays('streakDone'));
  const holiday = streakInfo.holiday;
  const resting = holiday && holiday.mode !== 'back_to_school'; // идут каникулы (не последние выходные)
  if (resting) {
    mood = streakInfo.today_done ? 'excited' : hello.mood;
    bubble = streakInfo.today_done
      ? tr('Огонёк на сегодня спасён. Отдыхай, ¡disfruta!')
      : tr('Каникулы! Одно слово повторения — и огонёк цел.');
  } else if (hasSchedule && streakInfo.streak > 0) {
    const risk = streakInfo.weekend ? tr('Выходные! Один урок до воскресенья — и огонёк цел.') : riskLine;
    bubble = `${streakInfo.today_done ? doneLine : risk} ${bubble}`;
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
            accessibilityLabel={tr('Обновить')}
            onPress={onRefresh}
            disabled={refreshing}
            style={styles.refresh}
          >
            {refreshing ? <ActivityIndicator size="small" color={colors.green} /> : <Text style={styles.refreshText}>↻</Text>}
          </Pressable>
          {/* Огонёк серый, пока сегодня не пройден урок; загорается после урока. */}
          <View
            style={[styles.chip, { backgroundColor: streakInfo.today_done ? colors.orangeLight : '#EEF0F2' }]}
            accessibilityLabel={streakInfo.today_done ? tr('Серия {0} дней, сегодня урок пройден', streakInfo.streak) : tr('Серия {0} дней, сегодня урока ещё не было', streakInfo.streak)}
          >
            <Flame size={16} color={streakInfo.today_done ? '#E8833A' : '#A3ABB5'} />
            <Text style={[styles.chipText, { color: streakInfo.today_done ? colors.orangeText : '#6B7480' }]}>{streakInfo.streak}</Text>
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
              ? tr('{0} {1} подряд', streakInfo.streak, plural(streakInfo.streak, tr('день'), tr('дня'), tr('дней')))
              : tr('Начни серию сегодня')}
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
                  {tr(DAY_LETTERS[date.getDay()])}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    d.status === 'done' && styles.dayDone,
                    d.status === 'frozen' && styles.dayFrozen,
                    d.status === 'covered' && styles.dayCovered,
                    isToday && d.status === 'none' && styles.dayToday,
                  ]}
                >
                  {d.status === 'done' && <Flame size={14} color="#FFFFFF" />}
                  {d.status === 'frozen' && <Snowflake size={12} color="#FFFFFF" />}
                  {d.status === 'covered' && <Flame size={14} color={colors.orange} />}
                </View>
              </View>
            );
          })}
        </View>
        {!streakInfo.today_done && (
          <Text style={styles.hint}>
            {streakInfo.need === 'word'
              ? (streakInfo.weekend
                ? tr('Каникулы: хватит повторить одно слово до конца воскресенья.')
                : tr('Каникулы: повтори хотя бы одно слово, чтобы огонёк не погас.'))
              : streakInfo.weekend
                ? tr('Выходные: хватит одного урока до конца воскресенья — и серия продлится на все три дня.')
                : tr('Пройди сегодня хотя бы один урок до конца, чтобы продлить серию.')}
          </Text>
        )}
        {streakInfo.today_done && (
          <Text style={styles.hintDone}>
            {streakInfo.need === 'word'
              ? tr('Огонёк спасён! Хороших каникул.')
              : streakInfo.weekend ? tr('Выходные закрыты! Отдыхай — следующий урок в понедельник.') : tr('Серия на сегодня продлена!')}
          </Text>
        )}
        {!!streakInfo.used_freezes && (
          <Text style={styles.small}>{tr('Заморозка спасла твою серию: {0} {1}.', streakInfo.used_freezes, plural(streakInfo.used_freezes, tr('день'), tr('дня'), tr('дней')))}</Text>
        )}
        <View style={{ gap: 6 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>{tr('Цель дня')}</Text>
            <Text style={[styles.muted, goalDone && { color: colors.green, fontWeight: '700' }]}>
              {goalDone ? tr('выполнена') : tr('{0} из {1} слов', wordsToday, goal)}
            </Text>
          </View>
          <ProgressBar value={wordsToday / goal} />
        </View>
      </Card>

      {holiday && (() => {
        const until = fmtDate(holiday.end).slice(0, 5);
        const subjectsToday = todayCodes(schedule).map((c) => subjectByCode(c).es).join(', ');
        const card = {
          review: { icon: '🎄', title: tr('Каникулы до {0}!', until), text: tr('Отдыхай! Чтобы огонёк не погас, хватит повторить одно слово в день.'), button: tr('Повторить') },
          summer_review: { icon: '☀️', title: tr('Летнее повторение'), text: subjectsToday ? tr('По расписанию сегодня: {0}. Хватит одного слова, чтобы огонёк не погас.', subjectsToday) : tr('Повторяем всё, что было за год. Хватит одного слова, чтобы огонёк не погас.'), button: tr('Повторить') },
          summer_prep: { icon: '🎒', title: nextGrade(student.grade) ? tr('Скоро {0}!', nextGrade(student.grade)) : tr('Скоро в школу!'), text: tr('Готовимся к новому классу: первые слова по сегодняшним предметам.'), button: tr('Начать') },
          back_to_school: { icon: '🏫', title: tr('Каникулы заканчиваются!'), text: tr('В понедельник снова в школу. Пройди один урок к понедельнику — и огонёк продлится на все выходные.'), button: null },
        }[holiday.mode];
        if (!card) return null;
        return (
          <View style={styles.holidayCard}>
            <Text style={styles.holidayIcon}>{card.icon}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.chestTitle}>{card.title}</Text>
              <Text style={styles.small}>{card.text}</Text>
            </View>
            {card.button && onStartHoliday && (
              <Pressable accessibilityRole="button" onPress={onStartHoliday} style={styles.reviewButton}>
                <Text style={styles.reviewButtonText}>{card.button}</Text>
              </Pressable>
            )}
          </View>
        );
      })()}

      {rewards && !rewards.daily.claimed_today && onOpenDaily && (
        <Pressable accessibilityRole="button" onPress={onOpenDaily} style={styles.dailyCard}>
          <Coin size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chestTitle}>{tr('Ежедневная награда ждёт!')}</Text>
            <Text style={styles.small}>{tr('День {0} из 7 · нажми, чтобы забрать', rewards.daily.day)}</Text>
          </View>
          <Text style={styles.chestArrow}>›</Text>
        </Pressable>
      )}

      {rewards && onOpenStreakRewards && (() => {
        const ready = claimableStreak(streakInfo.streak, rewards.streak_claimed);
        const next = milestones(streakInfo.streak).find((d) => d > streakInfo.streak);
        const prev = [0, ...milestones(streakInfo.streak)].filter((d) => d <= streakInfo.streak).pop();
        const r = next && streakReward(next);
        return (
          <Pressable accessibilityRole="button" onPress={onOpenStreakRewards} style={[styles.streakReward, ready.length > 0 && styles.streakRewardReady]}>
            <Flame size={30} />
            <View style={{ flex: 1, gap: 4 }}>
              {ready.length > 0 ? (
                <>
                  <Text style={styles.chestTitle}>{tr('Награда за {0} {1} серии!', ready[0], plural(ready[0], tr('день'), tr('дня'), tr('дней')))}</Text>
                  <Text style={styles.small}>{tr('Нажми, чтобы забрать')}</Text>
                </>
              ) : r ? (
                <>
                  <Text style={styles.chestTitle}>{tr('Награда за {0} {1}', next, plural(next, tr('день'), tr('дня'), tr('дней')))}</Text>
                  <Text style={styles.small} numberOfLines={1}>{r.item ? tr('эксклюзивная вещь') + ' + ' : ''}{rewardText(r)}</Text>
                  <ProgressBar value={(streakInfo.streak - prev) / (next - prev)} />
                </>
              ) : null}
            </View>
            <Text style={styles.chestArrow}>›</Text>
          </Pressable>
        );
      })()}

      {dueCount > 0 && (
        <Card style={styles.review}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.reviewTitle}>{tr('Повторение: {0} {1}', dueCount, plural(dueCount, tr('слово'), tr('слова'), tr('слов')))}</Text>
            <Text style={styles.small}>{tr('Слова, которые пора освежить, чтобы не забылись.')}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onStartReview} style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>{tr('Повторить')}</Text>
          </Pressable>
        </Card>
      )}

      <View style={styles.kamiRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Нажми на Ками — он что-нибудь расскажет')}
          onPress={() => setTapLine(kamiFact())}
        >
          <Kami size={88} color={kamiColor} mood={tapLine ? 'excited' : mood} />
        </Pressable>
        <Pressable style={styles.bubble} onPress={() => setTapLine(kamiFact())} accessibilityRole="button">
          <Text style={styles.bubbleText}>{tapLine || bubble}</Text>
          <Text style={styles.bubbleHint}>{tapLine ? tr('Нажми ещё — расскажу другое') : tr('Нажми на меня!')}</Text>
        </Pressable>
      </View>

      <FactCard kamiColor={kamiColor} />

      {(() => {
        const next = exams.find((e) => daysUntil(e.exam_date) >= 0);
        if (!next) return null;
        const days = daysUntil(next.exam_date);
        const done = examsDone[next.id];
        const task = days === 0 ? tr('Быстрое повторение') : days === 1 ? tr('Пробная контрольная') : tr('Подготовка: 10 слов');
        return (
          <View style={styles.examCard}>
            <View style={styles.examHead}>
              <Teacher teacher={teacherFor(next.subject_code)} size={44} kamiColor={kamiColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.examTitle}>📝 {subjectByCode(next.subject_code).es} — {whenText(days)}</Text>
                <Text style={styles.small}>
                  {days === 0 ? tr('¡Suerte! Ты готовился — всё получится.') : done ? tr('На сегодня готово ✓ Завтра продолжим.') : tr('Сегодня: {0}', task.toLowerCase())}
                </Text>
              </View>
            </View>
            {!done && <Button title={task} onPress={() => onStartExam(next)} />}
            <Text style={styles.link} onPress={onOpenExams} accessibilityRole="button">{tr('Все контрольные')}</Text>
          </View>
        );
      })()}
      {!exams.some((e) => daysUntil(e.exam_date) >= 0) && (
        <Text style={styles.link} onPress={onOpenExams} accessibilityRole="button">{tr('📝 Скоро контрольная? Подготовимся вместе')}</Text>
      )}

      {newCheers.length > 0 && (
        <Pressable accessibilityRole="button" onPress={onOpenFriends} style={styles.cheerCard}>
          <UserAvatar value={newCheers[0].avatar} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cheerTitle}>{newCheers[0].from}: {cheerLabels[newCheers[0].cheer]}</Text>
            <Text style={styles.small}>{tr('{0}Нажми, чтобы ответить', newCheers.length > 1 ? tr('И ещё {0} от друзей · ', newCheers.length - 1) : '')}</Text>
          </View>
        </Pressable>
      )}

      {(student.chests_lesson > 0 || student.chests_skin > 0) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenChest(student.chests_lesson > 0 ? 'lesson' : 'skin')}
          style={styles.chestCard}
        >
          <Chest type={student.chests_lesson > 0 ? 'lesson' : 'skin'} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chestTitle}>
              {student.chests_lesson > 0 ? tr('Сундуки за уроки: {0}', student.chests_lesson) : tr('Сундуки со скинами: {0}', student.chests_skin)}
            </Text>
            <Text style={styles.small}>{tr('Нажми, чтобы открыть')}</Text>
          </View>
          <Text style={styles.chestArrow}>›</Text>
        </Pressable>
      )}

      {!hasSchedule && <Button title={tr('Заполнить расписание')} variant="secondary" onPress={onOpenSchedule} />}

      <Text style={styles.h2}>{hasSchedule ? tr('{0} в школе', next.label) : tr('Темы')}</Text>
      {hasSchedule && subjects.length === 0 && (
        <Text style={styles.muted}>{tr('В расписании на этот день пусто.')}</Text>
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
                {!!TEACHERS[code] && <Text style={styles.small}>{tr('Ведёт {0}', TEACHERS[code].name)}</Text>}
              </View>
            </View>
            {blocks.length === 0 && (
              <Text style={styles.small}>
                {subj.custom ? tr('Свой предмет — готовых слов для него нет.') : tr('Слова по этому предмету скоро появятся.')}
              </Text>
            )}
            {blocks.map((t) => {
              const done = learnedCount(t, learned);
              return (
                <View key={t.id} style={{ gap: 6 }}>
                  <Text style={styles.muted}>{tr('Тема: {0} · {1}', t.title, t.titleRu)}</Text>
                  <ProgressBar value={done / t.words.length} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.small}>{tr('{0} из {1} слов', done, t.words.length)}</Text>
                    <Text style={styles.link} onPress={() => onStartTopic(t.id)} accessibilityRole="button">
                      {done === t.words.length ? tr('Повторить') : tr('Учить')}
                    </Text>
                  </View>
                </View>
              );
            })}
            {count > 1 && (
              <Text style={styles.link} onPress={() => onOpenTopics(code)} accessibilityRole="button">{tr('Все темы ({0})', count)}</Text>
            )}
          </Card>
        );
      })}

      {firstUnfinished && <Button title={tr('Начать подготовку')} onPress={() => onStartTopic(firstUnfinished.id)} />}
      {!!onOpenTask && <Button title={tr('Разобрать задание')} variant="secondary" onPress={onOpenTask} />}
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
  dayCovered: { backgroundColor: colors.orangeLight },
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
  examCard: { gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: '#7A5AF8', backgroundColor: '#F4F1FF' },
  examHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  examTitle: { fontSize: 16, fontWeight: '800', color: '#4A2DB3' },
  holidayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: '#84CAFF', backgroundColor: '#EFF8FF' },
  holidayIcon: { fontSize: 32 },
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 2, borderColor: '#F5C443', backgroundColor: '#FFFBEB' },
  streakReward: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  streakRewardReady: { borderWidth: 2, borderColor: '#F79009', backgroundColor: '#FFF4E5' },
  cheerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.green, backgroundColor: colors.greenLight },
  cheerTitle: { fontSize: 16, fontWeight: '800', color: colors.greenDark },
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
