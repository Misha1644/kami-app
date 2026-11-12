// Озвучка испанским голосом, встроенным в телефон (бесплатно, без интернета на iOS/Android;
// в браузере — через голос браузера).
import * as Speech from 'expo-speech';

export function speak(text, { slow = false } = {}) {
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: 'es-ES', rate: slow ? 0.7 : 0.9 });
  } catch (e) {
    // Голос недоступен — просто молчим.
  }
}

// Сравнение ответа «напиши сам»: без учёта регистра, лишних пробелов, артикля и знаков.
// Возвращает 'exact' | 'accents' (верно, но без ударений) | 'wrong'.
const ARTICLES = /^(el|la|los|las|un|una|unos|unas)\s+/;

function base(s) {
  return s.toLowerCase().trim().replace(/[.,;:!¡?¿«»"']/g, '').replace(/\s+/g, ' ').replace(ARTICLES, '');
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
