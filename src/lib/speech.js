// Озвучка испанским голосом, встроенным в телефон (бесплатно, без интернета на iOS/Android;
// в браузере — через голос браузера).
import * as Speech from 'expo-speech';

export function speak(text, { slow = false, lang = 'es-ES' } = {}) {
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: lang, rate: slow ? 0.6 : 0.9 });
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
