// Простые аватары-зверята для магазина (дешёвые вещи). Каждый собирается из деталей:
// уши, мордочка, нос, клюв, полоски, пятна, грива и т. п.
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';

const INK = '#1B1F1D';

// key: { body, inner, bg, ears, ...особенности }
export const ANIMALS = {
  'cat-grey':   { body: '#98A2B3', inner: '#F2F4F7', bg: '#EEF0F4', ears: 'pointy', nose: '#E0607E', whiskers: true },
  'cat-black':  { body: '#344054', inner: '#667085', bg: '#E9EBF0', ears: 'pointy', nose: '#F38BA8', whiskers: true, eyeColor: '#F5C443' },
  'cat-white':  { body: '#FFFFFF', inner: '#F9D7E2', bg: '#F3EEF5', ears: 'pointy', nose: '#F38BA8', whiskers: true, outline: true },
  'tiger':      { body: '#F79009', inner: '#FFFFFF', bg: '#FEF0E0', ears: 'round', nose: INK, stripes: true },
  'dog':        { body: '#C8945F', inner: '#F3E2CF', bg: '#F6EEE6', ears: 'floppy', nose: INK, earColor: '#8A5A2E' },
  'dalmatian':  { body: '#FFFFFF', inner: '#FFFFFF', bg: '#EEF0F4', ears: 'floppy', nose: INK, earColor: INK, spots: INK, outline: true },
  'bunny':      { body: '#F2F4F7', inner: '#F9D7E2', bg: '#FDEFF4', ears: 'long', nose: '#F38BA8', teeth: true, outline: true },
  'bunny-brown':{ body: '#B9875A', inner: '#F3E2CF', bg: '#F6EEE6', ears: 'long', nose: '#E0607E', teeth: true },
  'mouse':      { body: '#B0B7C3', inner: '#F9D7E2', bg: '#F1F2F5', ears: 'bigRound', nose: '#F38BA8', whiskers: true },
  'hamster':    { body: '#F2B66D', inner: '#FFF4E5', bg: '#FFF5E6', ears: 'round', nose: '#E0607E', cheeks: true },
  'panda':      { body: '#FFFFFF', inner: '#FFFFFF', bg: '#EDF7F1', ears: 'round', earColor: INK, nose: INK, patches: true, outline: true },
  'koala':      { body: '#A3ACB9', inner: '#E4E7EC', bg: '#EEF2F6', ears: 'bigRound', nose: '#344054', bigNose: true },
  'lion':       { body: '#F5C443', inner: '#FFF4CC', bg: '#FFF8E1', ears: 'round', nose: '#7A4A12', mane: '#D97706' },
  'monkey':     { body: '#8A5A2E', inner: '#F3D3B0', bg: '#F6EEE6', ears: 'side', nose: '#5C3A1A', face: true },
  'bear-brown': { body: '#9C6B43', inner: '#E9C9A8', bg: '#F6EEE6', ears: 'round', nose: INK },
  'polar-bear': { body: '#FFFFFF', inner: '#F2F4F7', bg: '#E8F4FB', ears: 'round', nose: INK, outline: true },
  'pig':        { body: '#F9B4C8', inner: '#F38BA8', bg: '#FDEFF4', ears: 'pointy', snout: true },
  'cow':        { body: '#FFFFFF', inner: '#F9C9D6', bg: '#EDF7F1', ears: 'side', earColor: '#344054', spots: '#344054', snout: true, horns: true, outline: true },
  'sheep':      { body: '#FFFFFF', inner: '#344054', bg: '#DCEBFA', ears: 'side', earColor: '#344054', wool: true, darkFace: true },
  'frog':       { body: '#4CC38A', inner: '#A6F4C5', bg: '#ECF8F1', ears: 'none', topEyes: true, cheeks: true },
  'penguin':    { body: '#1D2939', inner: '#FFFFFF', bg: '#E8F4FB', ears: 'none', beak: '#F79009', whiteFace: true },
  'chick':      { body: '#FDD835', inner: '#FDD835', bg: '#FFFBE6', ears: 'none', beak: '#F79009', tuft: true },
  'duck':       { body: '#FFFFFF', inner: '#FFFFFF', bg: '#E8F4FB', ears: 'none', beak: '#F79009', wideBeak: true, outline: true },
  'hedgehog':   { body: '#E9C9A8', inner: '#F6E3CF', bg: '#F6EEE6', ears: 'none', nose: INK, spikes: '#7A5230' },
  'fox-arctic': { body: '#F2F4F7', inner: '#FFFFFF', bg: '#EEF6FF', ears: 'pointy', nose: INK, foxFace: true, outline: true },
};

