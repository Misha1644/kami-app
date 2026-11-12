// Все запросы к базе в одном месте. Экраны не обращаются к Supabase напрямую.
// Монеты, серия и покупки меняются только через функции в базе (rpc) — так их нельзя накрутить.
import { supabase } from './supabase';
import { topics as localTopics } from '../data/content';

const STUDENT_FIELDS = 'id, nickname, grade, native_lang, coins, streak_freezes, kami_color, daily_goal';

// Темы со словами. Если база недоступна — берём встроенный контент, чтобы приложение работало.
export async function loadTopics() {
  const { data, error } = await supabase
    .from('topics')
    .select('id, subject, subject_code, title, title_ru, sort, words(id, es, ru, en, teacher, sort)')
    .order('sort')
    .order('sort', { referencedTable: 'words' });
  if (error || !data?.length) return localTopics;
  return data.map((t) => ({
    id: t.id,
    subject: t.subject,
    subjectCode: t.subject_code,
    title: t.title,
    titleRu: t.title_ru,
    words: t.words,
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
  const today = new Date().toISOString().slice(0, 10);
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
    supabase.from('shop_items').select('id, kind, title_ru, price, value, sort').order('sort'),
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
