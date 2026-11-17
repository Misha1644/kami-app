// Перевод слов по нажатию во фразах учителя (как в Duolingo).
// Источники: 1) слова всех тем (испанское слово → перевод на языке ученика);
//            2) маленький словарь частых служебных слов ниже.
import { getLang } from '../i18n';

// [es, ru, en, ar]
const COMMON = [
  ['el', 'определённый артикль (м. р.)', 'the', 'الـ'], ['la', 'определённый артикль (ж. р.)', 'the', 'الـ'],
  ['los', 'артикль (мн. ч.)', 'the', 'الـ'], ['las', 'артикль (мн. ч., ж. р.)', 'the', 'الـ'],
  ['un', 'один, какой-то', 'a', 'واحد'], ['una', 'одна, какая-то', 'a', 'واحدة'],
  ['unos', 'несколько', 'some', 'بعض'], ['unas', 'несколько', 'some', 'بعض'],
  ['de', 'из, о, (родительный падеж)', 'of, from', 'من'], ['del', 'из (de + el)', 'of the', 'من الـ'],
  ['a', 'к, в', 'to', 'إلى'], ['al', 'к (a + el)', 'to the', 'إلى الـ'],
  ['en', 'в, на', 'in, on', 'في'], ['con', 'с', 'with', 'مع'], ['sin', 'без', 'without', 'بدون'],
  ['por', 'через, за, из-за', 'by, for', 'بـ، من أجل'], ['para', 'для, чтобы', 'for, to', 'لـ، من أجل'],
  ['entre', 'между, на (делить)', 'between', 'بين'], ['sobre', 'о, на', 'about, on', 'عن، على'],
  ['y', 'и', 'and', 'و'], ['e', 'и', 'and', 'و'], ['o', 'или', 'or', 'أو'], ['u', 'или', 'or', 'أو'],
  ['pero', 'но', 'but', 'لكن'], ['si', 'если', 'if', 'إذا'], ['sí', 'да', 'yes', 'نعم'], ['no', 'не, нет', 'not, no', 'لا'],
  ['que', 'что, который', 'that, which', 'الذي، أنّ'], ['qué', 'что? какой?', 'what?', 'ماذا؟'],
  ['cómo', 'как?', 'how?', 'كيف؟'], ['cuándo', 'когда?', 'when?', 'متى؟'], ['dónde', 'где?', 'where?', 'أين؟'],
  ['cuántas', 'сколько?', 'how many?', 'كم؟'], ['cuántos', 'сколько?', 'how many?', 'كم؟'],
  ['es', 'является, есть', 'is', 'هو/هي'], ['son', 'являются', 'are', 'هم/هي'], ['está', 'находится', 'is (located)', 'يوجد'],
  ['están', 'находятся', 'are (located)', 'توجد'], ['hay', 'есть, имеется', 'there is/are', 'يوجد'],
  ['tiene', 'имеет, у него есть', 'has', 'لديه'], ['tienen', 'имеют', 'have', 'لديهم'],
  ['puede', 'может', 'can', 'يستطيع'], ['pueden', 'могут', 'can', 'يستطيعون'], ['se', 'себя, -ся', 'itself, (reflexive)', 'نفسه'],
  ['usamos', 'мы используем', 'we use', 'نستخدم'], ['tomamos', 'мы берём', 'we take', 'نأخذ'], ['vamos', 'давайте, мы идём', "let's, we go", 'هيا، نذهب'],
  ['hacemos', 'мы делаем', 'we do', 'نفعل'], ['dividimos', 'мы делим', 'we divide', 'نقسم'], ['sumamos', 'мы складываем', 'we add', 'نجمع'],
  ['restamos', 'мы вычитаем', 'we subtract', 'نطرح'], ['multiplicamos', 'мы умножаем', 'we multiply', 'نضرب'],
  ['mira', 'посмотри', 'look', 'انظر'], ['mirad', 'посмотрите', 'look (all of you)', 'انظروا'], ['escribe', 'напиши', 'write', 'اكتب'],
  ['escribid', 'напишите', 'write (all of you)', 'اكتبوا'], ['lee', 'прочитай', 'read', 'اقرأ'], ['leed', 'прочитайте', 'read (all of you)', 'اقرأوا'],
  ['este', 'этот', 'this', 'هذا'], ['esta', 'эта', 'this', 'هذه'], ['estos', 'эти', 'these', 'هؤلاء'], ['estas', 'эти', 'these', 'هؤلاء'],
  ['ese', 'тот', 'that', 'ذلك'], ['esa', 'та', 'that', 'تلك'], ['todo', 'всё, весь', 'all', 'كل'], ['todos', 'все', 'all', 'الجميع'],
  ['todas', 'все', 'all', 'كل'], ['mismo', 'тот же', 'same', 'نفس'], ['misma', 'та же', 'same', 'نفس'],
  ['más', 'больше, более', 'more', 'أكثر'], ['menos', 'меньше, минус', 'less, minus', 'أقل'], ['muy', 'очень', 'very', 'جدًا'],
  ['mucho', 'много', 'a lot', 'كثير'], ['muchos', 'многие', 'many', 'كثيرون'], ['poco', 'мало', 'little', 'قليل'],
  ['cada', 'каждый', 'each', 'كل'], ['otro', 'другой', 'other', 'آخر'], ['otra', 'другая', 'other', 'أخرى'],
  ['parte', 'часть', 'part', 'جزء'], ['partes', 'части', 'parts', 'أجزاء'], ['iguales', 'равные', 'equal', 'متساوية'],
  ['igual', 'равный', 'equal', 'متساوٍ'], ['número', 'число', 'number', 'عدد'], ['números', 'числа', 'numbers', 'أعداد'],
  ['dos', 'два', 'two', 'اثنان'], ['tres', 'три', 'three', 'ثلاثة'], ['cuatro', 'четыре', 'four', 'أربعة'], ['cinco', 'пять', 'five', 'خمسة'],
  ['primero', 'сначала, первый', 'first', 'أولًا'], ['después', 'потом', 'then, after', 'بعد ذلك'], ['siempre', 'всегда', 'always', 'دائمًا'],
  ['también', 'тоже', 'also', 'أيضًا'], ['solo', 'только', 'only', 'فقط'], ['ya', 'уже', 'already', 'بالفعل'],
  ['aquí', 'здесь', 'here', 'هنا'], ['hoy', 'сегодня', 'today', 'اليوم'], ['mañana', 'завтра', 'tomorrow', 'غدًا'],
  ['bien', 'хорошо', 'well', 'جيدًا'], ['nuestro', 'наш', 'our', 'لنا'], ['nuestra', 'наша', 'our', 'لنا'], ['su', 'его, её, их', 'his, her, their', 'له، لها'],
  ['sus', 'его, её, их (мн.)', 'his, her, their', 'لهم'], ['tu', 'твой', 'your', 'لك'], ['mi', 'мой', 'my', 'لي'],
  ['vivos', 'живые', 'living', 'حية'], ['seres', 'существа', 'beings', 'كائنات'], ['unidad', 'единица', 'unit', 'وحدة'],
  ['básica', 'основная', 'basic', 'أساسية'], ['básico', 'основной', 'basic', 'أساسي'], ['forma', 'форма', 'shape, form', 'شكل'],
  ['agua', 'вода', 'water', 'ماء'], ['tierra', 'земля', 'earth, land', 'أرض'], ['vida', 'жизнь', 'life', 'حياة'],
  ['clase', 'урок, класс', 'class', 'صف'], ['libro', 'учебник, книга', 'book', 'كتاب'], ['página', 'страница', 'page', 'صفحة'],
  ['ejercicio', 'упражнение', 'exercise', 'تمرين'], ['ejemplo', 'пример', 'example', 'مثال'], ['decir', 'сказать', 'to say', 'يقول'],
  ['representa', 'представляет', 'represents', 'يمثّل'], ['indica', 'показывает', 'shows, indicates', 'يشير'],
  ['divide', 'делит', 'divides', 'يقسم'], ['forman', 'образуют', 'form', 'يشكّلون'], ['tienes', 'у тебя есть', 'you have', 'لديك'],
  ['necesita', 'нужно, нуждается', 'needs', 'يحتاج'], ['necesitan', 'нуждаются', 'need', 'يحتاجون'], ['produce', 'производит', 'produces', 'ينتج'],
  ['vive', 'живёт', 'lives', 'يعيش'], ['viven', 'живут', 'live', 'يعيشون'], ['hace', 'делает', 'does, makes', 'يفعل'],
  ['sirve', 'служит, нужен для', 'is used for', 'يُستخدم'], ['calcula', 'вычисли', 'calculate', 'احسب'], ['calculamos', 'мы вычисляем', 'we calculate', 'نحسب'],
  ['resultado', 'результат', 'result', 'نتيجة'], ['problema', 'задача', 'problem', 'مسألة'], ['grande', 'большой', 'big', 'كبير'],
  ['pequeño', 'маленький', 'small', 'صغير'], ['pequeña', 'маленькая', 'small', 'صغيرة'], ['nuevo', 'новый', 'new', 'جديد'],
  ['llamamos', 'мы называем', 'we call', 'نسمّي'], ['llama', 'называется', 'is called', 'يُسمّى'], ['significa', 'означает', 'means', 'يعني'],
];

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clean = (s) => (s || '').toLowerCase().replace(/[.,;:!¡?¿«»"()]/g, '').trim();
const ARTICLE = /^(el|la|los|las|un|una|unos|unas|lo)\s+/;

// Словарь: ключ — слово без ударений; значение — перевод.
export function buildGlossary(topics) {
  const lang = getLang();
  const col = lang === 'en' ? 2 : lang === 'ar' ? 3 : 1;
  const map = new Map();
  for (const row of COMMON) map.set(strip(row[0]), row[col] || row[2]);
  for (const t of topics || []) {
    for (const w of t.words || []) {
      if (!w.es || !w.ru) continue;
      const full = clean(w.es);
      const bare = full.replace(ARTICLE, '');
      // слова темы важнее служебного словаря
      map.set(strip(bare), w.ru);
      if (!map.has(strip(full))) map.set(strip(full), w.ru);
    }
  }
  return map;
}

// Перевод слова i во фразе (учитываются сочетания до 4 слов: «máximo común divisor»).
// Возвращает { from, to, text, tr } — какие слова подсветить и перевод, или null.
export function lookup(glossary, tokens, i) {
  const keys = tokens.map((t) => strip(clean(t)));
  for (let len = 4; len >= 2; len--) {
    for (let start = Math.max(0, i - len + 1); start <= i; start++) {
      const span = keys.slice(start, start + len);
      if (span.length < len) continue;
      const hit = glossary.get(span.join(' '));
      if (hit) return { from: start, to: start + len - 1, text: tokens.slice(start, start + len).join(' '), tr: hit };
    }
  }
  const k = keys[i];
  if (!k) return null;
  const forms = [k, k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/as$/, 'a'), k.replace(/os$/, 'o')];
  for (const f of forms) {
    const hit = f && glossary.get(f);
    if (hit) return { from: i, to: i, text: tokens[i], tr: hit };
  }
  return null;
}
