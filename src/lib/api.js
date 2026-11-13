// Все запросы к базе в одном месте. Экраны не обращаются к Supabase напрямую.
// Монеты, серия и покупки меняются только через функции в базе (rpc) — так их нельзя накрутить.
import { supabase } from './supabase';
import { topics as localTopics } from '../data/content';
import { tr } from '../i18n';

const STUDENT_FIELDS = 'id, nickname, grade, native_lang, coins, streak_freezes, kami_color, daily_goal, avatar, bg, chests_lesson, chests_skin, friends_enabled';

// Темы со словами. Если база недоступна — берём встроенный контент, чтобы приложение работало.
// Язык озвучки слова: в Valencià слова валенсийские, остальное — испанский.
export const langFor = (subjectCode) => (subjectCode === 'val' ? 'ca-ES' : 'es-ES');

// Темы класса ученика + общие темы ('ESO'). Если по предмету нет тем для этого класса
// (например, Biología во 2º ESO), берём темы того же предмета из другого класса.
export async function loadTopics(grade = '1º ESO') {
  const { data, error } = await supabase
    .from('topics')
    .select('id, grade, subject, subject_code, title, title_ru, title_en, title_ar, sort, words(id, es, ru, en, ar, teacher, sort)')
    .order('sort')
    .order('sort', { referencedTable: 'words' });
  if (error || !data?.length) return grade === '1º ESO' ? localTopics : [];
  const mine = data.filter((t) => t.grade === grade || t.grade === 'ESO');
  const covered = new Set(mine.map((t) => t.subject_code));
  const borrowed = data.filter((t) => !covered.has(t.subject_code) && t.grade !== grade && t.grade !== 'ESO');
  return [...mine, ...borrowed].map((t) => ({
    id: t.id,
    subject: t.subject,
    subjectCode: t.subject_code,
    title: t.title,
    titleRu: t.title_ru,
    titleEn: t.title_en,
    titleAr: t.title_ar,
    words: (t.words || []).map((w) => ({ ...w, lang: langFor(t.subject_code) })),
  }));
}

export async function getStudent() {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_FIELDS)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createStudent({ nickname, nativeLang, grade = '1º ESO' }) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('students')
    .insert({ parent_id: userData.user.id, nickname: nickname.trim(), native_lang: nativeLang, grade })
    .select(STUDENT_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

// { [wordId]: true } для слов, на которые ученик хоть раз ответил верно.
export async function loadLearned(studentId) {
  const { data, error } = await supabase
    .from('progress')
    .select('word_id')
    .eq('student_id', studentId)
    .not('learned_at', 'is', null);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.word_id, true]));
}

// Ответ ученика. Возвращает { coins, words_today, daily_goal, goal_bonus } или null при ошибке.
export async function recordAnswer(studentId, wordId, correct) {
  const { data, error } = await supabase.rpc('record_answer', { p_student: studentId, p_word: wordId, p_correct: correct });
  if (error) {
    console.warn('record_answer failed', error.message);
    return null;
  }
  return data;
}

// Серия: { streak, freezes, used_freezes, week: [{ day, status: 'done'|'frozen'|'none' }] }.
// Если были пропуски, на которые хватает заморозок, база тратит их и сохраняет серию.
export async function loadStreak(studentId) {
  const { data, error } = await supabase.rpc('get_streak', { p_student: studentId });
  if (error) return { streak: 0, freezes: 0, used_freezes: 0, week: [] };
  return data;
}

// Сколько слов выучено сегодня (для цели дня).
export async function loadWordsToday(studentId) {
  // «Сегодня» — по Мадриду, как в базе.
  const { data: today } = await supabase.rpc('kami_today');
  if (!today) return 0;
  const { data } = await supabase
    .from('activity_days')
    .select('words_done')
    .eq('student_id', studentId)
    .eq('day', today)
    .maybeSingle();
  return data?.words_done || 0;
}

// Магазин: товары и то, что уже куплено.
export async function loadShop(studentId) {
  const [items, owned, today] = await Promise.all([
    supabase.from('shop_items').select('id, kind, title_ru, price, value, sort, plus_only').order('sort'),
    supabase.from('student_items').select('item_id').eq('student_id', studentId),
    supabase.rpc('shop_today'),
  ]);
  if (items.error) throw items.error;
  // Витрина дня: { [id]: { tag: 'new' | 'back' | null, featured } }
  const rotation = {};
  for (const r of today.data?.items || []) rotation[r.id] = { tag: r.tag, featured: r.featured };
  return {
    items: items.data,
    owned: new Set((owned.data || []).map((r) => r.item_id)),
    rotation,
    rotationDay: today.data?.day || null,
    nextAt: today.data?.next_at || null,
  };
}

