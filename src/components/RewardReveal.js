// Показ новой вещи «как в Subway Surfers»: тёмный фон, крутящиеся лучи,
// вещь выпрыгивает с отскоком, разлетаются звёздочки, сверху падает надпись.
// intro='box' — сначала трясётся коробка-сюрприз и лопается вспышкой (покупка в магазине);
// intro='flash' — сразу вспышка (после рулетки сундука).
// Всё на Animated без нативного драйвера — работает и в Snack (веб), и на телефоне.
import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Kami from './Kami';
import UserAvatar from './UserAvatar';
import { BgSwatch } from './Background';
import { Button } from './ui';
import { tr } from '../i18n';

const RAYS = 14;
const SPARKS = 12;

// Цвет лучей по цене вещи — те же ступени, что у редкости в сундуке.
function tint(price = 0) {
  if (price >= 10000) return { ray: '#FFD84D', glow: '#FFF3B0', label: tr('ЛЕГЕНДАРНОЕ!') };
  if (price >= 5000) return { ray: '#FF6B6B', glow: '#FFD1D1', label: tr('ТАЙНОЕ!') };
  if (price >= 600) return { ray: '#E066F0', glow: '#F6D6FB', label: tr('ЗАСЕКРЕЧЕННОЕ!') };
  if (price >= 300) return { ray: '#A47CFF', glow: '#E4D9FF', label: tr('РЕДКОЕ!') };
  return { ray: '#6FA8FF', glow: '#D6E6FF', label: '' };
}

const HEADLINE = { avatar: 'НОВЫЙ АВАТАР!', color: 'НОВЫЙ ЦВЕТ КАМИ!', bg: 'НОВЫЙ ФОН!' };

