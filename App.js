// Точка входа.
// Порядок: вход родителя → профиль ученика → основное приложение с вкладками.
// Прогресс, серия, монеты, покупки и расписание хранятся в Supabase.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import StudentSetupScreen from './src/screens/StudentSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import LessonScreen from './src/screens/LessonScreen';
import TaskScreen from './src/screens/TaskScreen';
import ParentsScreen from './src/screens/ParentsScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ShopScreen from './src/screens/ShopScreen';
import PlusScreen from './src/screens/PlusScreen';
import TopicsScreen from './src/screens/TopicsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { KAMI_COLORS } from './src/data/content';
import {
  getStudent, loadTopics, loadLearned, loadStreak, recordAnswer, loadWordsToday,
  loadShop, buyItem, equipColor, loadSchedule, saveScheduleDay,
  completeLesson, loadPlan,
  updateGrade, loadDueWords,
} from './src/lib/api';
import { remindersSupported, remindersEnabled, rescheduleReminders, setRemindersEnabled } from './src/lib/reminders';

const TABS = [
  { key: 'home', label: 'Сегодня' },
  { key: 'schedule', label: 'Расписание' },
  { key: 'shop', label: 'Магазин' },
  { key: 'task', label: 'Задание' },
  { key: 'parents', label: 'Родителям' },
];