const SHOP_ERRORS = {
  'not enough coins': 'Не хватает монет. Учи слова — за каждое верное слово 1 монета.',
  'max freezes': 'Больше двух заморозок держать нельзя.',
  'already owned': 'Это уже куплено.',
  'plus only': 'Эта вещь — только для Ками Плюс.',
  'not in shop': 'Эта вещь сегодня не продаётся — загляни завтра, витрина обновляется каждый день!',
};

// Покупка. Возвращает { coins, freezes, kami_color } или бросает ошибку с понятным текстом.
export async function buyItem(studentId, itemId) {
  const { data, error } = await supabase.rpc('buy_item', { p_student: studentId, p_item: itemId });
  if (error) throw new Error(tr(SHOP_ERRORS[error.message] || error.message));
  return data;
}

// Надеть купленную вещь: цвет Ками, аватар или фон.
export async function equipItem(studentId, itemId) {
  const { error } = await supabase.rpc('equip_item', { p_student: studentId, p_item: itemId });
  if (error) throw new Error(tr('Не получилось. Попробуй ещё раз.'));
}
export const equipColor = equipItem;

// Настройки ученика, которые он меняет сам: цель дня, язык переводов, имя.
export async function updateStudent(studentId, fields) {
  const allowed = {};
  for (const k of ['daily_goal', 'native_lang', 'nickname']) if (k in fields) allowed[k] = fields[k];
  const { error } = await supabase.from('students').update(allowed).eq('id', studentId);
  if (error) throw new Error(tr('Не получилось сохранить. Попробуй ещё раз.'));
}

// Активность по дням за последние N дней: [{ day, words, lessons }].
export async function loadActivity(studentId, days = 14) {
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const { data } = await supabase.from('activity_days').select('day, words_done, lessons_done')
    .eq('student_id', studentId).gte('day', from.toISOString().slice(0, 10)).order('day');
  return (data || []).map((r) => ({ day: r.day, words: r.words_done, lessons: r.lessons_done }));
}

// Расписание: { 1: ['mat', 'len', ...], ..., 5: [...] } — коды предметов по порядку уроков.
export async function loadSchedule(studentId) {
  const { data, error } = await supabase
    .from('schedule')
    .select('weekday, slot, subject_code')
    .eq('student_id', studentId)
    .order('weekday')
    .order('slot');
  const result = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  if (error) return result;
  data.forEach((r) => result[r.weekday].push(r.subject_code));
  return result;
}

// Сохранить уроки одного дня целиком.
export async function saveScheduleDay(studentId, weekday, codes) {
  const del = await supabase.from('schedule').delete().eq('student_id', studentId).eq('weekday', weekday);
  if (del.error) throw del.error;
  if (!codes.length) return;
  const rows = codes.map((code, i) => ({ student_id: studentId, weekday, slot: i + 1, subject_code: code }));
  const ins = await supabase.from('schedule').insert(rows);
  if (ins.error) throw ins.error;
}

// ----- Свои слова ученика -----

export async function loadCustomWords(studentId) {
  const { data, error } = await supabase
    .from('custom_words')
    .select('id, subject_code, es, translation, example, learned_at')
    .eq('student_id', studentId)
    .order('created_at');
  if (error) return [];
  return data;
}

export async function addCustomWord(studentId, { subjectCode, es, translation, example }) {
  const { data, error } = await supabase
    .from('custom_words')
    .insert({
      student_id: studentId,
      subject_code: subjectCode,
      es: es.trim(),
      translation: translation.trim(),
      example: example?.trim() ? example.trim() : null,
    })
    .select('id, subject_code, es, translation, example, learned_at')
    .single();
  if (error) {
    if (error.message?.includes('free words limit')) {
      throw new Error(tr('В бесплатной версии можно добавить до 50 своих слов. С Ками Плюс — без лимита.'));
    }
    throw error;
  }
  return data;
}

export async function deleteCustomWord(wordId) {
  const { error } = await supabase.from('custom_words').delete().eq('id', wordId);
  if (error) throw error;
}

// Ответ по своему слову: монета только при первом правильном ответе.
export async function recordCustomAnswer(studentId, wordId, correct) {
  const { data, error } = await supabase.rpc('record_custom_answer', { p_student: studentId, p_word: wordId, p_correct: correct });
  if (error) {
    console.warn('record_custom_answer failed', error.message);
    return null;
  }
  return data;
}

// ----- Разбор задания по фото или файлу -----

