// Награды за серию: дорожка из вех (10, 50, 100, 200, 300, …).
// Уже полученные — с галочкой, доступные — с кнопкой «Забрать», остальные — сколько дней осталось.
// Вещи за серию эксклюзивные: их нет в магазине и в сундуках.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import UserAvatar from '../components/UserAvatar';
import Chest from '../components/Chest';
import RewardReveal from '../components/RewardReveal';
import { BgSwatch } from '../components/Background';
import { milestones, streakReward, rewardText } from '../components/Rewards';
import { Flame, Coin } from '../components/icons';
import { Button, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { tr } from '../i18n';

const dayWord = (n) => plural(n, tr('день'), tr('дня'), tr('дней'));

function RewardArt({ r, item, kamiColor }) {
  if (item) {
    if (item.kind === 'avatar') return <UserAvatar value={item.value} size={52} kamiColor={kamiColor} />;
    if (item.kind === 'color') return <Kami size={58} color={item.value} />;
    return <BgSwatch value={item.value} style={styles.bg} />;
  }
  if (r.chests) return <Chest type="skin" size={54} />;
  return <Coin size={40} />;
}

export default function StreakRewardsScreen({ streak, claimed = [], shopItems = [], kamiColor, onClaim, onEquip, onOpenChest, onBack }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(null);
  const list = milestones(streak);
  const next = list.find((d) => d > streak);
  const prev = [...list].reverse().find((d) => d <= streak) || 0;

  async function claim(days) {
    setBusy(days);
    setError('');
    try {
      const res = await onClaim(days);
      const extra = rewardText({ coins: res.item ? res.coins_added : 0, chests: res.item ? res.chests_skin_added : 0 });
      if (res.item) {
        setReveal({ ...res.item, extra: extra ? `+ ${extra}` : '' });
      } else {
        setReveal({
          id: `pack-${days}`, kind: 'pack', exclusive: true,
          coins: res.coins_added, chests: res.chests_skin_added,
          headline: tr('{0} {1} ПОДРЯД!', days, dayWord(days).toUpperCase()),
          extra: rewardText({ coins: res.coins_added, chests: res.chests_skin_added }),
        });
      }
    } catch (e) {
      setError(e.message);
    }
    setBusy(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {reveal && (
        <RewardReveal
          item={reveal}
          kamiColor={kamiColor}
          intro="box"
          onEquip={reveal.kind !== 'pack' ? onEquip : null}
          onClose={() => setReveal(null)}
        />
      )}
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ {tr('Назад')}</Text>
      </Pressable>

      <View style={styles.hero}>
        <Flame size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.h1}>{tr('Награды за серию')}</Text>
          <Text style={styles.streak}>{streak} {dayWord(streak)} {tr('подряд')}</Text>
        </View>
      </View>
      {next && (
        <View style={{ gap: 6 }}>
          <ProgressBar value={(streak - prev) / (next - prev)} />
          <Text style={styles.small}>{tr('До награды за {0} {1}: ещё {2} {3}', next, dayWord(next), next - streak, dayWord(next - streak))}</Text>
        </View>
      )}
      <Text style={styles.small}>{tr('Каждую награду можно получить один раз. Вещи за серию — эксклюзивные: их нельзя купить или выбить из сундука.')}</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {list.map((days) => {
        const r = streakReward(days);
        const item = r.item && shopItems.find((i) => i.id === r.item);
        const got = claimed.includes(days);
        const ready = !got && streak >= days;
        return (
          <View key={days} style={[styles.row, ready && styles.rowReady, got && styles.rowGot, item && !got && !ready && styles.rowItem]}>
            <View style={[styles.badge, (ready || got) && styles.badgeOn]}>
              <Text style={[styles.badgeNum, (ready || got) && { color: '#FFFFFF' }]}>{days}</Text>
              <Text style={[styles.badgeDays, (ready || got) && { color: '#FFFFFF' }]}>{dayWord(days)}</Text>
            </View>
            <View style={styles.art}><RewardArt r={r} item={item} kamiColor={kamiColor} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              {item && <Text style={styles.exclusive}>{tr('ЭКСКЛЮЗИВ')}</Text>}
              {item && <Text style={styles.itemTitle}>{tr(item.title_ru)}</Text>}
              <Text style={item ? styles.small : styles.itemTitle}>{(item ? '+ ' : '') + rewardText(r)}</Text>
            </View>
            {got ? (
              <Text style={styles.got}>✓</Text>
            ) : ready ? (
              <Pressable accessibilityRole="button" disabled={busy === days} onPress={() => claim(days)} style={styles.claim}>
                <Text style={styles.claimText}>{busy === days ? '…' : tr('Забрать')}</Text>
              </Pressable>
            ) : (
              <Text style={styles.left}>{tr('ещё {0}', days - streak)}</Text>
            )}
          </View>
        );
      })}

      {onOpenChest && <Button title={tr('К сундукам')} variant="secondary" onPress={() => onOpenChest('skin')} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  h1: { fontSize: 24, fontWeight: '900', color: colors.text },
  streak: { fontSize: 17, fontWeight: '800', color: colors.orangeText },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  error: { fontSize: 14, color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  rowReady: { borderColor: '#F5C443', borderWidth: 2, backgroundColor: '#FFFBEB' },
  rowGot: { opacity: 0.6 },
  rowItem: { borderColor: '#FDB27B', borderWidth: 2 },
  badge: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#EEF0F2', alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: '#E8833A' },
  badgeNum: { fontSize: 17, fontWeight: '900', color: colors.text },
  badgeDays: { fontSize: 10, fontWeight: '700', color: colors.muted },
  art: { width: 60, alignItems: 'center' },
  bg: { width: 58, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  exclusive: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: '#C4320A' },
  itemTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  got: { fontSize: 22, fontWeight: '900', color: colors.green, paddingHorizontal: 8 },
  claim: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: '#F79009', alignItems: 'center', justifyContent: 'center' },
  claimText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  left: { fontSize: 13, fontWeight: '700', color: colors.muted },
});
