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
import WordsScreen from './src/screens/WordsScreen';
import PlusScreen from './src/screens/PlusScreen';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { KAMI_COLORS, customTopics } from './src/data/content';
import {
  getStudent, loadTopics, loadLearned, loadStreak, recordAnswer, loadWordsToday,
  loadShop, buyItem, equipColor, loadSchedule, saveScheduleDay,
  loadCustomWords, addCustomWord, deleteCustomWord, recordCustomAnswer, completeLesson, loadPlan,
} from './src/lib/api';

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
  const [customWords, setCustomWords] = useState([]);
  const [wordsFor, setWordsFor] = useState(null);
  const [plan, setPlan] = useState({ plus: false });
  const [showPlus, setShowPlus] = useState(false);
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
        const [s, t, p] = await Promise.all([getStudent(), loadTopics(), loadPlan()]);
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
    const [learnedStd, info, today, sch, shopData, words] = await Promise.all([
      loadLearned(id).catch(() => ({})),
      loadStreak(id),
      loadWordsToday(id),
      loadSchedule(id),
      loadShop(id).catch(() => null),
      loadCustomWords(id),
    ]);
    const learnedOwn = Object.fromEntries(words.filter((w) => w.learned_at).map((w) => [w.id, true]));
    setLearned({ ...learnedStd, ...learnedOwn });
    setStreakInfo(info);
    setStudent((s) => (s ? { ...s, streak_freezes: info.freezes } : s));
    setWordsToday(today);
    setSchedule(sch);
    if (shopData) setShop(shopData);
    setCustomWords(words);
  }, []);

  useEffect(() => {
    if (studentId) loadStudentData(studentId);
  }, [studentId, loadStudentData]);

  // Кнопка «Обновить» и «потянуть вниз»: заново загружает всё с сервера.
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const [s, t, p] = await Promise.all([getStudent(), loadTopics(), loadPlan()]);
      setPlan(p);
      setTopics(t);
      setStudent(s);
      if (s) await loadStudentData(s.id);
    } catch (e) {
      // Нет сети — оставляем то, что уже показано.
    }
    setRefreshing(false);
  }

  // Обычные темы + «Мои слова» по каждому предмету.
  const allTopics = useMemo(() => [...topics, ...customTopics(customWords)], [topics, customWords]);
  const customIds = useMemo(() => new Set(customWords.map((w) => w.id)), [customWords]);

  const onAnswer = useCallback(
    async (wordId, correct) => {
      if (correct) setLearned((prev) => ({ ...prev, [wordId]: true }));
      const request = customIds.has(wordId)
        ? recordCustomAnswer(studentId, wordId, correct)
        : recordAnswer(studentId, wordId, correct);
      pendingAnswer.current = request;
      const res = await request;
      if (!res) return;
      setStudent((s) => ({ ...s, coins: res.coins }));
      setWordsToday(res.words_today);
      if (res.goal_bonus > 0) setGoalBanner(`Цель дня выполнена! +${res.goal_bonus} монет`);
    },
    [studentId, customIds]
  );

  async function onCompleteLesson() {
    await pendingAnswer.current; // сначала дождаться записи последнего ответа
    await completeLesson(studentId);
    setStreakInfo(await loadStreak(studentId));
  }

  async function onAddWord(word) {
    const created = await addCustomWord(studentId, word);
    setCustomWords((list) => [...list, created]);
  }

  async function onDeleteWord(id) {
    await deleteCustomWord(id);
    setCustomWords((list) => list.filter((w) => w.id !== id));
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
    setCustomWords([]);
    setWordsFor(null);
    setPlan({ plus: false });
    setShowPlus(false);
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
    screen = <StudentSetupScreen onCreated={setStudent} />;
  } else if (lessonTopic) {
    screen = (
      <LessonScreen
        topics={allTopics}
        topicId={lessonTopic}
        kamiColor={kamiColor}
        onAnswer={onAnswer}
        onComplete={onCompleteLesson}
        onClose={() => setLessonTopic(null)}
      />
    );
  } else if (showPlus) {
    screen = <PlusScreen plan={plan} onBack={() => setShowPlus(false)} />;
  } else if (wordsFor) {
    screen = (
      <WordsScreen
        subjectCode={wordsFor}
        words={allTopics.find((t) => t.id === `my-${wordsFor}`)?.words || []}
        learned={learned}
        onAdd={onAddWord}
        onDelete={onDeleteWord}
        onStudy={() => setLessonTopic(`my-${wordsFor}`)}
        onBack={() => setWordsFor(null)}
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
          onAddWord={onAddWord}
          onOpenWords={setWordsFor}
        />
      );
    } else if (tab === 'schedule') {
      screen = <ScheduleScreen schedule={schedule} onSaveDay={onSaveDay} onOpenWords={setWordsFor} />;
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
          onOpenWords={setWordsFor}
          refreshing={refreshing}
          onRefresh={refresh}
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
