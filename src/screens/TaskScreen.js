// Разбор задания по фото или файлу.
// Ученик фотографирует задание или загружает фото/PDF → функция explain-task в Supabase
// читает его и объясняет, что спрашивают. Приложение объясняет, но НЕ решает задание.
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Kami from '../components/Kami';
import { kamiSays } from '../data/kami';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
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

export default function TaskScreen({ student, kamiColor }) {
  const [preview, setPreview] = useState(null); // { uri, isPdf, name }
  const [busy, setBusy] = useState(false);
  const [taskLine] = useState(() => kamiSays('task'));
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(null);

  async function send(file) {
    setError('');
    setResult(null);
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
            <Text style={styles.kamiText}>{taskLine}</Text>
          </View>

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