function Rays({ color, size }) {
  const c = size / 2;
  const r = size / 2;
  const half = Math.PI / RAYS / 2;
  const d = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const x1 = c + r * Math.cos(a - half), y1 = c + r * Math.sin(a - half);
    const x2 = c + r * Math.cos(a + half), y2 = c + r * Math.sin(a + half);
    return `M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={color} opacity={0.55} />
    </Svg>
  );
}

function Star({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" fill={color} />
    </Svg>
  );
}

// Коробка-сюрприз (рисуем сами, чтобы не путать с сундуком).
function GiftBox({ size = 130 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x={20} y={50} width={80} height={56} rx={8} fill="#2E90FA" />
      <Rect x={14} y={36} width={92} height={20} rx={6} fill="#53B1FD" />
      <Rect x={53} y={36} width={14} height={70} fill="#FDB022" />
      <Path d="M60 36 C46 14 26 20 34 32 C38 37 50 36 60 36 Z" fill="#FDB022" />
      <Path d="M60 36 C74 14 94 20 86 32 C82 37 70 36 60 36 Z" fill="#FDB022" />
      <Circle cx={60} cy={36} r={6} fill="#F79009" />
      <Path d="M40 66 L48 74 M48 66 L40 74" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      <Path d="M72 82 L80 90 M80 82 L72 90" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
    </Svg>
  );
}

function ItemArt({ item, kamiColor }) {
  if (item.kind === 'avatar') return <UserAvatar value={item.value} size={130} kamiColor={kamiColor} />;
  if (item.kind === 'color') return <Kami size={150} color={item.value} />;
  return <BgSwatch value={item.value} style={styles.bg} />;
}

export default function RewardReveal({ item, kamiColor, intro = 'flash', onEquip, onClose }) {
  const [stage, setStage] = useState(intro === 'box' ? 'box' : 'reveal'); // box | reveal
  const [error, setError] = useState('');

  const fade = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const boxScale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const t = tint(item?.price);
  const legendary = (item?.price || 0) >= 10000;

  // Лучи крутятся и свечение «дышит» всё время, пока открыто окно.
  useEffect(() => {
    if (!item) return;
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: legendary ? 5000 : 8000, easing: Easing.linear, useNativeDriver: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [item?.id]);

  // Сценарий: фон → (коробка трясётся и раздувается) → вспышка → вещь.
  useEffect(() => {
    if (!item) return;
    fade.setValue(0); flash.setValue(0); pop.setValue(0); burst.setValue(0); drop.setValue(0);
    shake.setValue(0); boxScale.setValue(intro === 'box' ? 0.3 : 1);
    const steps = [Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: false })];
    if (intro === 'box') {
      setStage('box');
      const wobble = (to) => Animated.timing(shake, { toValue: to, duration: 70, useNativeDriver: false });
      steps.push(
        Animated.spring(boxScale, { toValue: 1, friction: 5, useNativeDriver: false }),
        Animated.sequence([wobble(1), wobble(-1), wobble(1), wobble(-1), wobble(1), wobble(-1), wobble(0)]),
        Animated.parallel([
          Animated.sequence([wobble(1), wobble(-1), wobble(1), wobble(-1), wobble(0)]),
          Animated.timing(boxScale, { toValue: 1.35, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        ]),
      );
    }
    Animated.sequence(steps).start(() => {
      setStage('reveal');
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: false }),
          Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: false }),
        ]),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 70, useNativeDriver: false }),
        Animated.timing(burst, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.sequence([
          Animated.delay(180),
          Animated.spring(drop, { toValue: 1, friction: 5, useNativeDriver: false }),
        ]),
      ]).start();
    });
  }, [item?.id]);

  if (!item) return null;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const wiggle = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const itemRotate = pop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });
  const titleY = drop.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={styles.center}>
          {stage === 'box' ? (
            <Animated.View style={{ transform: [{ rotate: wiggle }, { scale: boxScale }] }}>
              <GiftBox />
            </Animated.View>
          ) : (
            <>
              <Animated.View style={[styles.title, { opacity: drop, transform: [{ translateY: titleY }] }]}>
                {!!t.label && <Text style={[styles.rarity, { color: t.ray }]}>{t.label}</Text>}
                <Text style={styles.headline}>{tr(HEADLINE[item.kind] || 'НОВАЯ ВЕЩЬ!')}</Text>
              </Animated.View>

              <View style={styles.stage}>
                <Animated.View style={[styles.layer, { transform: [{ rotate }] }]}>
                  <Rays color={t.ray} size={420} />
                </Animated.View>
                <Animated.View style={[styles.glow, { backgroundColor: t.glow, transform: [{ scale: glowScale }] }]} />
                {Array.from({ length: SPARKS }, (_, i) => {
                  const a = (i / SPARKS) * Math.PI * 2;
                  const dist = 110 + (i % 3) * 25;
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.spark, {
                        opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                        transform: [
                          { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
                          { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
                          { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.3, 0.6] }) },
                        ],
                      }]}
                    >
                      <Star color={i % 2 ? '#FFFFFF' : t.ray} size={i % 3 === 0 ? 22 : 14} />
                    </Animated.View>
                  );
                })}
                <Animated.View style={{ transform: [{ scale: pop }, { rotate: itemRotate }] }}>
                  <ItemArt item={item} kamiColor={kamiColor} />
                </Animated.View>
              </View>

              <Animated.View style={[styles.bottom, { opacity: drop }]}>
                <Text style={styles.name}>{tr(item.title_ru || item.title)}</Text>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.buttons}>
                  {onEquip && (
                    <Button
                      title={item.kind === 'color' ? tr('Надеть на Ками') : tr('Поставить')}
                      onPress={async () => {
                        try { await onEquip(item.id); onClose(); } catch (e) { setError(e.message); }
                      }}
                    />
                  )}
                  <Button title={tr('Круто!')} variant="secondary" onPress={onClose} />
                </View>
              </Animated.View>
            </>
          )}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,14,30,0.88)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  stage: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', width: 420, height: 420, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, opacity: 0.75 },
  spark: { position: 'absolute' },
  bg: { width: 170, height: 120, borderRadius: 14, borderWidth: 3, borderColor: '#FFFFFF' },
  title: { alignItems: 'center', gap: 2 },
  rarity: { fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  headline: {
    fontSize: 30, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0,
  },
  bottom: { alignSelf: 'stretch', alignItems: 'center', gap: 12 },
  name: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  buttons: { alignSelf: 'stretch', gap: 10, maxWidth: 360, width: '100%' },
  error: { fontSize: 14, color: '#FDA29B' },
  flash: { backgroundColor: '#FFFFFF' },
});
