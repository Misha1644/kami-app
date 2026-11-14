// Магазин: монеты тратятся на заморозки серии, цвета Ками, аватары и фоны.
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { PLUS_ENABLED } from '../config';
import UserAvatar from '../components/UserAvatar';
import { BgSwatch } from '../components/Background';
import Chest from '../components/Chest';
import RewardReveal from '../components/RewardReveal';
import Kami from '../components/Kami';
import { Coin, Snowflake } from '../components/icons';
import { Card } from '../components/ui';
import { colors, radius } from '../theme';
import { tr, itemTitle } from '../i18n';
import { plural } from '../data/content';
import { togglePreview, stopPreview, usePreviewState } from '../lib/music';

export default function ShopScreen({ student, shop, plan, kamiColor, onBuy, onEquip, onOpenPlus, onOpenChest, refreshing, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [listening, setListening] = useState(null); // трек, который сейчас слушаем
  usePreviewState(setListening);
  useEffect(() => () => stopPreview(), []); // ушли из магазина — прослушивание выключаем
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(null); // купленная вещь — показываем большой анимацией

  if (!shop) {
    return <View style={styles.wrap}><Text style={styles.muted}>{tr('Загружаем магазин…')}</Text></View>;
  }

  const freeze = shop.items.find((i) => i.kind === 'freeze');
  const chest = shop.items.find((i) => i.kind === 'chest');
  // Вещи «только с Плюсом» видны, если подписка включена (или Плюс уже есть).
  // Витрина дня: продаются только сегодняшние вещи (+ вещи «с Плюсом», они всегда).
  const rot = shop.rotation || {};
  const inShop = (i) => (i.plus_only ? PLUS_ENABLED || plan.plus : !!rot[i.id] && !rot[i.id].featured);
  const visible = (kind) => shop.items
    .filter((i) => i.kind === kind && inShop(i))
    .sort((a, b) => a.price - b.price || a.sort - b.sort);
  const featured = shop.items.find((i) => rot[i.id]?.featured);
  const DEFAULTS = ['color-green', 'avatar-person', 'bg-default'];
  const worn = { color: student.kami_color, avatar: student.avatar, bg: student.bg };
  const WORN_TEXT = { color: tr('Надет'), avatar: tr('Выбран'), bg: tr('Выбран') };
  const OK_TEXT = { color: tr('Ками переоделся!'), avatar: tr('Новый аватар!'), bg: tr('Новый фон!') };

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
                <Tag tag={rot[item.id]?.tag} away={rot[item.id]?.away} />
                {item.price >= 5000 && <Text style={styles.legend}>{tr('ЛЕГЕНДАРНОЕ')}</Text>}
                {preview(item)}
                <Text style={styles.itemTitle} numberOfLines={1}>{itemTitle(item)}</Text>
                {isWorn ? (
                  <Text style={styles.worn}>{WORN_TEXT[kind]}</Text>
                ) : locked ? (
                  <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.plusLock}>
                    <Text style={styles.plusLockText}>{tr('Только с Плюсом')}</Text>
                  </Pressable>
                ) : owned ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onEquip(item.id), OK_TEXT[kind])}
                    style={styles.equip}
                  >
                    <Text style={styles.equipText}>{kind === 'color' ? tr('Надеть') : tr('Выбрать')}</Text>
                  </Pressable>
                ) : item.price === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, () => onBuy(item.id), tr('Получено!'), item)}
                    style={styles.equip}
                  >
                    <Text style={styles.equipText}>{tr('Получить')}</Text>
                  </Pressable>
                ) : (
                  <PriceButton
                    price={item.price}
                    disabled={busy === item.id || student.coins < item.price}
                    onPress={() => run(item.id, () => onBuy(item.id), tr('Куплено!'), item)}
                  />
                )}
              </Card>
            );
          })}
        </View>
      </>
    );
  }

  async function run(id, action, okText, revealItem) {
    setBusy(id);
    setError('');
    setMessage('');
    try {
      await action();
      if (revealItem) setReveal(revealItem);
      else setMessage(okText);
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
      {reveal && (
        <RewardReveal
          item={reveal}
          kamiColor={kamiColor}
          intro="box"
          onEquip={onEquip}
          onClose={() => setReveal(null)}
        />
      )}
      <View style={styles.header}>
        <Text style={styles.h1}>{tr('Магазин')}</Text>
        <View style={styles.balance}>
          <Coin size={20} />
          <Text style={styles.balanceText}>{student.coins}</Text>
        </View>
      </View>
      <Text style={styles.muted}>{tr('1 монета за каждое верное слово, +10 за выполненную цель дня.')}</Text>

      <View style={styles.vitrine}>
        <Text style={styles.vitrineTitle}>{tr('🛍 Витрина дня')}</Text>
        <Countdown to={shop.nextAt} onExpire={onRefresh} />
      </View>

      {featured && (() => {
        const owned = shop.owned.has(featured.id);
        const worn = [student.kami_color, student.avatar, student.bg].includes(featured.id);
        return (
          <Card style={styles.featured}>
            <View style={styles.featuredHead}>
              <Text style={styles.featuredLabel}>{tr('★ ВЕЩЬ ДНЯ')}</Text>
              <Tag tag={rot[featured.id]?.tag} away={rot[featured.id]?.away} inline />
            </View>
            <View style={styles.featuredRow}>
              {preview(featured)}
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.featuredTitle}>{itemTitle(featured)}</Text>
                <Text style={styles.small}>{tr('{0} · только сегодня', { avatar: tr('Аватар'), color: tr('Цвет Ками'), bg: tr('Фон') }[featured.kind])}</Text>
                {worn ? <Text style={styles.worn}>{tr('Надето')}</Text> : owned ? (
                  <Pressable accessibilityRole="button" onPress={() => run(featured.id, () => onEquip(featured.id), tr('Готово!'))} style={styles.equip}>
                    <Text style={styles.equipText}>{tr('Выбрать')}</Text>
                  </Pressable>
                ) : (
                  <PriceButton
                    price={featured.price}
                    disabled={busy === featured.id || student.coins < featured.price}
                    onPress={() => run(featured.id, () => onBuy(featured.id), tr('Куплено!'), featured)}
                  />
                )}
              </View>
            </View>
          </Card>
        );
      })()}

      {!!message && <Text style={styles.ok}>{message}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {chest && (
        <Card style={styles.chestCard}>
          <View style={styles.chestRow}>
            <Chest type="skin" size={80} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.itemTitle}>{itemTitle(chest)}</Text>
              <Text style={styles.small}>{tr('Только вещи: аватары, цвета, фоны. Вещи дороже 500 — с шансом 0,005%. Повторов не бывает.')}</Text>
            </View>
          </View>
          <View style={styles.chestRow}>
            <PriceButton
              price={chest.price}
              disabled={busy === chest.id || student.coins < chest.price}
              onPress={() => run(chest.id, () => onBuy(chest.id), tr('Сундук куплен!'))}
            />
            {(student.chests_skin || 0) > 0 && (
              <Pressable accessibilityRole="button" onPress={() => onOpenChest('skin')} style={styles.equip}>
                <Text style={styles.equipText}>{tr('Открыть ({0})', student.chests_skin)}</Text>
              </Pressable>
            )}
            {(student.chests_lesson || 0) > 0 && (
              <Pressable accessibilityRole="button" onPress={() => onOpenChest('lesson')} style={styles.equip}>
                <Text style={styles.equipText}>{tr('За уроки ({0})', student.chests_lesson)}</Text>
              </Pressable>
            )}
          </View>
        </Card>
      )}

      {freeze && (
        <Card style={styles.freezeCard}>
          <View style={styles.freezeIcon}><Snowflake size={28} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.itemTitle}>{itemTitle(freeze)}</Text>
            <Text style={styles.small}>{tr('Спасает серию, если пропустишь день. У тебя: {0} из 5. Каждый месяц 1-го числа снова 5.', student.streak_freezes)}</Text>
          </View>
          <PriceButton
            price={freeze.price}
            disabled={busy === freeze.id || student.streak_freezes >= 5}
            onPress={() => run(freeze.id, () => onBuy(freeze.id), tr('Заморозка куплена!'))}
          />
        </Card>
      )}

      {/* Музыка: всегда в продаже, играет в меню */}
      <Text style={styles.h2}>{tr('🎵 Музыка')}</Text>
      <Text style={styles.small}>{tr('Выбранная музыка играет в меню. На уроках — тишина. Нажми ▶, чтобы послушать.')}</Text>
      <Card style={{ paddingVertical: 4 }}>
        {shop.items.filter((i) => i.kind === 'music').sort((a, b) => a.price - b.price || a.sort - b.sort).map((item, idx, arr) => {
          const owned = item.price === 0 || shop.owned.has(item.id);
          const playing = student.music === item.id;
          const legend = item.price >= 5000;
          return (
            <View key={item.id} style={[styles.musicRow, idx < arr.length - 1 && styles.musicBorder]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={listening === item.value ? tr('Остановить') : tr('Послушать {0}', itemTitle(item))}
                onPress={() => togglePreview(item.value)}
                style={[styles.listen, listening === item.value && styles.listenOn]}
              >
                <Text style={[styles.listenText, listening === item.value && { color: '#FFFFFF' }]}>{listening === item.value ? '■' : '▶'}</Text>
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                {legend && <Text style={styles.legend}>{tr('ЛЕГЕНДАРНОЕ')}</Text>}
                <Text style={styles.itemTitle} numberOfLines={1}>{itemTitle(item)}</Text>
              </View>
              {playing ? (
                <Pressable accessibilityRole="button" disabled={busy === item.id} onPress={() => run(item.id, () => onEquip('music-off'), tr('Музыка выключена.'))} style={styles.equip}>
                  <Text style={styles.equipText}>{tr('Играет ♪')}</Text>
                </Pressable>
              ) : owned ? (
                <Pressable accessibilityRole="button" disabled={busy === item.id} onPress={() => run(item.id, () => onEquip(item.id), tr('Музыка включена!'))} style={styles.equip}>
                  <Text style={styles.equipText}>{tr('Включить')}</Text>
                </Pressable>
              ) : (
                <PriceButton
                  price={item.price}
                  disabled={busy === item.id || student.coins < item.price}
                  onPress={() => { stopPreview(); run(item.id, () => onBuy(item.id), tr('Куплено!'), item); }}
                />
              )}
            </View>
          );
        })}
      </Card>

      {section('avatar', tr('Аватары'))}
      {section('color', tr('Цвет Ками'))}
      {section('bg', tr('Фоны'))}
    </ScrollView>
  );
}

