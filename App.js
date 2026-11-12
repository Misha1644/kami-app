// Точка входа.
// Порядок: вход родителя → профиль ученика → основное приложение с вкладками.
// Прогресс, серия, монеты, покупки и расписание хранятся в Supabase.
import { useCallback, useEffect, useState } from 'react';
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
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { KAMI_COLORS } from './src/data/content';
import {
  getStudent, loadTopics, loadLearned, loadStreak, recordAnswer, loadWordsToday,
  loadShop, buyItem, equipColor, loadSchedule, saveScheduleDay,
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
        const [s, t] = await Promise.all([getStudent(), loadTopics()]);
        if (cancelled) return;
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
  useEffect(() => {
    if (!studentId) return;
    loadLearned(studentId).then(setLearned).catch(() => {});
    loadStreak(studentId).then((info) => {
      setStreakInfo(info);
      setStudent((s) => (s ? { ...s, streak_freezes: info.freezes } : s));
    });
    loadWordsToday(studentId).then(setWordsToday);
    loadSchedule(studentId).then(setSchedule);
    loadShop(studentId).then(setShop).catch(() => {});
  }, [studentId]);

  const onAnswer = useCallback(
    async (wordId, correct) => {
      if (correct) setLearned((prev) => ({ ...prev, [wordId]: true }));
      const res = await recordAnswer(studentId, wordId, correct);
      if (!res) return;
      setStudent((s) => ({ ...s, coins: res.coins }));
      setWordsToday(res.words_today);
      if (res.goal_bonus > 0) setGoalBanner(`Цель дня выполнена! +${res.goal_bonus} монет`);
      if (correct) loadStreak(studentId).then(setStreakInfo);
    },
    [studentId]
  );

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
        topics={topics}
        topicId={lessonTopic}
        kamiColor={kamiColor}
        onAnswer={onAnswer}
        onClose={() => setLessonTopic(null)}
      />
    );
  } else {
    showTabs = true;
    if (tab === 'task') {
      screen = <TaskScreen onLearnWords={() => setLessonTopic(topics[0].id)} />;
    } else if (tab === 'schedule') {
      screen = <ScheduleScreen schedule={schedule} onSaveDay={onSaveDay} />;
    } else if (tab === 'shop') {
      screen = <ShopScreen student={student} shop={shop} onBuy={onBuy} onEquip={onEquip} />;
    } else if (tab === 'parents') {
      screen = (
        <ParentsScreen topics={topics} student={student} learned={learned} streak={streakInfo.streak} onSignOut={signOut} />
      );
    } else {
      screen = (
        <HomeScreen
          topics={topics}
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
