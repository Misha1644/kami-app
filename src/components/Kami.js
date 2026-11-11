// Хамелеон Ками — талисман приложения: новенький в школе, с рюкзаком.
import Svg, { Path, Ellipse, Rect, Circle, Line } from 'react-native-svg';

export default function Kami({ size = 96 }) {
  const height = (size * 90) / 120;
  return (
    <Svg width={size} height={height} viewBox="0 0 120 90" accessibilityLabel="Хамелеон Ками">
      <Path d="M34 58 C12 58 8 84 26 84 C38 84 38 70 28 70" fill="none" stroke="#3DB37F" strokeWidth={9} strokeLinecap="round" />
      <Ellipse cx={62} cy={52} rx={30} ry={21} fill="#3DB37F" />
      <Rect x={46} y={26} width={24} height={22} rx={6} fill="#E8833A" />
      <Rect x={52} y={22} width={12} height={6} rx={3} fill="none" stroke="#C2661F" strokeWidth={2.5} />
      <Line x1={50} y1={70} x2={46} y2={82} stroke="#2F9E6E" strokeWidth={6} strokeLinecap="round" />
      <Line x1={74} y1={70} x2={78} y2={82} stroke="#2F9E6E" strokeWidth={6} strokeLinecap="round" />
      <Circle cx={92} cy={44} r={18} fill="#3DB37F" />
      <Circle cx={96} cy={39} r={9} fill="#FFFFFF" stroke="#1F7A52" strokeWidth={2.5} />
      <Circle cx={98} cy={39} r={4} fill="#1B1F1D" />
      <Path d="M98 52 Q104 56 109 50" fill="none" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
