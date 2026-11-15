// Урок: для каждого слова — карточка с озвучкой, затем одно из упражнений:
//   «выбери перевод», «услышь и выбери», «скажи вслух», «напиши сам»,
//   «собери фразу учителя на слух», «диктант».
// В конце, если слов 4 и больше, — «соедини пары».
// Режим повторения (review) пропускает карточки и сразу проверяет.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Coin } from '../components/icons';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { kamiSays } from '../data/kami';
import { teacherFor, KAMI_TEACHER, pickLine } from '../data/teachers';
import Teacher from '../components/Teacher';
import Chest from '../components/Chest';
import RewardReveal from '../components/RewardReveal';
import { LessonProgress, FeedbackSheet, Bounce, ComboCelebration, AlmostBanner, playSfx } from '../components/LessonFx';
import { speak, checkTyped, checkSpoken, phraseTokens, tokenKey, isNearTyped, isNearPhrase } from '../lib/speech';
import PhraseBuilder from '../components/PhraseBuilder';
import haptic from '../lib/haptics';
import { useVoiceRecorder, canAutoCheck, recognizeOnce } from '../lib/voice';
import { tr } from '../i18n';

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

function SpeakButton({ text, lang, label = tr('Послушать'), slow }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slow ? tr('Послушать медленно') : label}
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
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Послушать ещё раз')} onPress={() => speak(text, { lang })} style={styles.bigSpeak}>
        <Text style={styles.bigSpeakText}>🔊</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Послушать медленно')} onPress={() => speak(text, { slow: true, lang })} style={styles.slowSpeak}>
        <Text style={styles.slowText}>{tr('🐢 медленно')}</Text>
      </Pressable>
    </View>
  );
}

