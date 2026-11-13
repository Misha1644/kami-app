// Урок: для каждого слова — карточка с озвучкой, затем одно из упражнений:
//   «выбери перевод», «услышь и выбери», «скажи вслух», «напиши сам»,
//   «собери фразу учителя на слух», «диктант».
// В конце, если слов 4 и больше, — «соедини пары».
// Режим повторения (review) пропускает карточки и сразу проверяет.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Coin } from '../components/icons';
import { Button, Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { kamiSays } from '../data/kami';
import { teacherFor, KAMI_TEACHER, pickLine } from '../data/teachers';
import Teacher from '../components/Teacher';
import Chest from '../components/Chest';
import { speak, checkTyped, checkSpoken, phraseTokens, tokenKey } from '../lib/speech';
import { useVoiceRecorder, canAutoCheck, recognizeOnce } from '../lib/voice';

const KINDS = ['choose', 'listen', 'speak', 'type', 'phrase', 'dictation'];
const TYPED = ['type', 'dictation'];

// Фраза учителя годится для плиток, если в ней 3–12 слов.
const phraseOk = (w) => { const n = phraseTokens(w.teacher).length; return n >= 3 && n <= 12; };

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SpeakButton({ text, lang, label = 'Послушать', slow }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slow ? 'Послушать медленно' : label}
      onPress={() => speak(text, { slow, lang })}
      style={({ pressed }) => [styles.speak, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.speakText}>{slow ? '🐢' : '🔊'}</Text>
    </Pressable>
  );
}

