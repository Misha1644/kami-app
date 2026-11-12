// Хамелеон Ками — талисман приложения: новенький в школе, с рюкзаком.
// mood: happy | excited | worried | sleepy — меняет глаз, рот и щёки.
import Svg, { Path, Ellipse, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';

export default function Kami({ size = 96, color = '#3DB37F', mood = 'happy' }) {
  const height = (size * 90) / 120;
  return (
    <Svg width={size} height={height} viewBox="0 0 120 90" accessibilityLabel="Хамелеон Ками">
      <Path d="M34 58 C12 58 8 84 26 84 C38 84 38 70 28 70" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />
      <Ellipse cx={62} cy={52} rx={30} ry={21} fill={color} />
      <Rect x={46} y={26} width={24} height={22} rx={6} fill="#E8833A" />
      <Rect x={52} y={22} width={12} height={6} rx={3} fill="none" stroke="#C2661F" strokeWidth={2.5} />
      <Line x1={50} y1={70} x2={46} y2={82} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <Line x1={74} y1={70} x2={78} y2={82} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={92} cy={44} r={18} fill={color} />
      {mood === 'sleepy' ? (
        <Path d="M88 40 Q96 45 104 40" fill="none" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
      ) : (
        <>
          <Circle cx={96} cy={39} r={mood === 'excited' ? 10 : 9} fill="#FFFFFF" stroke="#1F7A52" strokeWidth={2.5} />
          <Circle cx={mood === 'worried' ? 95 : 98} cy={mood === 'worried' ? 41 : 39} r={mood === 'excited' ? 5 : 4} fill="#1B1F1D" />
          {mood === 'excited' && <Circle cx={100} cy={36} r={1.6} fill="#FFFFFF" />}
        </>
      )}
      {mood === 'worried' && (
        <>
          <Path d="M88 29 L102 25" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={100} cy={52} rx={5} ry={3} fill="#F28B82" opacity={0.8} />
          <Path d="M96 56 Q100 53 104 56 Q107 58 109 55" fill="none" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}
      {mood === 'excited' && (
        <>
          <Path d="M96 50 Q103 59 110 49 Z" fill="#1F7A52" />
          <Ellipse cx={86} cy={51} rx={4} ry={2.5} fill="#F28B82" opacity={0.7} />
          <Path d="M112 18 L114 24 L120 26 L114 28 L112 34 L110 28 L104 26 L110 24 Z" fill="#F5C443" />
        </>
      )}
      {mood === 'happy' && (
        <Path d="M98 52 Q104 56 109 50" fill="none" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
      )}
      {mood === 'sleepy' && (
        <>
          <Path d="M99 53 Q104 54 108 52" fill="none" stroke="#1F7A52" strokeWidth={2.5} strokeLinecap="round" />
          <SvgText x={104} y={20} fontSize={12} fontWeight="bold" fill="#7A8A82">z</SvgText>
          <SvgText x={111} y={12} fontSize={9} fontWeight="bold" fill="#7A8A82">z</SvgText>
        </>
      )}
    </Svg>
  );
}