function Ears({ a }) {
  const c = a.earColor || a.body;
  const stroke = a.outline ? { stroke: '#D0D5DD', strokeWidth: 1.5 } : {};
  switch (a.ears) {
    case 'pointy':
      return <Path d="M24 44 L28 14 L46 32 Z M76 44 L72 14 L54 32 Z" fill={c} {...stroke} />;
    case 'round':
      return (<><Circle cx={27} cy={30} r={11} fill={c} {...stroke} /><Circle cx={73} cy={30} r={11} fill={c} {...stroke} />
        <Circle cx={27} cy={30} r={5} fill={a.inner} /><Circle cx={73} cy={30} r={5} fill={a.inner} /></>);
    case 'bigRound':
      return (<><Circle cx={24} cy={32} r={16} fill={c} {...stroke} /><Circle cx={76} cy={32} r={16} fill={c} {...stroke} />
        <Circle cx={24} cy={32} r={9} fill={a.inner} /><Circle cx={76} cy={32} r={9} fill={a.inner} /></>);
    case 'long':
      return (<><Ellipse cx={38} cy={18} rx={8} ry={20} fill={c} {...stroke} /><Ellipse cx={62} cy={18} rx={8} ry={20} fill={c} {...stroke} />
        <Ellipse cx={38} cy={20} rx={4} ry={14} fill={a.inner} /><Ellipse cx={62} cy={20} rx={4} ry={14} fill={a.inner} /></>);
    case 'floppy':
      return <Path d="M24 34 Q12 40 16 66 Q26 62 32 46 Z M76 34 Q88 40 84 66 Q74 62 68 46 Z" fill={c} />;
    case 'side':
      return (<><Ellipse cx={20} cy={52} rx={9} ry={7} fill={c} {...stroke} /><Ellipse cx={80} cy={52} rx={9} ry={7} fill={c} {...stroke} />
        <Ellipse cx={20} cy={52} rx={5} ry={3.5} fill={a.inner} /><Ellipse cx={80} cy={52} rx={5} ry={3.5} fill={a.inner} /></>);
    default:
      return null;
  }
}

