// Разбор задания по фото или файлу.
// Ученик фотографирует задание или загружает фото/PDF → функция explain-task в Supabase
// читает его и объясняет, что спрашивают. Приложение объясняет, но НЕ решает задание.
// Ключевые слова можно сразу сохранить в «Мои слова» к нужному предмету.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Kami from '../components/Kami';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { SUBJECTS, subjectByCode, isCustom } from '../data/content';
import { explainTask } from '../lib/api';

const MAX_BYTES = 5 * 1024 * 1024;

// Читает файл по адресу (file://, blob:, data:) в base64 — работает и в браузере, и на телефоне.
async function uriToBase64(uri) {
  if (uri.startsWith('data:')) return uri.slice(uri.indexOf(',') + 1);
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function normalizeImageType(t) {
  if (!t) return 'image/jpeg';
  if (t === 'image/jpg') return 'image/jpeg';
  return t;
}

export default function TaskScreen({ student, kamiColor, schedule, onAddWord, onOpenWords }) {
  const [preview, setPreview] = useState(null); // { uri, isPdf, name }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedTo, setSavedTo] = useState(null);
  const [choosing, setChoosing] = useState(false);

  async function send(file) {
    setError('');
    setResult(null);
    setSavedTo(null);
    setChoosing(false);
    setPreview(file);
    setBusy(true);
    try {
      const base64 = file.base64 || (await uriToBase64(file.uri));
      if (base64.length * 0.75 > MAX_BYTES) throw new Error('Файл слишком большой. Нужно до 5 МБ.');
      const res = await explainTask(student.id, { mediaType: file.mediaType, base64 });
      setResult(res.result);
      setLeft(res.left);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function takePhoto() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Разреши доступ к камере в настройках телефона.');
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (r.canceled) return;
    const a = r.assets[0];
    send({ uri: a.uri, base64: a.base64, mediaType: normalizeImageType(a.mimeType), isPdf: false });
  }

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (r.canceled) return;
    const a = r.assets[0];
    send({ uri: a.uri, base64: a.base64, mediaType: normalizeImageType(a.mimeType), isPdf: false });
  }

  async function pickFile() {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (r.canceled) return;
    const a = r.assets[0];
    if (a.size && a.size > MAX_BYTES) return setError('Файл слишком большой. Нужно до 5 МБ.');
    const isPdf = a.mimeType === 'application/pdf' || a.name?.toLowerCase().endsWith('.pdf');
    send({ uri: a.uri, mediaType: isPdf ? 'application/pdf' : normalizeImageType(a.mimeType), isPdf, name: a.name });
  }

  async function saveWords(code) {
    setChoosing(false);
    setSaving(true);
    setError('');
    try {
      for (const k of result.keywords.filter((k) => k.es && k.tr)) {
        await onAddWord({ subjectCode: code, es: k.es.slice(0, 80), translation: k.tr.slice(0, 80), example: result.original.slice(0, 200) });
      }
      setSavedTo(code);
    } catch (e) {
      setError('Не удалось сохранить слова.');
    }
    setSaving(false);
  }

  // Предметы для сохранения слов: сначала из расписания (включая свои), потом остальные.
  const fromSchedule = [...new Set(Object.values(schedule).flat())];
  const subjectCodes = [...fromSchedule, ...SUBJECTS.map((s) => s.code).filter((c) => !fromSchedule.includes(c))];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Разбор задания</Text>
      <Text style={styles.muted}>Сфотографируй задание или загрузи файл — Ками объяснит, что от тебя хотят.</Text>

      <View style={{ gap: 10 }}>
        <Button title="Сфотографировать" onPress={takePhoto} disabled={busy} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><Button title="Фото из галереи" variant="secondary" onPress={pickPhoto} disabled={busy} /></View>
          <View style={{ flex: 1 }}><Button title="Файл или PDF" variant="secondary" onPress={pickFile} disabled={busy} /></View>
        </View>
      </View>

      {preview && (
        <View style={styles.paper}>
          {preview.isPdf ? (
            <Text style={styles.paperText}>PDF: {preview.name || 'файл'}</Text>
          ) : (
            <Image source={{ uri: preview.uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Фото задания" />
          )}
        </View>
      )}

      {busy && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.muted}>Ками читает задание…</Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {result && result.not_a_task && (
        <Card style={{ gap: 6 }}>
          <Text style={styles.label}>Похоже, это не задание</Text>
          <Text style={styles.body}>{result.meaning}</Text>
        </Card>
      )}

      {result && !result.not_a_task && (
        <>
          {!!result.original && (
            <View style={styles.paperNote}>
              <Text style={styles.label}>Текст задания</Text>
              <Text style={styles.paperText}>{result.original}</Text>
            </View>
          )}

          <Card style={{ gap: 6 }}>
            <Text style={styles.label}>Что от тебя хотят</Text>
            <Text style={styles.body}>{result.meaning}</Text>
          </Card>

          {result.keywords.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Ключевые слова</Text>
              <View style={styles.chips}>
                {result.keywords.map((k) => (
                  <View key={k.es} style={styles.chip}>
                    <Text style={styles.chipText}><Text style={{ fontWeight: '700' }}>{k.es}</Text> — {k.tr}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!result.phrase_es && (
            <Card style={{ gap: 6 }}>
              <Text style={styles.label}>Как начать ответ</Text>
              <Text style={[styles.body, { fontStyle: 'italic' }]}>«{result.phrase_es}»</Text>
              <Text style={styles.muted}>{result.phrase_tr}</Text>
            </Card>
          )}

          <View style={styles.kamiBox}>
            <Kami size={64} color={kamiColor} />
            <Text style={styles.kamiText}>Решаешь ты, я только объясняю, что спрашивают. Так ты правда научишься.</Text>
          </View>

          {result.keywords.length > 0 && !savedTo && !choosing && (
            <Button
              title={saving ? 'Сохраняем…' : 'Сохранить слова в «Мои слова»'}
              onPress={() => setChoosing(true)}
              disabled={saving}
            />
          )}
          {choosing && (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>К какому предмету?</Text>
              <View style={styles.chips}>
                {subjectCodes.map((code) => (
                  <Pressable
                    key={code}
                    accessibilityRole="button"
                    onPress={() => saveWords(code)}
                    style={[styles.subjectChip, isCustom(code) && styles.customChip]}
                  >
                    <Text style={styles.subjectChipText}>{subjectByCode(code).es}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.link} onPress={() => setChoosing(false)} accessibilityRole="button">Отмена</Text>
            </View>
          )}
          {savedTo && (
            <Card style={{ gap: 6 }}>
              <Text style={styles.ok}>Слова сохранены в «{subjectByCode(savedTo).es}».</Text>
              <Text style={styles.link} onPress={() => onOpenWords(savedTo)} accessibilityRole="button">Открыть и выучить</Text>
            </Card>
          )}
          {left !== null && <Text style={styles.small}>Разборов на сегодня осталось: {left}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  paper: { backgroundColor: '#FFFDF6', borderColor: '#E4DCC4', borderWidth: 1, borderRadius: radius.md, padding: 10, alignItems: 'center' },
  paperNote: { backgroundColor: '#FFFDF6', borderColor: '#E4DCC4', borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 6 },
  image: { width: '100%', height: 220 },
  paperText: { fontSize: 15, lineHeight: 22, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : undefined },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  error: { fontSize: 14, color: colors.danger },
  ok: { fontSize: 15, fontWeight: '700', color: colors.greenDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.greenLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  chipText: { fontSize: 14, color: colors.greenDark },
  subjectChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  customChip: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  subjectChipText: { fontSize: 14, color: colors.text },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 8 },
  kamiBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.orangeLight, borderRadius: radius.lg, padding: 12 },
  kamiText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#5A2C0C' },
});
