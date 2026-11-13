// Режим «Контрольная»: план подготовки по дням.
//   больше 1 дня до контрольной — подготовка: 10 слов (сначала невыученные, потом по кругу);
//   за 1 день — пробная контрольная: до 20 слов без карточек, оценка 0–10;
//   в день контрольной — быстрое повторение и «¡Suerte!».
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from '../data/facts';
import { tr } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');

export function daysUntil(dateStr, today = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86400000);
}

export function whenText(days) {
  if (days === 0) return tr('сегодня');
  if (days === 1) return tr('завтра');
  if (days < 5) return tr('через {0} дня', days);
  return tr('через {0} дней', days);
}

// Все слова контрольной из выбранных тем.
export function examWords(exam, topics) {
  const byId = Object.fromEntries(topics.map((t) => [t.id, t]));
  return exam.topic_ids.flatMap((id) => byId[id]?.words || []);
}

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Задание на сегодня: { mode: 'practice' | 'test' | 'today', words }.
export function todayTask(exam, topics, learned) {
  const days = daysUntil(exam.exam_date);
  const all = examWords(exam, topics);
  if (days <= 0) return { mode: 'today', words: shuffle(all).slice(0, 10) };
  if (days === 1) return { mode: 'test', words: shuffle(all).slice(0, 20) };
  // Подготовка: невыученные вперёд, затем остальные — со сдвигом по дням, чтобы каждый день были разные.
  const fresh = all.filter((w) => !learned[w.id]);
  const known = all.filter((w) => learned[w.id]);
  const shift = (days * 7) % Math.max(1, known.length);
  const rotated = [...known.slice(shift), ...known.slice(0, shift)];
  return { mode: 'practice', words: [...fresh, ...rotated].slice(0, 10) };
}

// Отметка «сегодня уже готовился» (на этом устройстве).
const doneKey = (examId) => `kami.exam.${examId}.${dayKey()}`;
export async function isDoneToday(examId) {
  try { return (await AsyncStorage.getItem(doneKey(examId))) === '1'; } catch (e) { return false; }
}
export async function markDoneToday(examId) {
  try { await AsyncStorage.setItem(doneKey(examId), '1'); } catch (e) { /* не страшно */ }
}

export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
