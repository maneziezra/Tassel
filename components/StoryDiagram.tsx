// Tassel — the advisory story diagrams: show, don't tell.
//
// Each diagram draws one fact the step states (lib/diagramFacts.ts): spacing
// (seeds drop into rows at the true row-to-plant ratio, then measured brackets
// appear), depth (a soil cutaway with a ruler; the seed or tuber sinks to the
// stated depth), rotation (a season strip) and certified seed (a stamped bag).
// Ranges are labelled as ranges. Reduce-motion shows the finished diagram.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { CropIcon, Icon, Text } from './ui';
import { mid, rangeLabel, type DiagramFact } from '../lib/diagramFacts';
import { useLang } from '../lib/i18n';
import { C, FONT } from '../lib/theme';

const SOIL = '#E9DFC9';
const SOIL_RIDGE = '#CDBB9A';
const SOIL_DEEP = '#9C7A4E';
const SOIL_TOP = '#B89466';

/** One shared 0→1 clock per diagram; items read their own slice of it. */
function useClock(key: string, duration: number) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = 0;
    p.value = withDelay(150, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [key, reduce, duration, p]);
  return p;
}

/** Fades and lifts in when the clock passes `from` (0–1). */
function Reveal({ p, from, to = from + 0.15, style, children }: { p: SharedValue<number>; from: number; to?: number; style?: object; children?: React.ReactNode }) {
  const a = useAnimatedStyle(() => {
    const v = interpolate(p.value, [from, to], [0, 1], 'clamp');
    return { opacity: v, transform: [{ translateY: (1 - v) * 6 }] };
  });
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------- spacing

function Seed({ p, i, n, x, y }: { p: SharedValue<number>; i: number; n: number; x: number; y: number }) {
  // seeds drop one after another during the first 60 % of the clock
  const from = (i / n) * 0.5;
  const a = useAnimatedStyle(() => {
    const v = interpolate(p.value, [from, from + 0.12], [0, 1], 'clamp');
    return { opacity: v, transform: [{ translateY: (1 - v) * -22 }, { scale: 0.6 + v * 0.4 }] };
  });
  return (
    <Animated.View style={[st.seedWrap, { left: x - 7, top: y - 12 }, a]}>
      <View style={st.leafL} />
      <View style={st.leafR} />
      <View style={st.seedDot} />
    </Animated.View>
  );
}

function Spacing({ fact, width, k, compact }: { fact: Extract<DiagramFact, { kind: 'spacing' }>; width: number; k: string; compact?: boolean }) {
  const { t } = useLang();
  const p = useClock(k, 1800);
  const L = 92; // label column: room for "45–50 cm" on one line
  const T = 34; // room for the plant bracket
  const r = compact ? 42 : 58; // px between rows
  const ratio = mid(fact.plant) / mid(fact.row);
  const pp = Math.max(16, r * ratio); // px between plants (true ratio unless very tight)
  const perRow = Math.max(2, Math.min(9, Math.floor((width - L - 18) / pp) + 1));
  const H = T + r * 2 + 22;
  const seeds: { x: number; y: number }[] = [];
  for (let row = 0; row < 3; row++) for (let c = 0; c < perRow; c++) seeds.push({ x: L + 6 + c * pp, y: T + 8 + row * r });
  const rowTxt = t('Rows {n} cm apart', { n: rangeLabel(fact.row) });
  const plantTxt = t('Plants {n} cm apart', { n: rangeLabel(fact.plant) });

  return (
    <View style={[st.box, { width, height: H }]} accessible accessibilityLabel={`${rowTxt}. ${plantTxt}.`}>
      <View style={[st.bed, { left: L - 10, top: T - 6, right: 0, bottom: 0 }]} />
      {[0, 1, 2].map((row) => (
        <View key={row} style={[st.ridge, { left: L - 4, right: 8, top: T + 8 + row * r + 6 }]} />
      ))}
      {seeds.map((s, i) => (
        <Seed key={i} p={p} i={i} n={seeds.length} x={s.x} y={s.y} />
      ))}
      {/* plant bracket over the first two seeds of the top row */}
      <Reveal p={p} from={0.62} style={[st.hBracket, { left: L + 6, width: pp, top: T - 18 }]}>
        <View style={st.hTickL} />
        <View style={st.hLine} />
        <View style={st.hTickR} />
      </Reveal>
      <Reveal p={p} from={0.66} style={{ position: 'absolute', left: L + 6 + pp + 8, top: T - 30 }}>
        <Text raw style={st.dimTxt}>
          {plantTxt}
        </Text>
      </Reveal>
      {/* row bracket between the first two rows */}
      <Reveal p={p} from={0.72} style={[st.vBracket, { left: L - 22, top: T + 8, height: r }]}>
        <View style={st.vTickT} />
        <View style={st.vLine} />
        <View style={st.vTickB} />
      </Reveal>
      <Reveal p={p} from={0.76} style={{ position: 'absolute', left: 0, width: L - 26, top: T + 8 + r / 2 - 18 }}>
        <Text raw style={[st.dimTxt, { textAlign: 'right' }]} numberOfLines={1}>
          {t('{n} cm', { n: rangeLabel(fact.row) })}
        </Text>
        <Text style={[st.dimSub, { textAlign: 'right' }]}>between rows</Text>
      </Reveal>
    </View>
  );
}

// ---------------------------------------------------------------- depth

function Depth({ fact, crop, width, k, compact }: { fact: Extract<DiagramFact, { kind: 'depth' }>; crop: string; width: number; k: string; compact?: boolean }) {
  const { t } = useLang();
  const p = useClock(k, 1600);
  const H = compact ? 140 : 176;
  const G = 40; // ground line
  const maxCm = Math.max(15, Math.ceil((fact.cm[1] + 5) / 5) * 5);
  const pxPerCm = (H - G - 14) / maxCm;
  const yOf = (cm: number) => G + cm * pxPerCm;
  const tuber = /potato/i.test(crop);
  const seedW = tuber ? 34 : 16;
  const seedH = tuber ? 24 : 20;
  const target = yOf(mid(fact.cm));
  const seedX = width * 0.42; // leaves room for the depth label on a narrow phone
  const label = t('{n} cm deep', { n: rangeLabel(fact.cm) });

  const fall = useAnimatedStyle(() => {
    const v = interpolate(p.value, [0, 0.55], [0, 1], 'clamp');
    return { transform: [{ translateY: 6 + (target - seedH / 2 - 6) * v }] };
  });

  return (
    <View style={[st.box, { width, height: H }]} accessible accessibilityLabel={label}>
      <View style={[st.soilTop, { top: G, height: 10 }]} />
      <View style={[st.soilDeep, { top: G + 10 }]} />
      {/* ruler */}
      <View style={[st.ruler, { top: G, height: maxCm * pxPerCm }]}>
        {Array.from({ length: maxCm + 1 }, (_, cm) => (
          <View key={cm} style={[st.tick, { top: cm * pxPerCm, width: cm % 5 === 0 ? 12 : 6 }]} />
        ))}
      </View>
      {Array.from({ length: maxCm / 5 }, (_, i) => (i + 1) * 5).map((cm) => (
        <Text key={cm} raw style={[st.rulerNum, { top: yOf(cm) - 9 }]}>
          {cm}
        </Text>
      ))}
      {/* the stated depth: a band for a range, a line for one value */}
      <Reveal
        p={p}
        from={0.55}
        style={{
          position: 'absolute',
          left: 48,
          right: 12,
          top: yOf(fact.cm[0]) - (fact.cm[0] === fact.cm[1] ? 1 : 0),
          height: Math.max(2, (fact.cm[1] - fact.cm[0]) * pxPerCm),
          backgroundColor: fact.cm[0] === fact.cm[1] ? C.brandGold : 'rgba(226,179,60,0.45)',
        }}
      />
      <Animated.View style={[{ position: 'absolute', left: seedX - seedW / 2, top: 0 }, fall]}>
        <View style={[tuber ? st.tuber : st.seed, { width: seedW, height: seedH }]}>
          {tuber ? <View style={st.tuberEye} /> : null}
        </View>
      </Animated.View>
      <Reveal p={p} from={0.65} style={{ position: 'absolute', left: seedX + seedW / 2 + 10, top: target - 12 }}>
        <View style={st.depthChip}>
          <Text raw style={st.depthChipTxt}>
            {label}
          </Text>
        </View>
      </Reveal>
      <Text style={[st.dimSub, { position: 'absolute', left: 52, top: G - 22 }]}>Soil surface</Text>
    </View>
  );
}

// ---------------------------------------------------------------- rotation

function Sprout({ p, from }: { p: SharedValue<number>; from: number }) {
  const a = useAnimatedStyle(() => {
    const v = interpolate(p.value, [from, from + 0.12], [0, 1], 'clamp');
    return { opacity: v, transform: [{ scale: 0.4 + v * 0.6 }] };
  });
  return (
    <Animated.View style={a}>
      <Icon name="sprout" size={24} color={C.primary} />
    </Animated.View>
  );
}

function Rotation({ fact, width, k }: { fact: Extract<DiagramFact, { kind: 'rotation' }>; width: number; k: string }) {
  const { t } = useLang();
  const p = useClock(k, 1800);
  const gap = 14; // room for the arrow between tiles
  const side = (width - gap * 2) * 0.29;
  const middle = width - gap * 2 - side * 2;
  const sprouts = Math.min(fact.seasons, 4);
  const caption = t('Other crops for {n} seasons', { n: fact.seasons });
  const arrow = (from: number) => (
    <Reveal p={p} from={from} style={{ width: gap, alignItems: 'center' }}>
      <Icon name="chevron-right" size={18} color={C.textSub} />
    </Reveal>
  );
  return (
    <View style={{ width, flexDirection: 'row', alignItems: 'center' }} accessible accessibilityLabel={`${t('Potato or tomato')}. ${caption}. ${t('Potato again')}.`}>
      <Reveal p={p} from={0} style={[st.tile, st.tileNo, { width: side }]}>
        <CropIcon crop="potato" size={34} disc={false} />
        <View style={st.badgeNo}>
          <Icon name="close" size={12} color="#fff" />
        </View>
        <Text style={st.tileTxt}>Potato or tomato</Text>
      </Reveal>
      {arrow(0.18)}
      <Reveal p={p} from={0.22} style={[st.tile, { width: middle }]}>
        <View style={{ flexDirection: 'row', gap: 2, height: 34, alignItems: 'center' }}>
          {Array.from({ length: sprouts }, (_, i) => (
            <Sprout key={i} p={p} from={0.3 + i * 0.12} />
          ))}
        </View>
        <Text raw style={st.tileTxt}>
          {caption}
        </Text>
      </Reveal>
      {arrow(0.7)}
      <Reveal p={p} from={0.75} style={[st.tile, st.tileYes, { width: side }]}>
        <CropIcon crop="potato" size={34} disc={false} />
        <View style={st.badgeYes}>
          <Icon name="check" size={12} color="#fff" />
        </View>
        <Text style={st.tileTxt}>Potato again</Text>
      </Reveal>
    </View>
  );
}

// ---------------------------------------------------------------- certified seed

function Certified({ width, k }: { width: number; k: string }) {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const stamp = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    stamp.value = 0;
    stamp.value = withDelay(500, withSpring(1, { damping: 9, stiffness: 140 }));
  }, [k, reduce, stamp]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, stamp.value * 1.5), transform: [{ scale: 1.6 - stamp.value * 0.6 }, { rotate: '-10deg' }] }));
  return (
    <View style={{ width, alignItems: 'center' }} accessible accessibilityLabel={t('Certified seed')}>
      <View style={st.bag}>
        <View style={st.bagFold} />
        <Icon name="seed-outline" size={34} color={C.primary} />
        <View style={st.bagLine} />
        <View style={[st.bagLine, { width: 40 }]} />
        <Animated.View style={[st.stamp, a]}>
          <Icon name="check-decagram" size={18} color={C.primaryDark} />
          <Text style={st.stampTxt}>Certified</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- entry

/** The diagrams for one advisory step; `k` replays the animation when the card changes. */
export function StoryDiagram({ facts, crop, width = 300, k }: { facts: DiagramFact[]; crop: string; width?: number; k: string }) {
  return (
    <View style={{ gap: 18, alignItems: 'center' }}>
      {facts.map((f, i) =>
        f.kind === 'spacing' ? (
          <Spacing key={i} fact={f} width={width} k={k} compact={facts.length > 1} />
        ) : f.kind === 'depth' ? (
          <Depth key={i} fact={f} crop={crop} width={width} k={k} compact={facts.length > 1} />
        ) : f.kind === 'rotation' ? (
          <Rotation key={i} fact={f} width={width} k={k} />
        ) : (
          <Certified key={i} width={width} k={k} />
        )
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: { position: 'relative', overflow: 'hidden' },
  bed: { position: 'absolute', backgroundColor: SOIL, borderRadius: 10 },
  ridge: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: SOIL_RIDGE },
  seedWrap: { position: 'absolute', width: 14, height: 16, alignItems: 'center' },
  seedDot: { position: 'absolute', bottom: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: C.primaryDark },
  leafL: { position: 'absolute', top: 0, left: 1, width: 7, height: 5, borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: C.primary, transform: [{ rotate: '-20deg' }] },
  leafR: { position: 'absolute', top: 0, right: 1, width: 7, height: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: '#5E9C72', transform: [{ rotate: '20deg' }] },
  hBracket: { position: 'absolute', height: 10, flexDirection: 'row', alignItems: 'center' },
  hLine: { flex: 1, height: 2, backgroundColor: C.text },
  hTickL: { width: 2, height: 10, backgroundColor: C.text },
  hTickR: { width: 2, height: 10, backgroundColor: C.text },
  vBracket: { position: 'absolute', width: 10, alignItems: 'center' },
  vLine: { flex: 1, width: 2, backgroundColor: C.text },
  vTickT: { width: 10, height: 2, backgroundColor: C.text },
  vTickB: { width: 10, height: 2, backgroundColor: C.text },
  dimTxt: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  dimSub: { fontSize: 13, color: C.textSub },
  soilTop: { position: 'absolute', left: 0, right: 0, backgroundColor: SOIL_TOP },
  soilDeep: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: SOIL_DEEP },
  ruler: { position: 'absolute', left: 30, width: 18, backgroundColor: C.brandCream },
  tick: { position: 'absolute', left: 0, height: 1.5, backgroundColor: C.text },
  rulerNum: { position: 'absolute', left: 0, width: 26, textAlign: 'right', fontSize: 13, fontFamily: FONT.bodyBold, color: C.brandCream },
  seed: { backgroundColor: C.brandGold, borderRadius: 9, borderWidth: 2, borderColor: C.brandGround },
  tuber: { backgroundColor: '#D7B97A', borderRadius: 12, borderWidth: 1.5, borderColor: '#8C6A3E' },
  tuberEye: { position: 'absolute', top: 5, left: 8, width: 4, height: 3, borderRadius: 2, backgroundColor: '#8C6A3E' },
  depthChip: { backgroundColor: C.brandCream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  depthChipTxt: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  tile: { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 10, backgroundColor: C.primaryTint, minHeight: 104, justifyContent: 'center' },
  tileNo: { backgroundColor: C.errorTint },
  tileYes: { backgroundColor: C.accentTint },
  badgeNo: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center' },
  badgeYes: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  tileTxt: { fontSize: 13, lineHeight: 16, textAlign: 'center', color: C.textMid, fontFamily: FONT.bodyBold },
  bag: { width: 132, height: 150, borderRadius: 10, backgroundColor: C.accentTint, borderWidth: 2, borderColor: SOIL_RIDGE, alignItems: 'center', paddingTop: 30, gap: 8 },
  bagFold: { position: 'absolute', top: 12, left: 10, right: 10, height: 3, borderRadius: 2, backgroundColor: SOIL_RIDGE },
  bagLine: { width: 72, height: 4, borderRadius: 2, backgroundColor: SOIL_RIDGE },
  stamp: { position: 'absolute', bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 2, borderColor: C.primaryDark, backgroundColor: 'rgba(244,241,230,0.92)' },
  stampTxt: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.primaryDark },
});
