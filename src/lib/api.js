// Все запросы к базе в одном месте. Экраны не обращаются к Supabase напрямую.
// Монеты, серия и покупки меняются только через функции в базе (rpc) — так их нельзя накрутить.
import { supabase } from './supabase';
import { topics as localTopics } from '../data/content';

const STUDENT_FIELDS = 'id, nickname, grade, native_lang, coins, streak_freezes, kami_color, daily_goal';

// Темы со словами. Если база недоступна — берём встроенный контент, чтобы приложение работало.
// Язык озвучки слова: в Valencià слова валенсийские, остальное — испанский.
export const langFor = (subjectCode) => (subjectCode === 'val' ? 'ca-ES' : 'es-ES');

// Темы класса ученика + общие темы ('ESO'). Если по предмету нет тем для этого класса
// (например, Biología во 2º ESO), берём темы того же предмета из другого класса.
export async function loadTopics(grade = '1º ESO') {
  const { data, error } = await supabase
    .from('topics')
    .select('id, grade, subject, subject_code, title, title_ru, sort, words(id, es, ru, en, teacher, sort)')
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
  const [items, owned] = await Promise.all([
    supabase.from('shop_items').select('id, kind, title_ru, price, value, sort, plus_only').order('sort'),
    supabase.from('student_items').select('item_id').eq('student_id', studentId),
  ]);
  if (items.error) throw items.error;
  return {
    items: items.data,
    owned: new Set((owned.data || []).map((r) => r.item_id)),
  };
}

const SHOP_ERRORS = {
  'not enough coins': 'Не хватает монет. Учи слова — за каждое верное слово 1 монета.',
  'max freezes': 'Больше двух заморозок держать нельзя.',
  'already owned': 'Это уже куплено.',
  'plus only': 'Этот цвет — только для Ками Плюс.',
};

// Покупка. Возвращает { coins, freezes, kami_color } или бросает ошибку с понятным текстом.
export async function buyItem(studentId, itemId) {
  const { data, error } = await supabase.rpc('buy_item', { p_student: studentId, p_item: itemId });
  if (error) throw new Error(SHOP_ERRORS[error.message] || error.message);
  return data;
}

export async function equipColor(studentId, itemId) {
  const { error } = await supabase.rpc('equip_color', { p_student: studentId, p_item: itemId });
  if (error) throw new Error(error.message);
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
      throw new Error('В бесплатной версии можно добавить до 50 своих слов. С Ками Плюс — без лимита.');
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
  limit: 'На сегодня разборы закончились. Бесплатно — 3 в день, с Ками Плюс — 15.',
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
  if (error) throw new Error(TASK_ERRORS.failed);
  if (data.error) throw new Error(TASK_ERRORS[data.error] || TASK_ERRORS.failed);
  return data;
}

// Урок пройден до конца — именно это засчитывает день в серию.
export async function completeLesson(studentId) {
  const { data, error } = await supabase.rpc('complete_lesson', { p_student: studentId });
  if (error) return null;
  return data;
}

// ----- Подписка «Ками Плюс» -----

// { plus: true/false, source: 'comp'|'app_store'|'google_play'|null, expiresAt }
export async function loadPlan() {
  const { data } = await supabase.from('parent_plans').select('plan, source, expires_at').maybeSingle();
  const active = !!data && data.plan === 'plus' && (!data.expires_at || new Date(data.expires_at) > new Date());
  return { plus: active, source: data?.source || null, expiresAt: data?.expires_at || null };
}

// Трудные слова для отчёта родителям: где больше всего ошибок.
export async function loadHardWords(studentId) {
  const [std, own] = await Promise.all([
    supabase.from('progress').select('wrong_count, correct_count, words(es, ru)')
      .eq('student_id', studentId).gt('wrong_count', 0).order('wrong_count', { ascending: false }).limit(5),
    supabase.from('custom_words').select('wrong_count, correct_count, es, translation')
      .eq('student_id', studentId).gt('wrong_count', 0).order('wrong_count', { ascending: false }).limit(5),
  ]);
  const list = [
    ...(std.data || []).map((r) => ({ es: r.words?.es, ru: r.words?.ru, wrong: r.wrong_count, right: r.correct_count })),
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
  const { data } = await supabase.from('progress').select('word_id, due_at, words(id, es, ru, en, teacher, topics(subject_code))')
    .eq('student_id', studentId).lte('due_at', new Date().toISOString()).order('due_at').limit(15);
  return (data || []).filter((r) => r.words).map(({ words: w }) => ({
    id: w.id, es: w.es, ru: w.ru, en: w.en, teacher: w.teacher, lang: langFor(w.topics?.subject_code),
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
  if (error || !data?.ok) throw new Error('Не получилось удалить аккаунт. Попробуйте позже.');
  await supabase.auth.signOut();
}
