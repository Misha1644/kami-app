// Экран для родителей: сколько выучено и готовность по предметам.
// Цифры считаются из реального прогресса ученика в этом приложении.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Button, Card } from '../components/ui';
import { colors } from '../theme';
import { learnedCount } from '../data/content';
import { loadHardWords } from '../lib/api';

function status(done, total) {
  if (done === 0) return { label: 'Не начато', bg: '#F1EFE8', fg: '#444441' };
  if (done < total) return { label: 'В процессе', bg: colors.orangeLight, fg: colors.orangeText };
  return { label: 'Готов к уроку', bg: colors.greenLight, fg: colors.greenDark };
}

export default function ParentsScreen({ topics, student, learned, streak, plan, onOpenPlus, onSignOut }) {
  const [hard, setHard] = useState(null);
  useEffect(() => {
    if (plan.plus) loadHardWords(student.id).then(setHard);
  }, [plan.plus, student.id]);

  const totalLearned = Object.keys(learned).length;
  const topicsReady = topics.filter((t) => learnedCount(t, learned) === t.words.length).length;

  const stats = [
    { value: streak, label: 'дней подряд' },
    { value: totalLearned, label: 'слов выучено' },
    { value: student.coins, label: 'монет' },
    { value: topicsReady, label: 'темы готовы' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View>
        <Text style={styles.small}>Для родителей</Text>
        <Text style={styles.h1}>Прогресс: {student.nickname}</Text>
        <Text style={styles.small}>{student.grade}</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={onOpenPlus} style={[styles.plus, plan.plus && styles.plusActive]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.plusTitle}>{plan.plus ? 'Ками Плюс подключён' : 'Ками Плюс'}</Text>
          <Text style={styles.small}>
            {plan.plus ? 'Все возможности открыты.' : '15 разборов фото в день, свои слова без лимита, отчёт о трудных словах.'}
          </Text>
        </View>
        <Text style={styles.plusArrow}>›</Text>
      </Pressable>

      <View style={styles.stats}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.small}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.h2}>Готовность по предметам</Text>
      <Card style={{ paddingVertical: 4 }}>
        {topics.map((t, i) => {
          const s = status(learnedCount(t, learned), t.words.length);
          return (
            <View key={t.id} style={[styles.row, i < topics.length - 1 && styles.rowBorder]}>
              <Text style={styles.body}>{t.subject}: {t.title}</Text>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Text style={styles.h2}>Трудные слова</Text>
      {plan.plus ? (
        <Card style={{ paddingVertical: 4 }}>
          {hard === null && <Text style={[styles.small, { paddingVertical: 12 }]}>Загружаем…</Text>}
          {hard?.length === 0 && <Text style={[styles.small, { paddingVertical: 12 }]}>Ошибок пока нет — отлично!</Text>}
          {hard?.map((w, i) => (
            <View key={`${w.es}-${i}`} style={[styles.row, i < hard.length - 1 && styles.rowBorder]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{w.es}</Text>
                <Text style={styles.small}>{w.ru}</Text>
              </View>
              <Text style={styles.mistakes}>ошибок: {w.wrong}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.small}>Список слов, в которых ребёнок чаще ошибается, — в Ками Плюс.</Text>
      )}

      <Button title="Выйти из аккаунта" variant="secondary" onPress={onSignOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 2 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, color: colors.text, flexShrink: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: '45%', padding: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#B07CE8', backgroundColor: colors.card },
  plusActive: { backgroundColor: '#F3ECFC' },
  plusTitle: { fontSize: 16, fontWeight: '800', color: '#6B3FB8' },
  plusArrow: { fontSize: 24, color: '#6B3FB8' },
  mistakes: { fontSize: 13, fontWeight: '700', color: colors.danger },
});
