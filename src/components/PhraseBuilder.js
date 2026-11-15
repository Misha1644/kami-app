// «Собери фразу» с перетаскиванием.
//   • Нажми на слово — оно встанет в конец фразы; нажми на слово во фразе — вернётся вниз.
//   • Зажми и тащи слово — его можно поставить в любое место фразы (между другими словами),
//     переставить внутри фразы или утащить обратно вниз.
// Слова плавно «переезжают» (LayoutAnimation), при касаниях — лёгкая вибрация.
import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Button } from './ui';
import { colors, radius } from '../theme';
import haptic from '../lib/haptics';
import { tr } from '../i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch (e) { /* новая архитектура — не нужно */ }
}

const animate = () => {
  try { LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); } catch (e) { /* веб */ }
};

const DRAG_START = 6; // сколько пикселей нужно сдвинуть палец, чтобы это стало перетаскиванием

// Одна плитка: и нажатие, и перетаскивание.
function Tile({ text, zone, disabled, hidden, state, onTap, onDragStart, onDragMove, onDrop, onLayout }) {
  const [pressed, setPressed] = useState(false);
  const dragging = useRef(false);
  // Обработчик жеста создаётся один раз (иначе при перерисовке посреди движения палец «отклеится»),
  // а свежие колбэки берёт из ref.
  const cb = useRef({});
  cb.current = { disabled, onTap, onDragStart, onDragMove, onDrop };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !cb.current.disabled,
    onMoveShouldSetPanResponder: () => !cb.current.disabled,
    onPanResponderTerminationRequest: () => !dragging.current, // во время перетаскивания экран не прокручивается
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => { dragging.current = false; setPressed(true); },
    onPanResponderMove: (e, g) => {
      if (!dragging.current && Math.hypot(g.dx, g.dy) > DRAG_START) {
        dragging.current = true;
        cb.current.onDragStart();
      }
      if (dragging.current) cb.current.onDragMove(g.dx, g.dy);
    },
    onPanResponderRelease: (e, g) => {
      setPressed(false);
      if (dragging.current) cb.current.onDrop(g.dx, g.dy);
      else cb.current.onTap();
      dragging.current = false;
    },
    onPanResponderTerminate: (e, g) => {
      setPressed(false);
      if (dragging.current) cb.current.onDrop(g.dx, g.dy);
      dragging.current = false;
    },
  })).current;

  return (
    <View
      {...responder.panHandlers}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={[
        styles.tile,
        state === 'right' && styles.tileRight,
        state === 'wrong' && styles.tileWrong,
        pressed && !hidden && styles.tilePressed,
        hidden && styles.tileGhostSpot,
        Platform.OS === 'web' && { cursor: disabled ? 'default' : 'grab', userSelect: 'none' },
      ]}
    >
      <Text style={[styles.tileText, state && styles.tileTextOn, hidden && { color: 'transparent' }]}>{text}</Text>
    </View>
  );
}

