// Точка входа.
// Порядок: вход родителя → профиль ученика → основное приложение с вкладками.
// Прогресс и серия дней хранятся в Supabase, поэтому не пропадают при перезапуске.
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
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { getStudent, loadTopics, loadLearned, loadStreak, recordAnswer } from './src/lib/api';

const TABS = [
  { key: 'home', label: 'Сегодня' },
  { key: 'task', label: 'Задание' },
  { key: 'parents', label: 'Родителям' },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ещё проверяем
  const [student, setStudent] = useState(undefined);
  const [topics, setTopics] = useState([]);
  const [learned, setLearned] = useState({});
  const [streak, setStreak] = useState(0);
  const [tab, setTab] = useState('home');
  const [lessonTopic, setLessonTopic] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // После входа: загружаем ученика и контент.
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

  // Когда ученик известен: его прогресс и серия.
  useEffect(() => {
    if (!student) return;
    loadLearned(student.id).then(setLearned).catch(() => {});
    loadStreak(student.id).then(setStreak).catch(() => {});
  }, [student]);

  const onAnswer = useCallback(
    (wordId, correct) => {
      if (correct) setLearned((prev) => ({ ...prev, [wordId]: true }));
      recordAnswer(student.id, wordId, correct).then(() => loadStreak(student.id).then(setStreak));
    },
    [student]
  );

  async function signOut() {
    await supabase.auth.signOut();
    setLearned({});
    setStreak(0);
    setTab('home');
  }

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
    screen = <LessonScreen topics={topics} topicId={lessonTopic} onAnswer={onAnswer} onClose={() => setLessonTopic(null)} />;
  } else {
    showTabs = true;
    if (tab === 'task') {
      screen = <TaskScreen onLearnWords={() => setLessonTopic(topics[0].id)} />;
    } else if (tab === 'parents') {
      screen = <ParentsScreen topics={topics} student={student} learned={learned} streak={streak} onSignOut={signOut} />;
    } else {
      screen = (
        <HomeScreen
          topics={topics}
          studentName={student.nickname}
          learned={learned}
          streak={streak}
          onStartTopic={setLessonTopic}
          onOpenTask={() => setTab('task')}
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
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
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
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.green },
  tabText: { fontSize: 13, color: colors.muted },
  tabTextActive: { color: colors.green, fontWeight: '700' },
});
