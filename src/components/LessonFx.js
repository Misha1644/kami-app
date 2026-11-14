// Эффекты урока «как в Дуолинго»: толстая шкала прогресса с бликом и серией верных ответов,
// панель ответа снизу (зелёная / красная), «прыжок» верного варианта и «тряска» неверного, звуки ответов.
import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { tr } from '../i18n';

const GREEN = '#58CC02';
const GREEN_DARK = '#46A302';
const ORANGE = '#FF9600';

// ---------- звуки ответов ----------
const SFX = {
  correct: require('../../assets/sfx/correct.m4a'),
  wrong: require('../../assets/sfx/wrong.m4a'),
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
        <Animated.View style={[styles.fill, { width, backgroundColor: hot ? ORANGE : GREEN }]}>
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
        <Animated.View style={[styles.badge, { backgroundColor: ok ? GREEN : '#FF4B4B', transform: [{ scale: icon }] }]}>
          <Text style={styles.badgeText}>{ok ? '✓' : '✕'}</Text>
        </Animated.View>
        <Text style={[styles.sheetTitle, { color: ok ? GREEN_DARK : '#EA2B2B' }]}>{title}</Text>
        {extra}
      </View>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} style={[styles.sheetLine, { color: ok ? '#3F7A0A' : '#C21F1F' }]}>{l}</Text>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onNext}
        style={({ pressed }) => [styles.next, { backgroundColor: ok ? GREEN : '#FF4B4B', borderBottomColor: ok ? GREEN_DARK : '#D33131' }, pressed && styles.nextPressed]}
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
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetOk: { backgroundColor: '#D7FFB8' },
  sheetBad: { backgroundColor: '#FFDFE0' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: '900' },
  sheetLine: { fontSize: 16, fontWeight: '600' },
  next: { marginTop: 8, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  nextPressed: { borderBottomWidth: 0, transform: [{ translateY: 4 }] },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
});