export default function PhraseBuilder({ tokens, bank, answered, onCheck, onDragging, onEdit, check }) {
  const [chosen, setChosen] = useState([]); // индексы плиток из bank — в порядке фразы
  const [ok, setOk] = useState(null);
  const [drag, setDrag] = useState(null); // { i, from, x, y, w, h, t } — для отрисовки
  const dragRef = useRef(null); // то же, но без перерисовки на каждое движение пальца
  const [over, setOver] = useState(false); // палец над строкой фразы
  const overRef = useRef(false);
  const pos = useRef(new Animated.ValueXY()).current;
  const boxes = useRef({ slots: null, bank: null, tiles: {} }); // координаты относительно корня

  const tileKey = (zone, i) => `${zone}:${i}`;
  const rectOf = (zone, i) => {
    const box = boxes.current[zone];
    const t = boxes.current.tiles[tileKey(zone, i)];
    return box && t ? { x: box.x + t.x, y: box.y + t.y, w: t.w, h: t.h } : null;
  };
  const inside = (r, x, y, pad = 0) => r && x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

  function add(i) {
    if (answered) return;
    haptic.tap();
    animate();
    edited();
    setChosen((c) => [...c, i]);
  }

  function remove(i) {
    if (answered) return;
    haptic.tap();
    animate();
    edited();
    setChosen((c) => c.filter((x) => x !== i));
  }

  function startDrag(i, from) {
    const r = rectOf(from, i);
    if (!r) return;
    haptic.lift();
    pos.setValue({ x: r.x, y: r.y });
    const d = { i, from, ...r, t: bank.find((b) => b.i === i).t };
    dragRef.current = d;
    setDrag(d);
    onDragging?.(true);
  }

  function moveDrag(dx, dy) {
    const d = dragRef.current;
    if (!d) return;
    pos.setValue({ x: d.x + dx, y: d.y + dy });
    const isOver = inside(boxes.current.slots, d.x + dx + d.w / 2, d.y + dy + d.h / 2, 24);
    if (isOver !== overRef.current) {
      overRef.current = isOver;
      setOver(isOver);
      if (isOver) haptic.tap();
    }
  }

  // Куда вставить слово: перед первым словом фразы, которое правее/ниже точки отпускания.
  function insertIndex(list, cx, cy) {
    let idx = 0;
    list.forEach((j, n) => {
      const r = rectOf('slots', j);
      if (!r) return;
      const midY = r.y + r.h / 2;
      const sameRow = Math.abs(midY - cy) <= r.h * 0.6;
      if (midY < cy - r.h * 0.6 || (sameRow && r.x + r.w / 2 < cx)) idx = n + 1;
    });
    return idx;
  }

  function endDrag(dx, dy) {
    const d = dragRef.current;
    dragRef.current = null;
    overRef.current = false;
    setDrag(null);
    setOver(false);
    onDragging?.(false);
    if (!d) return;
    const cx = d.x + dx + d.w / 2;
    const cy = d.y + dy + d.h / 2;
    const onPhrase = inside(boxes.current.slots, cx, cy, 24);
    animate();
    edited();
    if (onPhrase) {
      haptic.drop();
      setChosen((c) => {
        const rest = c.filter((x) => x !== d.i);
        const at = insertIndex(rest, cx, cy);
        return [...rest.slice(0, at), d.i, ...rest.slice(at)];
      });
    } else if (d.from === 'slots') {
      haptic.tap();
      setChosen((c) => c.filter((x) => x !== d.i)); // утащили из фразы — вернулось вниз
    }
  }

  const [almost, setAlmost] = useState(false);
  function doCheck() {
    const got = chosen.map((i) => bank.find((b) => b.i === i).t);
    const res = check(got, tokens); // 'right' | 'almost' | 'wrong'
    if (res === 'almost') { setAlmost(true); return; } // вторая попытка: фразу можно поправить
    setOk(res === 'right');
    onCheck(res === 'right');
  }
  function edited() {
    if (almost) { setAlmost(false); onEdit?.(); }
  }

  const tileState = ok === true ? 'right' : ok === false ? 'wrong' : null;

  return (
    <View style={{ gap: 14 }}>
      <View
        onLayout={(e) => { const { x, y, width, height } = e.nativeEvent.layout; boxes.current.slots = { x, y, w: width, h: height }; }}
        style={[styles.slots, over && styles.slotsOver, almost && styles.slotsAlmost, ok === true && styles.slotsRight, ok === false && styles.slotsWrong]}
      >
        {chosen.length === 0 && !drag && <Text style={styles.hint}>{tr('Нажимай на слова или перетаскивай их сюда')}</Text>}
        {chosen.map((i) => (
          <Tile
            key={i}
            text={bank.find((b) => b.i === i).t}
            zone="slots"
            disabled={answered}
            hidden={drag?.i === i}
            state={tileState}
            onLayout={(e) => { const l = e.nativeEvent.layout; boxes.current.tiles[tileKey('slots', i)] = { x: l.x, y: l.y, w: l.width, h: l.height }; }}
            onTap={() => remove(i)}
            onDragStart={() => startDrag(i, 'slots')}
            onDragMove={moveDrag}
            onDrop={endDrag}
          />
        ))}
      </View>

      <View
        onLayout={(e) => { const { x, y, width, height } = e.nativeEvent.layout; boxes.current.bank = { x, y, w: width, h: height }; }}
        style={styles.bank}
      >
        {bank.map(({ i, t }) => {
          const used = chosen.includes(i);
          return used ? (
            <View key={i} style={[styles.tile, styles.tileUsed]}><Text style={[styles.tileText, { color: 'transparent' }]}>{t}</Text></View>
          ) : (
            <Tile
              key={i}
              text={t}
              zone="bank"
              disabled={answered}
              hidden={drag?.i === i}
              onLayout={(e) => { const l = e.nativeEvent.layout; boxes.current.tiles[tileKey('bank', i)] = { x: l.x, y: l.y, w: l.width, h: l.height }; }}
              onTap={() => add(i)}
              onDragStart={() => startDrag(i, 'bank')}
              onDragMove={moveDrag}
              onDrop={endDrag}
            />
          );
        })}
      </View>

      {!answered && <Button title={tr('Проверить')} onPress={doCheck} disabled={chosen.length === 0} />}

      {/* Слово, которое сейчас тащим — летит за пальцем */}
      {drag && (
        <Animated.View
          pointerEvents="none"
          style={[styles.tile, styles.flying, { position: 'absolute', left: 0, top: 0, width: drag.w, transform: [...pos.getTranslateTransform(), { scale: 1.08 }, { rotate: '-2deg' }] }]}
        >
          <Text style={styles.tileText}>{drag.t}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slots: { minHeight: 70, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D0D5DD', backgroundColor: 'rgba(255,255,255,0.6)' },
  slotsAlmost: { borderStyle: 'solid', borderColor: '#F79009', backgroundColor: '#FFFAEB' },
  slotsOver: { borderColor: '#1570EF', backgroundColor: '#EFF8FF' },
  slotsRight: { borderStyle: 'solid', borderColor: colors.green, backgroundColor: colors.greenLight },
  slotsWrong: { borderStyle: 'solid', borderColor: colors.danger, backgroundColor: colors.dangerLight },
  hint: { fontSize: 14, color: colors.muted },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tile: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, borderColor: '#D0D5DD', backgroundColor: colors.card },
  tilePressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }, { scale: 0.97 }], borderColor: '#98A2B3' },
  tileGhostSpot: { backgroundColor: '#E9ECEA', borderColor: '#E9ECEA' },
  tileUsed: { backgroundColor: '#E9ECEA', borderColor: '#E9ECEA', borderBottomWidth: 2 },
  tileRight: { backgroundColor: colors.greenBar, borderColor: colors.greenDark },
  tileWrong: { backgroundColor: '#D92D20', borderColor: '#912018' },
  tileText: { fontSize: 17, color: colors.text },
  tileTextOn: { color: '#FFFFFF', fontWeight: '800' },
  flying: { zIndex: 50, elevation: 12, borderColor: '#1570EF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
});
