// Первые 2 минуты: три коротких экрана и сразу первый урок на 3 слова (с монетами и первым огоньком).
// Показывается один раз новому ученику (флаг kami.onboarded.<id> в AsyncStorage).
import { useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import Kami from '../components/Kami';
import { Button } from '../components/ui';
import { colors, radius } from '../theme';
import { tr } from '../i18n';

function slides(name) {
  return [
    {
      mood: 'excited',
      title: tr('Привет, {0}! Я Ками', name),
      text: tr('Я помогу понимать уроки в испанской школе: математику, биологию, историю — слова, которые нужны именно в твоём классе.'),
    },
    {
      mood: 'happy',
      icon: '📅',
      title: tr('Учим то, что будет завтра'),
      text: tr('Внеси расписание — и я подготовлю слова к завтрашним урокам. Один короткий урок в день, 5 минут.'),
    },
    {
      mood: 'happy',
      icon: '🔥',
      title: tr('Огонёк, монеты и сундуки'),
      text: tr('Каждый день с уроком продлевает огонёк. За ответы — монеты, в магазине — скины и цвета для меня.'),
    },
  ];
}

export default function OnboardingScreen({ student, kamiColor, firstTopic, onStart, onSkip }) {
  const list = slides(student.nickname || tr('друг'));
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const last = i === list.length - 1;
  const s = list[i];

  function next() {
    if (last) { onStart(); return; }
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => {
      setI(i + 1);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {list.map((_, k) => <View key={k} style={[styles.dot, k === i && styles.dotOn]} />)}
        </View>
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}>
          <Text style={styles.skip}>{tr('Пропустить')}</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.body, { opacity: fade }]}>
        <View>
          <Kami size={140} color={kamiColor} mood={s.mood} />
          {!!s.icon && <Text style={styles.badge}>{s.icon}</Text>}
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.text}>{s.text}</Text>
        {last && firstTopic && (
          <View style={styles.first}>
            <Text style={styles.firstTitle}>{tr('Первый урок — всего 3 слова')}</Text>
            <Text style={styles.small}>{firstTopic.words.slice(0, 3).map((w) => w.es).join(' · ')}</Text>
          </View>
        )}
      </Animated.View>

      <Button title={last ? (firstTopic ? tr('Начать первый урок') : tr('Начать')) : tr('Дальше')} onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, paddingTop: 56, gap: 20, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.track },
  dotOn: { width: 22, backgroundColor: colors.green },
  skip: { fontSize: 15, fontWeight: '700', color: colors.muted },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  badge: { position: 'absolute', right: -6, bottom: -4, fontSize: 40 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
  text: { fontSize: 17, color: colors.muted, textAlign: 'center', lineHeight: 24 },
  first: { marginTop: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.greenLight, alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  firstTitle: { fontSize: 16, fontWeight: '800', color: colors.greenDark },
  small: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
