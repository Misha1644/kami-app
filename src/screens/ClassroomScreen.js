// «Фразы для школы»: темы-уроки + шпаргалка (фразы с озвучкой и «показать крупно» — можно показать учителю).
// Уроки здесь — дополнительные: монеты, серия верных ответов и сундуки есть, огонёк дней не продлевается.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { CLASSROOM_TOPICS } from '../data/classroom';
import { speak } from '../lib/speech';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { tr, getLang } from '../i18n';

function title(t) {
  const lang = getLang();
  return (lang === 'en' && t.titleEn) || (lang === 'ar' && t.titleAr) || t.titleRu;
}

export default function ClassroomScreen({ gloss, onStart, onBack }) {
  const [open, setOpen] = useState(null); // id темы со шпаргалкой
  const [big, setBig] = useState(null); // фраза «крупно»

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ {tr('Назад')}</Text>
      </Pressable>
      <Text style={styles.h1}>🏫 {tr('Фразы для школы')}</Text>
      <Text style={styles.small}>
        {tr('Самое нужное для урока и перемены. Это дополнительные занятия: дают монеты и сундуки, но огонёк не продлевают.')}
      </Text>

      {CLASSROOM_TOPICS.map((t) => {
        const words = t.words.map(gloss);
        const isOpen = open === t.id;
        return (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.icon}>{t.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title(t)}</Text>
                <Text style={styles.small}>{t.title} · {tr('{0} фраз', words.length)}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}><Button title={tr('Учить')} onPress={() => onStart(t.id)} /></View>
              <View style={{ flex: 1 }}>
                <Button title={isOpen ? tr('Скрыть') : tr('Шпаргалка')} variant="secondary" onPress={() => setOpen(isOpen ? null : t.id)} />
              </View>
            </View>
            {isOpen && words.map((w) => (
              <View key={w.id} style={styles.phrase}>
                <Pressable accessibilityRole="button" accessibilityLabel={tr('Послушать')} onPress={() => speak(w.es, { lang: w.lang })} style={styles.sound}>
                  <Text style={styles.soundText}>🔊</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.es}>{w.es}</Text>
                  <Text style={styles.small}>{w.ru}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={tr('Показать крупно')} onPress={() => { setBig(w); speak(w.es, { lang: w.lang }); }} style={styles.sound}>
                  <Text style={styles.soundText}>⤢</Text>
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}

      {/* Крупно — чтобы показать учителю или однокласснику */}
      <Modal visible={!!big} animationType="fade" onRequestClose={() => setBig(null)}>
        {big && (
          <Pressable style={styles.bigWrap} onPress={() => setBig(null)} accessibilityRole="button" accessibilityLabel={tr('Закрыть')}>
            <Text style={styles.bigEs}>{big.es}</Text>
            <Text style={styles.bigRu}>{big.ru}</Text>
            <Pressable onPress={() => speak(big.es, { lang: big.lang })} style={styles.bigSound} accessibilityRole="button" accessibilityLabel={tr('Послушать')}>
              <Text style={{ fontSize: 34 }}>🔊</Text>
            </Pressable>
            <Text style={styles.small}>{tr('Нажми, чтобы закрыть')}</Text>
          </Pressable>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 26, fontWeight: '900', color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 34 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  phrase: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.track },
  sound: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  soundText: { fontSize: 20 },
  es: { fontSize: 17, fontWeight: '800', color: colors.text },
  bigWrap: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 20 },
  bigEs: { fontSize: 44, fontWeight: '900', color: colors.text, textAlign: 'center' },
  bigRu: { fontSize: 22, color: colors.muted, textAlign: 'center' },
  bigSound: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
});