// Большая кнопка «послушать» + «медленно», как в Duolingo.
function ListenButtons({ text, lang }) {
  return (
    <View style={styles.listenRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Послушать ещё раз" onPress={() => speak(text, { lang })} style={styles.bigSpeak}>
        <Text style={styles.bigSpeakText}>🔊</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Послушать медленно" onPress={() => speak(text, { slow: true, lang })} style={styles.slowSpeak}>
        <Text style={styles.slowText}>🐢 медленно</Text>
      </Pressable>
    </View>
  );
}

export default function LessonScreen({ topics, topicId, review, kamiColor, prefs = {}, onAnswer, onComplete, onClose, onOpenChest }) {
  const topic = topics.find((t) => t.id === topicId);
  const words = topic.words;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(review ? 'exercise' : 'learn'); // learn → exercise → (match) → done
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState(null); // 'exact' | 'accents' | 'wrong'
  const [verdict, setVerdict] = useState(null); // null | 'right' | 'wrong' — ответ на текущее упражнение
  const [gotChest, setGotChest] = useState(false); // за урок выдан сундук
  const [speakOff, setSpeakOff] = useState(prefs.speaking === false); // выключено в профиле или «не могу говорить сейчас»
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  // Реплики Ками: новые на каждое слово, но не меняются при перерисовке.
  // Урок ведёт учитель предмета; повторение и свои предметы — Ками.
  const teacher = review || topic.custom ? KAMI_TEACHER : teacherFor(topic.subjectCode);
  const hello = useMemo(() => pickLine(teacher.hello), [teacher]);
  const praise = useMemo(() => pickLine(teacher.praise), [index, phase, teacher]);
  const comfort = useMemo(() => pickLine(teacher.wrong), [index, phase, teacher]);
  const ending = useMemo(() => ({
    done: pickLine(teacher.done),
    perfect: teacher === KAMI_TEACHER ? kamiSays('perfect') : `Ни одной ошибки! ${pickLine(teacher.done)}`,
    review: kamiSays('reviewDone'),
  }), [teacher]);

  const word = words[index];

  // Тип упражнения для слова: по кругу, со случайным сдвигом в начале урока.
  const offset = useMemo(() => Math.floor(Math.random() * KINDS.length), []);
  let kind = KINDS[(index + offset) % KINDS.length];
  if (kind === 'speak' && speakOff) kind = 'choose';
  if (kind === 'phrase' && !phraseOk(word)) kind = 'listen';

  const options = useMemo(() => {
    const others = shuffle(words.filter((w) => w.id !== word.id)).slice(0, 2);
    return shuffle([word, ...others]);
  }, [words, word]);

  // Озвучка: на карточке и в «услышь и выбери» слово звучит сразу.
  useEffect(() => {
    if ((phase === 'learn' && prefs.autoplay !== false) || (phase === 'exercise' && (kind === 'listen' || kind === 'dictation'))) speak(word.es, { lang: word.lang });
    if (phase === 'exercise' && kind === 'phrase') speak(word.teacher, { lang: word.lang });
  }, [phase, index, kind, word]);

  // Чужие слова для плиток-обманок во «собери фразу».
  const decoys = useMemo(() => {
    const own = new Set(phraseTokens(word.teacher).map(tokenKey));
    const pool = words.filter((w) => w.id !== word.id).flatMap((w) => phraseTokens(w.teacher));
    return shuffle([...new Set(pool)].filter((t) => !own.has(tokenKey(t)))).slice(0, 3);
  }, [words, word]);

  const answered = verdict !== null;

  function record(ok) {
    setVerdict(ok ? 'right' : 'wrong');
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
    Promise.resolve(onComplete?.(topic.id)).then((res) => { if (res?.chest) setGotChest(true); }).catch(() => {});
  }

  function next() {
    setPicked(null);
    setTyped('');
    setTypedResult(null);
    setVerdict(null);
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
        <Teacher teacher={teacher} size={140} kamiColor={kamiColor} mood="excited" />
        <Text style={styles.h1}>{review ? 'Повторение готово!' : 'Тема готова!'}</Text>
        {teacher !== KAMI_TEACHER && <Text style={styles.teacherName}>{teacher.name} · {teacher.who}</Text>}
        <Text style={styles.mutedCenter}>{mistakes === 0 ? ending.perfect : review ? ending.review : ending.done}</Text>
        <Text style={styles.mutedCenter}>
          {review ? 'Слова закреплены.' : `${topic.subject}: ${topic.title}.`} Слов: {words.length}, ошибок: {mistakes}.
        </Text>
        <View style={styles.earned}>
          <Coin size={22} />
          <Text style={styles.earnedText}>+{earned} {plural(earned, 'монета', 'монеты', 'монет')}</Text>
        </View>
        {gotChest && (
          <Pressable accessibilityRole="button" onPress={onOpenChest} style={styles.chestGift}>
            <Chest type="lesson" size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chestTitle}>+1 сундук!</Text>
              <Text style={styles.small}>Нажми, чтобы открыть</Text>
            </View>
          </Pressable>
        )}
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          {gotChest && <Button title="Открыть сундук" onPress={onOpenChest} />}
          <Button title="На главную" variant={gotChest ? 'secondary' : 'primary'} onPress={onClose} />
        </View>
      </View>
    );
  }

  if (phase === 'match') {
    return <MatchRound words={words} kamiColor={kamiColor} teacher={teacher} onDone={finish} onClose={onClose} />;
  }

  const correctNow = verdict === 'right';
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
      <View style={styles.capsRow}>
        <Teacher teacher={teacher} size={28} kamiColor={kamiColor} />
        <Text style={[styles.caps, { flex: 1 }]}>
          {review ? 'ПОВТОРЕНИЕ' : `${topic.subject.toUpperCase()} · ${topic.title.toUpperCase()}`}
        </Text>
      </View>

      {phase === 'learn' && index === 0 && (
        <View style={styles.helloRow}>
          <Teacher teacher={teacher} size={64} kamiColor={kamiColor} />
          <View style={styles.helloBubble}>
            <Text style={styles.teacherName}>{teacher.name}</Text>
            <Text style={styles.kamiText}>{hello}</Text>
          </View>
        </View>
      )}

      {phase === 'learn' && (
        <>
          <Card style={{ gap: 12, padding: 20 }}>
            <View style={styles.wordRow}>
              <Text style={styles.word}>{word.es}</Text>
              <View style={styles.speakPair}>
                <SpeakButton text={word.es} lang={word.lang} slow />
                <SpeakButton text={word.es} lang={word.lang} />
              </View>
            </View>
            <Text style={styles.translation}>{word.ru}</Text>
            {!!word.teacher && (
              <View style={styles.teacherBox}>
                <View style={styles.wordRow}>
                  <Text style={styles.teacherLabel}>{topic.custom ? 'Пример' : 'Как скажет учитель'}</Text>
                  <SpeakButton text={word.teacher} lang={word.lang} label="Послушать фразу" />
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
          <ListenButtons text={word.es} lang={word.lang} />
          <Options options={options} word={word} picked={picked} onChoose={choose} />
        </>
      )}

      {phase === 'exercise' && kind === 'speak' && (
        <SpeakExercise
          key={word.id}
          word={word}
          answered={answered}
          onResult={(ok) => !answered && record(ok)}
          onSkip={() => setSpeakOff(true)}
        />
      )}

      {phase === 'exercise' && kind === 'phrase' && (
        <>
          <Text style={styles.question}>Послушай учителя и собери фразу</Text>
          <ListenButtons text={word.teacher} lang={word.lang} />
          <PhraseTiles key={word.id} phrase={word.teacher} decoys={decoys} answered={answered} onCheck={(ok) => !answered && record(ok)} />
        </>
      )}

      {phase === 'exercise' && TYPED.includes(kind) && (
        <>
          {kind === 'type' ? (
            <Text style={styles.question}>Напиши {word.lang === 'ca-ES' ? 'по-валенсийски' : 'по-испански'}: «{word.ru}»</Text>
          ) : (
            <>
              <Text style={styles.question}>Послушай и напиши, что услышал</Text>
              <ListenButtons text={word.es} lang={word.lang} />
            </>
          )}
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
            <Teacher teacher={teacher} size={64} kamiColor={kamiColor} mood={correctNow ? 'excited' : 'worried'} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.kamiText}>{correctNow ? praise : comfort}</Text>
              {!correctNow && kind !== 'phrase' && <Text style={styles.kamiText}>Правильно: {word.es}. Вернёмся к нему в повторении.</Text>}
              {!correctNow && kind === 'phrase' && <Text style={styles.kamiText}>Порядок слов другой. Послушай ещё раз — вернёмся к этому слову в повторении.</Text>}
              {!correctNow && <Text style={styles.small}>{word.ru}</Text>}
            </View>
            <SpeakButton text={word.es} lang={word.lang} />
          </View>
          {kind === 'phrase' && <Text style={styles.small}>Фраза: «{word.teacher}»</Text>}
          <Button title="Дальше" onPress={next} />
        </>
      )}
    </ScrollView>
  );
}

