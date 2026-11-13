// Учебный контент первой версии: 1º ESO, две темы.
// Позже эти данные переедут в базу Supabase (таблицы topics и words).
// У каждого слова: испанский термин, перевод (ru, en) и фраза, как её скажет учитель.
import { tr, getLang } from '../i18n';

export const GRADE = '1º ESO';
export const GRADES = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
];

// В начальной школе (Primaria) часть предметов называется иначе, а некоторых нет вовсе.
const PRIMARIA_NAMES = {
  bio: { es: 'Ciencias de la Naturaleza', ru: 'Естествознание' },
  geo: { es: 'Ciencias Sociales', ru: 'Обществознание' },
  pla: { es: 'Educación Artística', ru: 'ИЗО' },
};
const NOT_IN_PRIMARIA = new Set(['fyq', 'tec']);
let PRIMARIA = false;
export const isPrimaria = (grade) => !!grade && grade.includes('Primaria');
// Вызывается из App при смене ученика или класса.
export function setGradeContext(grade) { PRIMARIA = isPrimaria(grade); }
// Предметы для расписания с учётом ступени.
export function subjectsForGrade() {
  return PRIMARIA ? SUBJECTS.filter((s) => !NOT_IN_PRIMARIA.has(s.code)).map((s) => ({ ...s, ...(PRIMARIA_NAMES[s.code] || {}) })) : SUBJECTS;
}

export const topics = [
  {
    id: 'mat-fracciones',
    subject: 'Matemáticas',
    subjectCode: 'mat',
    title: 'las fracciones',
    titleRu: 'дроби',
    lessonSlot: '1-й урок',
    words: [
      { id: 'w-fraccion', es: 'la fracción', ru: 'дробь', en: 'fraction', teacher: 'Una fracción representa una parte de la unidad.' },
      { id: 'w-numerador', es: 'el numerador', ru: 'числитель', en: 'numerator', teacher: 'El numerador indica cuántas partes tomamos.' },
      { id: 'w-denominador', es: 'el denominador', ru: 'знаменатель', en: 'denominator', teacher: 'El denominador indica en cuántas partes iguales se divide la unidad.' },
      { id: 'w-simplificar', es: 'simplificar', ru: 'сокращать (дробь)', en: 'to simplify', teacher: 'Para simplificar, dividimos el numerador y el denominador entre el mismo número.' },
      { id: 'w-equivalentes', es: 'las fracciones equivalentes', ru: 'равные дроби', en: 'equivalent fractions', teacher: 'Dos fracciones son equivalentes si representan la misma cantidad.' },
      { id: 'w-irreducible', es: 'la fracción irreducible', ru: 'несократимая дробь', en: 'irreducible fraction', teacher: 'Una fracción irreducible no se puede simplificar más.' },
      { id: 'w-mcd', es: 'el máximo común divisor', ru: 'наибольший общий делитель', en: 'greatest common divisor', teacher: 'Usamos el máximo común divisor para simplificar la fracción al máximo.' },
    ],
  },
  {
    id: 'bio-celula',
    subject: 'Biología',
    subjectCode: 'bio',
    title: 'la célula',
    titleRu: 'клетка',
    lessonSlot: '3-й урок',
    words: [
      { id: 'w-celula', es: 'la célula', ru: 'клетка', en: 'cell', teacher: 'La célula es la unidad básica de los seres vivos.' },
      { id: 'w-nucleo', es: 'el núcleo', ru: 'ядро', en: 'nucleus', teacher: 'El núcleo contiene el material genético.' },
      { id: 'w-membrana', es: 'la membrana plasmática', ru: 'клеточная мембрана', en: 'cell membrane', teacher: 'La membrana plasmática rodea la célula.' },
      { id: 'w-citoplasma', es: 'el citoplasma', ru: 'цитоплазма', en: 'cytoplasm', teacher: 'El citoplasma está entre la membrana y el núcleo.' },
      { id: 'w-mitocondria', es: 'la mitocondria', ru: 'митохондрия', en: 'mitochondrion', teacher: 'Las mitocondrias obtienen energía de los nutrientes.' },
      { id: 'w-eucariota', es: 'la célula eucariota', ru: 'эукариотическая клетка', en: 'eukaryotic cell', teacher: 'Las células eucariotas tienen núcleo.' },
    ],
  },
];

