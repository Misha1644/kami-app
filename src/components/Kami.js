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
// value: форма из HATS ('cap') или форма в своих цветах: 'h:cap~#ОСНОВНОЙ~#АКЦЕНТ'
// (такие добавляет агент новинок магазина).
export function parseHat(value) {
  if (!value) return null;
  const m = /^h:([a-z]+)~(#[0-9A-Fa-f]{6})~(#[0-9A-Fa-f]{6})$/.exec(value);
  const shape = m ? m[1] : value;
  const def = HATS[shape];
  if (!def) return null;
  return { draw: def.draw, main: m ? m[2] : def.main, accent: m ? m[3] : def.accent };
}

export function Hat({ value }) {
  const hat = parseHat(value);
  if (!hat) return null;
  return <G transform="translate(92 44) scale(0.15) translate(-730 -470)">{hat.draw(hat.main, hat.accent)}</G>;
}

const SHADE = { fill: '#000000', opacity: 0.18 }; // тень поверх основного цвета — для околышей и полей

export const HATS = {
  cap: {
    main: '#F28C38', accent: '#D9701F',
    draw: (m, a) => (
      <G transform="rotate(-6 735 360)">
        <Path d="M622 395 Q620 290 735 282 Q850 290 848 395 Z" fill={m} />
        <Path d="M800 390 Q880 382 930 400 Q910 418 820 412 Z" fill={a} />
        <Circle cx={735} cy={284} r={13} fill={a} />
        <Path d="M735 286 L735 392" stroke={a} strokeWidth={7} />
      </G>
    ),
  },
  beanie: {
    main: '#E9534A', accent: '#FFFFFF',
    draw: (m, a) => (
      <G transform="rotate(-6 730 350)">
        <Path d="M620 380 Q615 270 730 262 Q845 270 840 380 Z" fill={m} />
        <Rect x={608} y={362} width={244} height={46} rx={22} fill={m} />
        <Rect x={608} y={362} width={244} height={46} rx={22} {...SHADE} />
        <Circle cx={730} cy={252} r={34} fill={a} />
        <Path d="M680 300 L680 360 M730 290 L730 360 M780 300 L780 360" stroke="#000000" strokeOpacity={0.15} strokeWidth={8} strokeLinecap="round" />
      </G>
    ),
  },
  grad: {
    main: '#26364A', accent: '#F2B233',
    draw: (m, a) => (
      <G transform="rotate(-8 735 340)">
        <Path d="M660 338 L660 372 Q735 400 810 372 L810 338 Z" fill={m} />
        <Path d="M660 338 L660 372 Q735 400 810 372 L810 338 Z" {...SHADE} />
        <Path d="M600 330 L735 278 L870 330 L735 382 Z" fill={m} />
        <Circle cx={735} cy={330} r={10} fill={a} />
        <Path d="M735 330 L840 352 L842 420" fill="none" stroke={a} strokeWidth={9} strokeLinecap="round" />
        <Rect x={830} y={412} width={24} height={34} rx={8} fill={a} />
      </G>
    ),
  },
  party: {
    main: '#7C6CF2', accent: '#F5C443',
    draw: (m, a) => (
      <G transform="rotate(10 740 330)">
        <Path d="M668 378 L740 200 L812 378 Z" fill={m} />
        <Path d="M700 300 L780 300 M686 340 L796 340" stroke={a} strokeWidth={14} strokeLinecap="round" />
        <Circle cx={740} cy={198} r={22} fill={a} />
      </G>
    ),
  },
  chef: {
    main: '#FFFFFF', accent: '#D5DCD8',
    draw: (m, a) => (
      <G transform="rotate(-6 735 330)">
        <Circle cx={672} cy={296} r={46} fill={m} stroke={a} strokeWidth={6} />
        <Circle cx={798} cy={296} r={46} fill={m} stroke={a} strokeWidth={6} />
        <Circle cx={735} cy={262} r={58} fill={m} stroke={a} strokeWidth={6} />
        <Rect x={640} y={318} width={190} height={66} rx={14} fill={m} stroke={a} strokeWidth={6} />
        <Path d="M690 330 L690 372 M735 330 L735 372 M780 330 L780 372" stroke={a} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
  },
  crown: {
    main: '#F5C443', accent: '#E9534A',
    draw: (m, a) => (
      <G transform="rotate(-6 735 330)">
        <Path d="M630 382 L640 270 L690 320 L735 240 L780 320 L830 270 L840 382 Z" fill={m} />
        <Rect x={626} y={350} width={218} height={34} rx={8} fill={m} />
        <Rect x={626} y={350} width={218} height={34} rx={8} {...SHADE} />
        <Circle cx={690} cy={367} r={9} fill={a} />
        <Circle cx={735} cy={367} r={11} fill="#3D7BF2" />
        <Circle cx={780} cy={367} r={9} fill={a} />
        <Circle cx={640} cy={268} r={12} fill={m} />
        <Circle cx={735} cy={238} r={13} fill={m} />
        <Circle cx={830} cy={268} r={12} fill={m} />
      </G>
    ),
  },
  tophat: {
    main: '#2B2D42', accent: '#E9534A',
    draw: (m, a) => (
      <G transform="rotate(-6 735 330)">
        <Rect x={665} y={222} width={140} height={156} rx={12} fill={m} />
        <Rect x={665} y={330} width={140} height={30} fill={a} />
        <Ellipse cx={735} cy={380} rx={125} ry={22} fill={m} />
        <Ellipse cx={735} cy={380} rx={125} ry={22} {...SHADE} />
      </G>
    ),
  },
  beret: {
    main: '#E9534A', accent: '#B83A33',
    draw: (m, a) => (
      <G transform="rotate(-12 740 340)">
        <Rect x={733} y={268} width={16} height={34} rx={7} fill={a} />
        <Ellipse cx={742} cy={340} rx={128} ry={52} fill={m} />
        <Path d="M626 362 Q742 410 858 362" fill="none" stroke={a} strokeWidth={14} strokeLinecap="round" />
      </G>
    ),
  },
  wizard: {
    main: '#4B5BD7', accent: '#F5C443',
    draw: (m, a) => (
      <G transform="rotate(8 740 330)">
        <Path d="M655 380 Q700 300 752 160 Q790 290 825 380 Z" fill={m} />
        <Ellipse cx={740} cy={380} rx={132} ry={24} fill={m} />
        <Ellipse cx={740} cy={380} rx={132} ry={24} {...SHADE} />
        <Path d="M740 278 L748 298 L770 300 L752 313 L758 335 L740 322 L722 335 L728 313 L710 300 L732 298 Z" fill={a} />
        <Circle cx={782} cy={348} r={9} fill={a} />
        <Circle cx={700} cy={345} r={7} fill={a} />
      </G>
    ),
  },
  bow: {
    main: '#F06292', accent: '#C2185B',
    draw: (m, a) => (
      <G transform="rotate(-10 740 320)">
        <Path d="M740 325 L662 278 Q645 325 668 372 Z" fill={m} />
        <Path d="M740 325 L818 278 Q835 325 812 372 Z" fill={m} />
        <Circle cx={740} cy={325} r={26} fill={a} />
      </G>
    ),
  },
  flower: {
    main: '#F7A8C4', accent: '#F5C443',
    draw: (m, a) => (
      <G>
        <Path d="M612 405 Q730 300 848 405" fill="none" stroke="#2E9E6B" strokeWidth={18} strokeLinecap="round" />
        <Circle cx={790} cy={292} r={30} fill={m} />
        <Circle cx={826} cy={318} r={30} fill={m} />
        <Circle cx={812} cy={360} r={30} fill={m} />
        <Circle cx={768} cy={360} r={30} fill={m} />
        <Circle cx={754} cy={318} r={30} fill={m} />
        <Circle cx={790} cy={330} r={22} fill={a} />
      </G>
    ),
  },
  viking: {
    main: '#9AA8B2', accent: '#F5EBD6',
    draw: (m, a) => (
      <G transform="rotate(-6 735 340)">
        <Path d="M642 345 Q585 300 598 225 Q628 292 670 312 Z" fill={a} />
        <Path d="M828 345 Q885 300 872 225 Q842 292 800 312 Z" fill={a} />
        <Path d="M625 392 Q625 268 735 262 Q845 268 845 392 Z" fill={m} />
        <Rect x={612} y={368} width={246} height={32} rx={14} fill={m} />
        <Rect x={612} y={368} width={246} height={32} rx={14} {...SHADE} />
        <Rect x={727} y={265} width={16} height={105} fill="#000000" opacity={0.12} />
      </G>
    ),
  },
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
