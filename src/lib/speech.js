// Озвучка испанским голосом, встроенным в телефон (бесплатно, без интернета на iOS/Android;
// в браузере — через голос браузера).
import * as Speech from 'expo-speech';

// Скорость голоса (17 ноя: всё медленнее — обычный голос теперь как прежний «медленный»).
// Обычно 0.7; «Медленный голос» в Профиле — 0.55; кнопка 🐢 «ещё раз медленно» — ещё медленнее.
let normalRate = 0.7;
let slowRate = 0.5;
export function setVoiceSlow(on) {
  normalRate = on ? 0.55 : 0.7;
  slowRate = on ? 0.42 : 0.5;
}

export function speak(text, { slow = false, lang = 'es-ES' } = {}) {
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: lang, rate: slow ? slowRate : normalRate });
  } catch (e) {
    // Голос недоступен — просто молчим.
  }
}

// Сравнение ответа «напиши сам»: без учёта регистра, лишних пробелов, артикля и знаков.
// Возвращает 'exact' | 'accents' (верно, но без ударений) | 'wrong'.
// Артикли испанские и валенсийские (els, les, l').
const ARTICLES = /^(el|la|los|las|un|una|unos|unas|els|les)\s+|^l['’]/;

function base(s) {
  return s.toLowerCase().trim().replace(ARTICLES, '').replace(/[.,;:!¡?¿«»"'’·-]/g, '').replace(/\s+/g, ' ').trim();
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function checkTyped(answer, correct) {
  const a = base(answer);
  const c = base(correct);
  if (!a) return 'wrong';
  if (a === c) return 'exact';
  if (stripAccents(a) === stripAccents(c)) return 'accents';
  return 'wrong';
}

// Расстояние Левенштейна: сколько вставок / удалений / замен отделяет a от b (строки или массивы).
export function editDistance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// «Почти получилось» для письменного ответа: ошибка в одной букве (в словах от 8 букв — до двух).
// 17 ноя: мягче — переставленные соседние буквы считаются одной ошибкой; во фразе из нескольких
// слов допускается по ошибке в каждом слове; в длинных словах — до 2–3 букв.
function typoDistance(a, b) {
  let d = editDistance(a, b);
  // перестановка соседних букв («fraccoines») — одна ошибка, а не две
  if (a.length === b.length) {
    const diff = [];
    for (let i = 0; i < a.length && diff.length <= 2; i++) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) d = 1;
  }
  return d;
}
const typoLimit = (len) => (len >= 12 ? 3 : len >= 7 ? 2 : len >= 2 ? 1 : 0);

export function isNearTyped(answer, correct) {
  const a = stripAccents(base(answer || ''));
  const c = stripAccents(base(correct || ''));
  if (!a || !c || a === c) return false;
  if (typoDistance(a, c) <= typoLimit(c.length)) return true;
  // фраза: слово за словом, в каждом — небольшая опечатка
  const aw = a.split(' ');
  const cw = c.split(' ');
  return cw.length > 1 && aw.length === cw.length && aw.every((w, i) => typoDistance(w, cw[i]) <= typoLimit(cw[i].length));
}

// «Почти получилось» для фразы из плиток: одно слово не то / лишнее / пропущено,
// или два соседних слова перепутаны местами.
export function isNearPhrase(got, want) {
  const g = got.map(tokenKey);
  const w = want.map(tokenKey);
  if (g.join(' ') === w.join(' ')) return false;
  if (editDistance(g, w) <= 1) return true;
  if (g.length === w.length) {
    const diff = g.map((x, i) => (x === w[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && g[diff[0]] === w[diff[1]] && g[diff[1]] === w[diff[0]]) return true;
  }
  return false;
}

// ----- Проверка сказанного вслух (17 ноя: щадящая, как в Duolingo) -----
// Сравниваем по словам, «на слух»: без ударений и знаков; b/v, ll/y, c/z/s, немая h и т. п. — одно и то же;
// в длинных словах прощается одна-две буквы; артикли и лишние слова не мешают; цифры = слова.
const NUMS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const OPTIONAL = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'de', 'del', 'al', 'y', 'e', 'a']);

function sound(w) {
  let s = stripAccents(w.toLowerCase()).replace(/[^a-zñ0-9]/g, '');
  if (/^\d+$/.test(s) && NUMS[+s]) s = NUMS[+s];
  return s
    .replace(/h/g, '').replace(/v/g, 'b').replace(/ll/g, 'y').replace(/z/g, 's')
    .replace(/c([ei])/g, 's$1').replace(/qu/g, 'k').replace(/c/g, 'k').replace(/x/g, 'ks')
    .replace(/g([ei])/g, 'j$1').replace(/(.)\1/g, '$1');
}

function wordsOf(text) {
  return (text || '').split(/[\s,.;:!¡?¿«»"()\-]+/).map(sound).filter(Boolean);
}

function sameWord(a, b) {
  if (a === b) return true;
  const d = editDistance(a, b);
  return b.length >= 8 ? d <= 2 : b.length >= 4 ? d <= 1 : false;
}

// Какие слова нужной фразы уже прозвучали (по порядку). Для подсветки «как в Duolingo».
export function spokenMatch(heard, correct) {
  const target = (correct || '').split(/\s+/).filter(Boolean);
  const want = target.map(sound);
  const got = wordsOf(heard);
  const matched = want.map(() => false);
  let j = 0;
  for (let i = 0; i < want.length && j <= got.length; i++) {
    if (!want[i]) { matched[i] = true; continue; }
    // ищем слово дальше по услышанному (лишние слова пропускаем), но не дальше 3 слов вперёд
    for (let k = j; k < Math.min(got.length, j + 4); k++) {
      if (sameWord(got[k], want[i]) || (k + 1 < got.length && sameWord(got[k] + got[k + 1], want[i]))) {
        matched[i] = true;
        j = k + 1;
        break;
      }
    }
  }
  const needed = want.map((w, i) => !OPTIONAL.has(w) || want.length === 1 ? i : -1).filter((i) => i >= 0);
  const okNeeded = needed.filter((i) => matched[i]).length;
  const ok = needed.length > 0 && (okNeeded === needed.length || (needed.length >= 5 && okNeeded / needed.length >= 0.8));
  return { target, matched, ok };
}

export function checkSpoken(heard, correct) {
  return spokenMatch(heard, correct).ok;
}

// Фраза для «собери из плиток»: слова по порядку и их нормализованный вид для сравнения.
export function phraseTokens(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}
export const tokenKey = (t) => stripAccents(t.toLowerCase().replace(/[.,;:!¡?¿«»"]/g, ''));
