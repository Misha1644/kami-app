// Свои слова к предмету: ученик записывает слова с урока и потом учит их, как обычную тему.
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { subjectByCode, plural } from '../data/content';

export default function WordsScreen({ subjectCode, words, learned, onAdd, onDelete, onStudy, onBack }) {
  const subj = subjectByCode(subjectCode);
  const [es, setEs] = useState('');
  const [translation, setTranslation] = useState('');
  const [example, setExample] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  async function add() {
    if (!es.trim()) return setError('Напиши слово по-испански.');
    if (!translation.trim()) return setError('Напиши перевод.');
    setBusy(true);
    setError('');
    try {
      await onAdd({ subjectCode, es, translation, example });
      setEs('');
      setTranslation('');
      setExample('');
    } catch (e) {
      setError('Не удалось сохранить. Проверь интернет и попробуй ещё раз.');
    }
    setBusy(false);
  }

  async function remove(id) {
    setConfirmId(null);
    try {
      await onDelete(id);
    } catch (e) {
      setError('Не удалось удалить слово.');
    }
  }

  const learnedCount = words.filter((w) => learned[w.id]).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <View>
          <Text style={styles.small}>Мои слова</Text>
          <Text style={styles.h1}>{subj.es}</Text>
          {!!subj.ru && <Text style={styles.small}>{subj.ru}</Text>}
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={styles.label}>Новое слово</Text>
          <TextInput
            style={styles.input}
            value={es}
            onChangeText={(t) => { setEs(t); setError(''); }}
            maxLength={80}
            placeholder="По-испански, например: el ángulo"
            placeholderTextColor="#8A928E"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={translation}
            onChangeText={(t) => { setTranslation(t); setError(''); }}
            maxLength={80}
            placeholder="Перевод, например: угол"
            placeholderTextColor="#8A928E"
          />
          <TextInput
            style={[styles.input, { minHeight: 64 }]}
            value={example}
            onChangeText={setExample}
            maxLength={200}
            multiline
            placeholder="Пример фразы с урока (необязательно)"
            placeholderTextColor="#8A928E"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button title={busy ? 'Сохраняем…' : 'Добавить слово'} onPress={add} disabled={busy} />
        </Card>

        {words.length > 0 && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.h2}>
                {words.length} {plural(words.length, 'слово', 'слова', 'слов')}
              </Text>
              <Text style={styles.small}>выучено {learnedCount}</Text>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {words.map((w, i) => (
                <View key={w.id} style={[styles.word, i < words.length - 1 && styles.wordBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wordEs}>{w.es}</Text>
                    <Text style={styles.small}>{w.ru}</Text>
                  </View>
                  {learned[w.id] && <Text style={styles.learned}>выучено</Text>}
                  {confirmId === w.id ? (
                    <Pressable accessibilityRole="button" onPress={() => remove(w.id)} style={styles.confirm}>
                      <Text style={styles.confirmText}>Удалить?</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Удалить слово ${w.es}`}
                      onPress={() => setConfirmId(w.id)}
                      style={styles.remove}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>
          </>
        )}

        {words.length >= 2 ? (
          <Button title="Учить эти слова" onPress={onStudy} />
        ) : (
          <Text style={styles.small}>
            Добавь хотя бы 2 слова, чтобы начать урок. За каждое впервые выученное слово — 1 монета.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  input: { minHeight: 48, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, backgroundColor: colors.card, color: colors.text, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  word: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  wordBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  wordEs: { fontSize: 16, fontWeight: '700', color: colors.text },
  learned: { fontSize: 12, fontWeight: '700', color: colors.greenDark, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 16, color: colors.muted },
  confirm: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: colors.danger },
});
