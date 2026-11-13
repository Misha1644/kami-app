// «Факт дня» на главном экране. До открытия виден только вопрос — чтобы было любопытно.
// Открытый факт запоминается на сегодня; завтра будет новый.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Kami from './Kami';
import { colors, radius } from '../theme';
import { factOfDay, dayKey } from '../data/facts';
import { speak } from '../lib/speech';
import { tr } from '../i18n';

export default function FactCard({ kamiColor }) {
  const [today] = useState(() => new Date());
  const fact = factOfDay(today);
  const key = `kami.fact.${dayKey(today)}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((v) => setOpen(v === '1')).catch(() => {});
  }, [key]);

  function reveal() {
    setOpen(true);
    AsyncStorage.setItem(key, '1').catch(() => {});
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? tr('Факт дня: {0}', tr(fact.t)) : tr('Открыть факт дня: {0}', tr(fact.t))}
      onPress={open ? undefined : reveal}
      style={[styles.card, !open && styles.closed]}
    >
      <View style={styles.head}>
        <Text style={styles.label}>{tr('ФАКТ ДНЯ ОТ КАМИ')}</Text>
        {!open && <Text style={styles.badge}>{tr('новый')}</Text>}
      </View>
      <View style={styles.row}>
        <Kami size={52} color={kamiColor} mood={open ? 'excited' : 'happy'} />
        <Text style={styles.title}>{tr(fact.t)}</Text>
      </View>
      {open ? (
        <>
          <Text style={styles.text}>{tr(fact.x)}</Text>
          {!!fact.w && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Послушать: {0}', fact.w[0])}
              onPress={() => speak(fact.w[0])}
              style={styles.word}
            >
              <Text style={styles.wordEs}>🔊 {fact.w[0]}</Text>
              <Text style={styles.wordRu}>{tr(fact.w[1])}</Text>
            </Pressable>
          )}
          <Text style={styles.small}>{tr('Завтра Ками расскажет новый факт.')}</Text>
        </>
      ) : (
        <Text style={styles.open}>{tr('Нажми, чтобы узнать →')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  closed: { borderColor: colors.orange, borderWidth: 1.5, backgroundColor: colors.orangeLight },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.orangeText },
  badge: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', backgroundColor: colors.orange, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 23 },
  text: { fontSize: 15, lineHeight: 22, color: colors.text },
  word: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.greenLight },
  wordEs: { fontSize: 15, fontWeight: '700', color: colors.greenDark },
  wordRu: { fontSize: 13, color: colors.muted },
  open: { fontSize: 15, fontWeight: '700', color: colors.orangeText },
  small: { fontSize: 13, color: colors.muted },
});
