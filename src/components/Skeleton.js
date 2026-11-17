// Заглушки на время загрузки: серые карточки вместо пустого экрана, чтобы было видно, что всё грузится.
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Skeleton() {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const Box = ({ h, w = '100%', r = radius.lg }) => <Animated.View style={[styles.box, { height: h, width: w, borderRadius: r, opacity: pulse }]} />;
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка" accessibilityRole="progressbar">
      <View style={styles.row}>
        <Box h={28} w="45%" r={8} />
        <Box h={28} w={110} r={14} />
      </View>
      <Box h={150} />
      <Box h={170} />
      <Box h={90} />
      <Box h={90} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, paddingTop: 60, gap: 14, backgroundColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { backgroundColor: '#E3E7E4' },
});