// «спустя 12 дней» / «спустя 2 месяца» / «спустя больше года».
function awayText(days) {
  if (!days) return '';
  if (days >= 365) return tr('спустя больше года');
  if (days >= 30) {
    const m = Math.round(days / 30);
    return tr('спустя {0} {1}', m, plural(m, tr('месяц'), tr('месяца'), tr('месяцев')));
  }
  return tr('спустя {0} {1}', days, plural(days, tr('день'), tr('дня'), tr('дней')));
}

// Метка «НОВИНКА» (вещи ещё не было на витрине) / «ВЕРНУЛОСЬ спустя …».
function Tag({ tag, away, inline }) {
  if (!tag) return inline ? null : <View style={styles.tagSlot} />;
  const isNew = tag === 'new';
  const pill = (
    <View style={[styles.tag, isNew ? styles.tagNew : styles.tagBack]}>
      <Text style={styles.tagText}>{isNew ? tr('НОВИНКА') : tr('ВЕРНУЛОСЬ')}</Text>
    </View>
  );
  const sub = !isNew && away ? <Text style={styles.tagAway}>{awayText(away)}</Text> : null;
  if (inline) return <View style={styles.tagInline}>{pill}{sub}</View>;
  return <View style={styles.tagSlot}>{pill}{sub}</View>;
}

