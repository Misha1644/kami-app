// Фоны: обычный цвет ('#F6F7F4') или узор ('pattern:oranges:#FFF6E8').
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle, Path, G } from 'react-native-svg';

export function parseBg(value) {
  if (!value || !value.startsWith('pattern:')) return { color: value, pattern: null };
  const [, pattern, color] = value.split(':');
  return { color, pattern };
}

const TILES = {
  // Апельсины Валенсии
  oranges: (
    <G>
      <Circle cx={14} cy={14} r={7} fill="#F79009" opacity={0.35} />
      <Path d="M14 7 Q17 3 21 5 Q18 8 14 7 Z" fill="#12B76A" opacity={0.45} />
      <Circle cx={44} cy={44} r={6} fill="#F79009" opacity={0.3} />
      <Path d="M44 38 Q47 34 51 36 Q48 39 44 38 Z" fill="#12B76A" opacity={0.4} />
    </G>
  ),
  // Золотые звёзды
  stars: (
    <G>
      <Path d="M15 6 L17.5 12.5 L24 13 L19 17.5 L20.5 24 L15 20.5 L9.5 24 L11 17.5 L6 13 L12.5 12.5 Z" fill="#F5C443" opacity={0.45} />
      <Path d="M45 36 L46.5 40 L50.5 40.3 L47.4 43 L48.3 47 L45 44.8 L41.7 47 L42.6 43 L39.5 40.3 L43.5 40 Z" fill="#F5C443" opacity={0.35} />
    </G>
  ),
  // Конфетти Fallas
  confetti: (
    <G>
      <Rect x={8} y={10} width={6} height={3} rx={1} fill="#F04438" opacity={0.4} transform="rotate(25 11 11)" />
      <Rect x={36} y={8} width={6} height={3} rx={1} fill="#1570EF" opacity={0.35} transform="rotate(-30 39 9)" />
      <Rect x={20} y={38} width={6} height={3} rx={1} fill="#F5C443" opacity={0.5} transform="rotate(60 23 39)" />
      <Circle cx={48} cy={30} r={2} fill="#12B76A" opacity={0.4} />
      <Circle cx={10} cy={50} r={2} fill="#7A5AF8" opacity={0.4} />
    </G>
  ),
  // Ноты
  notes: (
    <G opacity={0.4}>
      <Circle cx={12} cy={22} r={4} fill="#DD2590" />
      <Path d="M15.5 22 V8 L24 6 V10 L15.5 12" stroke="#DD2590" strokeWidth={1.8} fill="none" />
      <Circle cx={42} cy={50} r={3.5} fill="#7A5AF8" />
      <Path d="M45 50 V38" stroke="#7A5AF8" strokeWidth={1.8} />
      <Path d="M45 38 Q50 40 49 45" stroke="#7A5AF8" strokeWidth={1.8} fill="none" />
    </G>
  ),
  // Цифры и знаки Doctor Pi
  numbers: (
    <G opacity={0.35}>
      <Path d="M8 10 H20 M11 10 V22 M17 10 V22" stroke="#7A5AF8" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M38 14 H48 M43 9 V19" stroke="#1570EF" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M10 44 L18 52 M18 44 L10 52" stroke="#F04438" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M38 46 H50 M38 51 H50" stroke="#12B76A" strokeWidth={2.2} strokeLinecap="round" />
    </G>
  ),
  // Листья парка Турия
  leaves: (
    <G opacity={0.4}>
      <Path d="M8 22 Q10 8 24 8 Q22 22 8 22 Z" fill="#12B76A" />
      <Path d="M8 22 L20 12" stroke="#027A48" strokeWidth={1} />
      <Path d="M36 52 Q38 38 52 38 Q50 52 36 52 Z" fill="#32D583" />
      <Path d="M36 52 L48 42" stroke="#027A48" strokeWidth={1} />
    </G>
  ),
  // Океан: волны, рыбки, пузырьки
  ocean: (
    <G opacity={0.4}>
      <Path d="M0 14 Q7.5 8 15 14 T30 14 T45 14 T60 14" stroke="#0BA5EC" strokeWidth={2} fill="none" />
      <Path d="M30 44 Q36 38 42 44 Q36 50 30 44 Z M42 44 L48 40 L48 48 Z" fill="#F79009" />
      <Circle cx={12} cy={42} r={2.5} fill="none" stroke="#0BA5EC" strokeWidth={1.2} />
      <Circle cx={16} cy={34} r={1.6} fill="none" stroke="#0BA5EC" strokeWidth={1.2} />
    </G>
  ),
  // Космос: планеты, звёзды, ракета
  space: (
    <G>
      <Circle cx={14} cy={14} r={6} fill="#7A5AF8" opacity={0.35} />
      <Path d="M5 16 Q14 10 23 12" stroke="#7A5AF8" strokeWidth={1.6} fill="none" opacity={0.5} />
      <Path d="M44 6 L45.2 9 L48.5 9.2 L46 11.3 L46.8 14.5 L44 12.8 L41.2 14.5 L42 11.3 L39.5 9.2 L42.8 9 Z" fill="#F5C443" opacity={0.6} />
      <Path d="M40 52 L44 36 L48 52 Z" fill="#F04438" opacity={0.35} />
      <Circle cx={44} cy={44} r={1.6} fill="#FFFFFF" opacity={0.8} />
      <Path d="M42 52 L44 57 L46 52" fill="#F79009" opacity={0.5} />
      <Circle cx={10} cy={46} r={1.2} fill="#1570EF" opacity={0.6} />
      <Circle cx={28} cy={30} r={1} fill="#1570EF" opacity={0.6} />
      <Circle cx={54} cy={26} r={1.2} fill="#7A5AF8" opacity={0.6} />
    </G>
  ),
  // Галактика: спирали, кометы, звёзды
  galaxy: (
    <G>
      <Path d="M20 20 m-8 0 a8 8 0 1 0 8 -8 a5 5 0 1 0 -5 5 a2.5 2.5 0 1 0 2.5 -2.5" stroke="#9E77ED" strokeWidth={1.8} fill="none" opacity={0.5} />
      <Path d="M36 46 L52 38" stroke="#F5C443" strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
      <Circle cx={53} cy={37.5} r={2.6} fill="#F5C443" opacity={0.7} />
      <Path d="M48 12 L49 15 L52 16 L49 17 L48 20 L47 17 L44 16 L47 15 Z" fill="#DD2590" opacity={0.5} />
      <Circle cx={8} cy={50} r={1.4} fill="#7A5AF8" opacity={0.6} />
      <Circle cx={30} cy={8} r={1} fill="#1570EF" opacity={0.6} />
      <Circle cx={24} cy={56} r={1} fill="#DD2590" opacity={0.6} />
    </G>
  ),
};

// Узор поверх цвета. Растягивается на всю площадь родителя.
export function PatternLayer({ pattern, tile = 60 }) {
  if (!TILES[pattern]) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`p-${pattern}`} patternUnits="userSpaceOnUse" width={tile} height={tile} viewBox="0 0 60 60">
            {TILES[pattern]}
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#p-${pattern})`} />
      </Svg>
    </View>
  );
}

// Маленький образец фона для магазина и профиля.
export function BgSwatch({ value, style }) {
  const { color, pattern } = parseBg(value);
  return (
    <View style={[{ backgroundColor: color, overflow: 'hidden' }, style]}>
      {!!pattern && <PatternLayer pattern={pattern} tile={40} />}
    </View>
  );
}
