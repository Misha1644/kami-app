// Вечернее напоминание в 19:00 на ближайшие 7 дней.
// Текст берётся из расписания: «Завтра: Matemáticas, Biología…».
// Уведомления локальные (без сервера). Работают на телефоне (Expo Go / приложение), не в браузере.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { subjectByCode } from '../data/content';
import { factOfDay } from '../data/facts';
import { tr } from '../i18n';

const KEY = 'kami.reminders.enabled';
const HOUR = 19;

export const remindersSupported = Platform.OS !== 'web';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function remindersEnabled() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch (e) {
    return false;
  }
}

// Каникулы ученика (задаются из App), чтобы на каникулах напоминание было про повторение.
let HOLIDAYS = [];
export function setReminderHolidays(list) {
  HOLIDAYS = list || [];
}
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const onHoliday = (d) => HOLIDAYS.some((h) => iso(d) >= h.start_date && iso(d) <= h.end_date);

function textFor(date, schedule) {
  // Каникулы: в будний день каникул и на выходных, после которых каникулы продолжаются, хватит одного слова.
  // Последние выходные перед учёбой — обычный текст ниже (урок к понедельнику).
  const mon = new Date(date);
  mon.setDate(mon.getDate() + ((8 - mon.getDay()) % 7 || 7)); // ближайший понедельник
  const wdNow = date.getDay();
  const weekendBlock = wdNow === 5 || wdNow === 6 || wdNow === 0;
  if (weekendBlock ? onHoliday(mon) : onHoliday(date)) {
    return tr('Каникулы! Повтори хотя бы одно слово — и огонёк не погаснет.');
  }
  // Пятница и суббота: для серии хватит одного урока за выходные.
  const today = date.getDay();
  if (today === 5 || today === 6) {
    return tr('Выходные! Хватит одного урока до вечера воскресенья, чтобы серия не сгорела.');
  }
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const wd = next.getDay();
  const codes = wd >= 1 && wd <= 5 ? [...new Set(schedule[wd] || [])] : [];
  if (codes.length) {
    const list = codes.map((c) => subjectByCode(c).es).join(', ');
    if (today === 0) return tr('Завтра: {0}. Если на выходных урока ещё не было — сегодня последний шанс сохранить серию!', list);
    return tr('Завтра: {0}. Пройди урок, чтобы серия не сгорела!', list);
  }
  return tr('Ками ждёт тебя! Пройди один урок, чтобы серия не сгорела.');
}

// В субботу и воскресенье — напомнить про ежедневную награду: календарь сбрасывается, если пропустить день.
function rewardLine(date) {
  const wd = date.getDay();
  return wd === 6 || wd === 0 ? ' ' + tr('Не забудь забрать ежедневную награду!') : '';
}

// Перепланировать напоминания (вызывается при запуске и после изменения расписания).
export async function rescheduleReminders(schedule) {
  if (!remindersSupported || !(await remindersEnabled())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(HOUR, 0, 0, 0);
    if (d <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: tr('Ками 🦎'), body: tr('{0}\nФакт дня: {1}', textFor(d, schedule) + rewardLine(d), factOfDay(d).t) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
    });
  }
}

// Включить/выключить. Возвращает итоговое состояние (false, если нет разрешения).
export async function setRemindersEnabled(on, schedule) {
  if (!remindersSupported) return false;
  if (on) {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    await AsyncStorage.setItem(KEY, '1');
    await rescheduleReminders(schedule);
    return true;
  }
  await AsyncStorage.setItem(KEY, '0');
  await Notifications.cancelAllScheduledNotificationsAsync();
  return false;
}
