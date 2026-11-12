// Иконки нижних вкладок.
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

export function TabIcon({ name, color, size = 24 }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" {...p} />}
      {name === 'schedule' && (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...p} />
          <Line x1={3} y1={10} x2={21} y2={10} {...p} />
          <Line x1={8} y1={3} x2={8} y2={7} {...p} />
          <Line x1={16} y1={3} x2={16} y2={7} {...p} />
        </>
      )}
      {name === 'shop' && (
        <>
          <Path d="M5 8 H19 L18 21 H6 Z" {...p} />
          <Path d="M9 8 V6 A3 3 0 0 1 15 6 V8" {...p} />
        </>
      )}
      {name === 'progress' && (
        <>
          <Line x1={5} y1={20} x2={5} y2={13} {...p} />
          <Line x1={12} y1={20} x2={12} y2={8} {...p} />
          <Line x1={19} y1={20} x2={19} y2={4} {...p} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21 C4 15 20 15 20 21" {...p} />
        </>
      )}
    </Svg>
  );
}
