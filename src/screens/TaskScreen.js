// Разбор задания по фото.
// Сейчас показывает пример. Настоящее распознавание фото подключим на следующем этапе:
// фото → сервер → текст задания → объяснение, ключевые слова и фраза для ответа.
// Важно: приложение объясняет, что спрашивают, но не решает задание за ученика.
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';

const example = {
  original: 'Ejercicio 4. Simplifica las siguientes fracciones y justifica tu respuesta: 6/8, 10/15, 12/18.',
  meaning: 'Сократи три дроби и объясни словами, почему ответ верный.',
  keywords: [
    { es: 'simplifica', ru: 'сократи' },
    { es: 'justifica', ru: 'обоснуй' },
    { es: 'las siguientes', ru: 'следующие' },
  ],
  phraseEs: 'Divido el numerador y el denominador entre 2, porque los dos son pares.',
  phraseRu: 'Делю числитель и знаменатель на 2, потому что оба чётные.',
};

export default function TaskScreen({ onLearnWords }) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Разбор задания</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Пример. Съёмка фото появится в следующей версии.</Text>
      </View>

      <View style={styles.paper}>
        <Text style={styles.label}>Фото из тетради</Text>
        <Text style={styles.paperText}>{example.original}</Text>
      </View>

      <Card style={{ gap: 6 }}>
        <Text style={styles.label}>Что от тебя хотят</Text>
        <Text style={styles.body}>{example.meaning}</Text>
      </Card>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Ключевые слова</Text>
        <View style={styles.chips}>
          {example.keywords.map((k) => (
            <View key={k.es} style={styles.chip}>
              <Text style={styles.chipText}><Text style={{ fontWeight: '700' }}>{k.es}</Text> — {k.ru}</Text>
            </View>
          ))}
        </View>
      </View>

      <Card style={{ gap: 8 }}>
        <Text style={styles.label}>Готовая фраза для ответа</Text>
        <Text style={[styles.body, { fontStyle: 'italic' }]}>«{example.phraseEs}»</Text>
        <Text style={styles.muted}>{example.phraseRu}</Text>
      </Card>

      <View style={styles.kamiBox}>
        <Kami size={64} />
        <Text style={styles.kamiText}>Решаешь ты, я только объясняю, что спрашивают. Так ты правда научишься.</Text>
      </View>

      <Button title="Выучить слова темы" onPress={onLearnWords} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  notice: { backgroundColor: colors.greenLight, borderRadius: radius.sm, padding: 10 },
  noticeText: { fontSize: 13, color: colors.greenDark },
  paper: { backgroundColor: '#FFFDF6', borderColor: '#E4DCC4', borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 6, transform: [{ rotate: '-1deg' }] },
  paperText: { fontSize: 15, lineHeight: 22, color: colors.text, fontFamily: 'Georgia' },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.greenLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  chipText: { fontSize: 14, color: colors.greenDark },
  kamiBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.orangeLight, borderRadius: radius.lg, padding: 12 },
  kamiText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#5A2C0C' },
});