export default function LessonScreen({ topics, topicId, review, test, kamiColor, prefs = {}, onAnswer, onComplete, onClose, onOpenChest, onTestScore }) {
  // test — пробная контрольная: без карточек и «найди пару», в конце оценка от 0 до 10.
  const quiz = review || test;
  const topic = topics.find((t) => t.id === topicId);
  const words = topic.words;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(quiz ? 'exercise' : 'learn'); // learn → exercise → (match) → done
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState(null); // 'exact' | 'accents' | 'wrong'
  const [verdict, setVerdict] = useState(null); // null | 'right' | 'wrong' — ответ на текущее упражнение
  const [gotChest, setGotChest] = useState(false); // за урок выдан сундук
  const [speakOff, setSpeakOff] = useState(prefs.speaking === false); // выключено в профиле или «не могу говорить сейчас»
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0); // верных ответов подряд — для шкалы
  const comboRef = useRef(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [celebrate, setCelebrate] = useState(null); // { n, key } — празднование 5, 10, 15… подряд
  const [almost, setAlmost] = useState(false); // «Почти получилось!» — показать подсказку
  const [retried, setRetried] = useState(false); // вторая попытка уже дана на этом задании
  const [dragLock, setDragLock] = useState(false); // тащим слово — экран не прокручивается
  const [earned, setEarned] = useState(0);
  const earnedRef = useRef(0); // актуальное число монет для анимации в конце
  const [reveal, setReveal] = useState(null); // награда за урок большой анимацией
  // Реплики Ками: новые на каждое слово, но не меняются при перерисовке.
  // Урок ведёт учитель предмета; повторение и свои предметы — Ками.
  const teacher = (review && !test) || topic.custom ? KAMI_TEACHER : teacherFor(topic.subjectCode);
  const hello = useMemo(() => pickLine(teacher.hello), [teacher]);
  const praise = useMemo(() => pickLine(teacher.praise), [index, phase, teacher]);
  const comfort = useMemo(() => pickLine(teacher.wrong), [index, phase, teacher]);
  const ending = useMemo(() => ({
    done: pickLine(teacher.done),
    perfect: teacher === KAMI_TEACHER ? kamiSays('perfect') : tr('Ни одной ошибки! {0}', pickLine(teacher.done)),
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
    const n = ok ? comboRef.current + 1 : 0;
    comboRef.current = n;
    setCombo(n);
    setBestCombo((b) => Math.max(b, n));
    const milestone = ok && n >= 5 && n % 5 === 0;
    if (milestone) {
      const key = Date.now();
      setCelebrate({ n, key });
      setTimeout(() => setCelebrate((c) => (c && c.key === key ? null : c)), 1700);
    }
    if (prefs.sfx !== false) playSfx(!ok ? 'wrong' : milestone ? 'combo' : 'correct');
    if (ok) haptic.success(); else haptic.error();
    setAlmost(false);
    onAnswer(word.id, ok);
    if (ok) { earnedRef.current += 1; setEarned((c) => c + 1); }
    else setMistakes((m) => m + 1);
  }

  // Ошибка на одну букву / одно слово: «Почти получилось!» и вторая попытка (один раз на задание).
  function giveSecondTry() {
    setRetried(true);
    setAlmost(true);
    haptic.lift();
  }

  function choose(id) {
    if (answered) return;
    haptic.tap();
    setPicked(id);
    record(id === word.id);
  }

  function checkTypedAnswer() {
    if (answered || !typed.trim()) return;
    const r = checkTyped(typed, word.es);
    if (r === 'wrong' && !retried && isNearTyped(typed, word.es)) {
      setTypedResult('almost');
      giveSecondTry();
      return;
    }
    setTypedResult(r);
    record(r !== 'wrong');
  }

  function finish() {
    setPhase('done');
    if (test) onTestScore?.(Math.round(((words.length - mistakes) / Math.max(1, words.length)) * 100));
    const showReward = (chest) => {
      const coins = earnedRef.current;
      if (!coins && !chest) return;
      setReveal({
        id: `lesson-${Date.now()}`, kind: 'pack', chestType: 'lesson',
        coins, chests: chest ? 1 : 0,
        headline: test ? tr('КОНТРОЛЬНАЯ СДАНА!') : review ? tr('ПОВТОРЕНИЕ ГОТОВО!') : tr('ТЕМА ГОТОВА!'),
      });
    };
    Promise.resolve(onComplete?.(topic.id))
      .then((res) => { if (res?.chest) setGotChest(true); showReward(!!res?.chest); })
      .catch(() => showReward(false));
  }

  function next() {
    setPicked(null);
    setTyped('');
    setTypedResult(null);
    setVerdict(null);
    setAlmost(false);
    setRetried(false);
    if (index + 1 < words.length) {
      setIndex(index + 1);
      setPhase(quiz ? 'exercise' : 'learn');
    } else if (words.length >= 4 && !test) {
      setPhase('match');
    } else {
      finish();
    }
  }

  if (phase === 'done') {
    return (
      <View style={[styles.wrap, styles.center]}>
        {reveal && (
          <RewardReveal
            item={reveal}
            action={reveal.chests && onOpenChest ? { title: tr('Открыть сундук'), onPress: onOpenChest } : null}
            onClose={() => setReveal(null)}
          />
        )}
        <Teacher teacher={teacher} size={140} kamiColor={kamiColor} mood="excited" />
        <Text style={styles.h1}>{test ? tr('Пробная контрольная сдана!') : review ? tr('Повторение готово!') : tr('Тема готова!')}</Text>
        {test && (() => {
          const nota = Math.round(((words.length - mistakes) / Math.max(1, words.length)) * 100) / 10;
          const label = nota >= 9 ? 'sobresaliente' : nota >= 7 ? 'notable' : nota >= 6 ? 'bien' : nota >= 5 ? 'suficiente' : 'insuficiente';
          return (
            <View style={styles.notaCard}>
              <Text style={styles.notaValue}>{String(nota).replace('.', ',')}</Text>
              <Text style={styles.notaLabel}>{label}</Text>
              <Text style={styles.small}>
                {nota >= 5 ? tr('Так держать! К контрольной ты готов.') : tr('Повтори трудные слова ещё раз — и всё получится.')}
              </Text>
            </View>
          );
        })()}
        {teacher !== KAMI_TEACHER && <Text style={styles.teacherName}>{tr(teacher.name)} · {tr(teacher.who)}</Text>}
        <Text style={styles.mutedCenter}>{mistakes === 0 ? ending.perfect : review ? ending.review : ending.done}</Text>
        <Text style={styles.mutedCenter}>{tr('{0} Слов: {1}, ошибок: {2}.', review ? tr('Слова закреплены.') : `${topic.subject}: ${topic.title}.`, words.length, mistakes)}</Text>
        <View style={styles.stats}>
          <View style={[styles.stat, { borderColor: colors.greenBar }]}>
            <Text style={[styles.statHead, { backgroundColor: colors.greenBar }]}>{tr('ТОЧНОСТЬ')}</Text>
            <Text style={styles.statValue}>{Math.round(((words.length - Math.min(mistakes, words.length)) / Math.max(1, words.length)) * 100)}%</Text>
          </View>
          <View style={[styles.stat, { borderColor: colors.orange }]}>
            <Text style={[styles.statHead, { backgroundColor: colors.orange }]}>{tr('ЛУЧШАЯ СЕРИЯ')}</Text>
            <Text style={styles.statValue}>🔥 {bestCombo}</Text>
          </View>
          <View style={[styles.stat, { borderColor: '#F5B800' }]}>
            <Text style={[styles.statHead, { backgroundColor: '#F5B800' }]}>{tr('МОНЕТЫ')}</Text>
            <View style={styles.statRow}><Coin size={20} /><Text style={styles.statValue}>+{earned}</Text></View>
          </View>
        </View>
        {gotChest && (
          <Pressable accessibilityRole="button" onPress={onOpenChest} style={styles.chestGift}>
            <Chest type="lesson" size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chestTitle}>{tr('+1 сундук!')}</Text>
              <Text style={styles.small}>{tr('Нажми, чтобы открыть')}</Text>
            </View>
          </Pressable>
        )}
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          {gotChest && <Button title={tr('Открыть сундук')} onPress={onOpenChest} />}
          <Button title={tr('На главную')} variant={gotChest ? 'secondary' : 'primary'} onPress={onClose} />
        </View>
      </View>
    );
  }

  if (phase === 'match') {
    return <MatchRound words={words} kamiColor={kamiColor} teacher={teacher} sfx={prefs.sfx !== false} onDone={finish} onClose={onClose} />;
  }

  const correctNow = verdict === 'right';
  const progress = (index + (phase === 'exercise' && answered ? 1 : 0)) / (words.length + (words.length >= 4 ? 1 : 0));

  const showSheet = phase === 'exercise' && answered;
  return (
    <View style={{ flex: 1 }}>
    <ScrollView scrollEnabled={!dragLock} contentContainerStyle={[styles.wrap, showSheet && { paddingBottom: 240 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('Закрыть урок')} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <LessonProgress value={progress} combo={combo} />
        <Text style={styles.counter}>{index + 1}/{words.length}</Text>
      </View>
      <View style={styles.capsRow}>
        <Teacher teacher={teacher} size={28} kamiColor={kamiColor} />
        <Text style={[styles.caps, { flex: 1 }]}>
          {test ? tr('ПРОБНАЯ КОНТРОЛЬНАЯ · {0}', topic.subject.toUpperCase()) : review ? tr('ПОВТОРЕНИЕ') : `${topic.subject.toUpperCase()} · ${topic.title.toUpperCase()}`}
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
            <View style={styles.translationBox}>
              <Text style={styles.translationLabel}>{tr('Перевод')}</Text>
              <Text style={styles.translation}>{word.ru}</Text>
            </View>
            {!!word.teacher && (
              <View style={styles.teacherBox}>
                <View style={styles.wordRow}>
                  <Text style={styles.teacherLabel}>{topic.custom ? tr('Пример') : tr('Как скажет учитель')}</Text>
                  <SpeakButton text={word.teacher} lang={word.lang} label={tr('Послушать фразу')} />
                </View>
                <Text style={styles.teacher}>«{word.teacher}»</Text>
              </View>
            )}
          </Card>
          <Button title={tr('Понятно, проверь меня')} onPress={() => setPhase('exercise')} />
        </>
      )}

      {phase === 'exercise' && kind === 'choose' && (
        <>
          <Text style={styles.question}>{tr('Как по-испански «{0}»?', word.ru)}</Text>
          <Options options={options} word={word} picked={picked} onChoose={choose} />
        </>
      )}

      {phase === 'exercise' && kind === 'listen' && (
        <>
          <Text style={styles.question}>{tr('Послушай и выбери слово')}</Text>
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
          <Text style={styles.question}>{tr('Послушай учителя и собери фразу')}</Text>
          <ListenButtons text={word.teacher} lang={word.lang} />
          <PhraseTiles
            key={word.id}
            phrase={word.teacher}
            decoys={decoys}
            answered={answered}
            retried={retried}
            onAlmost={giveSecondTry}
            onEdit={() => setAlmost(false)}
            onDragging={setDragLock}
            onCheck={(ok) => !answered && record(ok)}
          />
          {almost && <AlmostBanner text={tr('Одно слово не на месте или лишнее. Поправь и проверь ещё раз.')} />}
        </>
      )}

      {phase === 'exercise' && TYPED.includes(kind) && (
        <>
          {kind === 'type' ? (
            <Text style={styles.question}>{tr('Напиши {0}: «{1}»', word.lang === 'ca-ES' ? tr('по-валенсийски') : tr('по-испански'), word.ru)}</Text>
          ) : (
            <>
              <Text style={styles.question}>{tr('Послушай и напиши, что услышал')}</Text>
              <ListenButtons text={word.es} lang={word.lang} />
            </>
          )}
          <TextInput
            style={[
              styles.input,
              typedResult === 'wrong' && styles.inputWrong,
              typedResult === 'almost' && styles.inputAlmost,
              (typedResult === 'exact' || typedResult === 'accents') && styles.inputRight,
            ]}
            value={typed}
            onChangeText={(t) => { setTyped(t); if (typedResult === 'almost') { setTypedResult(null); setAlmost(false); } }}
            editable={!answered}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={tr('Твой ответ')}
            placeholderTextColor="#8A928E"
            returnKeyType="done"
            onSubmitEditing={checkTypedAnswer}
          />
          {almost && <AlmostBanner text={tr('Ошибка в одной букве. Посмотри внимательно и попробуй ещё раз.')} />}
          {!answered && <Button title={tr('Проверить')} onPress={checkTypedAnswer} disabled={!typed.trim()} />}
          {typedResult === 'accents' && <Text style={styles.note}>{tr('Верно! Только с ударением: {0}', word.es)}</Text>}
          <Text style={styles.small}>{tr('Артикль (el, la) писать не обязательно.')}</Text>
        </>
      )}

    </ScrollView>
    {celebrate && (
      <ComboCelebration
        key={celebrate.key}
        count={celebrate.n}
        face={<Teacher teacher={teacher} size={72} kamiColor={kamiColor} mood="excited" />}
      />
    )}
    {showSheet && (
      <FeedbackSheet
        key={`${index}-${verdict}`}
        ok={correctNow}
        title={correctNow ? praise : tr('Правильный ответ:')}
        lines={correctNow
          ? [typedResult === 'accents' ? tr('Только с ударением: {0}', word.es) : null]
          : [kind === 'phrase' ? `«${word.teacher}»` : `${word.es} — ${word.ru}`, tr('Вернёмся к нему в повторении.')]}
        extra={<SpeakButton text={kind === 'phrase' ? word.teacher : word.es} lang={word.lang} />}
        onNext={next}
      />
    )}
    </View>
  );
}

// «Собери фразу»: плитки можно нажимать или перетаскивать (см. PhraseBuilder).
function PhraseTiles({ phrase, decoys, answered, retried, onAlmost, onEdit, onDragging, onCheck }) {
  const tokens = useMemo(() => phraseTokens(phrase), [phrase]);
  const bank = useMemo(() => shuffle([...tokens, ...decoys].map((t, i) => ({ i, t }))), [tokens, decoys]);
  return (
    <PhraseBuilder
      tokens={tokens}
      bank={bank}
      answered={answered}
      onDragging={onDragging}
      onEdit={onEdit}
      check={(got, want) => {
        if (got.map(tokenKey).join(' ') === want.map(tokenKey).join(' ')) return 'right';
        if (!retried && isNearPhrase(got, want)) { onAlmost(); return 'almost'; }
        return 'wrong';
      }}
      onCheck={onCheck}
    />
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
      <Text style={styles.question}>{tr('Скажи вслух')}</Text>
      <Card style={{ gap: 6, padding: 16 }}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{word.es}</Text>
          <View style={styles.speakPair}>
            <SpeakButton text={word.es} lang={word.lang} slow />
            <SpeakButton text={word.es} lang={word.lang} label={tr('Послушать Ками')} />
          </View>
        </View>
        <Text style={styles.translation}>{word.ru}</Text>
      </Card>

      {useAuto ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('Нажми и скажи слово')}
            disabled={listening || answered}
            onPress={sayIt}
            style={[styles.mic, listening && styles.micOn, answered && { opacity: 0.5 }]}
          >
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={styles.micText}>{listening ? tr('Слушаю…') : tr('Нажми и скажи')}</Text>
          </Pressable>
          {heard !== null && !answered && (
            <Text style={styles.note}>
              {heard ? tr('Я услышал: «{0}». Попробуй ещё раз!', heard) : tr('Ничего не расслышал — скажи погромче.')}
            </Text>
          )}
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={voice.recording ? tr('Остановить запись') : tr('Записать свой голос')}
            disabled={answered}
            onPress={voice.recording ? voice.stop : voice.start}
            style={[styles.mic, voice.recording && styles.micOn, answered && { opacity: 0.5 }]}
          >
            <Text style={styles.micIcon}>{voice.recording ? '⏹' : '🎤'}</Text>
            <Text style={styles.micText}>{voice.recording ? tr('Стоп') : voice.uri ? tr('Записать ещё раз') : tr('Записать себя')}</Text>
          </Pressable>
          {!!voice.error && <Text style={[styles.note, { color: colors.danger }]}>{voice.error}</Text>}
          {!!voice.uri && !voice.recording && (
            <>
              <View style={styles.compareRow}>
                <Pressable accessibilityRole="button" onPress={voice.playMine} style={styles.compareBtn}>
                  <Text style={styles.compareText}>{tr('▶ Я')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => speak(word.es, { lang: word.lang })} style={styles.compareBtn}>
                  <Text style={styles.compareText}>{tr('🔊 Ками')}</Text>
                </Pressable>
              </View>
              {!answered && (
                <>
                  <Text style={styles.small}>{tr('Послушай себя и Ками. Похоже?')}</Text>
                  <View style={styles.compareRow}>
                    <View style={{ flex: 1 }}><Button title={tr('Похоже!')} onPress={() => onResult(true)} /></View>
                    <View style={{ flex: 1 }}><Button title={tr('Не очень')} variant="secondary" onPress={() => onResult(false)} /></View>
                  </View>
                </>
              )}
            </>
          )}
        </>
      )}

      {!answered && (
        <Text style={styles.link} onPress={onSkip} accessibilityRole="button">{tr('Не могу говорить сейчас')}</Text>
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
        const pickedRight = isRight && picked === word.id; // выбрал верно — горит зелёным
        const hint = isRight && !pickedRight; // ошибся — показываем, какой был верный
        const fx = o.id === picked ? (picked === word.id ? 'right' : 'wrong') : null;
        const faded = answered && !isRight && !isWrongPick;
        return (
          <Bounce key={o.id} kind={fx}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: o.id === picked }}
              onPress={() => onChoose(o.id)}
              style={({ pressed }) => [
                styles.option,
                pickedRight && styles.optionRight,
                hint && styles.optionHint,
                isWrongPick && styles.optionWrong,
                faded && { opacity: 0.4 },
                pressed && !answered && styles.optionPressed,
              ]}
            >
              <Text style={[styles.optionText, (pickedRight || isWrongPick) && styles.optionTextOn, hint && styles.optionTextHint]}>
                {o.es}
              </Text>
              {(pickedRight || hint) && <Text style={[styles.optionMark, hint && { color: colors.green }]}>✓</Text>}
              {isWrongPick && <Text style={styles.optionMark}>✕</Text>}
            </Pressable>
          </Bounce>
        );
      })}
    </View>
  );
}

