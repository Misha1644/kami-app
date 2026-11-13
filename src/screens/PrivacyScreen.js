// Политика конфиденциальности: русский и испанский текст, переключатель языка.
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { PRIVACY } from '../data/privacy';
import { PRIVACY_UPDATED, SUPPORT_EMAIL } from '../config';
import { tr, getLang } from '../i18n';

const LABEL = { ru: 'Русский', es: 'Español', en: 'English', ar: 'العربية' };
const UPDATED = { ru: 'Обновлено', es: 'Actualizada', en: 'Updated', ar: 'آخر تحديث' };

export default function PrivacyScreen({ onBack }) {
  const [lang, setLang] = useState(getLang());
  const doc = PRIVACY[lang];
  const fill = (t) => (SUPPORT_EMAIL ? t.replace(/\[(email поддержки|email de soporte|support email|بريد الدعم)\]/g, SUPPORT_EMAIL) : t);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.langRow}>
        {['ru', 'es', 'en', 'ar'].map((l) => (
          <Pressable
            key={l}
            accessibilityRole="button"
            accessibilityState={{ selected: lang === l }}
            onPress={() => setLang(l)}
            style={[styles.chip, lang === l && styles.chipActive]}
          >
            <Text style={[styles.chipText, lang === l && styles.chipTextActive]}>{LABEL[l]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.h1}>{doc.title}</Text>
      {doc.sections.map(([h, p]) => (
        <View key={h} style={{ gap: 4 }}>
          <Text style={styles.h2}>{h}</Text>
          <Text style={styles.body}>{fill(p)}</Text>
        </View>
      ))}
      <Text style={styles.small}>{UPDATED[lang]}: {PRIVACY_UPDATED}</Text>
      <Button title={tr('Назад')} variant="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  langRow: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', justifyContent: 'center' },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.greenDark, fontWeight: '700' },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontSize: 13, color: colors.muted },
});
