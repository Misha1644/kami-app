// Лёгкая вибрация при касаниях (на iPhone и Android; в браузере просто ничего не происходит).
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(fn) {
  if (!on) return;
  try { Promise.resolve(fn()).catch(() => {}); } catch (e) { /* нет вибро — не страшно */ }
}

const haptic = {
  tap: () => safe(() => Haptics.selectionAsync()),
  lift: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  drop: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export default haptic;