const EMPTY_STREAK = { streak: 0, freezes: 0, used_freezes: 0, week: [] };
const EMPTY_SCHEDULE = { 1: [], 2: [], 3: [], 4: [], 5: [] };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ещё проверяем
  const [student, setStudent] = useState(undefined);
  const [topics, setTopics] = useState([]);
  const [learned, setLearned] = useState({});
  const [streakInfo, setStreakInfo] = useState(EMPTY_STREAK);
  const [wordsToday, setWordsToday] = useState(0);
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [shop, setShop] = useState(null);
  const [goalBanner, setGoalBanner] = useState('');
  const [tab, setTab] = useState('home');
  const [lessonTopic, setLessonTopic] = useState(null);

  const [plan, setPlan] = useState({ plus: false });
  const [showPlus, setShowPlus] = useState(false);
  const [dueWords, setDueWords] = useState([]);
  const [currentTopics, setCurrentTopics] = useState({}); // { [код предмета]: id темы, которую проходят сейчас }
  const [topicsFor, setTopicsFor] = useState(null); // код предмета для экрана «Все темы»
  const [reminders, setReminders] = useState(false);
  const pendingAnswer = useRef(Promise.resolve()); // последний ответ, ещё не записанный в базу // код предмета, для которого открыт экран «Мои слова»
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // После входа: ученик и контент.
  useEffect(() => {
    if (!session) {
      setStudent(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadError('');
        const [s, p] = await Promise.all([getStudent(), loadPlan()]);
        const t = await loadTopics(s?.grade);
        if (cancelled) return;
        setPlan(p);
        setTopics(t);
        setStudent(s);
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Когда ученик известен: прогресс, серия, расписание, магазин.
  const studentId = student?.id;

  // Всё, что относится к ученику. Вызывается при входе и по кнопке «Обновить».
  const loadStudentData = useCallback(async (id) => {
    const [learnedStd, info, today, sch, shopData, due, current, remOn] = await Promise.all([
      loadLearned(id).catch(() => ({})),
      loadStreak(id),
      loadWordsToday(id),
      loadSchedule(id),
      loadShop(id).catch(() => null),
      loadDueWords(id).catch(() => []),
      AsyncStorage.getItem(`kami.current.${id}`).catch(() => null),
      remindersEnabled(),
    ]);
    setDueWords(due);
    setCurrentTopics(current ? JSON.parse(current) : {});
    setReminders(remOn);
    if (remOn) rescheduleReminders(sch).catch(() => {});
    setLearned(learnedStd);
    setStreakInfo(info);
    setStudent((s) => (s ? { ...s, streak_freezes: info.freezes } : s));
    setWordsToday(today);
    setSchedule(sch);
    if (shopData) setShop(shopData);
  }, []);

  useEffect(() => {
    if (studentId) loadStudentData(studentId);
  }, [studentId, loadStudentData]);

  // Кнопка «Обновить» и «потянуть вниз»: заново загружает всё с сервера.
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const [s, p] = await Promise.all([getStudent(), loadPlan()]);
      const t = await loadTopics(s?.grade);
      setPlan(p);
      setTopics(t);
      setStudent(s);
      if (s) await loadStudentData(s.id);
    } catch (e) {
      // Нет сети — оставляем то, что уже показано.
    }
    setRefreshing(false);
  }

  // Темы класса + сессия повторения.
  const allTopics = topics;
  const lessonTopics = useMemo(
    () => [...allTopics, { id: 'review', subject: 'Повторение', title: 'повторение', titleRu: '', words: dueWords }],
    [allTopics, dueWords]
  );

  const onAnswer = useCallback(
    async (wordId, correct) => {
      if (correct) setLearned((prev) => ({ ...prev, [wordId]: true }));
      const request = recordAnswer(studentId, wordId, correct);
      pendingAnswer.current = request;
      const res = await request;
      if (!res) return;
      setStudent((s) => ({ ...s, coins: res.coins }));
      setWordsToday(res.words_today);
      if (res.goal_bonus > 0) setGoalBanner(`Цель дня выполнена! +${res.goal_bonus} монет`);
    },
    [studentId]
  );

  async function onCompleteLesson() {
    await pendingAnswer.current; // сначала дождаться записи последнего ответа
    await completeLesson(studentId);
    setStreakInfo(await loadStreak(studentId));
    setDueWords(await loadDueWords(studentId).catch(() => []));
  }

  async function setCurrentTopic(code, topicId) {
    const next = { ...currentTopics, [code]: topicId };
    setCurrentTopics(next);
    AsyncStorage.setItem(`kami.current.${studentId}`, JSON.stringify(next)).catch(() => {});
  }

  async function onChangeGrade(grade) {
    await updateGrade(studentId, grade);
    setStudent((s) => ({ ...s, grade }));
    setTopics(await loadTopics(grade));
  }

  async function onToggleReminders(on) {
    setReminders(await setRemindersEnabled(on, schedule));
  }

  async function onBuy(itemId) {
    const res = await buyItem(studentId, itemId);
    setStudent((s) => ({ ...s, coins: res.coins, streak_freezes: res.freezes, kami_color: res.kami_color }));
    setStreakInfo((info) => ({ ...info, freezes: res.freezes }));
    setShop(await loadShop(studentId));
  }

  async function onEquip(itemId) {
    await equipColor(studentId, itemId);
    setStudent((s) => ({ ...s, kami_color: itemId }));
  }

  async function onSaveDay(weekday, codes) {
    const prev = schedule;
    setSchedule((sch) => ({ ...sch, [weekday]: codes }));
    try {
      await saveScheduleDay(studentId, weekday, codes);
      if (reminders) rescheduleReminders({ ...schedule, [weekday]: codes }).catch(() => {});
    } catch (e) {
      setSchedule(prev);
      throw e;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLearned({});
    setStreakInfo(EMPTY_STREAK);
    setSchedule(EMPTY_SCHEDULE);
    setShop(null);
    setPlan({ plus: false });
    setShowPlus(false);
    setDueWords([]);
    setTopicsFor(null);
    setGoalBanner('');
    setTab('home');
  }

  const kamiColor = KAMI_COLORS[student?.kami_color] || KAMI_COLORS['color-green'];

  let screen;
  let showTabs = false;
  if (session === undefined || (session && student === undefined && !loadError)) {
    screen = <View style={styles.center}><ActivityIndicator color={colors.green} size="large" /></View>;
  } else if (!session) {
    screen = <AuthScreen />;
  } else if (loadError) {
    screen = (
      <View style={styles.center}>
        <Text style={styles.errorText}>Не удалось загрузить данные: {loadError}</Text>
        <Text style={styles.link} onPress={signOut} accessibilityRole="button">Выйти и попробовать снова</Text>
      </View>
    );
  } else if (!student) {
    screen = (
      <StudentSetupScreen
        onCreated={async (s) => {
          setTopics(await loadTopics(s.grade));
          setStudent(s);
        }}
      />
    );
  } else if (lessonTopic) {
    screen = (
      <LessonScreen
        topics={lessonTopics}
        topicId={lessonTopic}
        review={lessonTopic === 'review'}
        kamiColor={kamiColor}
        onAnswer={onAnswer}
        onComplete={onCompleteLesson}
        onClose={() => setLessonTopic(null)}
      />
    );
  } else if (showPlus) {
    screen = <PlusScreen plan={plan} onBack={() => setShowPlus(false)} />;
  } else if (topicsFor) {
    screen = (
      <TopicsScreen
        subjectCode={topicsFor}
        topics={topics.filter((t) => t.subjectCode === topicsFor)}
        learned={learned}
        currentId={currentTopics[topicsFor]}
        onSetCurrent={(id) => setCurrentTopic(topicsFor, id)}
        onStudy={setLessonTopic}
        onBack={() => setTopicsFor(null)}
      />
    );
  } else {
    showTabs = true;
    if (tab === 'task') {
      screen = (
        <TaskScreen
          student={student}
          kamiColor={kamiColor}
          schedule={schedule}
        />
      );
    } else if (tab === 'schedule') {
      screen = <ScheduleScreen schedule={schedule} onSaveDay={onSaveDay} />;
    } else if (tab === 'shop') {
      screen = (
        <ShopScreen
          student={student}
          shop={shop}
          plan={plan}
          onBuy={onBuy}
          onEquip={onEquip}
          onOpenPlus={() => setShowPlus(true)}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      );
    } else if (tab === 'parents') {
      screen = (
        <ParentsScreen
          topics={allTopics}
          student={student}
          learned={learned}
          streak={streakInfo.streak}
          plan={plan}
          onOpenPlus={() => setShowPlus(true)}
          onSignOut={signOut}
          onChangeGrade={onChangeGrade}
          reminders={reminders}
          remindersSupported={remindersSupported}
          onToggleReminders={onToggleReminders}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      );
    } else {
      screen = (
        <HomeScreen
          topics={allTopics}
          student={student}
          kamiColor={kamiColor}
          learned={learned}
          streakInfo={streakInfo}
          wordsToday={wordsToday}
          goalBanner={goalBanner}
          schedule={schedule}
          onStartTopic={(id) => { setGoalBanner(''); setLessonTopic(id); }}
          onOpenTask={() => setTab('task')}
          onOpenSchedule={() => setTab('schedule')}
          refreshing={refreshing}
          onRefresh={refresh}
          currentTopics={currentTopics}
          onOpenTopics={setTopicsFor}
          dueCount={dueWords.length}
          onStartReview={() => setLessonTopic('review')}
        />
      );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>{screen}</View>
        {showTabs && (
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(t.key)}
                  style={styles.tab}
                >
                  <View style={[styles.dot, active && styles.dotActive]} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 10 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4, paddingHorizontal: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.green },
  tabText: { fontSize: 11, color: colors.muted },
  tabTextActive: { color: colors.green, fontWeight: '700' },
});
