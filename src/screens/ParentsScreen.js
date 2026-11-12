// Экран для родителей: сколько выучено и готовность по предметам.
// Цифры считаются из реального прогресса ученика в этом приложении.
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Button, Card } from '../components/ui';
import { colors } from '../theme';
import { learnedCount, GRADES } from '../data/content';
import { loadHardWords, deleteAccount } from '../lib/api';
import { PAYMENTS_ENABLED, SUPPORT_EMAIL } from '../config';

function status(done, total) {
  if (done === 0) return { label: 'Не начато', bg: '#F1EFE8', fg: '#444441' };
  if (done < total) return { label: 'В процессе', bg: colors.orangeLight, fg: colors.orangeText };
  return { label: 'Готов к уроку', bg: colors.greenLight, fg: colors.greenDark };
}

export default function ParentsScreen({
  topics, student, learned, streak, plan, onOpenPlus, onSignOut, refreshing, onRefresh,
  onChangeGrade, reminders, remindersSupported, onToggleReminders, onOpenPrivacy,
}) {
  const [hard, setHard] = useState(null);
  // Пока оплата не подключена, отчёт о трудных словах бесплатный для всех.
  const hardOpen = plan.plus || !PAYMENTS_ENABLED;
  useEffect(() => {
    if (hardOpen) loadHardWords(student.id).then(setHard);
  }, [hardOpen, student.id]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function onDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
    } catch (e) {
      setDeleteError(e.message);
      setDeleting(false);
    }
  }

  const totalLearned = Object.keys(learned).length;
  const topicsReady = topics.filter((t) => learnedCount(t, learned) === t.words.length).length;

  const stats = [
    { value: streak, label: 'дней подряд' },
    { value: totalLearned, label: 'слов выучено' },
    { value: student.coins, label: 'монет' },
    { value: topicsReady, label: 'темы готовы' },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      <View>
        <Text style={styles.small}>Для родителей</Text>
        <Text style={styles.h1}>Прогресс: {student.nickname}</Text>
        <Text style={styles.small}>{student.grade}</Text>
      </View>

      {(PAYMENTS_ENABLED || plan.plus) && (
      <Pressable accessibilityRole="button" onPress={onOpenPlus} style={[styles.plus, plan.plus && styles.plusActive]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.plusTitle}>{plan.plus ? 'Ками Плюс подключён' : 'Ками Плюс'}</Text>
          <Text style={styles.small}>
            {plan.plus ? 'Все возможности открыты.' : '15 разборов фото в день, эксклюзивный цвет Ками, отчёт о трудных словах.'}
          </Text>
        </View>
        <Text style={styles.plusArrow}>›</Text>
      </Pressable>
      )}

      <View style={styles.stats}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.small}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.h2}>Готовность по предметам</Text>
      <Card style={{ paddingVertical: 4 }}>
        {topics.map((t, i) => {
          const s = status(learnedCount(t, learned), t.words.length);
          return (
            <View key={t.id} style={[styles.row, i < topics.length - 1 && styles.rowBorder]}>
              <Text style={styles.body}>{t.subject}: {t.title}</Text>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Text style={styles.h2}>Трудные слова</Text>
      {hardOpen ? (
        <Card style={{ paddingVertical: 4 }}>
          {hard === null && <Text style={[styles.small, { paddingVertical: 12 }]}>Загружаем…</Text>}
          {hard?.length === 0 && <Text style={[styles.small, { paddingVertical: 12 }]}>Ошибок пока нет — отлично!</Text>}
          {hard?.map((w, i) => (
            <View key={`${w.es}-${i}`} style={[styles.row, i < hard.length - 1 && styles.rowBorder]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{w.es}</Text>
                <Text style={styles.small}>{w.ru}</Text>
              </View>
              <Text style={styles.mistakes}>ошибок: {w.wrong}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.small}>Список слов, в которых ребёнок чаще ошибается, — в Ками Плюс.</Text>
      )}

      <Text style={styles.h2}>Настройки</Text>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>Класс</Text>
          <View style={styles.gradeRow}>
            {GRADES.map((g) => {
              const active = g === student.grade;
              return (
                <Pressable
                  key={g}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => !active && onChangeGrade(g)}
                  style={[styles.gradeChip, active && styles.gradeChipActive]}
                >
                  <Text style={[styles.gradeText, active && styles.gradeTextActive]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.body}>Напоминание в 19:00</Text>
            <Text style={styles.small}>
              {remindersSupported ? 'Какие уроки завтра и что серия под угрозой.' : 'Работает в приложении на телефоне, не в браузере.'}
            </Text>
          </View>
          <Switch
            value={reminders}
            onValueChange={onToggleReminders}
            disabled={!remindersSupported}
            trackColor={{ true: colors.green }}
            accessibilityLabel="Напоминание в 19:00"
          />
        </View>
      </Card>

      <Button title="Выйти из аккаунта" variant="secondary" onPress={onSignOut} />

      <Card style={{ gap: 10 }}>
        <Text style={styles.link} accessibilityRole="link" onPress={onOpenPrivacy}>Политика конфиденциальности</Text>
        {!!SUPPORT_EMAIL && <Text style={styles.small}>Поддержка: {SUPPORT_EMAIL}</Text>}
        {!confirmDelete ? (
          <Text style={styles.danger} accessibilityRole="button" onPress={() => setConfirmDelete(true)}>
            Удалить аккаунт
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.body}>
              Удалить аккаунт и все данные ребёнка: прогресс, серию, монеты, расписание? Это нельзя отменить.
            </Text>
            {!!deleteError && <Text style={styles.danger}>{deleteError}</Text>}
            <Button title={deleting ? 'Удаляем…' : 'Да, удалить навсегда'} onPress={onDelete} disabled={deleting} />
            <Button title="Отмена" variant="secondary" onPress={() => setConfirmDelete(false)} disabled={deleting} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 2 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, color: colors.text, flexShrink: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: '45%', padding: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.track },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#B07CE8', backgroundColor: colors.card },
  plusActive: { backgroundColor: '#F3ECFC' },
  plusTitle: { fontSize: 16, fontWeight: '800', color: '#6B3FB8' },
  plusArrow: { fontSize: 24, color: '#6B3FB8' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 4 },
  danger: { fontSize: 15, fontWeight: '700', color: colors.danger, paddingVertical: 4 },
  mistakes: { fontSize: 13, fontWeight: '700', color: colors.danger },
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#C9D0CB', justifyContent: 'center' },
  gradeChipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  gradeText: { fontSize: 15, color: colors.text },
  gradeTextActive: { color: colors.greenDark, fontWeight: '700' },
});