export function learnedCount(topic, learned) {
  return topic.words.filter((w) => learned[w.id]).length;
}

// Предметы 1º ESO для расписания. code совпадает с topics.subject_code в базе.
export const SUBJECTS = [
  { code: 'mat', es: 'Matemáticas', ru: 'Математика' },
  { code: 'len', es: 'Lengua Castellana', ru: 'Испанский язык' },
  { code: 'val', es: 'Valencià', ru: 'Валенсийский' },
  { code: 'ing', es: 'Inglés', ru: 'Английский' },
  { code: 'bio', es: 'Biología y Geología', ru: 'Биология и геология' },
  { code: 'geo', es: 'Geografía e Historia', ru: 'География и история' },
  { code: 'fyq', es: 'Física y Química', ru: 'Физика и химия' },
  { code: 'ef', es: 'Educación Física', ru: 'Физкультура' },
  { code: 'mus', es: 'Música', ru: 'Музыка' },
  { code: 'tec', es: 'Tecnología', ru: 'Технология' },
  { code: 'pla', es: 'Plástica', ru: 'ИЗО' },
  { code: 'tut', es: 'Tutoría', ru: 'Классный час' },
];

// Свой предмет ученика хранится как код с приставкой "x:", например "x:Robótica".
export const CUSTOM_PREFIX = 'x:';
export const CUSTOM_MAX = 40;

export function customCode(name) {
  return CUSTOM_PREFIX + name.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_MAX);
}

export function isCustom(code) {
  return code.startsWith(CUSTOM_PREFIX);
}

export function subjectByCode(code) {
  if (isCustom(code)) return { code, es: code.slice(CUSTOM_PREFIX.length), ru: tr('свой предмет'), custom: true };
  const s = SUBJECTS.find((x) => x.code === code);
  if (!s) return { code, es: code, ru: '' };
  return PRIMARIA && PRIMARIA_NAMES[code] ? { ...s, ...PRIMARIA_NAMES[code] } : s;
}

// Цвета Ками по id товара из магазина.
export const KAMI_COLORS = {
  'color-green': '#3DB37F',
  'color-blue': '#4A90D9',
  'color-purple': '#8E6FD8',
  'color-coral': '#E8735A',
  'color-gold': '#D9A92B',
  'color-diamond': '#7FD6E8',
  'color-plus': '#B07CE8',
  'color-fire': '#E4572E',
  'color-night': '#2E3A59',
  'color-platinum': '#A9B8C2',
};

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const NEXT_DAY = ['В понедельник', 'Во вторник', 'В среду', 'В четверг', 'В пятницу'];

// Следующий учебный день: завтра, а после пятницы — понедельник.
// Возвращает { weekday: 1..5, label: 'Завтра' | 'В понедельник' }.
export function nextSchoolDay(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  let skipped = false;
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
    skipped = true;
  }
  const weekday = d.getDay(); // 1..5
  const label = skipped ? tr(NEXT_DAY[weekday - 1]) : tr('Завтра');
  return { weekday, label };
}

export function plural(n, one, few, many) {
  // В английском и арабском интерфейсе формы уже переведены: 1 — «one», остальное — «many».
  if (getLang() !== 'ru') return n === 1 ? one : many;
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// Свои слова ученика превращаются в «темы»: одна тема «Мои слова» на каждый предмет.
export function customTopics(customWords) {
  const byCode = {};
  customWords.forEach((w) => {
    (byCode[w.subject_code] = byCode[w.subject_code] || []).push({
      id: w.id,
      es: w.es,
      ru: w.translation,
      teacher: w.example,
    });
  });
  return Object.entries(byCode).map(([code, words]) => ({
    id: `my-${code}`,
    subject: subjectByCode(code).es,
    subjectCode: code,
    title: tr('мои слова'),
    titleRu: '',
    custom: true,
    words,
  }));
}
