// Профиль: аватар, фон, цвет Ками, учёба, звук, напоминания, подписка и раздел для взрослых.
import { useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import UserAvatar from '../components/UserAvatar';
import ParentalGate from '../components/ParentalGate';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { GRADES } from '../data/content';
import { deleteAccount } from '../lib/api';
import { PLUS_ENABLED, SUPPORT_EMAIL } from '../config';

const DEFAULTS = new Set(['color-green', 'avatar-person', 'bg-default']);
const GOALS = [5, 10, 15, 20, 30];
const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

function Chips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => !active && onChange(o.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SwitchRow({ title, note, value, onChange }) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{title}</Text>
        {!!note && <Text style={styles.small}>{note}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.greenBar, false: '#C9D0CB' }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function ProfileScreen({
  student, plan, shop, kamiColor, streak, learnedTotal,
  prefs, onSavePrefs, onEquip, onChangeGrade, onUpdateStudent,
  reminders, remindersSupported, onToggleReminders,
  onOpenPlus, onOpenPrivacy, onOpenShop, onSignOut, refreshing, onRefresh,
}) {
  const [error, setError] = useState('');
  const [adult, setAdult] = useState('closed'); // closed | gate | open
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const items = shop?.items || [];
  const owns = (id) => DEFAULTS.has(id) || shop?.owned?.has(id);
  const ownedOf = (kind) => items.filter((i) => i.kind === kind && owns(i.id));
  const valueOf = (id) => items.find((i) => i.id === id)?.value;
  const avatarValue = valueOf(student.avatar) || 'person';

  async function act(fn) {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }

  const planLine = !plan.plus
    ? null
    : plan.source === 'trial'
      ? `Пробный Плюс до ${new Date(plan.expiresAt).toLocaleDateString('ru-RU')}`
      : 'Ками Плюс';

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      {/* Шапка */}
      <View style={styles.head}>
        <UserAvatar value={avatarValue} size={92} kamiColor={kamiColor} />
        <Text style={styles.h1}>{student.nickname}</Text>
        <Text style={styles.small}>{student.grade} · 🔥 {streak} · {learnedTotal} слов</Text>
        {!!planLine && <Text style={styles.plusBadge}>{planLine}</Text>}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Стиль */}
      <Text style={styles.h2}>Аватар</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
        {ownedOf('avatar').map((i) => {
          const worn = student.avatar === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={`Аватар ${i.title_ru}`}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.pick, worn && styles.pickActive]}
            >
              <UserAvatar value={i.value} size={56} kamiColor={kamiColor} />
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={onOpenShop} style={[styles.pick, styles.more]}>
          <Text style={styles.moreText}>+ ещё{'\n'}в магазине</Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.h2}>Фон</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
        {ownedOf('bg').map((i) => {
          const worn = student.bg === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={`Фон ${i.title_ru}`}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.swatch, { backgroundColor: i.value }, worn && styles.pickActive]}
            >
              <Text style={styles.swatchText}>{i.title_ru}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={onOpenShop} style={[styles.swatch, styles.more]}>
          <Text style={styles.moreText}>+ ещё</Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.h2}>Цвет Ками</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
        {ownedOf('color').map((i) => {
          const worn = student.kami_color === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={i.title_ru}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.pick, worn && styles.pickActive]}
            >
              <Kami size={56} color={i.value} />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Учёба */}
      <Text style={styles.h2}>Учёба</Text>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>Класс</Text>
          <Chips options={GRADES.map((g) => ({ value: g, label: g }))} value={student.grade} onChange={(g) => act(() => onChangeGrade(g))} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>Цель дня — слов</Text>
          <Chips options={GOALS.map((g) => ({ value: g, label: String(g) }))} value={student.daily_goal} onChange={(g) => act(() => onUpdateStudent({ daily_goal: g }))} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>Язык переводов</Text>
          <Chips options={LANGS.map((l) => ({ value: l.code, label: l.label }))} value={student.native_lang === 'en' ? 'en' : 'ru'} onChange={(l) => act(() => onUpdateStudent({ native_lang: l }))} />
          <Text style={styles.small}>На каком языке показывать переводы слов.</Text>
        </View>
      </Card>

      {/* Звук */}
      <Text style={styles.h2}>Звук и упражнения</Text>
      <Card style={{ gap: 14 }}>
        <SwitchRow title="Озвучивать новые слова" note="Ками сам произносит слово на карточке" value={prefs.autoplay} onChange={(v) => onSavePrefs({ ...prefs, autoplay: v })} />
        <SwitchRow title="Медленный голос" note="Для начала так проще расслышать" value={prefs.slowVoice} onChange={(v) => onSavePrefs({ ...prefs, slowVoice: v })} />
        <SwitchRow title="Упражнения «Скажи вслух»" note="Выключи, если занимаешься там, где нельзя говорить" value={prefs.speaking} onChange={(v) => onSavePrefs({ ...prefs, speaking: v })} />
        {remindersSupported && (
          <SwitchRow title="Напоминание в 19:00" note="С уроками на завтра и фактом дня" value={reminders} onChange={onToggleReminders} />
        )}
      </Card>

      {/* Подписка */}
      {PLUS_ENABLED && (
        <Pressable accessibilityRole="button" onPress={onOpenPlus} style={[styles.plus, plan.plus && styles.plusActive]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plusTitle}>{plan.plus ? planLine : 'Ками Плюс'}</Text>
            <Text style={styles.small}>
              {plan.plus ? 'Отчёты и разбор заданий открыты.' : plan.trialUsed ? 'Отчёты об успехах и разбор заданий по фото.' : 'Попробуй 3 дня бесплатно: отчёты и разбор заданий по фото.'}
            </Text>
          </View>
          <Text style={styles.plusArrow}>›</Text>
        </Pressable>
      )}

      {/* Для взрослых */}
      <Text style={styles.h2}>Для взрослых</Text>
      {adult === 'closed' && (
        <Card style={{ gap: 8 }}>
          <Text style={styles.small}>Выход из аккаунта, удаление аккаунта и политика конфиденциальности.</Text>
          <Button title="Открыть" variant="secondary" onPress={() => setAdult('gate')} />
        </Card>
      )}
      {adult === 'gate' && <ParentalGate onPass={() => setAdult('open')} onCancel={() => setAdult('closed')} />}
      {adult === 'open' && (
        <Card style={{ gap: 10 }}>
          <Button title="Выйти из аккаунта" variant="secondary" onPress={onSignOut} />
          <Text style={styles.link} accessibilityRole="link" onPress={onOpenPrivacy}>Политика конфиденциальности</Text>
          {!!SUPPORT_EMAIL && <Text style={styles.small}>Поддержка: {SUPPORT_EMAIL}</Text>}
          {!confirmDelete ? (
            <Text style={styles.danger} accessibilityRole="button" onPress={() => setConfirmDelete(true)}>Удалить аккаунт</Text>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.body}>
                Удалить аккаунт и все данные ребёнка: прогресс, серию, монеты, покупки, расписание? Это нельзя отменить.
              </Text>
              <Button title={deleting ? 'Удаляем…' : 'Да, удалить навсегда'} onPress={onDelete} disabled={deleting} />
              <Button title="Отмена" variant="secondary" onPress={() => setConfirmDelete(false)} disabled={deleting} />
            </View>
          )}
          <Text style={styles.link} onPress={() => { setAdult('closed'); setConfirmDelete(false); }}>Закрыть</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  head: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  plusBadge: { fontSize: 13, fontWeight: '800', color: '#6B3FB8', backgroundColor: '#F3ECFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  hscroll: { gap: 10, paddingVertical: 2 },
  pick: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  pickActive: { borderColor: colors.green, borderWidth: 3 },
  more: { borderColor: '#C9D0CB', borderStyle: 'dashed', borderWidth: 1.5, backgroundColor: colors.card },
  moreText: { fontSize: 12, fontWeight: '700', color: colors.green, textAlign: 'center' },
  swatch: { width: 92, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'flex-end', padding: 6, borderWidth: 1, borderColor: colors.border },
  swatchText: { fontSize: 12, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, minWidth: 48, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.greenDark, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#B07CE8', backgroundColor: '#F7F2FD', marginTop: 8 },
  plusActive: { backgroundColor: '#F3ECFC' },
  plusTitle: { fontSize: 16, fontWeight: '800', color: '#6B3FB8' },
  plusArrow: { fontSize: 26, color: '#6B3FB8' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 6 },
  danger: { fontSize: 15, fontWeight: '700', color: colors.danger, paddingVertical: 6 },
});
