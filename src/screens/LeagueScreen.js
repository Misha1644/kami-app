// Лига друзей: кто за неделю дал больше верных ответов. Только друзья по коду — общего рейтинга нет.
// Неделя — с понедельника по воскресенье. За прошлую неделю: 1-е место — сундук со скинами, 2–3-е — сундук за урок.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import UserAvatar from '../components/UserAvatar';
import RewardReveal from '../components/RewardReveal';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import { tr } from '../i18n';

const MEDAL = ['🥇', '🥈', '🥉'];
const MIN = 10; // очков, чтобы участвовать

function daysLeft(endsAt) {
  const ms = new Date(endsAt) - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function LeagueScreen({ league, onReload, onClaim, onOpenFriends, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(null);
  useEffect(() => { onReload?.(); }, []);

  if (!league) {
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center' }]}>
        <Text style={styles.small}>{tr('Загрузка…')}</Text>
      </View>
    );
  }

  if (!league.enabled) {
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        {onBack && <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ {tr('Назад')}</Text></Pressable>}
        <Text style={styles.h1}>🏆 {tr('Лига друзей')}</Text>
        <Text style={styles.small}>{tr('Друзья выключены в разделе «Для взрослых». Попроси родителей включить их.')}</Text>
      </ScrollView>
    );
  }

  const table = league.table || [];
  let place = 0;
  let prev = null;
  const rows = table.map((r, i) => {
    const playing = r.score >= MIN;
    if (playing && r.score !== prev) place = i + 1;
    prev = r.score;
    return { ...r, place: playing ? place : null };
  });
  const left = daysLeft(league.ends_at);
  const last = league.last_week || {};

  async function claim() {
    setBusy(true);
    setError('');
    try {
      const res = await onClaim();
      setReveal({
        id: `league-${Date.now()}`, kind: 'pack', chests: 1, chestType: res.chest,
        headline: res.place === 1 ? tr('1-Е МЕСТО В ЛИГЕ!') : tr('{0}-Е МЕСТО В ЛИГЕ!', res.place),
      });
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {reveal && <RewardReveal item={reveal} intro="box" onClose={() => setReveal(null)} />}
      {onBack && <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ {tr('Назад')}</Text></Pressable>}
      <Text style={styles.h1}>🏆 {tr('Лига друзей')}</Text>
      <Text style={styles.small}>
        {tr('Кто за неделю даст больше верных ответов. До конца недели: {0} {1}.', left, plural(left, tr('день'), tr('дня'), tr('дней')))}
      </Text>

      {last.reward && (
        <View style={styles.prize}>
          <Text style={styles.prizeIcon}>{MEDAL[(last.place || 1) - 1] || '🏅'}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.prizeTitle}>{tr('Прошлая неделя: {0}-е место!', last.place)}</Text>
            <Text style={styles.small}>{last.reward === 'skin' ? tr('Награда — сундук со скинами') : tr('Награда — сундук за урок')}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={claim} style={styles.claim}>
            <Text style={styles.claimText}>{busy ? '…' : tr('Забрать')}</Text>
          </Pressable>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.table}>
        {rows.map((r, i) => (
          <View key={r.id} style={[styles.row, r.me && styles.rowMe, i < rows.length - 1 && styles.rowBorder]}>
            <Text style={styles.place}>{r.place ? (MEDAL[r.place - 1] || r.place) : '·'}</Text>
            <UserAvatar value={r.avatar} size={40} kamiColor={r.kami_color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, r.me && { color: colors.greenDark }]} numberOfLines={1}>
                {r.nickname || tr('Без имени')}{r.me ? ` · ${tr('ты')}` : ''}
              </Text>
              {!r.place && <Text style={styles.tiny}>{tr('Ещё {0} до участия', MIN - r.score)}</Text>}
            </View>
            <Text style={styles.score}>{r.score}</Text>
          </View>
        ))}
      </View>

      {table.length <= 1 && (
        <View style={{ gap: 10 }}>
          <Text style={styles.small}>{tr('Пока в лиге только ты. Добавь друзей по коду — и соревнуйтесь каждую неделю!')}</Text>
          {onOpenFriends && <Button title={tr('Добавить друзей')} onPress={onOpenFriends} />}
        </View>
      )}

      <Text style={styles.rules}>
        {tr('Очки — верные ответы за неделю (уроки и «Фразы для школы»). Участвуют те, у кого 10+ очков. Награды за прошлую неделю: 🥇 — сундук со скинами, 🥈 и 🥉 — сундук за урок. Видят друг друга только друзья.')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 26, fontWeight: '900', color: colors.text },
  small: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  tiny: { fontSize: 12, color: colors.muted },
  error: { fontSize: 14, color: colors.danger },
  prize: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: '#F5C443', backgroundColor: '#FFFBEB' },
  prizeIcon: { fontSize: 34 },
  prizeTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  claim: { minHeight: 42, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: '#F79009', alignItems: 'center', justifyContent: 'center' },
  claimText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  table: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rowMe: { backgroundColor: colors.greenLight },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  place: { width: 30, fontSize: 20, fontWeight: '900', color: colors.muted, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  score: { fontSize: 18, fontWeight: '900', color: colors.text },
  rules: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
