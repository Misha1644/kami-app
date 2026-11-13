// Друзья. Безопасно для детей:
//   • добавить можно только по коду, который друг сказал лично (поиска нет);
//   • добавление — после проверки «для взрослых», друг должен подтвердить;
//   • писать сообщения нельзя — только готовые реакции на испанском;
//   • удалить или заблокировать — в один клик.
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import UserAvatar from '../components/UserAvatar';
import ParentalGate from '../components/ParentalGate';
import { Button, Card } from '../components/ui';
import { colors, radius } from '../theme';
import { plural } from '../data/content';
import {
  CHEERS, myFriendCode, addFriend, friendAction, listFriends, sendCheer, myCheers,
} from '../lib/api';
import { tr } from '../i18n';

function timeAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return tr('{0} мин назад', Math.max(1, min));
  const h = Math.round(min / 60);
  if (h < 24) return tr('{0} ч назад', h);
  const d = Math.round(h / 24);
  return tr('{0} {1} назад', d, plural(d, tr('день'), tr('дня'), tr('дней')));
}

export default function FriendsScreen({ student, onBack }) {
  const [code, setCode] = useState('');
  const [list, setList] = useState(null);
  const [cheers, setCheers] = useState([]);
  const [adding, setAdding] = useState('closed'); // closed | gate | form
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(null); // id друга, у которого открыты реакции
  const [confirm, setConfirm] = useState(null); // { id, action }
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, ch] = await Promise.all([myFriendCode(student.id), listFriends(student.id), myCheers(student.id, true)]);
      setCode(c);
      setList(l);
      setCheers(ch);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  async function act(fn, ok) {
    setError('');
    setMessage('');
    try {
      await fn();
      if (ok) setMessage(ok);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitCode() {
    const c = input.replace(/\s/g, '').toUpperCase();
    if (c.length !== 6) return setError(tr('Код — 6 букв и цифр.'));
    await act(async () => {
      const res = await addFriend(student.id, c);
      setInput('');
      setAdding('closed');
      setMessage(res.status === 'accepted' ? tr('Теперь вы друзья! 🎉') : tr('Заявка отправлена. Друг должен её принять.'));
    });
  }

  const friends = (list || []).filter((f) => f.status === 'friend');
  const incoming = (list || []).filter((f) => f.status === 'incoming');
  const outgoing = (list || []).filter((f) => f.status === 'outgoing');

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.green} />}
    >
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>{tr('‹ Назад')}</Text>
      </Pressable>
      <Text style={styles.h1}>{tr('Друзья')}</Text>

      {/* Мой код */}
      <Card style={styles.codeCard}>
        <Text style={styles.small}>{tr('Твой код друга')}</Text>
        <Text style={styles.code} selectable accessibilityLabel={tr('Код: {0}', code.split('').join(' '))}>{code || '······'}</Text>
        <Text style={styles.small}>{tr('Скажи его другу из класса лично. Не выкладывай код в интернет.')}</Text>
      </Card>

      {!!message && <Text style={styles.ok}>{message}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Добавить друга */}
      {adding === 'closed' && <Button title={tr('+ Добавить друга по коду')} onPress={() => { setError(''); setAdding('gate'); }} />}
      {adding === 'gate' && (
        <ParentalGate title={tr('Добавить друга — вместе со взрослым')} onPass={() => setAdding('form')} onCancel={() => setAdding('closed')} />
      )}
      {adding === 'form' && (
        <Card style={{ gap: 10 }}>
          <Text style={styles.body}>{tr('Введи код друга')}</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(t) => setInput(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            placeholder="ABC234"
            placeholderTextColor="#8A928E"
            accessibilityLabel={tr('Код друга')}
          />
          <Button title={tr('Отправить заявку')} onPress={submitCode} disabled={!input.trim()} />
          <Button title={tr('Отмена')} variant="secondary" onPress={() => setAdding('closed')} />
        </Card>
      )}

      {/* Входящие заявки */}
      {incoming.length > 0 && (
        <>
          <Text style={styles.h2}>{tr('Хотят дружить')}</Text>
          {incoming.map((f) => (
            <Card key={f.id} style={styles.row}>
              <UserAvatar value={f.avatar} size={44} kamiColor={f.kami_color} />
              <Text style={[styles.name, { flex: 1 }]}>{f.nickname}</Text>
              <Pressable accessibilityRole="button" onPress={() => act(() => friendAction(student.id, f.id, 'accept'), tr('Теперь вы друзья! 🎉'))} style={styles.accept}>
                <Text style={styles.acceptText}>{tr('Принять')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={tr('Отклонить {0}', f.nickname)} onPress={() => act(() => friendAction(student.id, f.id, 'decline'))} style={styles.decline}>
                <Text style={styles.declineText}>✕</Text>
              </Pressable>
            </Card>
          ))}
        </>
      )}

      {/* Реакции от друзей */}
      {cheers.length > 0 && (
        <>
          <Text style={styles.h2}>{tr('Тебе прислали')}</Text>
          <Card style={{ gap: 10 }}>
            {cheers.slice(0, 8).map((c) => (
              <View key={c.id} style={styles.cheerRow}>
                <UserAvatar value={c.avatar} size={32} />
                <Text style={[styles.body, { flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>{c.from}</Text>: {CHEERS[c.cheer]}
                </Text>
                <Text style={styles.small}>{timeAgo(c.at)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Друзья */}
      <Text style={styles.h2}>{tr('Мои друзья {0}', friends.length > 0 ? `(${friends.length})` : '')}</Text>
      {list === null && <Text style={styles.small}>{tr('Загружаем…')}</Text>}
      {list !== null && friends.length === 0 && (
        <Text style={styles.small}>{tr('Пока никого. Обменяйтесь кодами с одноклассниками — и подбадривайте друг друга!')}</Text>
      )}
      {friends.map((f) => (
        <Card key={f.id} style={{ gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(open === f.id ? null : f.id)} style={styles.row}>
            <UserAvatar value={f.avatar} size={48} kamiColor={f.kami_color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{f.nickname}</Text>
              <Text style={styles.small}>
                {f.active_today ? tr('✅ Занимался сегодня') : tr('Сегодня ещё не занимался')} · {f.learned} {plural(f.learned, tr('слово'), tr('слова'), tr('слов'))}
              </Text>
            </View>
            <Text style={styles.chev}>{open === f.id ? '˄' : '˅'}</Text>
          </Pressable>
          {open === f.id && (
            <>
              <View style={styles.cheers}>
                {Object.entries(CHEERS).map(([key, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    onPress={() => act(() => sendCheer(student.id, f.id, key), tr('Отправлено: {0}', label))}
                    style={styles.cheer}
                  >
                    <Text style={styles.cheerText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              {confirm?.id === f.id ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.body}>
                    {confirm.action === 'block'
                      ? tr('Заблокировать {0}? Он(а) больше не сможет добавить тебя и присылать реакции.', f.nickname)
                      : tr('Удалить {0} из друзей?', f.nickname)}
                  </Text>
                  <Button title={tr('Да')} onPress={() => { const a = confirm.action; setConfirm(null); act(() => friendAction(student.id, f.id, a), a === 'block' ? tr('Заблокирован.') : tr('Удалён из друзей.')); }} />
                  <Button title={tr('Отмена')} variant="secondary" onPress={() => setConfirm(null)} />
                </View>
              ) : (
                <View style={styles.manage}>
                  <Text style={styles.link} onPress={() => setConfirm({ id: f.id, action: 'remove' })}>{tr('Удалить')}</Text>
                  <Text style={styles.danger} onPress={() => setConfirm({ id: f.id, action: 'block' })}>{tr('Заблокировать')}</Text>
                </View>
              )}
            </>
          )}
        </Card>
      ))}

      {/* Исходящие */}
      {outgoing.length > 0 && (
        <>
          <Text style={styles.h2}>{tr('Ждут подтверждения')}</Text>
          {outgoing.map((f) => (
            <Card key={f.id} style={styles.row}>
              <UserAvatar value={f.avatar} size={40} kamiColor={f.kami_color} />
              <Text style={[styles.body, { flex: 1 }]}>{f.nickname}</Text>
              <Text style={styles.link} onPress={() => act(() => friendAction(student.id, f.id, 'remove'))}>{tr('Отменить')}</Text>
            </Card>
          ))}
        </>
      )}

      <Text style={styles.safety}>{tr('В Kami нельзя писать сообщения — только отправлять реакции. Если кто-то ведёт себя странно, заблокируй его и расскажи взрослому.')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '700', color: colors.green },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  ok: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  error: { fontSize: 14, color: colors.danger },
  codeCard: { alignItems: 'center', gap: 6, borderColor: colors.green, borderWidth: 2 },
  code: { fontSize: 34, fontWeight: '800', letterSpacing: 6, color: colors.greenDark },
  input: { minHeight: 52, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 24, letterSpacing: 4, textAlign: 'center', backgroundColor: colors.card, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  chev: { fontSize: 20, color: colors.muted },
  accept: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: colors.green, justifyContent: 'center' },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  decline: { minWidth: 40, minHeight: 40, borderRadius: radius.sm, borderWidth: 1.5, borderColor: '#C9D0CB', alignItems: 'center', justifyContent: 'center' },
  declineText: { fontSize: 16, color: colors.muted },
  cheers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cheer: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.greenLight, justifyContent: 'center' },
  cheerText: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  cheerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manage: { flexDirection: 'row', gap: 20 },
  link: { fontSize: 14, fontWeight: '700', color: colors.muted, paddingVertical: 6 },
  danger: { fontSize: 14, fontWeight: '700', color: colors.danger, paddingVertical: 6 },
  safety: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17, marginTop: 8 },
});