const TASK_ERRORS = {
  limit: 'На сегодня разборы закончились. С Ками Плюс — до 15 в день. Без Плюса разбор недоступен.',
  not_configured: 'Разбор фото ещё не включён: нужно добавить ключ ИИ в Supabase.',
  too_large: 'Файл слишком большой. Попробуй фото поменьше или PDF до 5 МБ.',
  forbidden: 'Не удалось проверить аккаунт. Выйди и войди снова.',
  ai_failed: 'Ками не смог прочитать задание. Попробуй ещё раз или сделай фото чётче.',
  failed: 'Что-то пошло не так. Попробуй ещё раз.',
  bad_request: 'Этот тип файла не подходит. Нужны фото (JPG, PNG) или PDF.',
};

// Возвращает { result: { original, meaning, keywords: [{es, tr}], phrase_es, phrase_tr, not_a_task }, left }.
export async function explainTask(studentId, { mediaType, base64 }) {
  const { data, error } = await supabase.functions.invoke('explain-task', {
    body: { studentId, mediaType, data: base64 },
  });
  if (error) throw new Error(tr(TASK_ERRORS.failed));
  if (data.error) throw new Error(tr(TASK_ERRORS[data.error] || TASK_ERRORS.failed));
  return data;
}

// Урок пройден до конца — именно это засчитывает день в серию.
// Открыть сундук: type = 'lesson' | 'skin'. Что выпало — решает сервер.
export async function openChest(studentId, type) {
  const { data, error } = await supabase.rpc('open_chest', { p_student: studentId, p_type: type });
  if (error) throw new Error(error.message.includes('no chest') ? tr('Сундуков не осталось.') : tr('Не получилось открыть. Попробуй ещё раз.'));
  return data;
}

export async function completeLesson(studentId) {
  const { data, error } = await supabase.rpc('complete_lesson', { p_student: studentId });
  if (error) return null;
  return data;
}

// ----- Подписка «Ками Плюс» -----

// { plus: true/false, source: 'comp'|'app_store'|'google_play'|null, expiresAt }
// Статус подписки: { plus, source, expiresAt, trialUsed }. source: comp | trial | app_store | google_play.
export async function loadPlan() {
  const { data, error } = await supabase.rpc('plan_status');
  if (error || !data) return { plus: false, source: null, expiresAt: null, trialUsed: false };
  return { plus: !!data.plus, source: data.source, expiresAt: data.expires_at, trialUsed: !!data.trial_used };
}

// Пробный период Плюса (один раз на аккаунт).
export async function startTrial() {
  const { error } = await supabase.rpc('start_trial');
  if (error) {
    if (error.message.includes('trial used')) throw new Error(tr('Пробный период уже был на этом аккаунте.'));
    if (error.message.includes('already plus')) throw new Error(tr('Ками Плюс уже подключён.'));
    throw new Error(tr('Не получилось включить пробный период. Попробуйте позже.'));
  }
  return loadPlan();
}

// Трудные слова для отчёта родителям: где больше всего ошибок.
export async function loadHardWords(studentId) {
  const [std, own] = await Promise.all([
    supabase.from('progress').select('wrong_count, correct_count, words(es, ru, en, ar)')
      .eq('student_id', studentId).gt('wrong_count', 0).order('wrong_count', { ascending: false }).limit(5),
    supabase.from('custom_words').select('wrong_count, correct_count, es, translation')
      .eq('student_id', studentId).gt('wrong_count', 0).order('wrong_count', { ascending: false }).limit(5),
  ]);
  const list = [
    ...(std.data || []).map((r) => ({ es: r.words?.es, ru: r.words?.ru, en: r.words?.en, ar: r.words?.ar, wrong: r.wrong_count, right: r.correct_count })),
    ...(own.data || []).map((r) => ({ es: r.es, ru: r.translation, wrong: r.wrong_count, right: r.correct_count })),
  ];
  return list.filter((w) => w.es).sort((a, b) => b.wrong - a.wrong).slice(0, 5);
}

// Смена класса ученика (1º ESO / 2º ESO).
export async function updateGrade(studentId, grade) {
  const { error } = await supabase.from('students').update({ grade }).eq('id', studentId);
  if (error) throw error;
}

// Слова, которые пора повторить (умное повторение): обычные и свои. Не больше 15 за раз.
export async function loadDueWords(studentId) {
  const { data } = await supabase.from('progress').select('word_id, due_at, words(id, es, ru, en, ar, teacher, topics(subject_code))')
    .eq('student_id', studentId).lte('due_at', new Date().toISOString()).order('due_at').limit(15);
  return (data || []).filter((r) => r.words).map(({ words: w }) => ({
    id: w.id, es: w.es, ru: w.ru, en: w.en, ar: w.ar, teacher: w.teacher, lang: langFor(w.topics?.subject_code),
  }));
}

