// Экран для родителей: сколько выучено и готовность по предметам.
// Цифры считаются из реального прогресса ученика в этом приложении.
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Button, Card } from '../components/ui';
import { colors } from '../theme';
import { learnedCount } from '../data/content';

function status(done, total) {
  if (done === 0) return { label: 'Не начато', bg: '#F1EFE8', fg: '#444441' };
  if (done < total) return { label: 'В процессе', bg: colors.orangeLight, fg: colors.orangeText };
  return { label: 'Готов к уроку', bg: colors.greenLight, fg: colors.greenDark };
}

export default function ParentsScreen({ topics, student, learned, streak, onSignOut }) {
  const totalLearned = Object.keys(learned).length;
  const topicsReady = topics.filter((t) => learnedCount(t, learned) === t.words.length).length;

  const stats = [
    { value: streak, label: 'дней подряд' },
    { value: totalLearned, label: 'слов выучено' },
    { value: topicsReady, label: 'темы готовы' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View>
        <Text style={styles.small}>Для родителей</Text>
        <Text style={styles.h1}>Прогресс: {student.nickname}</Text>
        <Text style={styles.small}>{student.grade}</Text>
      </View>

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
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});
