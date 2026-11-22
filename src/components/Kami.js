// Хамелеон Ками — талисман приложения: новенький в школе, с рюкзаком.
// mood: happy | excited | worried | sleepy — меняет глаз, рот и щёки.
// hat: головной убор из магазина (cap | beanie | grad | party | chef | crown). По умолчанию — без него.
// Если hat не передан, Ками надевает то, что выбрал ученик (KamiHatContext).
import { createContext, useContext } from 'react';
import Svg, { G, Path, Ellipse, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { tr } from '../i18n';

export const KamiHatContext = createContext(null);

// Шапки нарисованы в координатах большой иконки (голова: центр 730,452, радиус 120)
// и уменьшаются до головы Ками (92,44, радиус 18).
export function Hat({ value }) {
  const art = HATS[value];
  if (!art) return null;
  return <G transform="translate(92 44) scale(0.15) translate(-730 -470)">{art}</G>;
}

const HATS = {
  cap: (
    <G transform="rotate(-6 735 360)">
      <Path d="M622 395 Q620 290 735 282 Q850 290 848 395 Z" fill="#F28C38" />
      <Path d="M800 390 Q880 382 930 400 Q910 418 820 412 Z" fill="#D9701F" />
      <Circle cx={735} cy={284} r={13} fill="#D9701F" />
      <Path d="M735 286 L735 392" stroke="#D9701F" strokeWidth={7} />
    </G>
  ),
  beanie: (
    <G transform="rotate(-6 730 350)">
      <Path d="M620 380 Q615 270 730 262 Q845 270 840 380 Z" fill="#E9534A" />
      <Rect x={608} y={362} width={244} height={46} rx={22} fill="#C93F37" />
      <Circle cx={730} cy={252} r={34} fill="#FFFFFF" />
      <Path d="M680 300 L680 360 M730 290 L730 360 M780 300 L780 360" stroke="#C93F37" strokeWidth={8} strokeLinecap="round" />
    </G>
  ),
  grad: (
    <G transform="rotate(-8 735 340)">
      <Path d="M660 338 L660 372 Q735 400 810 372 L810 338 Z" fill="#1E2A3A" />
      <Path d="M600 330 L735 278 L870 330 L735 382 Z" fill="#26364A" />
      <Circle cx={735} cy={330} r={10} fill="#F2B233" />
      <Path d="M735 330 L840 352 L842 420" fill="none" stroke="#F2B233" strokeWidth={9} strokeLinecap="round" />
      <Rect x={830} y={412} width={24} height={34} rx={8} fill="#F2B233" />
    </G>
  ),
  party: (
    <G transform="rotate(10 740 330)">
      <Path d="M668 378 L740 200 L812 378 Z" fill="#7C6CF2" />
      <Path d="M700 300 L780 300 M686 340 L796 340" stroke="#F5C443" strokeWidth={14} strokeLinecap="round" />
      <Circle cx={740} cy={198} r={22} fill="#F5C443" />
    </G>
  ),
  chef: (
    <G transform="rotate(-6 735 330)">
      <Circle cx={672} cy={296} r={46} fill="#FFFFFF" stroke="#D5DCD8" strokeWidth={6} />
      <Circle cx={798} cy={296} r={46} fill="#FFFFFF" stroke="#D5DCD8" strokeWidth={6} />
      <Circle cx={735} cy={262} r={58} fill="#FFFFFF" stroke="#D5DCD8" strokeWidth={6} />
      <Rect x={640} y={318} width={190} height={66} rx={14} fill="#FFFFFF" stroke="#D5DCD8" strokeWidth={6} />
      <Path d="M690 330 L690 372 M735 330 L735 372 M780 330 L780 372" stroke="#E3E8E5" strokeWidth={6} strokeLinecap="round" />
    </G>
  ),
  crown: (
    <G transform="rotate(-6 735 330)">
      <Path d="M630 382 L640 270 L690 320 L735 240 L780 320 L830 270 L840 382 Z" fill="#F5C443" />
      <Rect x={626} y={350} width={218} height={34} rx={8} fill="#D9A21F" />
      <Circle cx={690} cy={367} r={9} fill="#E9534A" />
      <Circle cx={735} cy={367} r={11} fill="#3D7BF2" />
      <Circle cx={780} cy={367} r={9} fill="#E9534A" />
      <Circle cx={640} cy={268} r={12} fill="#F5C443" />
      <Circle cx={735} cy={238} r={13} fill="#F5C443" />
      <Circle cx={830} cy={268} r={12} fill="#F5C443" />
    </G>
  ),
};

export default function Kami({ size = 96, color = '#3DB37F', mood = 'happy', hat }) {
  const worn = useContext(KamiHatContext);
  const hatValue = hat === undefined ? worn : hat;
  const height = (size * 90) / 120;
  return (
    <Svg width={size} height={height} viewBox="0 0 120 90" accessibilityLabel={tr('Хамелеон Ками')}>
      <Path d="M34 58 C12 58 8 84 26 84 C38 84 38 70 28 70" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />
      <Ellipse cx={62} cy={52} rx={30} ry={21} fill={color} />
      <Rect x={46} y={26} width={24} height={22} rx={6} fill="#E8833A" />
      <Rect x={52} y={22} width={12} height={6} rx={3} fill="none" stroke="#C2661F" strokeWidth={2.5} />
      <Line x1={50} y1={70} x2={46} y2={82} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <Line x1={74} y1={70} x2={78} y2={82} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={92} cy={44} r={18} fill={color} />
      <Hat value={hatValue} />
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
