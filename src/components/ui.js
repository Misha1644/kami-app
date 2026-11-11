// Общие маленькие элементы интерфейса.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export function ProgressBar({ value, height = 8 }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${pct}%`, height, borderRadius: height / 2 }]} />
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled }) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.buttonText, primary ? styles.primaryText : styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.track, width: '100%', overflow: 'hidden' },
  fill: { backgroundColor: colors.greenBar },
  button: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: '#C9D0CB' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: colors.text },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
});
