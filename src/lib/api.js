// Все запросы к базе в одном месте. Экраны не обращаются к Supabase напрямую.
import { supabase } from './supabase';
import { topics as localTopics } from '../data/content';

const LESSON_SLOTS = { 'mat-fracciones': '1-й урок', 'bio-celula': '3-й урок' };

// Темы со словами. Если база недоступна — берём встроенный контент, чтобы приложение работало.
export async function loadTopics() {
  const { data, error } = await supabase
    .from('topics')
    .select('id, subject, title, title_ru, sort, words(id, es, ru, en, teacher, sort)')
    .order('sort')
    .order('sort', { referencedTable: 'words' });
  if (error || !data?.length) return localTopics;
  return data.map((t) => ({
    id: t.id,
    subject: t.subject,
    title: t.title,
    titleRu: t.title_ru,
    lessonSlot: LESSON_SLOTS[t.id] || '',
    words: t.words,
  }));
}

export async function getStudent() {
  const { data, error } = await supabase
    .from('students')
    .select('id, nickname, grade, native_lang')
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
    .select('id, nickname, grade, native_lang')
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

export async function recordAnswer(studentId, wordId, correct) {
  const { error } = await supabase.rpc('record_answer', { p_student: studentId, p_word: wordId, p_correct: correct });
  if (error) console.warn('record_answer failed', error.message);
}

// Серия: сколько дней подряд (до сегодня или вчера) ученик занимался.
export async function loadStreak(studentId) {
  const { data, error } = await supabase
    .from('activity_days')
    .select('day')
    .eq('student_id', studentId)
    .order('day', { ascending: false })
    .limit(60);
  if (error || !data.length) return 0;
  const days = new Set(data.map((r) => r.day));
  const iso = (d) => d.toISOString().slice(0, 10);
  const cursor = new Date();
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