// Подключён ли ИИ для разбора заданий (без расхода лимита). Если нет — вкладку прячем.
export async function taskHelpAvailable() {
  try {
    const { data, error } = await supabase.functions.invoke('explain-task', { body: { ping: true } });
    return !error && !!data?.configured;
  } catch (e) {
    return false;
  }
}

// Удаление аккаунта родителя вместе со всеми данными детей.
export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error || !data?.ok) throw new Error(tr('Не получилось удалить аккаунт. Попробуйте позже.'));
  await supabase.auth.signOut();
}

// ----- Друзья (по коду; общение — только готовыми реакциями) -----
export const CHEERS = {
  hola: '👋 ¡Hola!',
  animo: '💪 ¡Ánimo!',
  bravo: '👏 ¡Bravo!',
  fuego: '🔥 ¡Qué racha!',
  genial: '⭐ ¡Genial!',
  vamos: '🚀 ¡Vamos!',
  gracias: '🙏 ¡Gracias!',
  chocala: '✋ ¡Choca esos cinco!',
};

const FRIEND_ERRORS = {
  'not found': 'Такого кода нет. Проверь буквы и цифры.',
  self: 'Это твой собственный код 🙂',
  already: 'Заявка уже отправлена или вы уже друзья.',
  'too many': 'На сегодня хватит — попробуй завтра.',
  'friends disabled': 'Друзья выключены в настройках для взрослых.',
  'not friends': 'Вы больше не друзья.',
};
const friendError = (e) => new Error(tr(FRIEND_ERRORS[e?.message]) || tr('Не получилось. Попробуй ещё раз.'));

export async function myFriendCode(studentId) {
  const { data, error } = await supabase.rpc('my_friend_code', { p_student: studentId });
  if (error) throw friendError(error);
  return data;
}
export async function addFriend(studentId, code) {
  const { data, error } = await supabase.rpc('add_friend', { p_student: studentId, p_code: code });
  if (error) throw friendError(error);
  return data;
}
export async function friendAction(studentId, otherId, action) {
  const { error } = await supabase.rpc('friend_action', { p_student: studentId, p_other: otherId, p_action: action });
  if (error) throw friendError(error);
}
export async function listFriends(studentId) {
  const { data, error } = await supabase.rpc('list_friends', { p_student: studentId });
  if (error) throw friendError(error);
  return data || [];
}
export async function sendCheer(studentId, friendId, cheer) {
  const { error } = await supabase.rpc('send_cheer', { p_student: studentId, p_friend: friendId, p_cheer: cheer });
  if (error) throw friendError(error);
}
export async function myCheers(studentId, markSeen = false) {
  const { data, error } = await supabase.rpc('my_cheers', { p_student: studentId, p_mark_seen: markSeen });
  if (error) return [];
  return data || [];
}
export async function setFriendsEnabled(studentId, on) {
  const { error } = await supabase.from('students').update({ friends_enabled: on }).eq('id', studentId);
  if (error) throw new Error(tr('Не получилось сохранить.'));
}

// ----- Контрольные -----
export async function loadExams(studentId) {
  const from = new Date();
  from.setDate(from.getDate() - 3);
  const { data } = await supabase.from('exams').select('id, subject_code, topic_ids, exam_date, best_score')
    .eq('student_id', studentId).gte('exam_date', from.toISOString().slice(0, 10)).order('exam_date');
  return data || [];
}
export async function createExam(studentId, subjectCode, topicIds, examDate) {
  const { data, error } = await supabase.from('exams')
    .insert({ student_id: studentId, subject_code: subjectCode, topic_ids: topicIds, exam_date: examDate })
    .select('id, subject_code, topic_ids, exam_date, best_score').single();
  if (error) throw new Error(tr('Не получилось сохранить контрольную. Попробуй ещё раз.'));
  return data;
}
export async function deleteExam(examId) {
  const { error } = await supabase.from('exams').delete().eq('id', examId);
  if (error) throw new Error(tr('Не получилось удалить.'));
}
export async function saveExamScore(examId, score) {
  const { data } = await supabase.rpc('save_exam_score', { p_exam: examId, p_score: score });
  return data;
}

// ----- Еженедельный отчёт на почту (Плюс) -----
export async function loadWeeklyEmail() {
  const { data } = await supabase.from('report_prefs').select('weekly_email').maybeSingle();
  return data ? !!data.weekly_email : true;
}

export async function setWeeklyEmail(on) {
  const { error } = await supabase.rpc('set_weekly_email', { p_on: on });
  if (error) throw new Error(tr('Не получилось сохранить.'));
}
