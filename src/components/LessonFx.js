// Эффекты урока «как в Дуолинго»: толстая шкала прогресса с бликом и серией верных ответов,
// панель ответа снизу (зелёная / красная), «прыжок» верного варианта и «тряска» неверного, звуки ответов.
import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { tr } from '../i18n';
import { colors } from '../theme';

// Фирменные цвета Ками (не чужие).
const GREEN = colors.green;
const GREEN_DARK = colors.greenDark;
const BAR = colors.greenBar;
const ORANGE = colors.orange;
const RED = '#D92D20';

// ---------- звуки ответов ----------
const SFX = {
  correct: require('../../assets/sfx/correct.m4a'),
  wrong: require('../../assets/sfx/wrong.m4a'),
  combo: require('../../assets/sfx/combo.m4a'),
};
const players = {};
export function playSfx(name) {
  try {
    if (!players[name]) players[name] = createAudioPlayer(SFX[name]);
    const p = players[name];
    p.volume = 0.7;
    p.seekTo(0);
    Promise.resolve(p.play()).catch(() => {});
  } catch (e) { /* без звука — не страшно */ }
}

// ---------- шкала прогресса ----------
export function LessonProgress({ value, combo = 0 }) {
  const w = useRef(new Animated.Value(value)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const hot = combo >= 3;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(1, value)), duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  useEffect(() => {
    if (!hot) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false }).start();
  }, [combo]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: hot ? ORANGE : BAR }]}>
          <View style={styles.shine} />
        </Animated.View>
      </View>
      {hot && (
        <Animated.Text
          style={[styles.combo, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
        >
          {tr('🔥 {0} подряд!', combo)}
        </Animated.Text>
      )}
    </View>
  );
}

// ---------- «прыжок» / «тряска» варианта ответа ----------
export function Bounce({ kind, children, style }) {
  // kind: null | 'right' | 'wrong'
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!kind) return;
    v.setValue(0);
    if (kind === 'right') {
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.spring(v, { toValue: 0, friction: 3, tension: 160, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.sequence(
        [1, -1, 1, -1, 0].map((to) => Animated.timing(v, { toValue: to, duration: 60, useNativeDriver: false })),
      ).start();
    }
  }, [kind]);
  const transform = kind === 'wrong'
    ? [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }]
    : [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }];
  return <Animated.View style={[style, { transform }]}>{children}</Animated.View>;
}

// ---------- празднование серии: 5, 10, 15… верных подряд ----------
const CHEERS = ['¡Increíble!', '¡Imparable!', '¡Fuego!', '¡Qué crack!', '¡Olé!', '¡Brutal!'];
export function ComboCelebration({ count, face }) {
  const a = useRef(new Animated.Value(0)).current;
  const cheer = useRef(CHEERS[Math.floor(Math.random() * CHEERS.length)]).current;
  useEffect(() => {
    a.setValue(0);
    Animated.sequence([
      Animated.spring(a, { toValue: 1, friction: 4, tension: 110, useNativeDriver: false }),
      Animated.delay(1000),
      Animated.timing(a, { toValue: 2, duration: 280, useNativeDriver: false }),
    ]).start();
  }, []);
  return (
    <View pointerEvents="none" style={styles.comboLayer}>
      <Animated.View
        style={[styles.comboCard, {
          opacity: a.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.15] }) }],
        }]}
      >
        <Text style={styles.comboFire}>🔥</Text>
        {face}
        <Text style={styles.comboBig}>{tr('{0} подряд!', count)}</Text>
        <Text style={styles.comboCheer}>{cheer}</Text>
      </Animated.View>
    </View>
  );
}

// ---------- «Почти получилось!» — вторая попытка ----------
export function AlmostBanner({ text }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.spring(a, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }).start();
  }, [text]);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.almost, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}
    >
      <Text style={styles.almostIcon}>💡</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.almostTitle}>{tr('Почти получилось!')}</Text>
        <Text style={styles.almostText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

// ---------- панель ответа снизу ----------
export function FeedbackSheet({ ok, title, lines = [], extra, onNext }) {
  const y = useRef(new Animated.Value(1)).current;
  const icon = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    y.setValue(1);
    icon.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(icon, { toValue: 1, friction: 4, tension: 140, useNativeDriver: false }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[styles.sheet, ok ? styles.sheetOk : styles.sheetBad, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.sheetHead}>
        <Animated.View style={[styles.badge, { backgroundColor: ok ? GREEN : RED, transform: [{ scale: icon }] }]}>
          <Text style={styles.badgeText}>{ok ? '✓' : '✕'}</Text>
        </Animated.View>
        <Text style={[styles.sheetTitle, { color: ok ? GREEN_DARK : colors.danger }]}>{title}</Text>
        {extra}
      </View>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} style={[styles.sheetLine, { color: ok ? GREEN_DARK : colors.danger }]}>{l}</Text>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onNext}
        style={({ pressed }) => [styles.next, { backgroundColor: ok ? GREEN : RED, borderBottomColor: ok ? GREEN_DARK : colors.danger }, pressed && styles.nextPressed]}
      >
        <Text style={styles.nextText}>{tr('ДАЛЬШЕ')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { height: 16, borderRadius: 8, backgroundColor: '#E5E5E5', overflow: 'hidden' },
  fill: { height: 16, borderRadius: 8, minWidth: 16 },
  shine: { position: 'absolute', top: 3, left: 8, right: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  combo: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '900', color: ORANGE },
  almost: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#FFFAEB', borderWidth: 2, borderColor: '#F79009' },
  almostIcon: { fontSize: 26 },
  almostTitle: { fontSize: 17, fontWeight: '900', color: '#B54708' },
  almostText: { fontSize: 14, color: '#93370D' },
  comboLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  comboCard: { alignItems: 'center', gap: 4, paddingVertical: 18, paddingHorizontal: 28, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: ORANGE, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  comboFire: { fontSize: 54 },
  comboBig: { fontSize: 30, fontWeight: '900', color: ORANGE },
  comboCheer: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetOk: { backgroundColor: colors.greenLight, borderTopWidth: 2, borderColor: '#BFE3CE' },
  sheetBad: { backgroundColor: colors.dangerLight, borderTopWidth: 2, borderColor: '#F7C1BB' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: '900' },
  sheetLine: { fontSize: 16, fontWeight: '600' },
  next: { marginTop: 8, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  nextPressed: { borderBottomWidth: 0, transform: [{ translateY: 4 }] },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
});
