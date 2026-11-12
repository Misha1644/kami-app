// Урок: для каждого слова — карточка с озвучкой, затем одно из упражнений:
//   «выбери перевод», «услышь и выбери», «напиши сам».
// В конце, если слов 4 и больше, — «соедини пары».
// Режим повторения (review) пропускает карточки и сразу проверяет.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Coin } from '../components/icons';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { kamiSays } from '../data/kami';
import { speak, checkTyped } from '../lib/speech';

const KINDS = ['choose', 'listen', 'type'];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SpeakButton({ text, label = 'Послушать', slow }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => speak(text, { slow })}
      style={({ pressed }) => [styles.speak, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.speakText}>🔊</Text>
    </Pressable>
  );
}

export default function LessonScreen({ topics, topicId, review, kamiColor, onAnswer, onComplete, onClose }) {
  const topic = topics.find((t) => t.id === topicId);
  const words = topic.words;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(review ? 'exercise' : 'learn'); // learn → exercise → (match) → done
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState(null); // 'exact' | 'accents' | 'wrong'
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  // Реплики Ками: новые на каждое слово, но не меняются при перерисовке.
  const praise = useMemo(() => kamiSays('correct'), [index, phase]);
  const comfort = useMemo(() => kamiSays('wrong'), [index, phase]);
  const ending = useMemo(() => ({ done: kamiSays('done'), perfect: kamiSays('perfect'), review: kamiSays('reviewDone') }), []);

  const word = words[index];

  // Тип упражнения для слова: по кругу, со случайным сдвигом в начале урока.
  const offset = useMemo(() => Math.floor(Math.random() * KINDS.length), []);
  const kind = KINDS[(index + offset) % KINDS.length];

  const options = useMemo(() => {
    const others = shuffle(words.filter((w) => w.id !== word.id)).slice(0, 2);
    return shuffle([word, ...others]);
  }, [words, word]);

  // Озвучка: на карточке и в «услышь и выбери» слово звучит сразу.
  useEffect(() => {
    if (phase === 'learn' || (phase === 'exercise' && kind === 'listen')) speak(word.es);
  }, [phase, index, kind, word]);

  const answered = kind === 'type' ? typedResult !== null : picked !== null;

  function record(ok) {
    onAnswer(word.id, ok);
    if (ok) setEarned((c) => c + 1);
    else setMistakes((m) => m + 1);
  }

  function choose(id) {
    if (answered) return;
    setPicked(id);
    record(id === word.id);
  }

  function checkTypedAnswer() {
    if (answered || !typed.trim()) return;
    const r = checkTyped(typed, word.es);
    setTypedResult(r);
    record(r !== 'wrong');
  }

  function finish() {
    setPhase('done');
    onComplete?.(topic.id);
  }

  function next() {
    setPicked(null);
    setTyped('');
    setTypedResult(null);
    if (index + 1 < words.length) {
      setIndex(index + 1);
      setPhase(review ? 'exercise' : 'learn');
    } else if (words.length >= 4) {
      setPhase('match');
    } else {
      finish();
    }
  }

  if (phase === 'done') {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Kami size={140} color={kamiColor} mood="excited" />
        <Text style={styles.h1}>{review ? 'Повторение готово!' : 'Тема готова!'}</Text>
        <Text style={styles.mutedCenter}>{mistakes === 0 ? ending.perfect : review ? ending.review : ending.done}</Text>
        <Text style={styles.mutedCenter}>
          {review ? 'Слова закреплены.' : `${topic.subject}: ${topic.title}.`} Слов: {words.length}, ошибок: {mistakes}.
        </Text>
        <View style={styles.earned}>
          <Coin size={22} />
          <Text style={styles.earnedText}>+{earned} {plural(earned, 'монета', 'монеты', 'монет')}</Text>
        </View>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="На главную" onPress={onClose} />
        </View>
      </View>
    );
  }

  if (phase === 'match') {
    return <MatchRound words={words} kamiColor={kamiColor} onDone={finish} onClose={onClose} />;
  }

  const correctNow = kind === 'type' ? typedResult && typedResult !== 'wrong' : picked === word.id;
  const progress = (index + (phase === 'exercise' && answered ? 1 : 0)) / (words.length + (words.length >= 4 ? 1 : 0));

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть урок" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={progress} height={10} />
        </View>
        <Text style={styles.counter}>{index + 1}/{words.length}</Text>
      </View>
      <Text style={styles.caps}>
        {review ? 'ПОВТОРЕНИЕ' : `${topic.subject.toUpperCase()} · ${topic.title.toUpperCase()}`}
      </Text>

      {phase === 'learn' && (
        <>
          <Card style={{ gap: 12, padding: 20 }}>
            <View style={styles.wordRow}>
              <Text style={styles.word}>{word.es}</Text>
              <SpeakButton text={word.es} />
            </View>
            <Text style={styles.translation}>{word.ru}</Text>
            {!!word.teacher && (
              <View style={styles.teacherBox}>
                <View style={styles.wordRow}>
                  <Text style={styles.teacherLabel}>{topic.custom ? 'Пример' : 'Как скажет учитель'}</Text>
                  <SpeakButton text={word.teacher} label="Послушать фразу" />
                </View>
                <Text style={styles.teacher}>«{word.teacher}»</Text>
              </View>
            )}
          </Card>
          <Button title="Понятно, проверь меня" onPress={() => setPhase('exercise')} />
        </>
      )}

      {phase === 'exercise' && kind === 'choose' && (
        <>
          <Text style={styles.question}>Как по-испански «{word.ru}»?</Text>
          <Options options={options} word={word} picked={picked} onChoose={choose} />
        </>
      )}

      {phase === 'exercise' && kind === 'listen' && (
        <>
          <Text style={styles.question}>Послушай и выбери слово</Text>
          <View style={styles.listenRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Послушать ещё раз" onPress={() => speak(word.es)} style={styles.bigSpeak}>
              <Text style={styles.bigSpeakText}>🔊</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Послушать медленно" onPress={() => speak(word.es, { slow: true })} style={styles.slowSpeak}>
              <Text style={styles.slowText}>медленно</Text>
            </Pressable>
          </View>
          <Options options={options} word={word} picked={picked} onChoose={choose} />
        </>
      )}

      {phase === 'exercise' && kind === 'type' && (
        <>
          <Text style={styles.question}>Напиши по-испански: «{word.ru}»</Text>
          <TextInput
            style={[
              styles.input,
              typedResult === 'wrong' && { borderColor: colors.danger },
              typedResult && typedResult !== 'wrong' && { borderColor: colors.green },
            ]}
            value={typed}
            onChangeText={setTyped}
            editable={!answered}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Твой ответ"
            placeholderTextColor="#8A928E"
            returnKeyType="done"
            onSubmitEditing={checkTypedAnswer}
          />
          {!answered && <Button title="Проверить" onPress={checkTypedAnswer} disabled={!typed.trim()} />}
          {typedResult === 'accents' && <Text style={styles.note}>Верно! Только с ударением: {word.es}</Text>}
          <Text style={styles.small}>Артикль (el, la) писать не обязательно.</Text>
        </>
      )}

      {phase === 'exercise' && answered && (
        <>
          <View style={styles.kamiRow}>
            <Kami size={64} color={kamiColor} mood={correctNow ? 'excited' : 'worried'} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.kamiText}>{correctNow ? praise : comfort}</Text>
              {!correctNow && <Text style={styles.kamiText}>Правильно: {word.es}. Вернёмся к нему в повторении.</Text>}
              {!correctNow && <Text style={styles.small}>{word.ru}</Text>}
            </View>
            <SpeakButton text={word.es} />
          </View>
          <Button title="Дальше" onPress={next} />
        </>
      )}
    </ScrollView>
  );
}