// «Соедини пары»: испанские слова слева, переводы справа.
function MatchRound({ words, kamiColor, teacher, sfx, onDone, onClose }) {
  const pairs = useMemo(() => shuffle(words).slice(0, 5), [words]);
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(null);
  const [wrongLeft, setWrongLeft] = useState(null);
  const [just, setJust] = useState(null); // только что найденная пара — горит зелёным
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
      setWrong(null);
      setJust(id);
      setTimeout(() => setJust((j) => (j === id ? null : j)), 500);
      if (sfx) playSfx('correct');
      if (next.size === pairs.length) setTimeout(onDone, 400);
    } else {
      setWrong(id);
      setWrongLeft(selected);
      if (sfx) playSfx('wrong');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('Закрыть урок')} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <LessonProgress value={matched.size / pairs.length} />
      </View>
      <Text style={styles.question}>{tr('Соедини пары')}</Text>
      <Text style={styles.small}>{tr('Нажми на испанское слово, потом на его перевод.')}</Text>
      <View style={styles.matchCols}>
        <View style={styles.matchCol}>
          {left.map((w) => {
            const done = matched.has(w.id);
            return (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                onPress={() => pickLeft(w.id)}
                style={[styles.matchItem, selected === w.id && styles.matchSelected, wrong && wrongLeft === w.id && selected === w.id && styles.matchWrong, done && (just === w.id ? styles.matchJust : styles.matchDone)]}
              >
                <Text style={[styles.matchText, done && styles.matchDoneText, ((done && just === w.id) || (wrong && wrongLeft === w.id && selected === w.id)) && styles.optionTextOn]}>{w.es}</Text>
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
                style={[styles.matchItem, wrong === w.id && styles.matchWrong, done && (just === w.id ? styles.matchJust : styles.matchDone)]}
              >
                <Text style={[styles.matchText, done && styles.matchDoneText, ((done && just === w.id) || wrong === w.id) && styles.optionTextOn]}>{w.ru}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.kamiRow}>
        <Teacher teacher={teacher} size={56} kamiColor={kamiColor} mood={wrong ? 'worried' : 'happy'} />
        <Text style={styles.kamiText}>{wrong ? tr('¡Uy! Не та пара — попробуй ещё.') : matchLine}</Text>
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
  translationBox: { backgroundColor: '#FFF4CC', borderLeftWidth: 5, borderLeftColor: '#F5B800', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, gap: 2 },
  translationLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#9A6B00', textTransform: 'uppercase' },
  translation: { fontSize: 24, fontWeight: '800', color: '#1D2939' },
  teacherBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 4 },
  teacherLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  teacher: { fontSize: 15, lineHeight: 21, fontStyle: 'italic', color: colors.text },
  speak: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  speakText: { fontSize: 20 },
  speakPair: { flexDirection: 'row', gap: 8 },
  slots: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#C9D0CB' },
  slotsRight: { borderColor: colors.green, borderBottomWidth: 3 },
  slotsWrong: { borderColor: colors.danger, borderBottomWidth: 3 },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.md, borderWidth: 1.5, borderBottomWidth: 3, borderColor: '#C9D0CB', backgroundColor: colors.card },
  tileRight: { backgroundColor: colors.greenBar, borderColor: colors.greenDark },
  tileWrong: { backgroundColor: '#D92D20', borderColor: '#912018' },
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
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, borderColor: '#D0D5DD', backgroundColor: colors.card },
  optionPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
  optionRight: { backgroundColor: colors.greenBar, borderColor: colors.greenDark },
  optionHint: { backgroundColor: colors.greenLight, borderColor: colors.green },
  optionWrong: { backgroundColor: '#D92D20', borderColor: '#912018' },
  optionText: { fontSize: 17, color: colors.text, flexShrink: 1 },
  optionTextOn: { color: '#FFFFFF', fontWeight: '800' },
  optionTextHint: { color: colors.greenDark, fontWeight: '800' },
  optionMark: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginLeft: 8 },
  inputAlmost: { borderColor: '#F79009', borderWidth: 3, backgroundColor: '#FFFAEB' },
  inputRight: { borderColor: colors.green, borderWidth: 3, backgroundColor: colors.greenLight, color: colors.greenDark, fontWeight: '800' },
  inputWrong: { borderColor: colors.danger, borderWidth: 3, backgroundColor: colors.dangerLight, color: colors.danger, fontWeight: '800', textDecorationLine: 'line-through' },
  input: { minHeight: 52, borderWidth: 2, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 18, backgroundColor: colors.card, color: colors.text },
  note: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  small: { fontSize: 13, color: colors.muted },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  stat: { flex: 1, borderWidth: 2, borderRadius: 14, overflow: 'hidden', alignItems: 'center', backgroundColor: colors.card },
  statHead: { alignSelf: 'stretch', textAlign: 'center', paddingVertical: 4, fontSize: 10, fontWeight: '900', letterSpacing: 0.6, color: '#FFFFFF' },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.text, paddingVertical: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kamiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notaCard: { alignItems: 'center', gap: 2, padding: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignSelf: 'stretch' },
  notaValue: { fontSize: 44, fontWeight: '800', color: colors.text },
  notaLabel: { fontSize: 16, fontWeight: '800', color: colors.greenDark, textTransform: 'uppercase', letterSpacing: 1 },
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
  matchItem: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, borderColor: '#D0D5DD', backgroundColor: colors.card },
  matchSelected: { borderWidth: 2, borderColor: '#1570EF', backgroundColor: '#EFF8FF' },
  matchWrong: { borderWidth: 2, borderColor: '#912018', backgroundColor: '#D92D20' },
  matchJust: { borderWidth: 2, borderColor: colors.greenDark, backgroundColor: colors.greenBar },
  matchDone: { opacity: 0.35, borderColor: colors.green },
  matchText: { fontSize: 15, color: colors.text },
  matchDoneText: { color: colors.greenDark },
});
