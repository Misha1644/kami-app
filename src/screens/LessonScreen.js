// Урок: карточка слова, затем вопрос с выбором ответа.
// Слово считается выученным, когда ученик правильно ответил на вопрос.
import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LessonScreen({ topics, topicId, onAnswer, onClose }) {
  const topic = topics.find((t) => t.id === topicId);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('learn'); // learn → quiz → done
  const [picked, setPicked] = useState(null);
  const [mistakes, setMistakes] = useState(0);

  const word = topic.words[index];

  // Варианты ответа: правильное слово и два других из той же темы.
  const options = useMemo(() => {
    const others = shuffle(topic.words.filter((w) => w.id !== word.id)).slice(0, 2);
    return shuffle([word, ...others]);
  }, [topic, word]);

  if (phase === 'done') {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Kami size={140} />
        <Text style={styles.h1}>Тема готова!</Text>
        <Text style={styles.mutedCenter}>
          {topic.subject}: {topic.title}. Слов: {topic.words.length}, ошибок: {mistakes}.
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="На главную" onPress={onClose} />
        </View>
      </View>
    );
  }

  const answered = picked !== null;
  const correct = answered && picked === word.id;

  function choose(id) {
    if (answered) return;
    setPicked(id);
    const ok = id === word.id;
    onAnswer(word.id, ok);
    if (!ok) setMistakes((m) => m + 1);
  }

  function next() {
    setPicked(null);
    if (index + 1 < topic.words.length) {
      setIndex(index + 1);
      setPhase('learn');
    } else {
      setPhase('done');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть урок" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(index + (phase === 'quiz' && answered ? 1 : 0)) / topic.words.length} height={10} />
        </View>
        <Text style={styles.counter}>{index + 1}/{topic.words.length}</Text>
      </View>
      <Text style={styles.caps}>{topic.subject.toUpperCase()} · {topic.title.toUpperCase()}</Text>

      {phase === 'learn' ? (
        <>
          <Card style={{ gap: 12, padding: 20 }}>
            <Text style={styles.word}>{word.es}</Text>
            <Text style={styles.translation}>{word.ru}</Text>
            <View style={styles.teacherBox}>
              <Text style={styles.teacherLabel}>Как скажет учитель</Text>
              <Text style={styles.teacher}>«{word.teacher}»</Text>
            </View>
          </Card>
          <Button title="Понятно, проверь меня" onPress={() => setPhase('quiz')} />
        </>
      ) : (
        <>
          <Text style={styles.question}>Как по-испански «{word.ru}»?</Text>
          <View style={{ gap: 10 }}>
            {options.map((o) => {
              const isRight = answered && o.id === word.id;
              const isWrongPick = answered && o.id === picked && o.id !== word.id;
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  onPress={() => choose(o.id)}
                  style={[styles.option, isRight && styles.optionRight, isWrongPick && styles.optionWrong]}
                >
                  <Text style={[styles.optionText, isRight && { color: colors.greenDark, fontWeight: '700' }, isWrongPick && { color: colors.danger }]}>
                    {o.es}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {answered && (
            <View style={styles.kamiRow}>
              <Kami size={64} />
              <Text style={styles.kamiText}>
                {correct ? 'Верно! Так держать.' : `Почти! Правильно: ${word.es}. Вернёмся к нему позже.`}
              </Text>
            </View>
          )}
          <Button title="Дальше" onPress={next} disabled={!answered} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16, flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: colors.muted },
  counter: { fontSize: 14, fontWeight: '700', color: colors.muted },
  caps: { fontSize: 13, fontWeight: '700', color: colors.muted },
  word: { fontSize: 28, fontWeight: '800', color: colors.text },
  translation: { fontSize: 16, color: colors.muted, marginTop: -6 },
  teacherBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 4 },
  teacherLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  teacher: { fontSize: 15, lineHeight: 21, fontStyle: 'italic', color: colors.text },
  question: { fontSize: 18, fontWeight: '700', color: colors.text },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  optionRight: { borderWidth: 2, borderColor: colors.green, backgroundColor: colors.greenLight },
  optionWrong: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerLight },
  optionText: { fontSize: 16, color: colors.text },
  kamiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kamiText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  mutedCenter: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
