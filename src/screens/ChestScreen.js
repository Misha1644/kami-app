// Открытие сундука — рулетка как в CS: лента вещей прокручивается и останавливается
// на выигрыше под жёлтым указателем. Что выпало, решает сервер (open_chest) ДО прокрутки;
// лента вокруг выигрыша — просто для красоты. Шансы показаны внизу экрана.
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Chest from '../components/Chest';
import RewardReveal from '../components/RewardReveal';
import Kami from '../components/Kami';
import UserAvatar from '../components/UserAvatar';
import { BgSwatch } from '../components/Background';
import { Coin } from '../components/icons';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { tr, itemTitle } from '../i18n';

const INFO = {
  lesson: {
    title: 'Сундук за урок',
    odds: 'Шансы: 99% — от 1 до 15 монет · 1% — вещь до 500 монет · 0,005% — редкая вещь дороже 500.',
  },
  skin: {
    title: 'Сундук со скинами',
    odds: 'Шансы: 99,995% — вещь до 500 монет · 0,005% — редкая вещь дороже 500. Вещей, которые уже есть, не бывает. Если все вещи до 500 уже собраны — вернём 600 монет.',
  },
};

const KIND_RU = { avatar: 'Аватар', color: 'Цвет Ками', bg: 'Фон' };
const TILE = 100;      // ширина плитки
const GAP = 8;
const STEP = TILE + GAP;
const COUNT = 46;      // плиток в ленте
const WIN_AT = 40;     // на какой плитке остановится
const SPIN_MS = 5200;

