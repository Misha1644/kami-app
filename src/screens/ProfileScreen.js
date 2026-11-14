// Профиль: аватар, фон, цвет Ками, учёба, звук, напоминания, подписка и раздел для взрослых.
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import UserAvatar from '../components/UserAvatar';
import { BgSwatch } from '../components/Background';
import ParentalGate from '../components/ParentalGate';
import { Button, Card } from '../components/ui';
import { Flame } from '../components/icons';
import { colors, radius } from '../theme';
import { GRADES } from '../data/content';
import { deleteAccount, loadWeeklyEmail, setWeeklyEmail } from '../lib/api';
import { PLUS_ENABLED, SUPPORT_EMAIL } from '../config';
import { tr, itemTitle, UI_LANGS, uiLangFor, setLang } from '../i18n';

const DEFAULTS = new Set(['color-green', 'avatar-person', 'bg-default', 'music-kami']);
const GOALS = [5, 10, 15, 20, 30];

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
  student, plan, shop, kamiColor, streak, todayDone, learnedTotal,
  prefs, onSavePrefs, onEquip, onChangeGrade, onUpdateStudent,
  reminders, remindersSupported, onToggleReminders,
  onOpenPlus, onOpenPrivacy, onOpenShop, onOpenFriends, onToggleFriends, onSignOut, refreshing, onRefresh,
}) {
  const [error, setError] = useState('');
  const [adult, setAdult] = useState('closed'); // closed | gate | open
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weeklyEmail, setWeekly] = useState(true);
  const [restart, setRestart] = useState(false);
  useEffect(() => {
    if (adult === 'open' && plan?.plus) loadWeeklyEmail().then(setWeekly).catch(() => {});
  }, [adult, plan?.plus]);

  const items = shop?.items || [];
  const owns = (id) => DEFAULTS.has(id) || shop?.owned?.has(id);
  const ownedOf = (kind) => items.filter((i) => i.kind === kind && owns(i.id));
  const valueOf = (id) => items.find((i) => i.id === id)?.value;
  const avatarValue = valueOf(student.avatar) || 'person';
  // В сетке сначала 8 вещей (надетая — всегда видна), остальные — по кнопке «Показать все».
  const [expanded, setExpanded] = useState({});
  const wornId = { avatar: student.avatar, bg: student.bg, color: student.kami_color };
  function limit(list, kind) {
    if (expanded[kind] || list.length <= 8) return list;
    const first = list.slice(0, 8);
    const worn = list.find((i) => i.id === wornId[kind]);
    return worn && !first.includes(worn) ? [worn, ...first.slice(0, 7)] : first;
  }
  function moreButton(kind) {
    const n = ownedOf(kind).length;
    if (n <= 8) return null;
    return (
      <Text style={styles.showAll} accessibilityRole="button" onPress={() => setExpanded((e) => ({ ...e, [kind]: !e[kind] }))}>
        {expanded[kind] ? tr('Свернуть') : tr('Показать все ({0})', n)}
      </Text>
    );
  }

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
      ? tr('Пробный Плюс до {0}', new Date(plan.expiresAt).toLocaleDateString('ru-RU'))
      : tr('Ками Плюс');

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      {/* Шапка */}
      <View style={styles.head}>
        <UserAvatar value={avatarValue} size={92} kamiColor={kamiColor} />
        <Text style={styles.h1}>{student.nickname}</Text>
        <View style={styles.headStats}>
          <Text style={styles.small}>{student.grade} · </Text>
          <Flame size={14} color={todayDone ? '#E8833A' : '#A3ABB5'} />
          <Text style={styles.small}>{' '}{tr('{0} · {1} слов', streak, learnedTotal)}</Text>
        </View>
        {!!planLine && <Text style={styles.plusBadge}>{planLine}</Text>}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {student.friends_enabled && (
        <Pressable accessibilityRole="button" onPress={onOpenFriends} style={styles.friends}>
          <Text style={styles.friendsIcon}>👋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendsTitle}>{tr('Друзья')}</Text>
            <Text style={styles.small}>{tr('Добавляй одноклассников по коду и подбадривай их')}</Text>
          </View>
          <Text style={styles.plusArrow}>›</Text>
        </Pressable>
      )}

      {/* Стиль */}
      <Text style={styles.h2}>{tr('Аватар')}</Text>
      <View style={styles.grid}>
        {limit(ownedOf('avatar'), 'avatar').map((i) => {
          const worn = student.avatar === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={tr('Аватар {0}', itemTitle(i))}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.pick, worn && styles.pickActive]}
            >
              <UserAvatar value={i.value} size={56} kamiColor={kamiColor} />
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={onOpenShop} style={[styles.pick, styles.more]}>
          <Text style={styles.moreText}>{tr('+ ещё{0}в магазине', '\n')}</Text>
        </Pressable>
      </View>
      {moreButton('avatar')}

      <Text style={styles.h2}>{tr('Фон')}</Text>
      <View style={styles.grid}>
        {limit(ownedOf('bg'), 'bg').map((i) => {
          const worn = student.bg === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={tr('Фон {0}', itemTitle(i))}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.swatchWrap, worn && styles.pickActive]}
            >
              <BgSwatch value={i.value} style={styles.swatch} />
              <Text style={styles.swatchText} numberOfLines={1}>{itemTitle(i)}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={onOpenShop} style={[styles.swatchWrap, styles.more, { height: 60, justifyContent: 'center' }]}>
          <Text style={styles.moreText}>{tr('+ ещё')}</Text>
        </Pressable>
      </View>
      {moreButton('bg')}

      <Text style={styles.h2}>{tr('Цвет Ками')}</Text>
      <View style={styles.grid}>
        {limit(ownedOf('color'), 'color').map((i) => {
          const worn = student.kami_color === i.id;
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              accessibilityLabel={itemTitle(i)}
              accessibilityState={{ selected: worn }}
              onPress={() => !worn && act(() => onEquip(i.id))}
              style={[styles.pick, worn && styles.pickActive]}
            >
              <Kami size={56} color={i.value} />
            </Pressable>
          );
        })}
      </View>
      {moreButton('color')}

      {/* Учёба */}
      <Text style={styles.h2}>{tr('Учёба')}</Text>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>{tr('Класс')}</Text>
          <Chips options={GRADES.map((g) => ({ value: g, label: g }))} value={student.grade} onChange={(g) => act(() => onChangeGrade(g))} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>{tr('Цель дня — слов')}</Text>
          <Chips options={GOALS.map((g) => ({ value: g, label: String(g) }))} value={student.daily_goal} onChange={(g) => act(() => onUpdateStudent({ daily_goal: g }))} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.body}>{tr('Язык')}</Text>
          <Chips
            options={UI_LANGS.map((l) => ({ value: l.code, label: l.label }))}
            value={uiLangFor(student.native_lang)}
            onChange={(l) => act(async () => {
              await onUpdateStudent({ native_lang: l });
              setRestart(setLang(l));
            })}
          />
          <Text style={styles.small}>{tr('Язык приложения, переводов слов и объяснений заданий.')}</Text>
          {restart && <Text style={styles.small}>{tr('Закрой и снова открой приложение, чтобы экран перевернулся справа налево.')}</Text>}
        </View>
      </Card>

      {/* Звук */}
      <Text style={styles.h2}>{tr('Звук и упражнения')}</Text>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>{tr('Музыка в меню')}</Text>
          <Chips
            options={[{ value: 'music-off', label: tr('Без музыки') }, ...ownedOf('music').map((i) => ({ value: i.id, label: '♪ ' + itemTitle(i) }))]}
            value={student.music || 'music-off'}
            onChange={(id) => act(() => onEquip(id))}
          />
          <Text style={styles.small}>{tr('Новую музыку можно купить в магазине.')}</Text>
        </View>
        <SwitchRow title={tr('Озвучивать новые слова')} note={tr('Ками сам произносит слово на карточке')} value={prefs.autoplay} onChange={(v) => onSavePrefs({ ...prefs, autoplay: v })} />
        <SwitchRow title={tr('Медленный голос')} note={tr('Для начала так проще расслышать')} value={prefs.slowVoice} onChange={(v) => onSavePrefs({ ...prefs, slowVoice: v })} />
        <SwitchRow title={tr('Упражнения «Скажи вслух»')} note={tr('Выключи, если занимаешься там, где нельзя говорить')} value={prefs.speaking} onChange={(v) => onSavePrefs({ ...prefs, speaking: v })} />
        {remindersSupported && (
          <SwitchRow title={tr('Напоминание в 19:00')} note={tr('С уроками на завтра и фактом дня')} value={reminders} onChange={onToggleReminders} />
        )}
      </Card>

      {/* Подписка */}
      {PLUS_ENABLED && (
        <Pressable accessibilityRole="button" onPress={onOpenPlus} style={[styles.plus, plan.plus && styles.plusActive]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plusTitle}>{plan.plus ? planLine : tr('Ками Плюс')}</Text>
            <Text style={styles.small}>
              {plan.plus ? tr('Отчёты и разбор заданий открыты.') : plan.trialUsed ? tr('Отчёты об успехах и разбор заданий по фото.') : tr('Попробуй 3 дня бесплатно: отчёты и разбор заданий по фото.')}
            </Text>
          </View>
          <Text style={styles.plusArrow}>›</Text>
        </Pressable>
      )}

      {/* Для взрослых */}
      <Text style={styles.h2}>{tr('Для взрослых')}</Text>
      {adult === 'closed' && (
        <Card style={{ gap: 8 }}>
          <Text style={styles.small}>{tr('Выход из аккаунта, удаление аккаунта и политика конфиденциальности.')}</Text>
          <Button title={tr('Открыть')} variant="secondary" onPress={() => setAdult('gate')} />
        </Card>
      )}
      {adult === 'gate' && <ParentalGate onPass={() => setAdult('open')} onCancel={() => setAdult('closed')} />}
      {adult === 'open' && (
        <Card style={{ gap: 10 }}>
          {PLUS_ENABLED && (
            <SwitchRow
              title={tr('Отчёт на почту')}
              note={plan?.plus
                ? tr('Раз в неделю: сколько занимался, новые и трудные слова, ближайшие контрольные.')
                : tr('Еженедельный отчёт на почту родителя входит в Ками Плюс.')}
              value={!!plan?.plus && weeklyEmail}
              onChange={(v) => {
                if (!plan?.plus) { onOpenPlus?.(); return; }
                setWeekly(v);
                act(async () => { try { await setWeeklyEmail(v); } catch (e) { setWeekly(!v); throw e; } });
              }}
            />
          )}
          <SwitchRow
            title={tr('Разрешить друзей')}
            note={tr('Добавление по коду и готовые реакции. Сообщений писать нельзя.')}
            value={!!student.friends_enabled}
            onChange={(v) => act(() => onToggleFriends(v))}
          />
          <Button title={tr('Выйти из аккаунта')} variant="secondary" onPress={onSignOut} />
          <Text style={styles.link} accessibilityRole="link" onPress={onOpenPrivacy}>{tr('Политика конфиденциальности')}</Text>
          {!!SUPPORT_EMAIL && <Text style={styles.small}>{tr('Поддержка: {0}', SUPPORT_EMAIL)}</Text>}
          {!confirmDelete ? (
            <Text style={styles.danger} accessibilityRole="button" onPress={() => setConfirmDelete(true)}>{tr('Удалить аккаунт')}</Text>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.body}>{tr('Удалить аккаунт и все данные ребёнка: прогресс, серию, монеты, покупки, расписание? Это нельзя отменить.')}</Text>
              <Button title={deleting ? tr('Удаляем…') : tr('Да, удалить навсегда')} onPress={onDelete} disabled={deleting} />
              <Button title={tr('Отмена')} variant="secondary" onPress={() => setConfirmDelete(false)} disabled={deleting} />
            </View>
          )}
          <Text style={styles.link} onPress={() => { setAdult('closed'); setConfirmDelete(false); }}>{tr('Закрыть')}</Text>
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
  headStats: { flexDirection: 'row', alignItems: 'center' },
  plusBadge: { fontSize: 13, fontWeight: '800', color: '#6B3FB8', backgroundColor: '#F3ECFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  showAll: { fontSize: 14, fontWeight: '700', color: colors.green, paddingVertical: 4 },
  pick: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  pickActive: { borderColor: colors.green, borderWidth: 3 },
  more: { borderColor: '#C9D0CB', borderStyle: 'dashed', borderWidth: 1.5, backgroundColor: colors.card },
  moreText: { fontSize: 12, fontWeight: '700', color: colors.green, textAlign: 'center' },
  swatchWrap: { width: 96, alignItems: 'center', gap: 4, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  swatch: { width: 88, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  swatchText: { fontSize: 12, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  chip: { minHeight: 40, minWidth: 48, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C9D0CB', alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.greenDark, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  friends: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.green, backgroundColor: colors.greenLight },
  friendsIcon: { fontSize: 26 },
  friendsTitle: { fontSize: 16, fontWeight: '800', color: colors.greenDark },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#B07CE8', backgroundColor: '#F7F2FD', marginTop: 8 },
  plusActive: { backgroundColor: '#F3ECFC' },
  plusTitle: { fontSize: 16, fontWeight: '800', color: '#6B3FB8' },
  plusArrow: { fontSize: 26, color: '#6B3FB8' },
  link: { fontSize: 15, fontWeight: '700', color: colors.green, paddingVertical: 6 },
  danger: { fontSize: 15, fontWeight: '700', color: colors.danger, paddingVertical: 6 },
});
