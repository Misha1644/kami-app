// Награды: ежедневная (календарь из 7 дней, как в Brawl Stars) и за серию.
// Что именно выдаётся, решает сервер (миграция 026); здесь — только как это показать.
import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Chest from './Chest';
import { Coin, Snowflake } from './icons';
import { Button } from './ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { tr } from '../i18n';

// Календарь ежедневных наград (как в claim_daily_reward).
export const DAILY = [
  { day: 1, coins: 5 },
  { day: 2, coins: 10 },
  { day: 3, freeze: 1 },
  { day: 4, coins: 10 },
  { day: 5, chest: 1 },
  { day: 6, coins: 15 },
  { day: 7, coins: 30, chest: 1 },
];

// Награда за серию (как streak_milestone в базе).
export function streakReward(days) {
  if (days === 10) return { coins: 50 };
  if (days === 50) return { coins: 200, chests: 1 };
  if (days === 100) return { coins: 300, item: 'color-streak' };
  if (days === 200) return { chests: 2, item: 'bg-streak' };
  if (days === 300) return { coins: 500, chests: 2, item: 'avatar-streak' };
  if (days > 300 && days % 100 === 0) return { coins: 500, chests: 1 };
  return null;
}

// Вехи для экрана: 10, 50, 100, 200, 300 и дальше по 100 — на пару шагов вперёд от серии.
export function milestones(streak) {
  const list = [10, 50, 100, 200, 300];
  let n = 400;
  while (n <= Math.max(500, streak + 200)) { list.push(n); n += 100; }
  return list;
}

// Есть ли награда за серию, которую можно забрать прямо сейчас.
export function claimableStreak(streak, claimed = []) {
  return milestones(streak).filter((d) => d <= streak && !claimed.includes(d));
}

export function rewardText(r) {
  const parts = [];
  if (r.coins) parts.push(`${r.coins} ${plural(r.coins, tr('монета'), tr('монеты'), tr('монет'))}`);
  if (r.freeze) parts.push(tr('заморозка серии'));
  if (r.chest) parts.push(tr('сундук за урок'));
  if (r.chests) parts.push(r.chests > 1 ? tr('{0} сундука со скинами', r.chests) : tr('сундук со скинами'));
  return parts.join(' + ');
}

function DailyIcon({ r, big }) {
  if (r.chest && r.coins) {
    return (
      <View style={styles.combo}>
        <Chest type="lesson" size={big ? 54 : 40} />
        <View style={styles.comboCoins}><Coin size={16} /><Text style={styles.comboText}>{r.coins}</Text></View>
      </View>
    );
  }
  if (r.chest) return <Chest type="lesson" size={40} />;
  if (r.freeze) return <View style={styles.freeze}><Snowflake size={26} color="#FFFFFF" /></View>;
  return <Coin size={30} />;
}

// Ежедневная награда: показывается при первом входе за день.
export function DailyRewardModal({ day, onClaim, onOpenChest, onClose }) {
  const [claimed, setClaimed] = useState(null); // ответ сервера
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pulse = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: false }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  async function claim() {
    setBusy(true);
    setError('');
    try {
      const res = await onClaim();
      setClaimed(res);
      pop.setValue(0); fly.setValue(0);
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: false }),
        Animated.timing(fly, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const current = claimed ? claimed.day : day;
  const got = claimed && rewardText({ coins: claimed.coins_added, freeze: claimed.freeze_added, chest: claimed.chest_added });
  const scaleNow = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  function tile(r) {
    const done = r.day < current || (claimed && r.day === current);
    const isNow = r.day === current;
    const big = r.day === 7;
    const t = (
      <View style={[styles.tile, big && styles.tileBig, done && styles.tileDone, isNow && !claimed && styles.tileNow]}>
        <Text style={[styles.tileDay, big && { color: '#7A4A00' }]}>{tr('День {0}', r.day)}</Text>
        <View style={{ opacity: done && !isNow ? 0.45 : 1 }}><DailyIcon r={r} big={big} /></View>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {r.freeze ? tr('Заморозка') : r.chest && !r.coins ? tr('Сундук') : `+${r.coins}`}
        </Text>
        {done && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
      </View>
    );
    if (isNow && !claimed) return <Animated.View key={r.day} style={[styles.cell, big && styles.cellBig, { transform: [{ scale: scaleNow }] }]}>{t}</Animated.View>;
    if (isNow && claimed) {
      const s = pop.interpolate({ inputRange: [0, 1], outputRange: [1.3, 1] });
      return <Animated.View key={r.day} style={[styles.cell, big && styles.cellBig, { transform: [{ scale: s }] }]}>{t}</Animated.View>;
    }
    return <View key={r.day} style={[styles.cell, big && styles.cellBig]}>{t}</View>;
  }

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={styles.card}>
          <Text style={styles.title}>{tr('Ежедневная награда')}</Text>
          <Text style={styles.sub}>{tr('Заходи каждый день — 7-й день самый щедрый!')}</Text>
          <View style={styles.grid}>{DAILY.map(tile)}</View>

          {claimed && (
            <Animated.Text
              pointerEvents="none"
              style={[styles.fly, {
                opacity: fly.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) }],
              }]}
            >
              +{got}
            </Animated.Text>
          )}

          {!!claimed && <Text style={styles.got}>{tr('Получено: {0}', got)}</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            {!claimed && <Button title={busy ? tr('Секунду…') : tr('Забрать!')} onPress={claim} disabled={busy} />}
            {claimed?.chest_added > 0 && onOpenChest && (
              <Button title={tr('Открыть сундук')} onPress={() => { onClose(); onOpenChest('lesson'); }} />
            )}
            {claimed && <Button title={tr('Отлично!')} variant={claimed.chest_added ? 'secondary' : 'primary'} onPress={onClose} />}
            {!claimed && <Text style={styles.later} onPress={onClose} accessibilityRole="button">{tr('Потом')}</Text>}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,14,30,0.75)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, gap: 12, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
  cell: { width: '30%' },
  cellBig: { width: '94%' },
  tile: { alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F2F4F7', borderWidth: 2, borderColor: 'transparent', minHeight: 104, justifyContent: 'center' },
  tileBig: { backgroundColor: '#FFF4CC', borderColor: '#F5C443', minHeight: 96 },
  tileNow: { borderColor: colors.green, backgroundColor: colors.greenLight },
  tileDone: { backgroundColor: '#ECFDF3' },
  tileDay: { fontSize: 12, fontWeight: '800', color: colors.muted },
  tileLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  check: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  freeze: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' },
  combo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboCoins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comboText: { fontSize: 16, fontWeight: '900', color: '#7A5200' },
  fly: { position: 'absolute', top: '45%', alignSelf: 'center', fontSize: 26, fontWeight: '900', color: '#F79009' },
  got: { fontSize: 16, fontWeight: '800', color: colors.green, textAlign: 'center' },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  later: { fontSize: 15, fontWeight: '700', color: colors.muted, textAlign: 'center', paddingVertical: 8 },
});
