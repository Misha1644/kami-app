// Каникулы: подсказки дат и подбор слов для каникулярного повторения.
// Правила серии на каникулах считает сервер (миграция 032), здесь — только то, что показать и повторить.
import { GRADES } from './content';
import { tr } from '../i18n';

// Официальный школьный календарь Комунидад Валенсиана (Conselleria d'Educació), 2026–27:
// Рождество 22.12.2026–06.01.2027, Пасха 25.03–05.04.2027, учёба до 18.06.2027.
// Начало следующего учебного года ещё не объявлено — для лета берём 7 сентября (примерно).
// В некоторых городах (Аликанте, Эльче) даты немного другие, поэтому их можно поменять.
export const VALENCIA_HOLIDAYS = [
  { key: 'navidad-2026', kind: 'short', name: 'Рождество', start: '2026-12-22', end: '2027-01-06' },
  { key: 'pascua-2027', kind: 'short', name: 'Пасха', start: '2027-03-25', end: '2027-04-05' },
  { key: 'verano-2027', kind: 'summer', name: 'Лето', start: '2027-06-19', end: '2027-09-07', approx: true },
];

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' → '22.12.2026'
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// '22.12.2026' → 'YYYY-MM-DD' (или null, если дата неправильная)
export function parseDate(text) {
  const m = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/.exec(text || '');
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Подсказки: ещё не прошедшие и не пересекающиеся с уже добавленными каникулами.
export function suggestions(holidays) {
  const today = todayIso();
  return VALENCIA_HOLIDAYS.filter((s) => s.end >= today && !holidays.some((h) => h.start_date <= s.end && h.end_date >= s.start));
}

export function nextGrade(grade) {
  const i = GRADES.indexOf(grade);
  return i >= 0 && i < GRADES.length - 1 ? GRADES[i + 1] : null;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Предметы сегодняшнего дня по расписанию (в выходные — все предметы из расписания).
export function todayCodes(schedule) {
  const wd = new Date().getDay();
  const day = wd >= 1 && wd <= 5 ? schedule[wd] || [] : Object.values(schedule).flat();
  return [...new Set(day)];
}

// Слова для каникул.
//   review         — повторение выученного (сначала те, что пора повторить);
//   summer_review  — сжатое повторение года по сегодняшним предметам: сначала выученное, потом остальное из тем года;
// Возвращает до 10 слов.
export function holidayWords(mode, { topics, learned, dueWords, schedule }) {
  const all = topics.flatMap((t) => t.words.map((w) => ({ ...w, subjectCode: t.subjectCode })));
  if (mode === 'summer_review') {
    const codes = todayCodes(schedule);
    const mine = codes.length ? all.filter((w) => codes.includes(w.subjectCode)) : all;
    const pool = [...shuffle(mine.filter((w) => learned[w.id])), ...shuffle(mine.filter((w) => !learned[w.id]))];
    return (pool.length ? pool : shuffle(all)).slice(0, 10);
  }
  const due = dueWords || [];
  const seen = new Set(due.map((w) => w.id));
  const rest = shuffle(all.filter((w) => learned[w.id] && !seen.has(w.id)));
  const pool = [...due, ...rest];
  return (pool.length ? pool : shuffle(all)).slice(0, 10);
}

// Подготовка к новому классу: первая тема следующего класса по каждому сегодняшнему предмету (до 10 слов).
export function prepWords(nextTopics, schedule) {
  const codes = todayCodes(schedule);
  const firsts = [];
  for (const code of codes.length ? codes : [...new Set(nextTopics.map((t) => t.subjectCode))]) {
    const t = nextTopics.find((x) => x.subjectCode === code);
    if (t) firsts.push(...t.words.slice(0, 4));
  }
  return firsts.slice(0, 10);
}

export const HOLIDAY_TITLE = {
  review: () => tr('Каникулярное повторение'),
  summer_review: () => tr('Летнее повторение'),
  summer_prep: () => tr('Подготовка к новому классу'),
};
