// Вход и регистрация. Аккаунт заводит родитель.
// Почта подтверждается 6-значным кодом из письма (без ссылок — так работает
// и в приложении, и в браузере). Так же — сброс пароля.
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import Kami from '../components/Kami';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { supabase } from '../lib/supabase';
import PrivacyScreen from './PrivacyScreen';
import { tr, UI_LANGS } from '../i18n';

const TITLES = {
  signUp: 'Аккаунт родителя',
  signIn: 'Вход',
  verify: 'Подтвердите почту',
  forgot: 'Сброс пароля',
  reset: 'Новый пароль',
};

function humanError(message = '') {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return tr('Неверный email или пароль.');
  if (m.includes('email not confirmed')) return tr('Почта ещё не подтверждена. Введите код из письма.');
  if (m.includes('already registered')) return tr('Этот email уже зарегистрирован. Войдите или сбросьте пароль.');
  if (m.includes('expired') || m.includes('invalid') && m.includes('token')) return tr('Код неверный или устарел. Запросите новый.');
  if (m.includes('rate limit') || m.includes('security purposes')) return tr('Слишком много попыток. Подождите минуту.');
  if (m.includes('network')) return tr('Нет интернета. Проверьте подключение.');
  return tr('Что-то пошло не так. Попробуйте ещё раз.');
}

