// Аватар игрока: человечек по умолчанию, Ками или любой учитель (покупаются в магазине).
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Kami from './Kami';
import { Flame } from './icons';
import Teacher from './Teacher';
import { AnimalFace, ANIMALS } from './Animals';
import { TEACHERS } from '../data/teachers';
import { colors } from '../theme';

const BY_AVATAR = {
  ...Object.fromEntries(Object.values(TEACHERS).map((t) => [t.avatar, t])),
  // Легендарные аватары из магазина.
  dragon: { name: 'Дракон', who: 'легендарный аватар', avatar: 'dragon', color: '#12B76A' },
  unicorn: { name: 'Единорог', who: 'легендарный аватар', avatar: 'unicorn', color: '#F9A8D4' },
  astronaut: { name: 'Космонавт', who: 'легендарный аватар', avatar: 'astronaut', color: '#1570EF' },
};

export function PersonIcon({ size = 40, color = colors.green, bg = colors.greenLight }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {!!bg && <Circle cx={50} cy={50} r={50} fill={bg} />}
      <Circle cx={50} cy={38} r={17} fill={color} />
      <Path d="M18 88 Q18 60 50 60 Q82 60 82 88 Z" fill={color} />
    </Svg>
  );
}

// value — поле value товара из магазина: 'person' | 'kami' | 'owl' | 'cat' | ...
export default function UserAvatar({ value = 'person', size = 40, kamiColor }) {
  if (value === 'kami' || value === 'kami-king') {
    const king = value === 'kami-king';
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: king ? '#FFF4CC' : colors.greenLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Kami size={size * (king ? 0.8 : 0.92)} color={kamiColor} />
        {king && (
          <Svg width={size * 0.42} height={size * 0.3} viewBox="0 0 40 28" style={{ position: 'absolute', top: size * 0.04, right: size * 0.16 }}>
            <Path d="M2 26 L4 8 L13 17 L20 2 L27 17 L36 8 L38 26 Z" fill="#F5C443" stroke="#B54708" strokeWidth={1.5} />
            <Circle cx={20} cy={18} r={3} fill="#F04438" />
            <Circle cx={10} cy={21} r={2} fill="#1570EF" /><Circle cx={30} cy={21} r={2} fill="#12B76A" />
          </Svg>
        )}
      </View>
    );
  }
  // Ками-чемпион — эксклюзивный аватар за 300 дней серии: Ками в огненном круге.
  if (value === 'kami-streak') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFE8D1', borderWidth: Math.max(2, size * 0.06), borderColor: '#F97316', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Kami size={size * 0.74} color={kamiColor} />
        <View style={{ position: 'absolute', top: size * 0.02, right: size * 0.1 }}>
          <Flame size={size * 0.34} color="#F97316" />
        </View>
      </View>
    );
  }
  if (BY_AVATAR[value]) return <Teacher teacher={BY_AVATAR[value]} size={size} />;
  // Зверята из магазина: value = 'a:<ключ>' или 'a:<ключ>~#окрас~#фон' (тот же зверёк в новых цветах)
  if (value?.startsWith('a:')) {
    const [key, body, bg] = value.slice(2).split('~');
    if (ANIMALS[key]) return <AnimalFace animal={key} size={size} body={body} bg={bg} />;
  }
  return <PersonIcon size={size} />;
}