// Сколько осталось до обновления витрины.
function Countdown({ to, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const left = to ? new Date(to).getTime() - now : 0;
  useEffect(() => {
    if (to && left <= 0) onExpire?.();
  }, [to, left <= 0]);
  if (!to) return null;
  const h = Math.max(0, Math.floor(left / 3600000));
  const m = Math.max(0, Math.floor((left % 3600000) / 60000));
  return <Text style={styles.countdown}>{tr('Обновится через {0} ч {1} мин', h, m)}</Text>;
}

function PriceButton({ price, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('Купить за {0} монет', price)}
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
  chestCard: { gap: 10, borderColor: '#B07CE8', borderWidth: 2, backgroundColor: '#F7F2FD' },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  vitrine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  vitrineTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  countdown: { fontSize: 13, fontWeight: '700', color: colors.orangeText },
  featured: { gap: 10, borderColor: '#F5C443', borderWidth: 2, backgroundColor: '#FFFBEB' },
  featuredHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: '#B54708' },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featuredTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  tagSlot: { height: 34, alignItems: 'center', gap: 2 },
  tagInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagAway: { fontSize: 11, fontWeight: '700', color: '#1570EF' },
  tag: { alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagNew: { backgroundColor: '#F79009' },
  tagBack: { backgroundColor: '#1570EF' },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#FFFFFF' },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  musicBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  listen: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  listenOn: { backgroundColor: colors.green },
  listenText: { fontSize: 16, fontWeight: '800', color: colors.green },
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
