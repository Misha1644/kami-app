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
