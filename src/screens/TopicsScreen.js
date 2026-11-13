// Все темы предмета: прогресс по каждой, «Учить» и выбор темы, которую сейчас проходят в классе.
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Teacher from '../components/Teacher';
import { TEACHERS } from '../data/teachers';
import { speak } from '../lib/speech';
import { Card, ProgressBar } from '../components/ui';
import { colors, radius } from '../theme';
import { learnedCount, subjectByCode } from '../data/content';
import { tr } from '../i18n';

export default function TopicsScreen({ subjectCode, topics, learned, currentId, onSetCurrent, onStudy, onBack }) {
  const subj = subjectByCode(subjectCode);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>{tr('‹ Назад')}</Text>
      </Pressable>
      <View>
        <Text style={styles.small}>{tr('Темы предмета')}</Text>
        <Text style={styles.h1}>{subj.es}</Text>
        <Text style={styles.small}>{tr('Отметь тему, которую сейчас проходите в классе, — Ками покажет её на главной.')}</Text>
      </View>

      {!!TEACHERS[subjectCode] && (() => {
        const t = TEACHERS[subjectCode];
        return (
          <Card style={styles.teacherCard}>
            <View style={styles.teacherHead}>
              <Teacher teacher={t} size={72} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.small}>{tr('Учитель предмета')}</Text>
                <Text style={styles.title}>{t.name}</Text>
                <Text style={styles.small}>{tr(t.who)}</Text>
              </View>
            </View>
            <Text style={styles.about}>{tr(t.about)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Послушать: {0}', t.motto[0])}
              onPress={() => speak(t.motto[0], { lang: subjectCode === 'val' ? 'ca-ES' : 'es-ES' })}
              style={[styles.motto, { borderColor: t.color }]}
            >
              <Text style={styles.mottoEs}>🔊 «{t.motto[0]}»</Text>
              <Text style={styles.small}>{tr(t.motto[1])}</Text>
            </Pressable>
          </Card>
        );
      })()}

      {topics.length === 0 && <Text style={styles.small}>{tr('Для этого класса тем по предмету пока нет.')}</Text>}

      {topics.map((t, i) => {
        const done = learnedCount(t, learned);
        const current = t.id === currentId;
        return (
          <Card key={t.id} style={[{ gap: 8 }, current && styles.current]}>
            <View style={styles.rowBetween}>
              <Text style={styles.num}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t.title}</Text>
                <Text style={styles.small}>{t.titleRu}</Text>
              </View>
              {current && <Text style={styles.badge}>{tr('сейчас в классе')}</Text>}
            </View>
            <ProgressBar value={done / t.words.length} />
            <View style={styles.rowBetween}>
              <Text style={styles.small}>{tr('{0} из {1} слов', done, t.words.length)}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {!current && (
                  <Text style={styles.linkMuted} onPress={() => onSetCurrent(t.id)} accessibilityRole="button">{tr('Проходим сейчас')}</Text>
                )}
                <Text style={styles.link} onPress={() => onStudy(t.id)} accessibilityRole="button">
                  {done === t.words.length ? tr('Повторить') : tr('Учить')}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  teacherCard: { gap: 10 },
  teacherHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  about: { fontSize: 15, lineHeight: 21, color: colors.text },
  motto: { alignSelf: 'flex-start', borderLeftWidth: 4, paddingLeft: 10, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  mottoEs: { fontSize: 15, fontWeight: '700', color: colors.text, fontStyle: 'italic' },
  current: { borderColor: colors.green, borderWidth: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  num: { width: 24, fontSize: 15, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { fontSize: 12, fontWeight: '700', color: colors.greenDark, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  link: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 6 },
  linkMuted: { fontSize: 14, fontWeight: '700', color: colors.muted, paddingVertical: 6 },
});
