// «Контрольные»: отметить контрольную (предмет, темы, дата) — Ками составит план подготовки.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Button, Card } from '../components/ui';
import Teacher from '../components/Teacher';
import { colors, radius } from '../theme';
import { subjectByCode } from '../data/content';
import { teacherFor } from '../data/teachers';
import { daysUntil, whenText, isoDay } from '../lib/exams';
import { PLUS_ENABLED } from '../config';

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ExamScreen({ topics, exams, plan, kamiColor, onCreate, onDelete, onStart, onOpenPlus, onBack }) {
  const locked = PLUS_ENABLED && !plan.plus;
  const [adding, setAdding] = useState(exams.length === 0);
  const [subject, setSubject] = useState(null);
  const [picked, setPicked] = useState([]);
  const [date, setDate] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);

  // Предметы, по которым есть темы.
  const subjects = [...new Set(topics.filter((t) => t.words.length && !t.custom).map((t) => t.subjectCode))];
  const subjectTopics = topics.filter((t) => t.subjectCode === subject && t.words.length);

  // Даты: с завтра на 3 недели вперёд, без выходных.
  const dates = [];
  for (let i = 1; dates.length < 15 && i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d);
  }

  async function save() {
    if (!subject || !picked.length || !date) return setError('Выбери предмет, хотя бы одну тему и дату.');
    setBusy(true);
    setError('');
    try {
      await onCreate(subject, picked, date);
      setAdding(false);
      setSubject(null);
      setPicked([]);
      setDate(null);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const upcoming = exams.filter((e) => daysUntil(e.exam_date) >= 0);
  const past = exams.filter((e) => daysUntil(e.exam_date) < 0);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>‹ Назад</Text>
      </Pressable>
      <Text style={styles.h1}>Контрольные</Text>
      <Text style={styles.small}>
        Отметь, когда контрольная и какие темы будут. Ками составит план: каждый день немного слов, а накануне — пробная контрольная с оценкой.
      </Text>

      {locked ? (
        <Pressable accessibilityRole="button" onPress={onOpenPlus} style={styles.locked}>
          <Text style={styles.lockTitle}>🔒 Подготовка к контрольным — с Ками Плюс</Text>
          <Text style={styles.small}>План на каждый день, пробная контрольная с оценкой от 0 до 10 и результаты для родителей.</Text>
          <Text style={styles.lockCta}>{plan.trialUsed ? 'Открыть с Ками Плюс ›' : 'Попробовать 3 дня бесплатно ›'}</Text>
        </Pressable>
      ) : (
        <>
          {upcoming.map((e) => {
            const days = daysUntil(e.exam_date);
            const subj = subjectByCode(e.subject_code);
            return (
              <Card key={e.id} style={{ gap: 10 }}>
                <View style={styles.row}>
                  <Teacher teacher={teacherFor(e.subject_code)} size={44} kamiColor={kamiColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{subj.es}</Text>
                    <Text style={styles.small}>
                      Контрольная {whenText(days)} · тем: {e.topic_ids.length}
                      {e.best_score != null ? ` · пробная: ${String(e.best_score / 10).replace('.', ',')}` : ''}
                    </Text>
                  </View>
                </View>
                <Button title={days === 1 ? 'Пробная контрольная' : days === 0 ? 'Быстрое повторение' : 'Подготовиться'} onPress={() => onStart(e)} />
                {confirm === e.id ? (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.body}>Удалить эту контрольную?</Text>
                    <Button title="Удалить" variant="secondary" onPress={() => { setConfirm(null); onDelete(e.id); }} />
                    <Text style={styles.link} onPress={() => setConfirm(null)}>Отмена</Text>
                  </View>
                ) : (
                  <Text style={styles.link} onPress={() => setConfirm(e.id)}>Удалить</Text>
                )}
              </Card>
            );
          })}

          {!adding && <Button title="+ Новая контрольная" variant={upcoming.length ? 'secondary' : 'primary'} onPress={() => setAdding(true)} />}

          {adding && (
            <Card style={{ gap: 14 }}>
              <Text style={styles.title}>Новая контрольная</Text>
              <View style={{ gap: 8 }}>
                <Text style={styles.body}>Предмет</Text>
                <View style={styles.chips}>
                  {subjects.map((c) => (
                    <Chip key={c} label={subjectByCode(c).es} active={subject === c} onPress={() => { setSubject(c); setPicked([]); }} />
                  ))}
                </View>
              </View>
              {!!subject && (
                <View style={{ gap: 8 }}>
                  <Text style={styles.body}>Какие темы будут?</Text>
                  <View style={styles.chips}>
                    {subjectTopics.map((t) => (
                      <Chip
                        key={t.id}
                        label={t.title}
                        active={picked.includes(t.id)}
                        onPress={() => setPicked((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id].slice(0, 12)))}
                      />
                    ))}
                  </View>
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Text style={styles.body}>Когда?</Text>
                <View style={styles.chips}>
                  {dates.map((d) => {
                    const v = isoDay(d);
                    return <Chip key={v} label={`${WD[d.getDay()]} ${d.getDate()}`} active={date === v} onPress={() => setDate(v)} />;
                  })}
                </View>
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button title={busy ? 'Сохраняем…' : 'Сохранить'} onPress={save} disabled={busy} />
              {upcoming.length > 0 && <Text style={styles.link} onPress={() => setAdding(false)}>Отмена</Text>}
            </Card>
          )}

          {past.length > 0 && (
            <>
              <Text style={styles.h2}>Прошедшие</Text>
              {past.map((e) => (
                <Card key={e.id} style={styles.row}>
                  <Text style={[styles.body, { flex: 1 }]}>{subjectByCode(e.subject_code).es} · {e.exam_date.split('-').reverse().slice(0, 2).join('.')}</Text>
                  <Text style={styles.small}>{e.best_score != null ? `пробная: ${String(e.best_score / 10).replace('.', ',')}` : 'без пробной'}</Text>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  error: { fontSize: 14, color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', justifyContent: 'center' },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.greenDark, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '700', color: colors.muted, paddingVertical: 6 },
  locked: { gap: 6, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#D9C8F5', backgroundColor: '#F7F2FD' },
  lockTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  lockCta: { fontSize: 14, fontWeight: '800', color: '#6B3FB8' },
});
