// Аватар учителя-персонажа (круглый портрет). mood: happy | worried — меняет рот.
import { tr } from '../i18n';
import Svg, { Circle, Ellipse, Path, Rect, Line, G } from 'react-native-svg';
import Kami from './Kami';

const INK = '#1B1F1D';

function Eyes({ y = 48, dx = 12, r = 5, pupil = 2.6, white = true }) {
  return (
    <>
      {white && <Circle cx={50 - dx} cy={y} r={r} fill="#FFFFFF" />}
      {white && <Circle cx={50 + dx} cy={y} r={r} fill="#FFFFFF" />}
      <Circle cx={50 - dx} cy={y} r={pupil} fill={INK} />
      <Circle cx={50 + dx} cy={y} r={pupil} fill={INK} />
    </>
  );
}

function Mouth({ y = 64, mood, w = 8, color = INK }) {
  return mood === 'worried'
    ? <Path d={`M${50 - w} ${y + 3} Q50 ${y - 3} ${50 + w} ${y + 3}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    : <Path d={`M${50 - w} ${y} Q50 ${y + 7} ${50 + w} ${y}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />;
}

const FACES = {
  // Сова в очках с квадратной шапочкой выпускника.
  owl: (c, mood) => (
    <>
      <Path d="M22 34 L30 14 L40 30 Z M78 34 L70 14 L60 30 Z" fill={c} />
      <Circle cx={50} cy={54} r={30} fill={c} />
      <Ellipse cx={50} cy={60} rx={20} ry={18} fill="#E9E3FF" />
      <Circle cx={38} cy={48} r={10} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <Circle cx={62} cy={48} r={10} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <Line x1={48} y1={48} x2={52} y2={48} stroke={INK} strokeWidth={2.5} />
      <Circle cx={38} cy={48} r={3.5} fill={INK} /><Circle cx={62} cy={48} r={3.5} fill={INK} />
      <Path d="M46 58 L54 58 L50 65 Z" fill="#F5A623" />
      {mood === 'worried' && <Path d="M30 36 L44 39 M70 36 L56 39" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
      <Path d="M30 22 L50 13 L70 22 L50 31 Z" fill={INK} />
      <Line x1={66} y1={21} x2={70} y2={33} stroke="#F5C443" strokeWidth={2} />
    </>
  ),
  // Черепаха в панаме.
  turtle: (c, mood) => (
    <>
      <Circle cx={50} cy={56} r={28} fill="#7CC79A" />
      <Eyes y={54} />
      <Mouth y={67} mood={mood} />
      <Ellipse cx={34} cy={63} rx={4} ry={2.5} fill="#F28B82" opacity={0.6} />
      <Ellipse cx={66} cy={63} rx={4} ry={2.5} fill="#F28B82" opacity={0.6} />
      <Ellipse cx={50} cy={34} rx={36} ry={7} fill="#F1E3B6" />
      <Path d="M30 34 Q30 16 50 16 Q70 16 70 34 Z" fill="#F1E3B6" />
      <Rect x={30} y={28} width={40} height={5} fill={c} />
    </>
  ),
  // Кот в капитанской фуражке.
  cat: (c, mood) => (
    <>
      <Path d="M24 40 L28 16 L44 32 Z M76 40 L72 16 L56 32 Z" fill="#F2A65A" />
      <Circle cx={50} cy={55} r={28} fill="#F2A65A" />
      <Eyes y={52} />
      <Path d="M47 60 L53 60 L50 63 Z" fill="#E0607E" />
      <Mouth y={65} mood={mood} w={6} />
      <Path d="M22 60 L36 62 M22 66 L36 65 M78 60 L64 62 M78 66 L64 65" stroke={INK} strokeWidth={1.5} />
      <Rect x={26} y={22} width={48} height={12} rx={4} fill="#FFFFFF" />
      <Rect x={24} y={32} width={52} height={5} rx={2} fill={c} />
      <Circle cx={50} cy={28} r={3.5} fill="#F5C443" />
    </>
  ),
  // Лиса с пером.
  fox: (c, mood) => (
    <>
      <Path d="M22 42 L26 12 L44 30 Z M78 42 L74 12 L56 30 Z" fill={c} />
      <Path d="M20 44 Q50 24 80 44 Q78 76 50 86 Q22 76 20 44 Z" fill={c} />
      <Path d="M28 58 Q40 66 50 84 Q60 66 72 58 Q60 70 50 72 Q40 70 28 58 Z" fill="#FFFFFF" />
      <Eyes y={50} dx={13} />
      <Circle cx={50} cy={72} r={3.5} fill={INK} />
      {mood === 'worried' && <Path d="M33 40 L42 43 M67 40 L58 43" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
      <Path d="M70 30 Q86 10 90 4 Q84 22 74 34 Z" fill="#7A5AF8" />
    </>
  ),
  // Енот в защитных очках на лбу.
  raccoon: (c, mood) => (
    <>
      <Circle cx={28} cy={30} r={10} fill="#98A2B3" /><Circle cx={72} cy={30} r={10} fill="#98A2B3" />
      <Circle cx={50} cy={56} r={30} fill="#98A2B3" />
      <Path d="M24 52 Q36 40 50 50 Q64 40 76 52 Q64 60 50 56 Q36 60 24 52 Z" fill="#344054" />
      <Eyes y={52} r={5.5} />
      <Ellipse cx={50} cy={68} rx={12} ry={8} fill="#F2F4F7" />
      <Circle cx={50} cy={64} r={3} fill={INK} />
      <Mouth y={70} mood={mood} w={6} />
      <Rect x={26} y={30} width={48} height={7} rx={3} fill={c} />
      <Circle cx={39} cy={33} r={6} fill="#B9E6FE" stroke={c} strokeWidth={2.5} />
      <Circle cx={61} cy={33} r={6} fill="#B9E6FE" stroke={c} strokeWidth={2.5} />
    </>
  ),
  // Летучая мышь с полосатым шарфом цветов флага Валенсии.
  bat: (c, mood) => (
    <>
      <Path d="M26 44 L18 10 L42 32 Z M74 44 L82 10 L58 32 Z" fill={c} />
      <Circle cx={50} cy={52} r={27} fill={c} />
      <Eyes y={48} r={6} pupil={3} />
      <Mouth y={60} mood={mood} color="#FFFFFF" w={7} />
      <Path d="M44 62 L46 67 L48 62 Z M52 62 L54 67 L56 62 Z" fill="#FFFFFF" />
      <Rect x={26} y={74} width={48} height={9} rx={4} fill="#F5C443" />
      <Rect x={30} y={74} width={4} height={9} fill="#D92D20" /><Rect x={40} y={74} width={4} height={9} fill="#D92D20" />
      <Rect x={50} y={74} width={4} height={9} fill="#D92D20" /><Rect x={60} y={74} width={4} height={9} fill="#D92D20" />
    </>
  ),
  // Корги с галстуком-бабочкой.
  corgi: (c, mood) => (
    <>
      <Path d="M22 44 L22 10 L44 30 Z M78 44 L78 10 L56 30 Z" fill="#E69B4E" />
      <Circle cx={50} cy={52} r={29} fill="#E69B4E" />
      <Path d="M50 30 Q42 50 36 70 Q50 80 64 70 Q58 50 50 30 Z" fill="#FFFFFF" />
      <Eyes y={48} dx={14} />
      <Ellipse cx={50} cy={62} rx={5} ry={3.5} fill={INK} />
      <Mouth y={67} mood={mood} w={6} />
      <Path d="M38 82 L50 87 L38 92 Z M62 82 L50 87 L62 92 Z" fill={c} />
      <Circle cx={50} cy={87} r={3} fill={c} />
    </>
  ),
  // Гепард с повязкой и свистком.
  cheetah: (c, mood) => (
    <>
      <Circle cx={28} cy={30} r={9} fill="#F5C443" /><Circle cx={72} cy={30} r={9} fill="#F5C443" />
      <Circle cx={50} cy={55} r={29} fill="#F5C443" />
      <Circle cx={30} cy={60} r={2.5} fill="#7A4A12" /><Circle cx={70} cy={58} r={2.5} fill="#7A4A12" />
      <Circle cx={36} cy={72} r={2} fill="#7A4A12" /><Circle cx={66} cy={72} r={2} fill="#7A4A12" />
      <Eyes y={52} />
      <Path d="M47 62 L53 62 L50 65 Z" fill={INK} />
      <Mouth y={68} mood={mood} w={6} />
      <Rect x={22} y={34} width={56} height={7} rx={3} fill={c} />
      <Line x1={70} y1={74} x2={80} y2={86} stroke="#98A2B3" strokeWidth={1.5} />
      <Rect x={76} y={84} width={10} height={6} rx={2} fill="#98A2B3" />
    </>
  ),
  // Птичка с нотой.
  bird: (c, mood) => (
    <>
      <Circle cx={50} cy={54} r={30} fill="#F9A8D4" />
      <Path d="M44 22 Q50 10 56 22" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Eyes y={48} />
      <Path d="M44 58 L56 58 L50 66 Z" fill="#F5A623" />
      {mood === 'worried' && <Path d="M33 39 L42 42 M67 39 L58 42" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
      <Ellipse cx={30} cy={60} rx={4} ry={2.5} fill={c} opacity={0.5} />
      <Ellipse cx={70} cy={60} rx={4} ry={2.5} fill={c} opacity={0.5} />
      <Circle cx={80} cy={30} r={4} fill={c} />
      <Line x1={83.5} y1={30} x2={83.5} y2={14} stroke={c} strokeWidth={2.5} />
      <Path d="M83.5 14 Q90 16 90 22" stroke={c} strokeWidth={2.5} fill="none" />
    </>
  ),
  // Робот с антенной.
  robot: (c, mood) => (
    <>
      <Line x1={50} y1={22} x2={50} y2={12} stroke={c} strokeWidth={3} />
      <Circle cx={50} cy={10} r={4} fill="#F04438" />
      <Rect x={22} y={22} width={56} height={52} rx={12} fill="#D0D5DD" />
      <Rect x={16} y={40} width={6} height={14} rx={2} fill={c} /><Rect x={78} y={40} width={6} height={14} rx={2} fill={c} />
      <Rect x={30} y={34} width={40} height={18} rx={6} fill="#101828" />
      <Circle cx={40} cy={43} r={4} fill="#32D583" /><Circle cx={60} cy={43} r={4} fill="#32D583" />
      {mood === 'worried'
        ? <Path d="M36 64 L42 60 L48 64 L54 60 L60 64 L64 60" stroke={c} strokeWidth={2.5} fill="none" />
        : <Rect x={36} y={60} width={28} height={6} rx={3} fill={c} />}
    </>
  ),
  // Осьминог в берете с кляксами краски.
  octopus: (c, mood) => (
    <>
      <Path d="M28 70 Q24 86 18 88 M40 74 Q38 88 34 92 M60 74 Q62 88 66 92 M72 70 Q76 86 82 88" stroke={c} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Ellipse cx={50} cy={52} rx={28} ry={26} fill={c} />
      <Eyes y={52} />
      <Mouth y={64} mood={mood} w={6} />
      <Circle cx={66} cy={64} r={3} fill="#F5C443" /><Circle cx={36} cy={38} r={2.5} fill="#F04438" />
      <Ellipse cx={46} cy={28} rx={22} ry={8} fill="#B42318" />
      <Line x1={46} y1={20} x2={46} y2={14} stroke="#B42318" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  // Медведица в очках и с шалью.
  bear: (c, mood) => (
    <>
      <Circle cx={28} cy={30} r={11} fill={c} /><Circle cx={72} cy={30} r={11} fill={c} />
      <Circle cx={28} cy={30} r={5} fill="#E9C9A8" /><Circle cx={72} cy={30} r={5} fill="#E9C9A8" />
      <Circle cx={50} cy={54} r={29} fill={c} />
      <Ellipse cx={50} cy={64} rx={14} ry={11} fill="#E9C9A8" />
      <Circle cx={40} cy={50} r={7} fill="none" stroke="#F5C443" strokeWidth={2} />
      <Circle cx={60} cy={50} r={7} fill="none" stroke="#F5C443" strokeWidth={2} />
      <Line x1={47} y1={50} x2={53} y2={50} stroke="#F5C443" strokeWidth={2} />
      <Circle cx={40} cy={50} r={2.6} fill={INK} /><Circle cx={60} cy={50} r={2.6} fill={INK} />
      <Ellipse cx={50} cy={60} rx={4} ry={3} fill={INK} />
      <Mouth y={67} mood={mood} w={6} />
      <Path d="M24 78 Q50 92 76 78 L72 88 Q50 98 28 88 Z" fill="#D92D20" opacity={0.85} />
    </>
  ),
  // Легендарные аватары (магазин).
  // Дракон с рожками и гребнем.
  dragon: (c, mood) => (
    <>
      <Path d="M30 30 L24 10 L40 26 Z M70 30 L76 10 L60 26 Z" fill="#F5C443" />
      <Path d="M44 22 L50 10 L56 22 Z" fill="#F04438" />
      <Circle cx={50} cy={54} r={29} fill={c} />
      <Ellipse cx={50} cy={68} rx={16} ry={11} fill="#A6F4C5" />
      <Circle cx={44} cy={66} r={1.8} fill={INK} /><Circle cx={56} cy={66} r={1.8} fill={INK} />
      <Eyes y={48} dx={13} r={6} pupil={3} />
      {mood === 'worried'
        ? <Path d="M42 76 Q50 72 58 76" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        : <Path d="M42 74 Q50 80 58 74" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
      <Path d="M80 46 Q92 40 88 30" stroke="#F04438" strokeWidth={3} fill="none" strokeLinecap="round" />
    </>
  ),
  // Единорог с радужной гривой.
  unicorn: (c, mood) => (
    <>
      <Path d="M44 26 L50 2 L56 26 Z" fill="#F5C443" />
      <Path d="M47 18 L53 16 M46 23 L54 21" stroke="#D9A92B" strokeWidth={1.5} />
      <Path d="M28 34 L30 18 L40 30 Z M72 34 L70 18 L60 30 Z" fill="#FFFFFF" stroke="#E4E7EC" strokeWidth={1.5} />
      <Circle cx={50} cy={56} r={28} fill="#FFFFFF" stroke="#E4E7EC" strokeWidth={1.5} />
      <Path d="M24 44 Q20 60 26 76" stroke="#F04438" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M29 40 Q24 58 30 74" stroke="#F5C443" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M34 36 Q28 56 34 72" stroke="#7A5AF8" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Eyes y={52} dx={11} />
      <Ellipse cx={38} cy={62} rx={4} ry={2.5} fill="#F9A8D4" /><Ellipse cx={66} cy={62} rx={4} ry={2.5} fill="#F9A8D4" />
      <Mouth y={67} mood={mood} w={6} />
    </>
  ),
  // Космонавт в шлеме.
  astronaut: (c, mood) => (
    <>
      <Circle cx={50} cy={50} r={36} fill="#F2F4F7" stroke="#98A2B3" strokeWidth={3} />
      <Rect x={26} y={34} width={48} height={36} rx={18} fill="#101828" />
      <Circle cx={50} cy={53} r={14} fill="#F2C29B" />
      <Circle cx={45} cy={51} r={2.2} fill={INK} /><Circle cx={55} cy={51} r={2.2} fill={INK} />
      <Mouth y={58} mood={mood} w={4} />
      <Circle cx={34} cy={40} r={3} fill="#FFFFFF" opacity={0.7} />
      <Circle cx={66} cy={64} r={1.5} fill="#FFFFFF" /><Circle cx={62} cy={40} r={1.2} fill="#FFFFFF" />
      <Rect x={44} y={84} width={12} height={8} rx={2} fill={c} />
      <Line x1={76} y1={22} x2={84} y2={12} stroke="#98A2B3" strokeWidth={2.5} />
      <Circle cx={85} cy={11} r={3} fill="#F04438" />
    </>
  ),
};

export default function Teacher({ teacher, size = 64, mood = 'happy', kamiColor }) {
  if (!teacher || teacher.avatar === 'kami') {
    return <Kami size={size} color={kamiColor} mood={mood === 'worried' ? 'worried' : mood === 'excited' ? 'excited' : 'happy'} />;
  }
  const face = FACES[teacher.avatar];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${tr(teacher.name)}, ${tr(teacher.who)}`}>
      <Circle cx={50} cy={50} r={50} fill={`${teacher.color}22`} />
      <G>{face ? face(teacher.color, mood) : null}</G>
    </Svg>
  );
}
