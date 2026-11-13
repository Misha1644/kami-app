// Точка входа.
// Порядок: вход родителя → профиль ученика → основное приложение с вкладками.
// Прогресс, серия, монеты, покупки и расписание хранятся в Supabase.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import StudentSetupScreen from './src/screens/StudentSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import LessonScreen from './src/screens/LessonScreen';
import TaskScreen from './src/screens/TaskScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChestScreen from './src/screens/ChestScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ExamScreen from './src/screens/ExamScreen';
import { todayTask, isDoneToday, markDoneToday } from './src/lib/exams';
import { TabIcon } from './src/components/TabIcons';
import UserAvatar from './src/components/UserAvatar';
import { parseBg, PatternLayer } from './src/components/Background';
import { loadPrefs, savePrefs, DEFAULT_PREFS } from './src/lib/prefs';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ShopScreen from './src/screens/ShopScreen';
import PlusScreen from './src/screens/PlusScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { PLUS_ENABLED } from './src/config';
import TopicsScreen from './src/screens/TopicsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { KAMI_COLORS, subjectByCode } from './src/data/content';
import {
  getStudent, loadTopics, loadLearned, loadStreak, recordAnswer, loadWordsToday,
  loadShop, buyItem, equipItem, openChest, myCheers, setFriendsEnabled, CHEERS,
  loadExams, createExam, deleteExam, saveExamScore, loadSchedule, saveScheduleDay, updateStudent, startTrial,
  completeLesson, loadPlan,
  updateGrade, loadDueWords, taskHelpAvailable,
} from './src/lib/api';
import { remindersSupported, remindersEnabled, rescheduleReminders, setRemindersEnabled } from './src/lib/reminders';

const TABS = [
  { key: 'home', label: 'Сегодня' },
  { key: 'schedule', label: 'Расписание' },
  { key: 'shop', label: 'Магазин' },
  { key: 'progress', label: 'Успехи' },
  { key: 'profile', label: 'Профиль' },
];