function Options({ options, word, picked, onChoose }) {
  const answered = picked !== null;
  return (
    <View style={{ gap: 10 }}>
      {options.map((o) => {
        const isRight = answered && o.id === word.id;
        const isWrongPick = answered && o.id === picked && o.id !== word.id;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            onPress={() => onChoose(o.id)}
            style={[styles.option, isRight && styles.optionRight, isWrongPick && styles.optionWrong]}
          >
            <Text style={[styles.optionText, isRight && { color: colors.greenDark, fontWeight: '700' }, isWrongPick && { color: colors.danger }]}>
              {o.es}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// «Соедини пары»: испанские слова слева, переводы справа.
function MatchRound({ words, kamiColor, onDone, onClose }) {
  const pairs = useMemo(() => shuffle(words).slice(0, 5), [words]);
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(null);
  const [matchLine] = useState(() => kamiSays('match'));

  function pickLeft(id) {
    if (matched.has(id)) return;
    setSelected(id);
    setWrong(null);
    const w = pairs.find((p) => p.id === id);
    speak(w.es);
  }

  function pickRight(id) {
    if (!selected || matched.has(id)) return;
    if (id === selected) {
      const next = new Set(matched);
      next.add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === pairs.length) setTimeout(onDone, 400);
    } else {
      setWrong(id);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть урок" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={matched.size / pairs.length} height={10} />
        </View>
      </View>
      <Text style={styles.question}>Соедини пары</Text>
      <Text style={styles.small}>Нажми на испанское слово, потом на его перевод.</Text>
      <View style={styles.matchCols}>
        <View style={styles.matchCol}>
          {left.map((w) => {
            const done = matched.has(w.id);
            return (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                onPress={() => pickLeft(w.id)}
                style={[styles.matchItem, selected === w.id && styles.matchSelected, done && styles.matchDone]}
              >
                <Text style={[styles.matchText, done && styles.matchDoneText]}>{w.es}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.matchCol}>
          {right.map((w) => {
            const done = matched.has(w.id);
            return (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                onPress={() => pickRight(w.id)}
                style={[styles.matchItem, wrong === w.id && styles.matchWrong, done && styles.matchDone]}
              >
                <Text style={[styles.matchText, done && styles.matchDoneText]}>{w.ru}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.kamiRow}>
        <Kami size={56} color={kamiColor} mood={wrong ? 'worried' : 'happy'} />
        <Text style={styles.kamiText}>{wrong ? '¡Uy! Не та пара — попробуй ещё.' : matchLine}</Text>
      </View>
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
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  word: { fontSize: 28, fontWeight: '800', color: colors.text, flexShrink: 1 },
  translation: { fontSize: 16, color: colors.muted, marginTop: -6 },
  teacherBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 4 },
  teacherLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  teacher: { fontSize: 15, lineHeight: 21, fontStyle: 'italic', color: colors.text },
  speak: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  speakText: { fontSize: 20 },
  listenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  bigSpeak: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  bigSpeakText: { fontSize: 40 },
  slowSpeak: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.green, justifyContent: 'center' },
  slowText: { fontSize: 14, fontWeight: '700', color: colors.green },
  question: { fontSize: 18, fontWeight: '700', color: colors.text },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  optionRight: { borderWidth: 2, borderColor: colors.green, backgroundColor: colors.greenLight },
  optionWrong: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerLight },
  optionText: { fontSize: 16, color: colors.text },
  input: { minHeight: 52, borderWidth: 2, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 18, backgroundColor: colors.card, color: colors.text },
  note: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  small: { fontSize: 13, color: colors.muted },
  kamiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kamiText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  mutedCenter: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FBF1D6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  earnedText: { fontSize: 18, fontWeight: '800', color: '#7A5200' },
  matchCols: { flexDirection: 'row', gap: 10 },
  matchCol: { flex: 1, gap: 10 },
  matchItem: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  matchSelected: { borderWidth: 2, borderColor: colors.green, backgroundColor: colors.greenLight },
  matchWrong: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerLight },
  matchDone: { opacity: 0.35, borderColor: colors.green },
  matchText: { fontSize: 15, color: colors.text },
  matchDoneText: { color: colors.greenDark },
});
