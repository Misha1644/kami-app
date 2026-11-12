// «Ками Плюс» — подписка для родителей.
// Бесплатно работают уроки. С Плюсом — отчёты об успехах и разбор заданий по фото.
// Пробный период 3 дня (один раз на аккаунт). Оплата — через App Store / Google Play,
// пока не подключена (PAYMENTS_ENABLED). Цены — предварительные, их легко поменять в PLANS.
import { useState } from 'react';
import ParentalGate from '../components/ParentalGate';
import { PAYMENTS_ENABLED, TRIAL_DAYS } from '../config';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { KAMI_COLORS } from '../data/content';

const PLANS = [
  { id: 'year', title: 'Год', price: '39,99 €', note: '3,33 € в месяц · выгоднее на 33%' },
  { id: 'month', title: 'Месяц', price: '4,99 €', note: 'можно отменить в любой момент' },
];

const BENEFITS = [
  { title: 'Уроки, повторение, факт дня', free: '✓', plus: '✓' },
  { title: 'Магазин, аватары, серия', free: '✓', plus: '✓' },
  { title: 'Активность по дням', free: '—', plus: '✓' },
  { title: 'Готовность по предметам', free: '—', plus: '✓' },
  { title: 'Трудные слова', free: '—', plus: '✓' },
  { title: 'Разбор заданий по фото', free: '—', plus: '15 в день' },
  { title: 'Фиолетовый Ками и звёздный фон', free: '—', plus: '✓' },
];

export default function PlusScreen({ plan, onBack, onStartTrial }) {
  const [picked, setPicked] = useState('year');
  const [note, setNote] = useState('');
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);

  async function trial() {
    setBusy(true);
    setNote('');
    try {
      await onStartTrial();
      setNote(`Готово! Ками Плюс открыт на ${TRIAL_DAYS} дня.`);
    } catch (e) {
      setNote(e.message);
    }
    setBusy(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>‹ Назад</Text>
      </Pressable>

      <View style={styles.hero}>
        <Kami size={130} color={KAMI_COLORS['color-plus']} />
        <Text style={styles.h1}>Ками Плюс</Text>
        <Text style={styles.muted}>Больше помощи с заданиями и подробные отчёты для родителей.</Text>
      </View>

      {plan.plus && (
        <Card style={styles.active}>
          <Text style={styles.activeTitle}>Ками Плюс подключён</Text>
          <Text style={styles.small}>
            {plan.source === 'comp'
              ? 'Бессрочно — подарок от разработчика.'
              : plan.source === 'trial'
                ? `Пробный период до ${new Date(plan.expiresAt).toLocaleDateString('ru-RU')}. Потом отчёты закроются, а уроки останутся бесплатными.`
              : plan.expiresAt
                ? `Действует до ${new Date(plan.expiresAt).toLocaleDateString('ru-RU')}.`
                : 'Подписка активна.'}
          </Text>
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={[styles.cell, { flex: 2 }]} />
          <Text style={[styles.cellHead]}>Бесплатно</Text>
          <Text style={[styles.cellHead, { color: '#6B3FB8' }]}>Плюс</Text>
        </View>
        {BENEFITS.map((b, i) => (
          <View key={b.title} style={[styles.row, i < BENEFITS.length - 1 && styles.rowBorder]}>
            <Text style={[styles.cell, { flex: 2, fontWeight: '700' }]}>{b.title}</Text>
            <Text style={styles.cell}>{b.free}</Text>
            <Text style={[styles.cell, { color: '#6B3FB8', fontWeight: '700' }]}>{b.plus}</Text>
          </View>
        ))}
      </Card>

      {!plan.plus && !plan.trialUsed && (
        <Card style={styles.trial}>
          <Text style={styles.activeTitle}>{TRIAL_DAYS} дня бесплатно</Text>
          <Text style={styles.small}>Все возможности Плюса без оплаты и без привязки карты. После пробного периода ничего не списывается.</Text>
          <Button title={busy ? 'Подождите…' : `Попробовать ${TRIAL_DAYS} дня бесплатно`} onPress={trial} disabled={busy} />
        </Card>
      )}

      {!plan.plus && (
        <>
          <View style={{ gap: 10 }}>
            {PLANS.map((p) => {
              const active = p.id === picked;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setPicked(p.id)}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    <Text style={styles.small}>{p.note}</Text>
                  </View>
                  <Text style={styles.planPrice}>{p.price}</Text>
                </Pressable>
              );
            })}
          </View>
          {gate ? (
            <ParentalGate
              title="Подписку оформляет взрослый"
              onCancel={() => setGate(false)}
              onPass={() => {
                setGate(false);
                setNote('Оплата заработает в версии приложения из App Store и Google Play.');
              }}
            />
          ) : (
            <Button
              title={PAYMENTS_ENABLED ? 'Оформить Ками Плюс' : 'Оформить (скоро)'}
              variant={plan.trialUsed ? undefined : 'secondary'}
              onPress={() => setGate(true)}
            />
          )}
          {!!note && <Text style={styles.note}>{note}</Text>}
          <Text style={styles.small}>Подписку оформляет и оплачивает только взрослый.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  hero: { alignItems: 'center', gap: 6 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  muted: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  small: { fontSize: 13, color: colors.muted },
  trial: { gap: 8, borderColor: '#B07CE8', borderWidth: 2, backgroundColor: '#F7F2FD' },
  active: { backgroundColor: '#F3ECFC', borderColor: '#B07CE8', gap: 4 },
  activeTitle: { fontSize: 16, fontWeight: '800', color: '#6B3FB8' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  cell: { flex: 1, fontSize: 14, color: colors.text },
  cellHead: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.muted },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#C9D0CB', backgroundColor: colors.card },
  planActive: { borderWidth: 2, borderColor: '#8E6FD8', backgroundColor: '#F3ECFC' },
  planTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  planPrice: { fontSize: 18, fontWeight: '800', color: '#6B3FB8' },
  note: { fontSize: 14, color: colors.orangeText, lineHeight: 20 },
});