// Редкость — цвет полоски снизу, как в CS.
function rarity(tile) {
  if (tile.type === 'coins') return { color: '#98A2B3', label: tr('монеты') };
  const p = tile.item.price;
  if (p >= 10000) return { color: '#F5B700', label: tr('легендарное') };
  if (p >= 5000) return { color: '#EB4B4B', label: tr('тайное') };
  if (p >= 600) return { color: '#D32CE6', label: tr('засекреченное') };
  if (p >= 300) return { color: '#8847FF', label: tr('запрещённое') };
  return { color: '#4B69FF', label: tr('армейское') };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Лента: случайные плитки + выигрыш на позиции WIN_AT.
function buildStrip(type, items, win) {
  const regular = items.filter((i) => i.price <= 500);
  const legendary = items.filter((i) => i.price > 500);
  const tiles = [];
  for (let i = 0; i < COUNT; i++) {
    if (i === WIN_AT) { tiles.push(win); continue; }
    const r = Math.random();
    if (type === 'lesson' && r < 0.68) tiles.push({ type: 'coins', amount: 1 + Math.floor(Math.random() * 15) });
    else if (legendary.length && r > 0.9) tiles.push({ type: 'item', item: pick(legendary) });
    else if (regular.length) tiles.push({ type: 'item', item: pick(regular) });
    else tiles.push({ type: 'coins', amount: 1 + Math.floor(Math.random() * 15) });
  }
  return tiles;
}

function TileArt({ tile, big }) {
  const s = big ? 1.6 : 1;
  if (tile.type === 'coins') {
    return (
      <View style={styles.coinArt}>
        <Coin size={30 * s} />
        <Text style={[styles.coinAmount, big && { fontSize: 34 }]}>+{tile.amount}</Text>
      </View>
    );
  }
  const it = tile.item;
  if (it.kind === 'avatar') return <UserAvatar value={it.value} size={56 * s} />;
  if (it.kind === 'color') return <Kami size={64 * s} color={it.value} />;
  return <BgSwatch value={it.value} style={{ width: 72 * s, height: 46 * s, borderRadius: 8, borderWidth: 1, borderColor: colors.border }} />;
}

function Tile({ tile }) {
  const r = rarity(tile);
  return (
    <View style={styles.tile}>
      <View style={styles.tileArt}><TileArt tile={tile} /></View>
      <Text style={styles.tileName} numberOfLines={1}>
        {tile.type === 'coins' ? tr('Монеты') : itemTitle(tile.item)}
      </Text>
      <View style={[styles.rarityBar, { backgroundColor: r.color }]} />
    </View>
  );
}

export default function ChestScreen({ type, left, shopItems = [], onOpen, onEquip, onClose }) {
  const [phase, setPhase] = useState('ready'); // ready | spinning | opened
  const [strip, setStrip] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [equipped, setEquipped] = useState(false);
  const [width, setWidth] = useState(0);
  const [reveal, setReveal] = useState(null); // выпавшая вещь — показываем большой анимацией
  const offset = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const winRef = useRef(null);

  // Пул вещей для ленты: всё, что можно выиграть (не подписка, не бесплатное).
  const pool = shopItems.filter((i) => ['avatar', 'color', 'bg'].includes(i.kind) && i.price > 0 && !i.plus_only);

  // Пока не крутили — показываем ленту-превью.
  useEffect(() => {
    if (phase === 'ready' && pool.length) setStrip(buildStrip(type, pool, { type: 'coins', amount: 15 }));
  }, [phase, type, shopItems.length]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('opened');
    if (winRef.current) setReveal(winRef.current);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: false }).start();
  }

  async function spin() {
    if (phase !== 'ready') return;
    setError('');
    setEquipped(false);
    let res;
    try {
      res = await onOpen(type);
    } catch (e) {
      setError(e.message);
      return;
    }
    const full = res.item && (pool.find((i) => i.id === res.item.id) || { ...res.item, title_ru: res.item.title });
    const win = res.type === 'coins' ? { type: 'coins', amount: res.amount } : { type: 'item', item: full };
    setResult(res);
    winRef.current = win.type === 'item' ? win.item : null;
    setStrip(buildStrip(type, pool, win));
    setPhase('spinning');
    doneRef.current = false;

    // Остановиться так, чтобы выигрыш оказался под указателем (с небольшим случайным сдвигом).
    const center = (width || 340) / 2;
    const jitter = (Math.random() - 0.5) * (TILE * 0.6);
    const target = -(WIN_AT * STEP + TILE / 2 - center + jitter);
    offset.setValue(0);
    Animated.timing(offset, {
      toValue: target,
      duration: SPIN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => finish());
    setTimeout(finish, SPIN_MS + 400); // на случай, если анимация не сообщит о конце
  }

  function again() {
    offset.setValue(0);
    setResult(null);
    setPhase('ready');
  }

  const item = result?.item;
  const legendary = !!result?.legendary;
  const remaining = result ? (type === 'lesson' ? result.chests_lesson : result.chests_skin) : left;
  const win = strip[WIN_AT];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {reveal && (
        <RewardReveal
          item={reveal}
          intro="flash"
          showPrice
          onEquip={async (id) => { await onEquip(id); setEquipped(true); }}
          onClose={() => setReveal(null)}
        />
      )}
      <View style={styles.header}>
        <Chest type={type} open={phase === 'opened'} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{tr(INFO[type].title)}</Text>
          <Text style={styles.small}>
            {plural(remaining, tr('Остался'), tr('Осталось'), tr('Осталось'))} {remaining} {plural(remaining, tr('сундук'), tr('сундука'), tr('сундуков'))}
          </Text>
        </View>
      </View>

      {/* Рулетка */}
      <View style={styles.roulette} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.strip, { transform: [{ translateX: offset }] }]}>
          {strip.map((t, i) => <Tile key={i} tile={t} />)}
        </Animated.View>
        <View pointerEvents="none" style={styles.fadeLeft} />
        <View pointerEvents="none" style={styles.fadeRight} />
        <View pointerEvents="none" style={styles.marker} />
        <View pointerEvents="none" style={styles.markerTop} />
      </View>

      {/* Результат */}
      {phase === 'opened' && win && (
        <Animated.View style={[styles.reward, legendary && styles.rewardLegend, { transform: [{ scale: pop }] }]}>
          {legendary && <Text style={styles.legend}>{tr('★ РЕДКОЕ — ШАНС 0,005% ★')}</Text>}
          <TileArt tile={win} big />
          {win.type === 'coins' ? (
            <Text style={styles.itemTitle}>{win.amount} {plural(win.amount, tr('монета'), tr('монеты'), tr('монет'))}</Text>
          ) : (
            <>
              <Text style={styles.itemKind}>{tr(KIND_RU[item.kind])} · {rarity(win).label}</Text>
              <Text style={styles.itemTitle}>{itemTitle(item)}</Text>
              <View style={styles.price}><Coin size={16} /><Text style={styles.small}>{tr('стоит {0}', item.price)}</Text></View>
            </>
          )}
        </Animated.View>
      )}
      {phase === 'spinning' && <Text style={styles.spinning}>{tr('Крутится…')}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={{ gap: 10, marginTop: 'auto' }}>
        {phase === 'ready' && <Button title={tr('Крутить!')} onPress={spin} disabled={!pool.length || remaining < 1} />}
        {phase === 'opened' && item && !equipped && (
          <Button
            title={item.kind === 'color' ? tr('Надеть на Ками') : tr('Поставить')}
            onPress={async () => {
              try { await onEquip(item.id); setEquipped(true); } catch (e) { setError(e.message); }
            }}
          />
        )}
        {phase === 'opened' && remaining > 0 && (
          <Button title={tr('Крутить ещё ({0})', remaining)} variant={item && !equipped ? 'secondary' : 'primary'} onPress={again} />
        )}
        {phase !== 'spinning' && <Button title={tr('Готово')} variant="secondary" onPress={onClose} />}
        <Text style={styles.odds}>{tr(INFO[type].odds)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  small: { fontSize: 14, color: colors.muted },
  roulette: { height: 150, borderRadius: radius.lg, backgroundColor: '#1D2433', overflow: 'hidden', justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: GAP, paddingHorizontal: 0 },
  tile: { width: TILE, height: 122, borderRadius: 10, backgroundColor: '#2B3447', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, overflow: 'hidden' },
  tileArt: { height: 70, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 11, fontWeight: '700', color: '#E4E7EC', paddingHorizontal: 4 },
  rarityBar: { height: 6, alignSelf: 'stretch' },
  coinArt: { alignItems: 'center', gap: 2 },
  coinAmount: { fontSize: 16, fontWeight: '800', color: '#FDE68A' },
  fadeLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, backgroundColor: 'rgba(29,36,51,0.6)' },
  fadeRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, backgroundColor: 'rgba(29,36,51,0.6)' },
  marker: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, marginLeft: -1.5, backgroundColor: '#F5C443' },
  markerTop: { position: 'absolute', left: '50%', top: -2, marginLeft: -9, width: 18, height: 12, backgroundColor: '#F5C443', borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  spinning: { fontSize: 16, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  reward: { alignItems: 'center', gap: 6, padding: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  rewardLegend: { borderColor: '#F5C443', borderWidth: 3, backgroundColor: '#FFFBEB' },
  legend: { fontSize: 14, fontWeight: '800', letterSpacing: 1, color: '#B54708' },
  itemKind: { fontSize: 13, fontWeight: '700', color: colors.muted },
  itemTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  odds: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 },
});