// «Собери фразу»: нажимай на слова по порядку; нажатие на выбранное слово возвращает его.
function PhraseTiles({ phrase, decoys, answered, onCheck }) {
  const tokens = useMemo(() => phraseTokens(phrase), [phrase]);
  const bank = useMemo(() => shuffle([...tokens, ...decoys].map((t, i) => ({ i, t }))), [tokens, decoys]);
  const [chosen, setChosen] = useState([]); // индексы плиток из bank
  const [ok, setOk] = useState(null);

  function check() {
    const got = chosen.map((i) => tokenKey(bank.find((b) => b.i === i).t)).join(' ');
    const want = tokens.map(tokenKey).join(' ');
    setOk(got === want);
    onCheck(got === want);
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.slots, ok === true && styles.slotsRight, ok === false && styles.slotsWrong]}>
        {chosen.length === 0 && <Text style={styles.small}>Нажимай на слова по порядку</Text>}
        {chosen.map((i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            disabled={answered}
            onPress={() => setChosen((c) => c.filter((x) => x !== i))}
            style={styles.tile}
          >
            <Text style={styles.tileText}>{bank.find((b) => b.i === i).t}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.bank}>
        {bank.map(({ i, t }) => {
          const used = chosen.includes(i);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              disabled={used || answered}
              onPress={() => setChosen((c) => [...c, i])}
              style={[styles.tile, used && styles.tileUsed]}
            >
              <Text style={[styles.tileText, used && { color: 'transparent' }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      {!answered && <Button title="Проверить" onPress={check} disabled={chosen.length === 0} />}
    </View>
  );
}

// «Скажи вслух». В браузере Ками сам проверяет произношение; на телефоне
// ученик записывает себя, слушает и сравнивает с Ками.
function SpeakExercise({ word, answered, onResult, onSkip }) {
  const auto = canAutoCheck();
  const voice = useVoiceRecorder();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState(null);
  const [tries, setTries] = useState(0);
  const [autoFailed, setAutoFailed] = useState(false);
  const useAuto = auto && !autoFailed;

  async function sayIt() {
    setListening(true);
    setHeard(null);
    try {
      const variants = await recognizeOnce(word.lang);
      const ok = variants.some((v) => checkSpoken(v, word.es));
      setHeard(variants[0] || '');
      if (ok) onResult(true);
      else if (tries >= 1) onResult(false);
      setTries((t) => t + 1);
    } catch (e) {
      if (String(e.message).includes('not-allowed') || String(e.message).includes('unsupported')) setAutoFailed(true);
      else setHeard('');
    }
    setListening(false);
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.question}>Скажи вслух</Text>
      <Card style={{ gap: 6, padding: 16 }}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{word.es}</Text>
          <View style={styles.speakPair}>
            <SpeakButton text={word.es} lang={word.lang} slow />
            <SpeakButton text={word.es} lang={word.lang} label="Послушать Ками" />
          </View>
        </View>
        <Text style={styles.translation}>{word.ru}</Text>
      </Card>

      {useAuto ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Нажми и скажи слово"
            disabled={listening || answered}
            onPress={sayIt}
            style={[styles.mic, listening && styles.micOn, answered && { opacity: 0.5 }]}
          >
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={styles.micText}>{listening ? 'Слушаю…' : 'Нажми и скажи'}</Text>
          </Pressable>
          {heard !== null && !answered && (
            <Text style={styles.note}>
              {heard ? `Я услышал: «${heard}». Попробуй ещё раз!` : 'Ничего не расслышал — скажи погромче.'}
            </Text>
          )}
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={voice.recording ? 'Остановить запись' : 'Записать свой голос'}
            disabled={answered}
            onPress={voice.recording ? voice.stop : voice.start}
            style={[styles.mic, voice.recording && styles.micOn, answered && { opacity: 0.5 }]}
          >
            <Text style={styles.micIcon}>{voice.recording ? '⏹' : '🎤'}</Text>
            <Text style={styles.micText}>{voice.recording ? 'Стоп' : voice.uri ? 'Записать ещё раз' : 'Записать себя'}</Text>
          </Pressable>
          {!!voice.error && <Text style={[styles.note, { color: colors.danger }]}>{voice.error}</Text>}
          {!!voice.uri && !voice.recording && (
            <>
              <View style={styles.compareRow}>
                <Pressable accessibilityRole="button" onPress={voice.playMine} style={styles.compareBtn}>
                  <Text style={styles.compareText}>▶ Я</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => speak(word.es, { lang: word.lang })} style={styles.compareBtn}>
                  <Text style={styles.compareText}>🔊 Ками</Text>
                </Pressable>
              </View>
              {!answered && (
                <>
                  <Text style={styles.small}>Послушай себя и Ками. Похоже?</Text>
                  <View style={styles.compareRow}>
                    <View style={{ flex: 1 }}><Button title="Похоже!" onPress={() => onResult(true)} /></View>
                    <View style={{ flex: 1 }}><Button title="Не очень" variant="secondary" onPress={() => onResult(false)} /></View>
                  </View>
                </>
              )}
            </>
          )}
        </>
      )}

      {!answered && (
        <Text style={styles.link} onPress={onSkip} accessibilityRole="button">
          Не могу говорить сейчас
        </Text>
      )}
    </View>
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
function MatchRound({ words, kamiColor, teacher, onDone, onClose }) {
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
        <Teacher teacher={teacher} size={56} kamiColor={kamiColor} mood={wrong ? 'worried' : 'happy'} />
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
  speakPair: { flexDirection: 'row', gap: 8 },
  slots: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#C9D0CB' },
  slotsRight: { borderColor: colors.green },
  slotsWrong: { borderColor: colors.danger },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.md, borderWidth: 1.5, borderBottomWidth: 3, borderColor: '#C9D0CB', backgroundColor: colors.card },
  tileUsed: { backgroundColor: '#E9ECEA', borderColor: '#E9ECEA' },
  tileText: { fontSize: 16, color: colors.text },
  mic: { alignSelf: 'center', minWidth: 200, minHeight: 64, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.green },
  micOn: { backgroundColor: colors.danger },
  micIcon: { fontSize: 26 },
  micText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  compareRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  compareBtn: { minHeight: 48, minWidth: 110, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  compareText: { fontSize: 16, fontWeight: '700', color: colors.greenDark },
  link: { fontSize: 15, fontWeight: '700', color: colors.muted, textAlign: 'center', paddingVertical: 8 },
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
  chestGift: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 2, borderColor: '#D9A92B', backgroundColor: '#FFFBEB' },
  chestTitle: { fontSize: 18, fontWeight: '800', color: '#7A5200' },
  capsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helloBubble: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 2 },
  teacherName: { fontSize: 13, fontWeight: '800', color: colors.muted },
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
