// «Что сейчас проходим в школе»: у каждой школы своя программа, поэтому по каждому предмету
// ученик (или родитель) отмечает тему, которую сейчас проходят в классе. Ками готовит именно к ней.
// «Не знаю» — Ками идёт по порядку программы (первая невыученная тема).
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Teacher from '../components/Teacher';
import { teacherFor } from '../data/teachers';
import { learnedCount, subjectByCode } from '../data/content';
import { colors, radius } from '../theme';
import { tr } from '../i18n';
import haptic from '../lib/haptics';

export default function CurrentTopicsScreen({ topics, learned, current, codes, focus, kamiColor, onSet, onBack }) {
  const [open, setOpen] = useState(focus || null); // какой предмет раскрыт
  const subjects = codes.filter((c) => topics.some((t) => t.subjectCode === c));

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ {tr('Назад')}</Text>
      </Pressable>
      <Text style={styles.h1}>📚 {tr('Что проходим в школе')}</Text>
      <Text style={styles.small}>
        {tr('В каждой школе своя программа. Отметь тему, которую сейчас проходите на уроках, — и Ками будет готовить именно к ней. Не уверен? Спроси учителя или посмотри в учебнике.')}
      </Text>

      {subjects.length === 0 && <Text style={styles.small}>{tr('Для твоего класса тем пока нет.')}</Text>}

      {subjects.map((code) => {
        const subj = subjectByCode(code);
        const list = topics.filter((t) => t.subjectCode === code);
        const chosen = list.find((t) => t.id === current[code]);
        const isOpen = open === code;
        return (
          <View key={code} style={[styles.card, chosen && styles.cardChosen]}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(isOpen ? null : code)} style={styles.head}>
              <Teacher teacher={teacherFor(code)} size={36} kamiColor={kamiColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subject}>{subj.es}</Text>
                <Text style={[styles.small, chosen && { color: colors.greenDark, fontWeight: '700' }]} numberOfLines={2}>
                  {chosen ? `✓ ${chosen.title}${chosen.titleRu ? ` · ${chosen.titleRu}` : ''}` : tr('По порядку программы — нажми, чтобы выбрать')}
                </Text>
              </View>
              <Text style={styles.arrow}>{isOpen ? '▾' : '›'}</Text>
            </Pressable>

            {isOpen && (
              <View style={styles.list}>
                {list.map((t, i) => {
                  const on = t.id === current[code];
                  const done = learnedCount(t, learned);
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => { haptic.tap(); onSet(code, t.id); setOpen(null); }}
                      style={[styles.topic, on && styles.topicOn]}
                    >
                      <Text style={[styles.num, on && { color: '#FFFFFF' }]}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.topicTitle, on && { color: '#FFFFFF' }]}>{t.title}</Text>
                        {!!t.titleRu && <Text style={[styles.small, on && { color: '#E6F4EC' }]}>{t.titleRu}</Text>}
                      </View>
                      {done > 0 && (
                        <Text style={[styles.tiny, on && { color: '#E6F4EC' }]}>{done === t.words.length ? '✓' : `${done}/${t.words.length}`}</Text>
                      )}
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !chosen }}
                  onPress={() => { haptic.tap(); onSet(code, null); setOpen(null); }}
                  style={[styles.topic, !chosen && styles.topicUnknown]}
                >
                  <Text style={styles.num}>?</Text>
                  <Text style={[styles.topicTitle, { flex: 1 }]}>{tr('Не знаю — по порядку программы')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      <Text style={styles.tiny}>{tr('Тема сменилась в школе — просто выбери новую. Выбор сохраняется на всех телефонах семьи.')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 26, fontWeight: '900', color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  tiny: { fontSize: 12, color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardChosen: { borderColor: colors.green },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 },
  subject: { fontSize: 17, fontWeight: '800', color: colors.text },
  arrow: { fontSize: 22, color: colors.muted, width: 20, textAlign: 'center' },
  list: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.bg },
  topicOn: { backgroundColor: colors.green },
  topicUnknown: { borderWidth: 1, borderColor: colors.border },
  num: { width: 22, fontSize: 14, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  topicTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
});
