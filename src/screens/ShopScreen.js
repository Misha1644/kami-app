// Магазин: монеты тратятся на заморозки серии и новые цвета Ками.
import { useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Coin, Snowflake } from '../components/icons';
import { Card } from '../components/ui';
import { colors, radius } from '../theme';

export default function ShopScreen({ student, shop, plan, onBuy, onEquip, onOpenPlus, refreshing, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!shop) {
    return <View style={styles.wrap}><Text style={styles.muted}>Загружаем магазин…</Text></View>;
  }

  const freeze = shop.items.find((i) => i.kind === 'freeze');
  const colorItems = shop.items.filter((i) => i.kind === 'color');

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

      <Text style={styles.h2}>Цвет Ками</Text>
      <View style={styles.grid}>
        {colorItems.map((item) => {
          const owned = item.id === 'color-green' || shop.owned.has(item.id);
          const locked = item.plus_only && !plan.plus;
          const worn = student.kami_color === item.id;
          return (
            <Card key={item.id} style={[styles.colorCard, worn && styles.colorCardWorn]}>
              <Kami size={88} color={item.value} />
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title_ru}</Text>
              {worn ? (
                <Text style={styles.worn}>Надет</Text>
              ) : locked ? (
                <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.plusLock}>
                  <Text style={styles.plusLockText}>Только с Плюсом</Text>
                </Pressable>
              ) : owned ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy === item.id}
                  onPress={() => run(item.id, () => onEquip(item.id), 'Ками переоделся!')}
                  style={styles.equip}
                >
                  <Text style={styles.equipText}>Надеть</Text>
                </Pressable>
              ) : (
                item.price === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onBuy(item.id), 'Цвет получен!')}
                    style={styles.equip}
                  >
                    <Text style={styles.equipText}>Получить</Text>
                  </Pressable>
                ) : (
                  <PriceButton
                    price={item.price}
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onBuy(item.id), 'Новый цвет куплен!')}
                  />
                )
              )}
            </Card>
          );
        })}
      </View>
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
  colorCardWorn: { borderColor: colors.green, borderWidth: 2 },
  worn: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 10 },
  equip: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  equipText: { fontSize: 14, fontWeight: '700', color: colors.green },
  plusLock: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: '#F3ECFC', alignItems: 'center', justifyContent: 'center' },
  plusLockText: { fontSize: 13, fontWeight: '700', color: '#6B3FB8' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: colors.green },
  priceText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
