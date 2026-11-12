// «Только для взрослых»: перед выходом, удалением аккаунта и подпиской нужно решить пример.
// Так ребёнок случайно не удалит аккаунт и не оформит подписку.
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button, Card } from './ui';
import { colors, radius } from '../theme';

function makeTask() {
  const a = 6 + Math.floor(Math.random() * 7); // 6–12
  const b = 6 + Math.floor(Math.random() * 7);
  return { a, b, answer: a * b };
}

export default function ParentalGate({ title = 'Для взрослых', onPass, onCancel }) {
  const [task, setTask] = useState(makeTask);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function check() {
    if (Number(value) === task.answer) return onPass();
    setError('Неверно. Попробуйте ещё раз.');
    setValue('');
    setTask(makeTask());
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.small}>Чтобы продолжить, решите пример:</Text>
      <Text style={styles.task}>{task.a} × {task.b} = ?</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        maxLength={3}
        accessibilityLabel="Ответ"
        onSubmitEditing={check}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={{ gap: 8 }}>
        <Button title="Продолжить" onPress={check} disabled={!value} />
        <Button title="Отмена" variant="secondary" onPress={onCancel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, borderColor: colors.orange, borderWidth: 1.5 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  small: { fontSize: 14, color: colors.muted },
  task: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: '#C9D0CB', borderRadius: radius.md, paddingHorizontal: 14, fontSize: 22, textAlign: 'center', backgroundColor: colors.card, color: colors.text },
  error: { fontSize: 14, color: colors.danger },
});