export default function AuthScreen({ lang = 'ru', onLang }) {
  const [mode, setMode] = useState('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.replace(/\D/g, '');

  function go(next, message = '') {
    setMode(next);
    setError('');
    setInfo(message);
    setCode('');
  }

  async function run(action) {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(humanError(e?.message));
    }
    setBusy(false);
  }

  // Код из письма о регистрации: в новых версиях Supabase тип 'email', в старых — 'signup'.
  async function verifySignupCode() {
    let res = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'email' });
    if (res.error) res = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'signup' });
    if (res.error) throw res.error;
  }

  function submit() {
    if (mode !== 'reset' && mode !== 'verify' && !cleanEmail.includes('@')) return setError(tr('Введите email.'));
    if ((mode === 'signUp' || mode === 'signIn' || mode === 'reset') && password.length < 8) {
      return setError(tr('Пароль — не короче 8 символов.'));
    }
    if ((mode === 'verify' || mode === 'reset') && cleanCode.length < 6) return setError(tr('Введите код из письма.'));
    if (mode === 'signUp' && !consent) return setError(tr('Подтвердите, что вы родитель, и согласие с политикой.'));

    run(async () => {
      if (mode === 'signUp') {
        const { data, error: err } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (err) throw err;
        if (!data.session) go('verify', tr('Мы отправили код на {0}. Проверьте и папку «Спам».', cleanEmail));
      } else if (mode === 'signIn') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) {
          if (err.message?.toLowerCase().includes('email not confirmed')) {
            await supabase.auth.resend({ type: 'signup', email: cleanEmail });
            return go('verify', tr('Почта не подтверждена. Мы отправили новый код на {0}.', cleanEmail));
          }
          throw err;
        }
      } else if (mode === 'verify') {
        await verifySignupCode();
      } else if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (err) throw err;
        go('reset', tr('Если аккаунт с {0} есть, мы отправили на него код.', cleanEmail));
        setPassword('');
      } else if (mode === 'reset') {
        const { error: err } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'recovery' });
        if (err) throw err;
        const { error: err2 } = await supabase.auth.updateUser({ password });
        if (err2) throw err2;
      }
    });
  }

  function resend() {
    run(async () => {
      const { error: err } = mode === 'verify'
        ? await supabase.auth.resend({ type: 'signup', email: cleanEmail })
        : await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (err) throw err;
      setInfo(tr('Отправили новый код.'));
    });
  }

  if (showPrivacy) return <PrivacyScreen onBack={() => setShowPrivacy(false)} />;

  const needsEmail = mode === 'signUp' || mode === 'signIn' || mode === 'forgot';
  const needsPassword = mode === 'signUp' || mode === 'signIn' || mode === 'reset';
  const needsCode = mode === 'verify' || mode === 'reset';
  const buttonTitle = {
    signUp: tr('Создать аккаунт'), signIn: tr('Войти'), verify: tr('Подтвердить'),
    forgot: tr('Отправить код'), reset: tr('Сохранить пароль'),
  }[mode];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        {!!onLang && (
          <View style={styles.langRow}>
            {UI_LANGS.map((l) => (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: lang === l.code }}
                onPress={() => onLang(l.code)}
                style={[styles.langChip, lang === l.code && styles.langChipActive]}
              >
                <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Kami size={140} />
          <Text style={styles.h1}>{tr('Ками')}</Text>
          <Text style={styles.muted}>{tr('Школьный испанский для тех, кто только переехал')}</Text>
        </View>

        <Text style={styles.h2}>{tr(TITLES[mode])}</Text>
        {mode === 'signUp' && (
          <Text style={styles.small}>{tr('Аккаунт создаёт родитель. Потом вы добавите профиль ребёнка.')}</Text>
        )}

        {needsEmail && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="name@example.com"
              placeholderTextColor="#8A928E"
            />
          </View>
        )}

        {needsCode && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>{tr('Код из письма')}</Text>
            <TextInput
              style={[styles.input, styles.code]}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              placeholder="123456"
              placeholderTextColor="#8A928E"
            />
          </View>
        )}

        {needsPassword && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>{mode === 'reset' ? tr('Новый пароль') : tr('Пароль')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signIn' ? 'password' : 'new-password'}
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
              placeholder={tr('Минимум 8 символов')}
              placeholderTextColor="#8A928E"
            />
          </View>
        )}

        {mode === 'signUp' && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent(!consent)}
            style={styles.consent}
          >
            <View style={[styles.box, consent && styles.boxOn]}>
              {consent && <Text style={styles.tick}>✓</Text>}
            </View>
            <Text style={styles.consentText}>{tr('Мне есть 18 лет, я родитель или законный представитель ребёнка и согласен(на) с')}{' '}
              <Text style={styles.inlineLink} onPress={() => setShowPrivacy(true)}>{tr('политикой конфиденциальности')}</Text>.
            </Text>
          </Pressable>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Button title={busy ? tr('Подождите…') : buttonTitle} onPress={submit} disabled={busy} />

        {needsCode && (
          <Text style={styles.switch} accessibilityRole="button" onPress={resend}>{tr('Отправить код ещё раз')}</Text>
        )}
        {mode === 'signIn' && (
          <Text style={styles.switch} accessibilityRole="button" onPress={() => go('forgot')}>{tr('Забыли пароль?')}</Text>
        )}
        <Text
          style={styles.switch}
          accessibilityRole="button"
          onPress={() => go(mode === 'signUp' ? 'signIn' : 'signUp')}
        >
          {mode === 'signUp' ? tr('Уже есть аккаунт? Войти') : tr('Нет аккаунта? Создать')}
        </Text>
        {mode !== 'signUp' && mode !== 'signIn' && (
          <Text style={styles.switch} accessibilityRole="button" onPress={() => go('signIn')}>{tr('Назад ко входу')}</Text>
        )}
        <Text style={styles.privacy} accessibilityRole="link" onPress={() => setShowPrivacy(true)}>{tr('Политика конфиденциальности')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  langChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  langChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  langText: { fontSize: 13, color: colors.text },
  langTextActive: { color: '#fff', fontWeight: '700' },
  wrap: { padding: 24, gap: 14, flexGrow: 1, justifyContent: 'center' },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  muted: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  small: { fontSize: 13, color: colors.muted, marginTop: -6 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#9AA39E', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  tick: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  consentText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  inlineLink: { color: colors.green, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  info: { color: colors.greenDark, fontSize: 14 },
  switch: { color: colors.green, fontWeight: '700', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  privacy: { color: colors.muted, fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 8 },
});
