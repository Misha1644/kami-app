// Вечернее напоминание в 19:00 на ближайшие 7 дней.
// Текст берётся из расписания: «Завтра: Matemáticas, Biología…».
// Уведомления локальные (без сервера). Работают на телефоне (Expo Go / приложение), не в браузере.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { subjectByCode } from '../data/content';

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

function textFor(date, schedule) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const wd = next.getDay();
  const codes = wd >= 1 && wd <= 5 ? [...new Set(schedule[wd] || [])] : [];
  if (codes.length) {
    return `Завтра: ${codes.map((c) => subjectByCode(c).es).join(', ')}. Пройди урок, чтобы серия не сгорела!`;
  }
  return 'Ками ждёт тебя! Пройди один урок, чтобы серия не сгорела.';
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
      content: { title: 'Ками 🦎', body: textFor(d, schedule) },
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