export function AnimalFace({ animal, size = 64, mood = 'happy' }) {
  const a = ANIMALS[animal];
  if (!a) return null;
  const stroke = a.outline ? { stroke: '#D0D5DD', strokeWidth: 1.5 } : {};
  const eyeY = a.topEyes ? 34 : 50;
  const mouthY = a.snout ? 72 : 66;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={a.bg} />
      {a.mane && <Circle cx={50} cy={54} r={38} fill={a.mane} />}
      {a.wool && (
        <G fill={a.body} stroke="#C9D3DF" strokeWidth={1.5}>
          {[[28, 34], [40, 26], [54, 25], [68, 30], [76, 44], [74, 60], [26, 50], [24, 64]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={11} />)}
        </G>
      )}
      {a.spikes && <Path d="M18 60 L10 48 L22 46 L16 32 L30 34 L30 20 L42 28 L50 14 L58 28 L70 20 L70 34 L84 32 L78 46 L90 48 L82 60 Z" fill={a.spikes} />}
      <Ears a={a} />
      {a.horns && <Path d="M34 28 Q30 18 36 14 M66 28 Q70 18 64 14" stroke="#F5C443" strokeWidth={5} strokeLinecap="round" fill="none" />}
      {a.tuft && <Path d="M46 26 Q44 14 50 18 Q52 10 56 20" stroke={a.body} strokeWidth={4} fill="none" strokeLinecap="round" />}
      <Circle cx={50} cy={56} r={a.wool ? 22 : 28} fill={a.darkFace ? a.inner : a.body} {...stroke} />
      {a.whiteFace && <Ellipse cx={50} cy={62} rx={20} ry={20} fill={a.inner} />}
      {a.face && <Path d="M30 56 Q34 40 50 46 Q66 40 70 56 Q70 78 50 80 Q30 78 30 56 Z" fill={a.inner} />}
      {a.foxFace && <Path d="M24 50 Q40 62 50 84 Q60 62 76 50 Q62 66 50 68 Q38 66 24 50 Z" fill={a.inner} />}
      {a.stripes && <Path d="M50 30 L50 40 M38 32 L41 41 M62 32 L59 41 M24 54 L33 55 M76 54 L67 55 M25 62 L33 61 M75 62 L67 61" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
      {a.spots && (<><Circle cx={34} cy={42} r={5} fill={a.spots} /><Circle cx={66} cy={68} r={4} fill={a.spots} /><Circle cx={68} cy={42} r={3} fill={a.spots} /></>)}
      {a.patches && (<><Ellipse cx={39} cy={51} rx={7} ry={9} fill={INK} transform="rotate(-20 39 51)" /><Ellipse cx={61} cy={51} rx={7} ry={9} fill={INK} transform="rotate(20 61 51)" /></>)}
      {!a.whiteFace && !a.foxFace && !a.face && !a.snout && !a.beak && (a.ears !== 'none' || a.cheeks) && !a.darkFace &&
        <Ellipse cx={50} cy={66} rx={13} ry={9} fill={a.inner} />}

      {/* Глаза */}
      {a.topEyes ? (
        <>
          <Circle cx={36} cy={eyeY} r={10} fill={a.body} /><Circle cx={64} cy={eyeY} r={10} fill={a.body} />
          <Circle cx={36} cy={eyeY} r={6} fill="#FFFFFF" /><Circle cx={64} cy={eyeY} r={6} fill="#FFFFFF" />
          <Circle cx={36} cy={eyeY} r={3} fill={INK} /><Circle cx={64} cy={eyeY} r={3} fill={INK} />
        </>
      ) : (
        <>
          <Circle cx={39} cy={eyeY} r={a.patches ? 3.5 : 4} fill={a.patches ? '#FFFFFF' : (a.eyeColor || (a.darkFace ? '#FFFFFF' : INK))} />
          <Circle cx={61} cy={eyeY} r={a.patches ? 3.5 : 4} fill={a.patches ? '#FFFFFF' : (a.eyeColor || (a.darkFace ? '#FFFFFF' : INK))} />
          {(a.patches || a.eyeColor) && (<><Circle cx={39} cy={eyeY} r={1.8} fill={INK} /><Circle cx={61} cy={eyeY} r={1.8} fill={INK} /></>)}
          <Circle cx={40.5} cy={eyeY - 1.5} r={1.2} fill="#FFFFFF" /><Circle cx={62.5} cy={eyeY - 1.5} r={1.2} fill="#FFFFFF" />
        </>
      )}

      {/* Нос, клюв, пятачок */}
      {a.snout && (<><Ellipse cx={50} cy={64} rx={10} ry={7} fill={a.inner} /><Circle cx={46} cy={64} r={2} fill="#9E3355" /><Circle cx={54} cy={64} r={2} fill="#9E3355" /></>)}
      {a.beak && !a.wideBeak && <Path d="M44 60 L56 60 L50 68 Z" fill={a.beak} />}
      {a.wideBeak && <Ellipse cx={50} cy={64} rx={12} ry={5} fill={a.beak} />}
      {a.nose && !a.bigNose && <Ellipse cx={50} cy={a.patches ? 62 : 61} rx={4} ry={3} fill={a.nose} />}
      {a.bigNose && <Ellipse cx={50} cy={60} rx={7} ry={9} fill={a.nose} />}

      {/* Рот */}
      {!a.beak && (mood === 'worried'
        ? <Path d={`M44 ${mouthY + 3} Q50 ${mouthY - 2} 56 ${mouthY + 3}`} stroke={a.darkFace ? '#FFFFFF' : INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        : <Path d={`M44 ${mouthY} Q47 ${mouthY + 4} 50 ${mouthY} Q53 ${mouthY + 4} 56 ${mouthY}`} stroke={a.darkFace ? '#FFFFFF' : INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />)}
      {a.teeth && <Rect x={47} y={mouthY + 1} width={6} height={5} rx={1} fill="#FFFFFF" stroke="#D0D5DD" strokeWidth={1} />}
      {a.cheeks && (<><Ellipse cx={30} cy={64} rx={6} ry={4} fill="#F38BA8" opacity={0.55} /><Ellipse cx={70} cy={64} rx={6} ry={4} fill="#F38BA8" opacity={0.55} /></>)}
      {a.whiskers && <Path d="M20 60 L34 62 M20 67 L34 66 M80 60 L66 62 M80 67 L66 66" stroke={INK} strokeWidth={1.3} />}
    </Svg>
  );
}
