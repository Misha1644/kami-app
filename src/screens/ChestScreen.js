// Открытие сундука: нажми — сундук трясётся, открывается, и Ками показывает награду.
// Что выпало, решает сервер (open_chest). Шансы показаны прямо здесь.
import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import Chest from '../components/Chest';
import Kami from '../components/Kami';
import UserAvatar from '../components/UserAvatar';
import { BgSwatch } from '../components/Background';
import { Coin } from '../components/icons';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';

const INFO = {
  lesson: {
    title: 'Сундук за урок',
    odds: 'Шансы: 99% — от 1 до 15 монет · 1% — вещь из магазина · 0,005% — легендарная вещь (от 10 000).',
  },
  skin: {
    title: 'Сундук со скинами',
    odds: 'Шансы: 99% — вещь из магазина · 1% — легендарная вещь (от 10 000). Вещей, которые уже есть, не бывает. Если всё уже собрано — вернём 600 монет.',
  },
};

const KIND_RU = { avatar: 'Аватар', color: 'Цвет Ками', bg: 'Фон' };

export default function ChestScreen({ type, left, onOpen, onEquip, onClose }) {
  const [phase, setPhase] = useState('closed'); // closed | opening | opened
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [equipped, setEquipped] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  async function open() {
    if (phase !== 'closed') return;
    setPhase('opening');
    setError('');
    setEquipped(false);
    const wobble = Animated.sequence(
      [-1, 1, -1, 1, -0.6, 0.6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 90, easing: Easing.linear, useNativeDriver: true }))
    );
    try {
      const [res] = await Promise.all([onOpen(type), new Promise((r) => wobble.start(r))]);
      setResult(res);
      setPhase('opened');
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } catch (e) {
      setError(e.message);
      setPhase('closed');
    }
  }

  function again() {
    setResult(null);
    setPhase('closed');
  }

  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });
  const item = result?.item;
  const legendary = !!result?.legendary;
  const remaining = result ? (type === 'lesson' ? result.chests_lesson : result.chests_skin) : left;

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>{INFO[type].title}</Text>
      <Text style={styles.small}>{plural(remaining, 'Остался', 'Осталось', 'Осталось')} {remaining} {plural(remaining, 'сундук', 'сундука', 'сундуков')}</Text>

      <View style={styles.stage}>
        {phase !== 'opened' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Открыть сундук" onPress={open} disabled={phase !== 'closed'}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Chest type={type} size={200} />
            </Animated.View>
            <Text style={styles.tap}>{phase === 'opening' ? 'Открываем…' : 'Нажми, чтобы открыть!'}</Text>
          </Pressable>
        ) : (
          <Animated.View style={[styles.reward, legendary && styles.rewardLegend, { transform: [{ scale: pop }] }]}>
            <Chest type={type} open size={110} />
            {legendary && <Text style={styles.legend}>★ ЛЕГЕНДАРНОЕ ★</Text>}
            {result.type === 'coins' ? (
              <>
                <View style={styles.coins}>
                  <Coin size={36} />
                  <Text style={styles.coinsText}>+{result.amount}</Text>
                </View>
                <Text style={styles.body}>{plural(result.amount, 'монета', 'монеты', 'монет')}</Text>
              </>
            ) : (
              <>
                {item.kind === 'avatar' && <UserAvatar value={item.value} size={110} />}
                {item.kind === 'color' && <Kami size={130} color={item.value} mood="excited" />}
                {item.kind === 'bg' && <BgSwatch value={item.value} style={styles.bg} />}
                <Text style={styles.itemKind}>{KIND_RU[item.kind]}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <View style={styles.price}><Coin size={16} /><Text style={styles.priceText}>стоит {item.price}</Text></View>
              </>
            )}
          </Animated.View>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={{ gap: 10 }}>
        {phase === 'opened' && item && !equipped && (
          <Button
            title={item.kind === 'color' ? 'Надеть на Ками' : 'Поставить'}
            onPress={async () => {
              try { await onEquip(item.id); setEquipped(true); } catch (e) { setError(e.message); }
            }}
          />
        )}
        {phase === 'opened' && remaining > 0 && <Button title="Открыть ещё" variant={item && !equipped ? 'secondary' : 'primary'} onPress={again} />}
        <Button title="Готово" variant="secondary" onPress={onClose} />
      </View>
      <Text style={styles.odds}>{INFO[type].odds}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 12 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tap: { fontSize: 16, fontWeight: '700', color: colors.green, textAlign: 'center', marginTop: 8 },
  reward: { alignItems: 'center', gap: 8, padding: 20, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minWidth: 240 },
  rewardLegend: { borderColor: '#F5C443', borderWidth: 3, backgroundColor: '#FFFBEB' },
  legend: { fontSize: 14, fontWeight: '800', letterSpacing: 1, color: '#B54708' },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinsText: { fontSize: 40, fontWeight: '800', color: '#7A5200' },
  bg: { width: 160, height: 100, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  itemKind: { fontSize: 13, fontWeight: '700', color: colors.muted },
  itemTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontSize: 14, color: colors.muted },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  odds: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 },
});