const EMPTY_STREAK = { streak: 0, freezes: 0, used_freezes: 0, week: [] };
const EMPTY_SCHEDULE = { 1: [], 2: [], 3: [], 4: [], 5: [] };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ещё проверяем
  const [student, setStudent] = useState(undefined);
  const [topics, setTopics] = useState([]);
  const [learned, setLearned] = useState({});
  const [streakInfo, setStreakInfo] = useState(EMPTY_STREAK);
  const [wordsToday, setWordsToday] = useState(0);
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [shop, setShop] = useState(null);
  const [goalBanner, setGoalBanner] = useState('');
  const [tab, setTab] = useState('home');
  const [lessonTopic, setLessonTopic] = useState(null);

  const [plan, setPlan] = useState({ plus: false, trialUsed: false });
  const [showTask, setShowTask] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [exams, setExams] = useState([]);
  const [examsDone, setExamsDone] = useState({}); // { [examId]: true } — сегодня уже готовился
  const [showExams, setShowExams] = useState(false);
  const [examSession, setExamSession] = useState(null); // { exam, mode, words }
  const [newCheers, setNewCheers] = useState([]); // непрочитанные реакции от друзей
  const [chestType, setChestType] = useState(null); // открыт экран сундука: 'lesson' | 'skin'
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [showPlus, setShowPlus] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [taskReady, setTaskReady] = useState(false); // подключён ли ИИ для разбора заданий
  const [dueWords, setDueWords] = useState([]);
  const [currentTopics, setCurrentTopics] = useState({}); // { [код предмета]: id темы, которую проходят сейчас }
  const [topicsFor, setTopicsFor] = useState(null); // код предмета для экрана «Все темы»
  const [reminders, setReminders] = useState(false);
  const pendingAnswer = useRef(Promise.resolve()); // последний ответ, ещё не записанный в базу // код предмета, для которого открыт экран «Мои слова»
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Кнопку «Разобрать задание» показываем, только если на сервере подключён ИИ.
  useEffect(() => {
    if (session) taskHelpAvailable().then(setTaskReady);
  }, [session]);
  // Настройки этого устройства (озвучка, «скажи вслух», скорость голоса).
  useEffect(() => { loadPrefs().then(setPrefs); }, []);
  function onSavePrefs(p) {
    setPrefs(p);
    savePrefs(p);
  }
  const openPlus = PLUS_ENABLED || plan.plus ? () => setShowPlus(true) : null;

  // После входа: ученик и контент.
  useEffect(() => {
    if (!session) {
      setStudent(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadError('');
        const [s, p] = await Promise.all([getStudent(), loadPlan()]);
        const t = await loadTopics(s?.grade);
        if (cancelled) return;
        setPlan(p);
        setTopics(t);
        setStudent(s);
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Когда ученик известен: прогресс, серия, расписание, магазин.
  const studentId = student?.id;

  // Всё, что относится к ученику. Вызывается при входе и по кнопке «Обновить».
  const loadStudentData = useCallback(async (id) => {
    const [learnedStd, info, today, sch, shopData, due, current, remOn] = await Promise.all([
      loadLearned(id).catch(() => ({})),
      loadStreak(id),
      loadWordsToday(id),
      loadSchedule(id),
      loadShop(id).catch(() => null),
      loadDueWords(id).catch(() => []),
      AsyncStorage.getItem(`kami.current.${id}`).catch(() => null),
      remindersEnabled(),
    ]);
    setDueWords(due);
    myCheers(id).then((c) => setNewCheers(c.filter((x) => !x.seen))).catch(() => {});
    loadExams(id).then(async (list) => {
      setExams(list);
      const done = {};
      for (const e of list) done[e.id] = await isDoneToday(e.id);
      setExamsDone(done);
    }).catch(() => {});
    setCurrentTopics(current ? JSON.parse(current) : {});
    setReminders(remOn);
    if (remOn) rescheduleReminders(sch).catch(() => {});
    setLearned(learnedStd);
    setStreakInfo(info);
    setStudent((s) => (s ? { ...s, streak_freezes: info.freezes } : s));
    setWordsToday(today);
    setSchedule(sch);
    if (shopData) setShop(shopData);
  }, []);

  useEffect(() => {
    if (studentId) loadStudentData(studentId);
  }, [studentId, loadStudentData]);

  // Кнопка «Обновить» и «потянуть вниз»: заново загружает всё с сервера.
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const [s, p] = await Promise.all([getStudent(), loadPlan()]);
      const t = await loadTopics(s?.grade);
      setPlan(p);
      setTopics(t);
      setStudent(s);
      if (s) await loadStudentData(s.id);
    } catch (e) {
      // Нет сети — оставляем то, что уже показано.
    }
    setRefreshing(false);
  }

  // Переводы слов на выбранном языке (русский или английский).
  const en = student?.native_lang === 'en';
  const tr = useCallback((w) => (en && w.en ? { ...w, ru: w.en } : w), [en]);
  const allTopics = useMemo(() => (en ? topics.map((t) => ({ ...t, words: t.words.map(tr) })) : topics), [topics, en, tr]);
  // Темы класса + сессия повторения + подготовка к контрольной.
  const lessonTopics = useMemo(() => {
    const list = [...allTopics, { id: 'review', subject: 'Повторение', title: 'повторение', titleRu: '', words: dueWords.map(tr) }];
    if (examSession) {
      const subj = subjectByCode(examSession.exam.subject_code);
      list.push({
        id: 'exam', subject: subj.es, subjectCode: examSession.exam.subject_code,
        title: examSession.mode === 'practice' ? 'подготовка к контрольной' : 'контрольная', titleRu: '', words: examSession.words,
      });
    }
    return list;
  }, [allTopics, dueWords, tr, examSession]);

  function startExam(exam) {
    const task = todayTask(exam, allTopics, learned);
    if (!task.words.length) return;
    setExamSession({ exam, mode: task.mode, words: task.words });
    setShowExams(false);
    setLessonTopic('exam');
  }

  async function onCreateExam(subject, topicIds, date) {
    const e = await createExam(studentId, subject, topicIds, date);
    setExams((list) => [...list, e].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
  }

  async function onDeleteExam(id) {
    await deleteExam(id).catch(() => {});
    setExams((list) => list.filter((e) => e.id !== id));
  }

  const onAnswer = useCallback(
    async (wordId, correct) => {
      if (correct) setLearned((prev) => ({ ...prev, [wordId]: true }));
      const request = recordAnswer(studentId, wordId, correct);
      pendingAnswer.current = request;
      const res = await request;
      if (!res) return;
      setStudent((s) => ({ ...s, coins: res.coins }));
      setWordsToday(res.words_today);
      if (res.goal_bonus > 0) setGoalBanner(`Цель дня выполнена! +${res.goal_bonus} монет`);
    },
    [studentId]
  );

  async function onCompleteLesson() {
    await pendingAnswer.current; // сначала дождаться записи последнего ответа
    const res = await completeLesson(studentId);
    if (res?.chest) setStudent((s) => ({ ...s, chests_lesson: (s.chests_lesson || 0) + 1 }));
    setStreakInfo(await loadStreak(studentId));
    setDueWords(await loadDueWords(studentId).catch(() => []));
    return res;
  }

  // Сундук: сервер решает, что выпало; обновляем монеты, запас сундуков и вещи.
  async function onOpenChest(type) {
    const res = await openChest(studentId, type);
    setStudent((s) => ({ ...s, coins: res.coins, chests_lesson: res.chests_lesson, chests_skin: res.chests_skin }));
    if (res.type === 'item') setShop((sh) => (sh ? { ...sh, owned: new Set([...sh.owned, res.item.id]) } : sh));
    return res;
  }

  async function setCurrentTopic(code, topicId) {
    const next = { ...currentTopics, [code]: topicId };
    setCurrentTopics(next);
    AsyncStorage.setItem(`kami.current.${studentId}`, JSON.stringify(next)).catch(() => {});
  }

  async function onChangeGrade(grade) {
    await updateGrade(studentId, grade);
    setStudent((s) => ({ ...s, grade }));
    setTopics(await loadTopics(grade));
  }

  async function onToggleReminders(on) {
    setReminders(await setRemindersEnabled(on, schedule));
  }

  async function onBuy(itemId) {
    const res = await buyItem(studentId, itemId);
    setStudent((s) => ({ ...s, coins: res.coins, streak_freezes: res.freezes, kami_color: res.kami_color, avatar: res.avatar, bg: res.bg, chests_lesson: res.chests_lesson, chests_skin: res.chests_skin }));
    setStreakInfo((info) => ({ ...info, freezes: res.freezes }));
    setShop(await loadShop(studentId));
  }

  // Надеть вещь: цвет Ками, аватар или фон.
  async function onEquip(itemId) {
    const kind = shop?.items.find((i) => i.id === itemId)?.kind;
    await equipItem(studentId, itemId);
    const field = { color: 'kami_color', avatar: 'avatar', bg: 'bg' }[kind];
    if (field) setStudent((s) => ({ ...s, [field]: itemId }));
  }

  async function onUpdateStudent(fields) {
    await updateStudent(studentId, fields);
    setStudent((s) => ({ ...s, ...fields }));
  }

  async function onStartTrial() {
    setPlan(await startTrial());
  }

  async function onSaveDay(weekday, codes) {
    const prev = schedule;
    setSchedule((sch) => ({ ...sch, [weekday]: codes }));
    try {
      await saveScheduleDay(studentId, weekday, codes);
      if (reminders) rescheduleReminders({ ...schedule, [weekday]: codes }).catch(() => {});
    } catch (e) {
      setSchedule(prev);
      throw e;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLearned({});
    setStreakInfo(EMPTY_STREAK);
    setSchedule(EMPTY_SCHEDULE);
    setShop(null);
    setPlan({ plus: false, trialUsed: false });
    setShowTask(false);
    setChestType(null);
    setShowFriends(false);
    setNewCheers([]);
    setExams([]);
    setShowExams(false);
    setExamSession(null);
    setShowPlus(false);
    setShowPrivacy(false);
    setDueWords([]);
    setTopicsFor(null);
    setGoalBanner('');
    setTab('home');
  }

  const itemValue = (id) => shop?.items.find((i) => i.id === id)?.value;
  const kamiColor = KAMI_COLORS[student?.kami_color] || (student && itemValue(student.kami_color)) || KAMI_COLORS['color-green'];
  const bg = parseBg((student && itemValue(student.bg)) || colors.bg);
  const avatarValue = (student && itemValue(student.avatar)) || 'person';

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
    screen = (
      <StudentSetupScreen
        onCreated={async (s) => {
          setTopics(await loadTopics(s.grade));
          setStudent(s);
        }}
      />
    );
  } else if (lessonTopic) {
    screen = (
      <LessonScreen
        topics={lessonTopics}
        topicId={lessonTopic}
        review={lessonTopic === 'review'}
        test={lessonTopic === 'exam' && examSession?.mode !== 'practice'}
        onTestScore={async (score) => {
          if (!examSession) return;
          const best = await saveExamScore(examSession.exam.id, score).catch(() => null);
          if (best != null) setExams((list) => list.map((e) => (e.id === examSession.exam.id ? { ...e, best_score: best } : e)));
        }}
        kamiColor={kamiColor}
        prefs={prefs}
        onAnswer={onAnswer}
        onComplete={onCompleteLesson}
        onClose={() => {
          if (lessonTopic === 'exam' && examSession) {
            markDoneToday(examSession.exam.id);
            setExamsDone((d) => ({ ...d, [examSession.exam.id]: true }));
            setExamSession(null);
          }
          setLessonTopic(null);
        }}
        onOpenChest={() => { setLessonTopic(null); setExamSession(null); setChestType('lesson'); }}
      />
    );
  } else if (chestType) {
    screen = (
      <ChestScreen
        key={chestType}
        type={chestType}
        left={chestType === 'lesson' ? student.chests_lesson : student.chests_skin}
        shopItems={shop?.items || []}
        onOpen={onOpenChest}
        onEquip={onEquip}
        onClose={() => setChestType(null)}
      />
    );
  } else if (showExams) {
    screen = (
      <ExamScreen
        topics={allTopics}
        exams={exams}
        plan={plan}
        kamiColor={kamiColor}
        onCreate={onCreateExam}
        onDelete={onDeleteExam}
        onStart={startExam}
        onOpenPlus={openPlus}
        onBack={() => setShowExams(false)}
      />
    );
  } else if (showFriends) {
    screen = (
      <FriendsScreen
        student={student}
        onBack={() => { setShowFriends(false); setNewCheers([]); }}
      />
    );
  } else if (showPrivacy) {
    screen = <PrivacyScreen onBack={() => setShowPrivacy(false)} />;
  } else if (showPlus) {
    screen = <PlusScreen plan={plan} onBack={() => setShowPlus(false)} onStartTrial={onStartTrial} />;
  } else if (showTask && taskReady) {
    screen = (
      <TaskScreen
        student={student}
        kamiColor={kamiColor}
        plan={plan}
        onOpenPlus={openPlus}
        onBack={() => setShowTask(false)}
      />
    );
  } else if (topicsFor) {
    screen = (
      <TopicsScreen
        subjectCode={topicsFor}
        topics={topics.filter((t) => t.subjectCode === topicsFor)}
        learned={learned}
        currentId={currentTopics[topicsFor]}
        onSetCurrent={(id) => setCurrentTopic(topicsFor, id)}
        onStudy={setLessonTopic}
        onBack={() => setTopicsFor(null)}
      />
    );
  } else {
    showTabs = true;
    if (tab === 'schedule') {
      screen = <ScheduleScreen schedule={schedule} onSaveDay={onSaveDay} />;
    } else if (tab === 'shop') {
      screen = (
        <ShopScreen
          student={student}
          shop={shop}
          plan={plan}
          kamiColor={kamiColor}
          onOpenChest={setChestType}
          onBuy={onBuy}
          onEquip={onEquip}
          onOpenPlus={openPlus}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      );
    } else if (tab === 'progress') {
      screen = (
        <ProgressScreen
          topics={allTopics}
          exams={exams}
          student={student}
          learned={learned}
          streakInfo={streakInfo}
          wordsToday={wordsToday}
          plan={plan}
          kamiColor={kamiColor}
          onOpenPlus={openPlus}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      );
    } else if (tab === 'profile') {
      screen = (
        <ProfileScreen
          student={student}
          plan={plan}
          shop={shop}
          kamiColor={kamiColor}
          streak={streakInfo.streak}
          todayDone={!!streakInfo.today_done}
          learnedTotal={Object.keys(learned).length}
          prefs={prefs}
          onSavePrefs={onSavePrefs}
          onEquip={onEquip}
          onChangeGrade={onChangeGrade}
          onUpdateStudent={onUpdateStudent}
          reminders={reminders}
          remindersSupported={remindersSupported}
          onToggleReminders={onToggleReminders}
          onOpenPlus={openPlus}
          onOpenPrivacy={() => setShowPrivacy(true)}
          onOpenShop={() => setTab('shop')}
          onOpenFriends={() => setShowFriends(true)}
          onToggleFriends={async (on) => { await setFriendsEnabled(studentId, on); setStudent((s) => ({ ...s, friends_enabled: on })); }}
          onSignOut={signOut}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      );
    } else {
      screen = (
        <HomeScreen
          topics={allTopics}
          student={student}
          kamiColor={kamiColor}
          learned={learned}
          streakInfo={streakInfo}
          wordsToday={wordsToday}
          goalBanner={goalBanner}
          schedule={schedule}
          onStartTopic={(id) => { setGoalBanner(''); setLessonTopic(id); }}
          onOpenTask={taskReady ? () => setShowTask(true) : null}
          onOpenChest={setChestType}
          exams={exams}
          examsDone={examsDone}
          onOpenExams={() => setShowExams(true)}
          onStartExam={startExam}
          newCheers={student.friends_enabled ? newCheers : []}
          cheerLabels={CHEERS}
          onOpenFriends={() => setShowFriends(true)}
          onOpenSchedule={() => setTab('schedule')}
          refreshing={refreshing}
          onRefresh={refresh}
          currentTopics={currentTopics}
          onOpenTopics={setTopicsFor}
          dueCount={dueWords.length}
          onStartReview={() => setLessonTopic('review')}
        />
      );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: bg.color || colors.bg }]} edges={['top', 'bottom']}>
        {!!bg.pattern && <PatternLayer pattern={bg.pattern} />}
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}><ErrorBoundary>{screen}</ErrorBoundary></View>
        {showTabs && (
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(t.key)}
                  style={styles.tab}
                >
                  {t.key === 'profile' && avatarValue !== 'person' ? (
                    <View style={[styles.tabAvatar, active && styles.tabAvatarActive]}>
                      <UserAvatar value={avatarValue} size={24} kamiColor={kamiColor} />
                    </View>
                  ) : (
                    <TabIcon name={t.key} color={active ? colors.green : colors.muted} />
                  )}
                  <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{t.label}</Text>
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
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4, paddingHorizontal: 2 },
  tabAvatar: { borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  tabAvatarActive: { borderColor: colors.green },
  tabText: { fontSize: 11, color: colors.muted },
  tabTextActive: { color: colors.green, fontWeight: '700' },
});
