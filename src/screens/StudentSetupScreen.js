// Первый запуск после регистрации: родитель создаёт профиль ученика.
// Храним только псевдоним, класс и родной язык.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import Kami from '../components/Kami';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { createStudent } from '../lib/api';
import { GRADES } from '../data/content';
import { tr, uiLangFor } from '../i18n';

const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

export default function StudentSetupScreen({ onCreated, lang: uiLang = 'ru', onLang }) {
  const [nickname, setNickname] = useState('');
  const [lang, setLangState] = useState(uiLang);
  // Выбор языка сразу переключает и интерфейс.
  const setLang = (code) => { setLangState(code); onLang?.(uiLangFor(code)); };
  const [grade, setGrade] = useState(GRADES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!nickname.trim()) return setError(tr('Введите имя или псевдоним.'));
    setBusy(true);
    setError('');
    try {
      onCreated(await createStudent({ nickname, nativeLang: lang, grade }));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center' }}><Kami size={120} /></View>
      <Text style={styles.h1}>{tr('Кто будет учиться?')}</Text>
      <Text style={styles.muted}>{tr('Достаточно имени или псевдонима. Фамилия и фото не нужны.')}</Text>

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{tr('Имя ученика')}</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          maxLength={30}
          placeholder={tr('Например, Алекс')}
          placeholderTextColor="#8A928E"
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{tr('Родной язык')}</Text>
        <View style={styles.chips}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setLang(l.code)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.small}>{tr('На этом языке будут приложение и переводы слов. Для украинского пока русский.')}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{tr('Класс')}</Text>
        <View style={styles.chips}>
          {GRADES.map((g) => {
            const active = g === grade;
            return (
              <Pressable
                key={g}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setGrade(g)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title={busy ? tr('Сохраняем…') : tr('Начать')} onPress={save} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontSize: 15, color: colors.text },
  chipTextActive: { color: colors.greenDark, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
});
