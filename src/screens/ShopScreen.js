// Магазин: монеты тратятся на заморозки серии, цвета Ками, аватары и фоны.
import { useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { PLUS_ENABLED } from '../config';
import UserAvatar from '../components/UserAvatar';
import { BgSwatch } from '../components/Background';
import Kami from '../components/Kami';
import { Coin, Snowflake } from '../components/icons';
import { Card } from '../components/ui';
import { colors, radius } from '../theme';

export default function ShopScreen({ student, shop, plan, kamiColor, onBuy, onEquip, onOpenPlus, refreshing, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!shop) {
    return <View style={styles.wrap}><Text style={styles.muted}>Загружаем магазин…</Text></View>;
  }

  const freeze = shop.items.find((i) => i.kind === 'freeze');
  // Вещи «только с Плюсом» видны, если подписка включена (или Плюс уже есть).
  const visible = (kind) => shop.items.filter((i) => i.kind === kind && (PLUS_ENABLED || plan.plus || !i.plus_only));
  const DEFAULTS = ['color-green', 'avatar-person', 'bg-default'];
  const worn = { color: student.kami_color, avatar: student.avatar, bg: student.bg };
  const WORN_TEXT = { color: 'Надет', avatar: 'Выбран', bg: 'Выбран' };
  const OK_TEXT = { color: 'Ками переоделся!', avatar: 'Новый аватар!', bg: 'Новый фон!' };

  function preview(item) {
    if (item.kind === 'avatar') return <UserAvatar value={item.value} size={72} kamiColor={kamiColor} />;
    if (item.kind === 'bg') return <BgSwatch value={item.value} style={styles.bgPreview} />;
    return <Kami size={88} color={item.value} />;
  }

  function section(kind, title) {
    return (
      <>
        <Text style={styles.h2}>{title}</Text>
        <View style={styles.grid}>
          {visible(kind).map((item) => {
            const owned = DEFAULTS.includes(item.id) || shop.owned.has(item.id);
            const locked = item.plus_only && !plan.plus;
            const isWorn = worn[kind] === item.id;
            return (
              <Card key={item.id} style={[styles.colorCard, isWorn && styles.colorCardWorn, item.price >= 5000 && styles.legendCard]}>
                {item.price >= 5000 && <Text style={styles.legend}>ЛЕГЕНДАРНОЕ</Text>}
                {preview(item)}
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title_ru}</Text>
                {isWorn ? (
                  <Text style={styles.worn}>{WORN_TEXT[kind]}</Text>
                ) : locked ? (
                  <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.plusLock}>
                    <Text style={styles.plusLockText}>Только с Плюсом</Text>
                  </Pressable>
                ) : owned ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onEquip(item.id), OK_TEXT[kind])}
                    style={styles.equip}
                  >
                    <Text style={styles.equipText}>{kind === 'color' ? 'Надеть' : 'Выбрать'}</Text>
                  </Pressable>
                ) : item.price === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onBuy(item.id), 'Получено!')}
                    style={styles.equip}
                  >
                    <Text style={styles.equipText}>Получить</Text>
                  </Pressable>
                ) : (
                  <PriceButton
                    price={item.price}
                    disabled={busy === item.id || student.coins < item.price}
                    onPress={() => run(item.id, () => onBuy(item.id), 'Куплено!')}
                  />
                )}
              </Card>
            );
          })}
        </View>
      </>
    );
  }

  async function run(id, action, okText) {
    setBusy(id);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(okText);
    } catch (e) {
      setError(e.message);
    }
    setBusy(null);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      <View style={styles.header}>
        <Text style={styles.h1}>Магазин</Text>
        <View style={styles.balance}>
          <Coin size={20} />
          <Text style={styles.balanceText}>{student.coins}</Text>
        </View>
      </View>
      <Text style={styles.muted}>1 монета за каждое верное слово, +10 за выполненную цель дня.</Text>

      {!!message && <Text style={styles.ok}>{message}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {freeze && (
        <Card style={styles.freezeCard}>
          <View style={styles.freezeIcon}><Snowflake size={28} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.itemTitle}>{freeze.title_ru}</Text>
            <Text style={styles.small}>Спасает серию, если пропустишь день. У тебя: {student.streak_freezes} из 2.</Text>
          </View>
          <PriceButton
            price={freeze.price}
            disabled={busy === freeze.id || student.streak_freezes >= 2}
            onPress={() => run(freeze.id, () => onBuy(freeze.id), 'Заморозка куплена!')}
          />
        </Card>
      )}

      {section('avatar', 'Аватары')}
      {section('color', 'Цвет Ками')}
      {section('bg', 'Фоны')}
    </ScrollView>
  );
}

function PriceButton({ price, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Купить за ${price} монет`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.price, disabled && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Coin size={16} />
      <Text style={styles.priceText}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  ok: { fontSize: 14, color: colors.greenDark, fontWeight: '700' },
  error: { fontSize: 14, color: colors.danger },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FBF1D6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  balanceText: { fontSize: 17, fontWeight: '800', color: '#7A5200' },
  freezeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  freezeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E6F0FB', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorCard: { width: '48%', alignItems: 'center', gap: 8, padding: 12 },
  bgPreview: { width: 88, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  legendCard: { borderColor: '#F5C443', borderWidth: 2, backgroundColor: '#FFFBEB' },
  legend: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#B54708' },
  colorCardWorn: { borderColor: colors.green, borderWidth: 2 },
  worn: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 10 },
  equip: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  equipText: { fontSize: 14, fontWeight: '700', color: colors.green },
  plusLock: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: '#F3ECFC', alignItems: 'center', justifyContent: 'center' },
  plusLockText: { fontSize: 13, fontWeight: '700', color: '#6B3FB8' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: colors.green },
  priceText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
