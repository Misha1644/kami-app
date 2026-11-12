// Небольшие значки: огонёк серии, монета, снежинка заморозки.
import Svg, { Path, Circle, Line } from 'react-native-svg';

export function Flame({ size = 18, color = '#E8833A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3.2 2-4.8 2.6-7 1.7 1.2 2.4 2.6 2.4 4.5C12.8 8 13 5 12 2z" fill={color} />
    </Svg>
  );
}

export function Coin({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill="#E9B949" stroke="#B8861B" strokeWidth={1.5} />
      <Path d="M9 9.5c0-1.4 1.3-2.2 3-2.2s3 .8 3 2M15 14.5c0 1.4-1.3 2.2-3 2.2s-3-.8-3-2M9 9.5c0 1.6 6 1 6 3.4" fill="none" stroke="#8A5A00" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function Snowflake({ size = 18, color = '#4A90D9' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={12} y1={2} x2={12} y2={22} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={3.3} y1={7} x2={20.7} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={3.3} y1={17} x2={20.7} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
