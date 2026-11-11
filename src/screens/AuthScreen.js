// Вход и регистрация. Аккаунт заводит родитель.
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Kami from '../components/Kami';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('signUp'); // signUp | signIn
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setError('');
    setInfo('');
    if (!email.includes('@')) return setError('Введите email.');
    if (password.length < 8) return setError('Пароль — не короче 8 символов.');
    setBusy(true);
    const { data, error: err } =
      mode === 'signUp'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) return setError(err.message);
    if (mode === 'signUp' && !data.session) {
      setInfo('Мы отправили письмо. Откройте ссылку в нём, затем войдите здесь.');
      setMode('signIn');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Kami size={140} />
          <Text style={styles.h1}>Ками</Text>
          <Text style={styles.muted}>Школьный испанский для тех, кто только переехал</Text>
        </View>

        <Text style={styles.h2}>{mode === 'signUp' ? 'Аккаунт родителя' : 'Вход'}</Text>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="name@example.com"
            placeholderTextColor="#8A928E"
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
            placeholder="Минимум 8 символов"
            placeholderTextColor="#8A928E"
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Button title={busy ? 'Подождите…' : mode === 'signUp' ? 'Создать аккаунт' : 'Войти'} onPress={submit} disabled={busy} />
        <Text
          style={styles.switch}
          accessibilityRole="button"
          onPress={() => { setMode(mode === 'signUp' ? 'signIn' : 'signUp'); setError(''); }}
        >
          {mode === 'signUp' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 14, flexGrow: 1, justifyContent: 'center' },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  muted: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  error: { color: colors.danger, fontSize: 14 },
  info: { color: colors.greenDark, fontSize: 14 },
  switch: { color: colors.green, fontWeight: '700', fontSize: 15, textAlign: 'center', paddingVertical: 10 },
});
