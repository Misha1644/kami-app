// Расписание: ученик вносит свои уроки по дням недели.
// По нему главная показывает, к каким предметам готовиться на следующий учебный день.
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Card } from '../components/ui';
import { colors, radius } from '../theme';
import { SUBJECTS, WEEKDAYS, subjectByCode, nextSchoolDay, customCode, isCustom, CUSTOM_MAX } from '../data/content';

export default function ScheduleScreen({ schedule, onSaveDay, onOpenWords }) {
  const [day, setDay] = useState(nextSchoolDay().weekday);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [customName, setCustomName] = useState('');
  const [typing, setTyping] = useState(false);
  const lessons = schedule[day] || [];

  // Свои предметы, которые уже есть в расписании на любой день, — чтобы не вводить заново.
  const myCustom = [...new Set(Object.values(schedule).flat().filter(isCustom))];

  function addLesson(code) {
    update([...lessons, code]);
    setAdding(false);
    setTyping(false);
    setCustomName('');
  }

  function addCustom() {
    const name = customName.trim();
    if (!name) return setError('Напиши название предмета.');
    addLesson(customCode(name));
  }

  async function update(codes) {
    setError('');
    try {
      await onSaveDay(day, codes);
    } catch (e) {
      setError('Не удалось сохранить. Проверь интернет и попробуй ещё раз.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Расписание</Text>
      <Text style={styles.muted}>Внеси уроки — и Ками будет готовить тебя к завтрашним предметам.</Text>

      <View style={styles.days} accessibilityRole="tablist">
        {WEEKDAYS.map((label, i) => {
          const wd = i + 1;
          const active = wd === day;
          return (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => { setDay(wd); setAdding(false); setTyping(false); }}
              style={[styles.day, active && styles.dayActive]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
              <Text style={[styles.dayCount, active && styles.dayTextActive]}>{(schedule[wd] || []).length}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ paddingVertical: 4 }}>
        {lessons.length === 0 && <Text style={[styles.muted, { paddingVertical: 14 }]}>Уроков пока нет.</Text>}
        {lessons.map((code, i) => {
          const s = subjectByCode(code);
          return (
            <View key={`${code}-${i}`} style={[styles.lesson, i < lessons.length - 1 && styles.lessonBorder]}>
              <Text style={styles.num}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subject}>{s.es}</Text>
                <Text style={styles.small}>{s.ru}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Свои слова для ${s.es}`}
                onPress={() => onOpenWords(code)}
                style={styles.wordsButton}
              >
                <Text style={styles.wordsText}>Слова</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Убрать урок ${s.es}`}
                onPress={() => update(lessons.filter((_, j) => j !== i))}
                style={styles.remove}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </Card>

      {lessons.length < 8 && !adding && (
        <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.addButton}>
          <Text style={styles.addText}>+ Добавить урок</Text>
        </Pressable>
      )}

      {adding && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Какой предмет {lessons.length + 1}-м уроком?</Text>
          <View style={styles.grid}>
            {SUBJECTS.map((s) => (
              <Pressable
                key={s.code}
                accessibilityRole="button"
                onPress={() => addLesson(s.code)}
                style={styles.subjectChip}
              >
                <Text style={styles.subjectChipText}>{s.es}</Text>
              </Pressable>
            ))}
            {myCustom.map((code) => (
              <Pressable
                key={code}
                accessibilityRole="button"
                onPress={() => addLesson(code)}
                style={[styles.subjectChip, styles.customChip]}
              >
                <Text style={[styles.subjectChipText, styles.customChipText]}>{subjectByCode(code).es}</Text>
              </Pressable>
            ))}
            {!typing && (
              <Pressable
                accessibilityRole="button"
                onPress={() => { setTyping(true); setError(''); }}
                style={[styles.subjectChip, styles.newChip]}
              >
                <Text style={styles.newChipText}>+ Свой предмет</Text>
              </Pressable>
            )}
          </View>

          {typing && (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Название предмета</Text>
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={(t) => { setCustomName(t); setError(''); }}
                maxLength={CUSTOM_MAX}
                placeholder="Например, Robótica"
                placeholderTextColor="#8A928E"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addCustom}
              />
              <Pressable accessibilityRole="button" onPress={addCustom} style={styles.saveButton}>
                <Text style={styles.saveText}>Добавить</Text>
              </Pressable>
            </View>
          )}
          <Text
            style={styles.link}
            onPress={() => { setAdding(false); setTyping(false); setCustomName(''); }}
            accessibilityRole="button"
          >
            Отмена
          </Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  days: { flexDirection: 'row', gap: 8 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card, minHeight: 52, justifyContent: 'center' },
  dayActive: { backgroundColor: colors.green, borderColor: colors.green },
  dayText: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayCount: { fontSize: 12, color: colors.muted },
  dayTextActive: { color: '#FFFFFF' },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  lessonBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  num: { width: 24, fontSize: 15, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  subject: { fontSize: 16, fontWeight: '700', color: colors.text },
  wordsButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.greenLight, justifyContent: 'center' },
  wordsText: { fontSize: 13, fontWeight: '700', color: colors.greenDark },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 16, color: colors.muted },
  addButton: { minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9AA49F', alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 16, fontWeight: '700', color: colors.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  subjectChipText: { fontSize: 14, color: colors.text },
  customChip: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  customChipText: { color: colors.orangeText },
  newChip: { borderStyle: 'dashed', borderColor: colors.green },
  newChipText: { fontSize: 14, fontWeight: '700', color: colors.green },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  saveButton: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 8 },
  error: { color: colors.danger, fontSize: 14 },
});
