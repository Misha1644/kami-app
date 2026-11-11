// Главная: что будет завтра в школе и сколько слов уже готово.
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount } from '../data/content';

export default function HomeScreen({ topics, studentName, learned, streak, onStartTopic, onOpenTask }) {
  const next = topics.find((t) => learnedCount(t, learned) < t.words.length) || topics[0];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.hello}>Hola, {studentName}!</Text>
        <View style={styles.streak}>
          <Text style={styles.streakText}>{streakLabel(streak)}</Text>
        </View>
      </View>

      <View style={styles.kamiRow}>
        <Kami size={96} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            Завтра {topics.map((t) => t.subject.toLowerCase()).join(' и ')}. Подготовимся за 10 минут?
          </Text>
        </View>
      </View>

      <Text style={styles.h2}>Завтра в школе</Text>
      {topics.map((t) => {
        const done = learnedCount(t, learned);
        return (
          <Card key={t.id} style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.subject}>{t.subject}</Text>
              <Text style={styles.small}>{t.lessonSlot}</Text>
            </View>
            <Text style={styles.muted}>Тема: {t.title} · {t.titleRu}</Text>
            <ProgressBar value={done / t.words.length} />
            <View style={styles.rowBetween}>
              <Text style={styles.small}>{done} из {t.words.length} слов</Text>
              <Text style={styles.link} onPress={() => onStartTopic(t.id)} accessibilityRole="button">
                {done === t.words.length ? 'Повторить' : 'Учить'}
              </Text>
            </View>
          </Card>
        );
      })}

      <Button title="Начать подготовку" onPress={() => onStartTopic(next.id)} />
      <Button title="Сфотографировать задание" variant="secondary" onPress={onOpenTask} />
    </ScrollView>
  );
}

function streakLabel(n) {
  if (n === 0) return 'Начни серию сегодня';
  const m10 = n % 10, m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
  return `${n} ${word} подряд`;
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontSize: 26, fontWeight: '800', color: colors.text },
  streak: { backgroundColor: colors.orangeLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  streakText: { color: colors.orangeText, fontWeight: '700', fontSize: 14 },
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
