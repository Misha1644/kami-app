// Аватар игрока: человечек по умолчанию, Ками или любой учитель (покупаются в магазине).
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Kami from './Kami';
import Teacher from './Teacher';
import { TEACHERS } from '../data/teachers';
import { colors } from '../theme';

const BY_AVATAR = Object.fromEntries(Object.values(TEACHERS).map((t) => [t.avatar, t]));

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
  if (value === 'kami') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Kami size={size * 0.92} color={kamiColor} />
      </View>
    );
  }
  if (BY_AVATAR[value]) return <Teacher teacher={BY_AVATAR[value]} size={size} />;
  return <PersonIcon size={size} />;
}
