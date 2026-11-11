// Точка входа: простая навигация по вкладкам и общее состояние прогресса.
// Прогресс пока хранится в памяти телефона и сбрасывается при перезапуске.
// На следующем этапе он будет сохраняться в Supabase (таблица progress).
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import LessonScreen from './src/screens/LessonScreen';
import TaskScreen from './src/screens/TaskScreen';
import ParentsScreen from './src/screens/ParentsScreen';
import { colors } from './src/theme';
import { topics } from './src/data/content';

const TABS = [
  { key: 'home', label: 'Сегодня' },
  { key: 'task', label: 'Задание' },
  { key: 'parents', label: 'Родителям' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [lessonTopic, setLessonTopic] = useState(null);
  const [learned, setLearned] = useState({}); // { [wordId]: true }
  const streak = 1;

  const markLearned = (wordId) => setLearned((prev) => ({ ...prev, [wordId]: true }));

  let screen;
  if (lessonTopic) {
    screen = <LessonScreen topicId={lessonTopic} onLearned={markLearned} onClose={() => setLessonTopic(null)} />;
  } else if (tab === 'task') {
    screen = <TaskScreen onLearnWords={() => setLessonTopic(topics[0].id)} />;
  } else if (tab === 'parents') {
    screen = <ParentsScreen learned={learned} streak={streak} />;
  } else {
    screen = (
      <HomeScreen
        learned={learned}
        streak={streak}
        onStartTopic={setLessonTopic}
        onOpenTask={() => setTab('task')}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>{screen}</View>
        {!lessonTopic && (
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
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.green },
  tabText: { fontSize: 13, color: colors.muted },
  tabTextActive: { color: colors.green, fontWeight: '700' },
});
