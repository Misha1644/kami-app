// Сундук: type 'lesson' — деревянный, 'skin' — фиолетовый с золотом. open — крышка откинута.
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';
import { tr } from '../i18n';

const LOOK = {
  lesson: { body: '#B7793F', dark: '#7A4A1E', band: '#D9A92B', glow: '#FDE68A' },
  skin: { body: '#7A5AF8', dark: '#4A2DB3', band: '#F5C443', glow: '#E9D7FE' },
};

export default function Chest({ type = 'lesson', open = false, size = 120 }) {
  const c = LOOK[type] || LOOK.lesson;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel={open ? tr('Открытый сундук') : tr('Сундук')}>
      {open && (
        <G>
          <Circle cx={60} cy={58} r={40} fill={c.glow} opacity={0.6} />
          <Path d="M60 14 L64 34 L60 30 L56 34 Z M30 30 L44 44 L40 44 Z M90 30 L80 44 L76 42 Z" fill={c.band} opacity={0.9} />
        </G>
      )}
      {/* Корпус */}
      <Rect x={18} y={56} width={84} height={46} rx={8} fill={c.body} />
      <Rect x={18} y={56} width={84} height={10} fill={c.dark} opacity={0.35} />
      <Rect x={18} y={74} width={84} height={6} fill={c.band} />
      <Rect x={30} y={56} width={8} height={46} fill={c.band} />
      <Rect x={82} y={56} width={8} height={46} fill={c.band} />
      {/* Крышка */}
      {open ? (
        <Path d="M20 54 L28 26 Q60 16 92 26 L100 54 Q60 46 20 54 Z" fill={c.body} stroke={c.dark} strokeWidth={2} />
      ) : (
        <>
          <Path d="M18 58 Q18 30 60 30 Q102 30 102 58 Z" fill={c.body} />
          <Path d="M18 58 Q18 30 60 30 Q102 30 102 58" fill="none" stroke={c.dark} strokeWidth={2} />
          <Rect x={30} y={33} width={8} height={25} fill={c.band} />
          <Rect x={82} y={33} width={8} height={25} fill={c.band} />
        </>
      )}
      {/* Замок */}
      <Rect x={52} y={open ? 60 : 52} width={16} height={18} rx={3} fill={c.band} stroke={c.dark} strokeWidth={1.5} />
      <Circle cx={60} cy={open ? 68 : 60} r={2.5} fill={c.dark} />
    </Svg>
  );
}
