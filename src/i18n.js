// Язык интерфейса: русский (исходный), английский и арабский.
// Строки в коде пишутся по-русски и оборачиваются в tr('…'); перевод ищется в словаре по русской строке.
// {0}, {1}… — места для чисел и имён: tr('Осталось {0} монет', n).
// Если перевода нет, показывается русский текст — так приложение никогда не «ломается».
import { I18nManager, Platform } from 'react-native';
import { DICT } from './i18n_dict';

export const UI_LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

let LANG = 'ru';

// Язык ученика → язык интерфейса. Украинский оставляем русским (отдельного перевода нет).
export const uiLangFor = (nativeLang) => (nativeLang === 'en' || nativeLang === 'ar' ? nativeLang : 'ru');

// Язык телефона — до того как ученик выбрал свой.
export function deviceLang() {
  try {
    const loc = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
    if (loc.startsWith('ar')) return 'ar';
    if (loc.startsWith('ru') || loc.startsWith('uk') || loc.startsWith('be')) return 'ru';
    return 'en';
  } catch (e) {
    return 'ru';
  }
}

export const getLang = () => LANG;
export const isRTL = () => LANG === 'ar';

// Возвращает true, если для арабского нужно перезапустить приложение (зеркальная раскладка на телефоне).
export function setLang(lang) {
  LANG = UI_LANGS.some((l) => l.code === lang) ? lang : 'ru';
  const rtl = LANG === 'ar';
  if (Platform.OS === 'web') {
    try {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = LANG;
    } catch (e) { /* нет document — не страшно */ }
    return false;
  }
  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      return true;
    }
  } catch (e) { /* не страшно */ }
  return false;
}

export function tr(s, ...args) {
  if (s == null) return s;
  const out = (LANG !== 'ru' && DICT[LANG] && DICT[LANG][s]) || s;
  if (!args.length) return out;
  return out.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined && args[i] !== null ? String(args[i]) : m));
}

// Название вещи из магазина: у новых вещей переводы лежат в базе (title_en, title_ar),
// у старых — в словаре интерфейса.
export function itemTitle(item) {
  if (!item) return '';
  if (LANG === 'en' && item.title_en) return item.title_en;
  if (LANG === 'ar' && item.title_ar) return item.title_ar;
  return tr(item.title_ru || item.title);
}
