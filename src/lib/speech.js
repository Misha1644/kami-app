// Озвучка испанским голосом, встроенным в телефон (бесплатно, без интернета на iOS/Android;
// в браузере — через голос браузера).
import * as Speech from 'expo-speech';

// Скорость голоса по умолчанию — из настроек профиля.
let normalRate = 0.9;
export function setVoiceSlow(on) { normalRate = on ? 0.7 : 0.9; }

export function speak(text, { slow = false, lang = 'es-ES' } = {}) {
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: lang, rate: slow ? 0.55 : normalRate });
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
export function isNearTyped(answer, correct) {
  const a = stripAccents(base(answer || ''));
  const c = stripAccents(base(correct || ''));
  if (!a || c.length < 3) return false;
  const d = editDistance(a, c);
  return d > 0 && d <= (c.length >= 8 ? 2 : 1);
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

// Проверка сказанного вслух: распознанная фраза засчитывается, если в ней есть нужное слово
// (без учёта ударений, артиклей и знаков).
export function checkSpoken(heard, correct) {
  const h = stripAccents(base(heard || ''));
  const c = stripAccents(base(correct));
  if (!h || !c) return false;
  return h === c || ` ${h} `.includes(` ${c} `);
}

// Фраза для «собери из плиток»: слова по порядку и их нормализованный вид для сравнения.
export function phraseTokens(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}
export const tokenKey = (t) => stripAccents(t.toLowerCase().replace(/[.,;:!¡?¿«»"]/g, ''));
