// Tassel — animated farming scenes for steps without a measured diagram.
//
// One looping scene per kind of work (lib/storyScene.ts picks it from the step's
// words): the hoe passes and the weeds fall, granules land in a ring beside the
// stem, mist follows the nozzle, the sick plant goes into the bag... Flat, two-tone,
// in the crop-art palette; motion is steady and purposeful (no bounce, no confetti).
// Everything moves on the UI thread (transform + opacity only). Reduce-motion shows
// one finished frame. Steps that say "Do not…" get a clay stop mark.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { isDont, sceneCrop, sceneFor, type SceneCrop, type SceneKind } from '../lib/storyScene';

const P = {
  sky: '#EEF1E6',
  soil: '#C9AA7C',
  soilDark: '#9C7A4E',
  soilDeep: '#7D5F3B',
  leaf: '#6E9B5A',
  leafDark: '#557F45',
  sick: '#B59A4A',
  gold: '#E2B33C',
  clay: '#A8472A',
  ink: '#1E2E26',
  wood: '#8A6A44',
  steel: '#7E8B86',
  water: '#6FA8D6',
  cream: '#F4F1E6',
  grain: '#E8C25A',
  wetGrain: '#B79A45',
  sack: '#D8CBA8',
};

const VB_W = 300;
const VB_H = 160;
const GROUND = 118; // soil line in scene units

type Track = { at: number[]; x?: number[]; y?: number[]; o?: number[]; r?: number[]; s?: number[]; sx?: number[]; sy?: number[] };

/** A looping 0→1 clock. Under reduce-motion it rests on `still`, a frame where the work is shown done. */
function useLoop(duration: number, still: number, key: string) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? still : 0);
  useEffect(() => {
    if (reduce) {
      p.value = still;
      return;
    }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [duration, reduce, still, key, p]);
  return p;
}

/** A piece of the scene: its own small SVG, placed at x,y and moved by a keyframe track. */
function Piece({ p, k, x, y, w, h, t, origin = 'center', children }: { p: SharedValue<number>; k: number; x: number; y: number; w: number; h: number; t?: Track; origin?: 'center' | 'bottom' | 'left'; children: React.ReactNode }) {
  const a = useAnimatedStyle(() => {
    if (!t) return {};
    const f = (v: number[] | undefined, d: number) => (v ? interpolate(p.value, t.at, v, 'clamp') : d);
    return {
      opacity: f(t.o, 1),
      transform: [
        { translateX: f(t.x, 0) * k },
        { translateY: f(t.y, 0) * k },
        { rotate: `${f(t.r, 0)}deg` },
        { scale: f(t.s, 1) },
        { scaleX: f(t.sx, 1) },
        { scaleY: f(t.sy, 1) },
      ],
    };
  });
  const transformOrigin = origin === 'bottom' ? 'center bottom' : origin === 'left' ? 'left center' : 'center';
  return (
    <Animated.View style={[{ position: 'absolute', left: x * k, top: y * k, width: w * k, height: h * k, transformOrigin }, a]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

// ------------------------------------------------------------------ the crops (viewBox 40 x 64, base at 20,64)

function PlantArt({ crop, sick }: { crop: SceneCrop; sick?: boolean }) {
  const l = sick ? P.sick : P.leaf;
  const d = sick ? '#8C7636' : P.leafDark;
  switch (crop) {
    case 'maize':
      return (
        <G>
          <Path d="M20 64 V8" stroke={d} strokeWidth={3} strokeLinecap="round" />
          <Path d="M20 50 C8 44 4 36 2 30 C10 34 16 40 20 44 Z" fill={l} />
          <Path d="M20 40 C32 34 36 26 38 18 C30 24 24 30 20 34 Z" fill={l} />
          <Path d="M20 28 C11 22 9 15 9 9 C15 14 18 19 20 23 Z" fill={d} />
          <Path d="M20 8 l-4 -6 M20 8 l4 -6 M20 8 v-7" stroke={P.gold} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'wheat':
      return (
        <G>
          <Path d="M14 64 C14 40 16 24 16 12 M20 64 V8 M26 64 C26 40 24 24 24 14" stroke={l} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          {[16, 20, 24].map((x, i) => (
            <Ellipse key={i} cx={x} cy={i === 1 ? 8 : 12} rx={2.6} ry={6} fill={P.gold} />
          ))}
        </G>
      );
    case 'beans':
      return (
        <G>
          <Path d="M20 64 V30 M20 44 L10 36 M20 38 L30 30" stroke={d} strokeWidth={2.4} strokeLinecap="round" />
          {[[10, 32], [30, 26], [20, 24], [14, 46], [27, 42]].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx={7} ry={5} fill={i % 2 ? d : l} />
          ))}
          {!sick ? <Path d="M24 50 c4 2 6 6 5 10" stroke={P.leafDark} strokeWidth={3} strokeLinecap="round" fill="none" /> : null}
        </G>
      );
    case 'tomato':
      return (
        <G>
          <Path d="M20 64 V14 M20 40 L9 30 M20 30 L31 22 M20 50 L32 44" stroke={d} strokeWidth={2.4} strokeLinecap="round" />
          {[[9, 28], [31, 20], [20, 12], [32, 42], [8, 46]].map(([x, y], i) => (
            <Path key={i} d={`M${x} ${y} c-5 -1 -6 -5 -3 -7 c2 2 5 3 3 7 c3 -2 6 -1 6 2 c-2 1 -4 0 -6 -2`} fill={l} />
          ))}
          {!sick ? (
            <G>
              <Circle cx={14} cy={38} r={4.2} fill={P.clay} />
              <Circle cx={26} cy={34} r={3.6} fill={P.clay} />
            </G>
          ) : null}
        </G>
      );
    case 'coffee':
      return (
        <G>
          <Path d="M20 64 V6" stroke={P.wood} strokeWidth={2.6} strokeLinecap="round" />
          {[14, 26, 38, 50].map((y, i) => (
            <G key={i}>
              <Ellipse cx={11} cy={y} rx={8} ry={3.6} fill={i % 2 ? d : l} />
              <Ellipse cx={29} cy={y - 4} rx={8} ry={3.6} fill={i % 2 ? l : d} />
              {!sick && i > 1 ? <Circle cx={20} cy={y + 2} r={2.2} fill={P.clay} /> : null}
            </G>
          ))}
        </G>
      );
    default: // potato and leafy crops: a bushy plant
      return (
        <G>
          <Path d="M20 64 V30" stroke={d} strokeWidth={2.4} strokeLinecap="round" />
          {[[12, 36], [28, 32], [20, 24], [8, 48], [32, 46], [20, 40]].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx={8} ry={6} fill={i % 2 ? d : l} />
          ))}
        </G>
      );
  }
}

/** A crop plant standing on the soil line, gently swaying. */
function Plant({ p, k, cx, crop, sick, h = 92, sway = true, phase = 0, t }: { p: SharedValue<number>; k: number; cx: number; crop: SceneCrop; sick?: boolean; h?: number; sway?: boolean; phase?: number; t?: Track }) {
  const w = (h * 40) / 64;
  const a = phase % 2 ? -1.6 : 1.6;
  const swayTrack: Track | undefined = sway ? { at: [0, 0.25, 0.5, 0.75, 1], r: [0, a, 0, -a, 0] } : undefined;
  return (
    <Piece p={p} k={k} x={cx - w / 2} y={GROUND - h} w={40} h={64} t={t ?? swayTrack} origin="bottom">
      <PlantArt crop={crop} sick={sick} />
    </Piece>
  );
}

function Weed() {
  return <Path d="M10 22 L6 8 L10 14 L12 2 L14 14 L18 6 L15 22 Z" fill="#8FA65C" />;
}

function Granule({ c = P.cream }: { c?: string }) {
  return <Circle cx={3} cy={3} r={2.6} fill={c} stroke="#B9B2A0" strokeWidth={0.6} />;
}

function Drop() {
  return <Path d="M5 0 C7 4 10 7 10 10 A5 5 0 0 1 0 10 C0 7 3 4 5 0 Z" fill={P.water} />;
}

function Ground({ furrows = 0 }: { furrows?: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
      <Rect width={VB_W} height={VB_H} fill={P.sky} />
      <Path d={`M0 ${GROUND - 26} C60 ${GROUND - 48} 120 ${GROUND - 40} 170 ${GROUND - 30} C220 ${GROUND - 20} 260 ${GROUND - 44} 300 ${GROUND - 34} V${GROUND} H0 Z`} fill="#DCE5CC" />
      {Array.from({ length: 16 }).map((_, i) => (
        <Path key={i} d={`M${10 + i * 19} ${GROUND} v-12 M${10 + i * 19} ${GROUND - 6} l-5 -4 M${10 + i * 19} ${GROUND - 9} l5 -4`} stroke="#B9C9A4" strokeWidth={2} strokeLinecap="round" />
      ))}
      <Rect y={GROUND} width={VB_W} height={VB_H - GROUND} fill={P.soil} />
      <Rect y={GROUND + 22} width={VB_W} height={VB_H - GROUND - 22} fill={P.soilDark} />
      {Array.from({ length: furrows }).map((_, i) => (
        <Rect key={i} x={0} y={GROUND + 6 + i * 9} width={VB_W} height={2} fill={P.soilDark} opacity={0.5} />
      ))}
    </Svg>
  );
}

// ------------------------------------------------------------------ the scenes

type SceneProps = { p: SharedValue<number>; k: number; crop: SceneCrop };

function WeedScene({ p, k, crop }: SceneProps) {
  const hoeAt = (x: number) => 0.25 + ((x + 40) / 380) * 0.5;
  return (
    <>
      {[60, 150, 240].map((x, i) => <Plant key={x} p={p} k={k} cx={x} crop={crop} phase={i} />)}
      {[105, 195, 22, 280].map((x) => {
        const hit = hoeAt(x);
        return (
          <Piece key={x} p={p} k={k} x={x - 10} y={GROUND - 22} w={20} h={24} origin="bottom"
            t={{ at: [0, 0.12, hit, hit + 0.06, 0.95, 1], s: [0, 1, 1, 1, 1, 0], r: [0, 0, 0, 80, 80, 0], o: [0, 1, 1, 0, 0, 0] }}>
            <Weed />
          </Piece>
        );
      })}
      <Piece p={p} k={k} x={-40} y={GROUND - 74} w={40} h={78} t={{ at: [0, 0.22, 0.78, 0.86, 1], x: [0, 0, 380, 380, 380], o: [0, 1, 1, 0, 0] }}>
        <Line x1={34} y1={2} x2={14} y2={68} stroke={P.wood} strokeWidth={4} strokeLinecap="round" />
        <Path d="M4 66 H24 L22 76 H6 Z" fill={P.steel} />
      </Piece>
    </>
  );
}

function TopdressScene({ p, k, crop }: SceneProps) {
  const cx = 150;
  const spots = [-40, -30, -20, 20, 30, 40];
  return (
    <>
      <Plant p={p} k={k} cx={cx} crop={crop} h={84} />
      <Piece p={p} k={k} x={cx - 70} y={40} w={34} h={30} t={{ at: [0, 0.1, 0.7, 0.8, 1], x: [0, 0, 106, 106, 106], o: [0, 1, 1, 0, 0] }}>
        <Path d="M2 4 H30 L26 28 H6 Z" fill={P.sack} />
        <Rect x={2} y={2} width={28} height={5} rx={2} fill="#C1B48E" />
      </Piece>
      {spots.map((dx, i) => {
        const t0 = 0.12 + (i / spots.length) * 0.55;
        return (
          <Piece key={dx} p={p} k={k} x={cx + dx - 3} y={58} w={6} h={6}
            t={{ at: [0, t0, t0 + 0.08, 0.86, 0.94, 1], y: [0, 0, GROUND - 62, GROUND - 62, GROUND - 58, GROUND - 58], o: [0, 1, 1, 1, 0, 0] }}>
            <Granule />
          </Piece>
        );
      })}
      <Piece p={p} k={k} x={cx - 48} y={GROUND - 4} w={96} h={10} origin="center" t={{ at: [0, 0.8, 0.9, 1], sx: [0, 0, 1, 1], o: [0, 0, 1, 1] }}>
        <Path d="M0 8 Q10 0 24 6 Q34 0 44 8 M52 8 Q62 0 72 6 Q84 0 96 8" stroke={P.soilDeep} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Piece>
    </>
  );
}

function SprayScene({ p, k, crop }: SceneProps) {
  return (
    <>
      {[70, 150, 230].map((x, i) => <Plant key={x} p={p} k={k} cx={x} crop={crop} phase={i} h={70} />)}
      <Piece p={p} k={k} x={20} y={18} w={70} h={40} t={{ at: [0, 0.1, 0.8, 0.9, 1], x: [0, 0, 200, 200, 200], o: [0, 1, 1, 0, 0] }}>
        <Line x1={2} y1={4} x2={50} y2={22} stroke={P.steel} strokeWidth={3} strokeLinecap="round" />
        <Rect x={48} y={18} width={10} height={8} rx={2} fill={P.ink} />
        <Ellipse cx={58} cy={34} rx={11} ry={5} fill={P.water} opacity={0.35} />
        <Ellipse cx={60} cy={38} rx={7} ry={3} fill={P.water} opacity={0.5} />
      </Piece>
      {[70, 150, 230].map((x) => {
        const t0 = 0.1 + ((x - 40) / 200) * 0.7;
        return (
          <Piece key={`c${x}`} p={p} k={k} x={x - 22} y={GROUND - 62} w={44} h={40} t={{ at: [0, t0, t0 + 0.08, 0.92, 1], o: [0, 0, 0.55, 0.55, 0] }}>
            {[[10, 10], [30, 8], [20, 22], [8, 28], [34, 26]].map(([a, b], i) => (
              <Circle key={i} cx={a} cy={b} r={1.8} fill={P.cream} />
            ))}
          </Piece>
        );
      })}
    </>
  );
}

function WaterScene({ p, k, crop }: SceneProps) {
  const cx = 160;
  return (
    <>
      <Piece p={p} k={k} x={cx - 50} y={GROUND - 8} w={100} h={16} t={{ at: [0, 0.3, 0.75, 0.95, 1], sx: [0.1, 0.1, 1, 1, 0.1], o: [0, 0.2, 0.7, 0.7, 0] }}>
        <Ellipse cx={50} cy={8} rx={48} ry={6} fill={P.soilDeep} />
      </Piece>
      <Plant p={p} k={k} cx={cx} crop={crop} h={80} />
      <Piece p={p} k={k} x={40} y={22} w={70} h={46} t={{ at: [0, 0.12, 0.2, 0.75, 0.85, 1], r: [0, 0, -18, -18, 0, 0] }}>
        <Path d="M6 14 H40 V42 H6 Z" fill={P.steel} />
        <Path d="M40 20 L66 8 L68 12 L42 26 Z" fill={P.steel} />
        <Path d="M10 14 C10 2 36 2 36 14" stroke={P.steel} strokeWidth={3} fill="none" />
      </Piece>
      {[0, 1, 2, 3, 4].map((i) => {
        const t0 = 0.22 + i * 0.1;
        return (
          <Piece key={i} p={p} k={k} x={108 + (i % 2) * 8} y={34} w={10} h={14} t={{ at: [0, t0, t0 + 0.12, 1], y: [0, 0, GROUND - 46, GROUND - 46], o: [0, 1, 0, 0] }}>
            <Drop />
          </Piece>
        );
      })}
    </>
  );
}

function HarvestScene({ p, k, crop }: SceneProps) {
  const produce = (fill: string) =>
    crop === 'potato' ? <Ellipse cx={8} cy={7} rx={8} ry={6} fill="#C8A26B" /> :
    crop === 'maize' ? <Path d="M4 0 C10 0 12 6 12 12 C12 18 8 20 6 20 C4 20 0 18 0 12 C0 6 2 0 4 0 Z" transform="translate(2 0)" fill={P.grain} /> :
    crop === 'wheat' || crop === 'beans' ? <Ellipse cx={8} cy={8} rx={4} ry={8} fill={crop === 'beans' ? '#C9B07A' : P.gold} /> :
    <Circle cx={8} cy={8} r={7} fill={fill} />;
  return (
    <>
      <Plant p={p} k={k} cx={90} crop={crop} h={86} />
      <Piece p={p} k={k} x={200} y={GROUND - 40} w={74} h={42}>
        <Path d="M2 6 H72 L64 40 H10 Z" fill={P.wood} />
        <Rect x={0} y={2} width={74} height={7} rx={3} fill="#A4835A" />
      </Piece>
      {[0, 1, 2].map((i) => {
        const t0 = 0.08 + i * 0.26;
        return (
          <Piece key={i} p={p} k={k} x={84} y={GROUND - 54 + i * 6} w={16} h={20}
            t={{ at: [0, t0, t0 + 0.08, t0 + 0.18, 0.94, 1], x: [0, 0, 60, 140 + i * 12, 140 + i * 12, 140 + i * 12], y: [0, 0, -50, 22 - i * 6, 22 - i * 6, 22 - i * 6], o: [0, 1, 1, 1, 1, 0] }}>
            {produce(P.clay)}
          </Piece>
        );
      })}
    </>
  );
}

function DryScene({ p, k }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={232} y={10} w={56} h={56} t={{ at: [0, 1], r: [0, 90] }}>
        <Circle cx={28} cy={28} r={11} fill={P.gold} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return <Line key={i} x1={28 + Math.cos(a) * 16} y1={28 + Math.sin(a) * 16} x2={28 + Math.cos(a) * 24} y2={28 + Math.sin(a) * 24} stroke={P.gold} strokeWidth={3} strokeLinecap="round" />;
        })}
      </Piece>
      <Piece p={p} k={k} x={30} y={GROUND - 8} w={200} h={14}>
        <Path d="M0 12 L10 2 H190 L200 12 Z" fill="#3F6E8C" />
      </Piece>
      {Array.from({ length: 22 }).map((_, i) => (
        <Piece key={i} p={p} k={k} x={46 + (i % 11) * 15} y={GROUND - 14 - Math.floor(i / 11) * 5} w={8} h={6}
          t={{ at: [0, 0.15 + (i % 5) * 0.05, 0.6 + (i % 4) * 0.05, 1], o: [1, 1, 1, 1] }}>
          <Ellipse cx={4} cy={3} rx={3.6} ry={2.6} fill={P.wetGrain} />
        </Piece>
      ))}
      {Array.from({ length: 22 }).map((_, i) => (
        <Piece key={`d${i}`} p={p} k={k} x={46 + (i % 11) * 15} y={GROUND - 14 - Math.floor(i / 11) * 5} w={8} h={6}
          t={{ at: [0, 0.15 + (i % 5) * 0.06, 0.55 + (i % 4) * 0.06, 0.95, 1], o: [0, 0, 1, 1, 0] }}>
          <Ellipse cx={4} cy={3} rx={3.6} ry={2.6} fill={P.grain} />
        </Piece>
      ))}
      {[0, 1, 2].map((i) => (
        <Piece key={`h${i}`} p={p} k={k} x={70 + i * 50} y={GROUND - 50} w={16} h={30}
          t={{ at: [0, 0.3 + i * 0.1, 0.55 + i * 0.1, 0.8 + i * 0.05, 1], y: [8, 8, -6, -16, -16], o: [0, 0, 0.6, 0, 0] }}>
          <Path d="M8 28 C2 22 14 16 8 10 C2 4 12 0 8 0" stroke="#D9C7A0" strokeWidth={2} fill="none" strokeLinecap="round" />
        </Piece>
      ))}
    </>
  );
}

function StoreScene({ p, k }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={40} y={GROUND - 4} w={220} h={10}>
        <Rect x={0} y={0} width={220} height={8} rx={2} fill={P.wood} />
      </Piece>
      {[0, 1, 2].map((i) => {
        const t0 = 0.05 + i * 0.25;
        return (
          <Piece key={i} p={p} k={k} x={60 + i * 64} y={GROUND - 62} w={52} h={58} origin="bottom"
            t={{ at: [0, t0, t0 + 0.12, 0.92, 1], y: [-60, -60, 0, 0, 0], o: [0, 0, 1, 1, 0] }}>
            <Path d="M8 8 C4 20 2 40 6 54 H46 C50 40 48 20 44 8 Z" fill={P.sack} />
            <Path d="M14 8 C20 2 32 2 38 8 L34 12 C30 8 22 8 18 12 Z" fill="#B9AA80" />
            <Path d="M18 6 Q26 0 34 6" stroke={P.ink} strokeWidth={2} fill="none" />
          </Piece>
        );
      })}
      <Piece p={p} k={k} x={262} y={GROUND - 34} w={30} h={30} t={{ at: [0, 0.8, 0.86, 0.95, 1], s: [0, 0, 1, 1, 0] }}>
        <Circle cx={15} cy={15} r={13} fill={P.leafDark} />
        <Path d="M8 15 L13 20 L22 10" stroke={P.cream} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Piece>
    </>
  );
}

function ScoutScene({ p, k }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={40} y={22} w={220} h={110}>
        <Path d="M6 60 C40 6 150 -4 214 50 C150 104 50 112 6 60 Z" fill={P.leaf} />
        <Path d="M6 60 C70 54 140 52 214 50 M60 58 L90 30 M110 55 L140 22 M80 58 L100 86 M140 53 L160 82" stroke={P.leafDark} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Piece>
      <Piece p={p} k={k} x={176} y={60} w={18} h={18} t={{ at: [0, 0.45, 0.55, 0.62, 0.7, 1], s: [1, 1, 1.35, 1, 1.35, 1] }}>
        <Circle cx={9} cy={9} r={7} fill={P.clay} />
        <Circle cx={9} cy={9} r={3} fill="#7E3420" />
      </Piece>
      <Piece p={p} k={k} x={168} y={52} w={34} h={34} t={{ at: [0, 0.48, 0.56, 0.85, 0.95, 1], s: [0.6, 0.6, 1, 1, 0.6, 0.6], o: [0, 0, 1, 1, 0, 0] }}>
        <Circle cx={17} cy={17} r={14} stroke={P.gold} strokeWidth={3} fill="none" />
      </Piece>
      <Piece p={p} k={k} x={30} y={40} w={62} h={62}
        t={{ at: [0, 0.2, 0.45, 0.85, 1], x: [0, 60, 132, 132, 0], y: [20, 0, 6, 6, 20] }}>
        <Circle cx={24} cy={24} r={18} fill="#FFFFFF" opacity={0.35} stroke={P.ink} strokeWidth={4} />
        <Line x1={37} y1={37} x2={56} y2={56} stroke={P.ink} strokeWidth={6} strokeLinecap="round" />
      </Piece>
    </>
  );
}

function RemoveScene({ p, k, crop }: SceneProps) {
  return (
    <>
      <Plant p={p} k={k} cx={60} crop={crop} h={70} phase={1} />
      <Plant p={p} k={k} cx={250} crop={crop} h={70} phase={2} />
      <Piece p={p} k={k} x={178} y={GROUND - 56} w={50} h={58} origin="bottom">
        <Path d="M6 6 C2 22 2 42 6 56 H44 C48 42 48 22 44 6 Z" fill={P.ink} opacity={0.85} />
        <Path d="M6 6 H44" stroke={P.ink} strokeWidth={3} />
      </Piece>
      <Plant p={p} k={k} cx={130} crop={crop} sick h={70} sway={false}
        t={{ at: [0, 0.2, 0.42, 0.62, 0.7, 0.95, 1], x: [0, 0, 0, 72, 72, 72, 0], y: [0, 0, -40, -46, 20, 20, 0], r: [12, 12, 6, 0, 0, 0, 12], s: [1, 1, 1, 0.8, 0.5, 0.5, 1], o: [1, 1, 1, 1, 0, 0, 1] }} />
      <Piece p={p} k={k} x={110} y={GROUND - 4} w={40} h={10} t={{ at: [0, 0.4, 0.5, 0.95, 1], o: [0, 0, 1, 1, 0] }}>
        <Ellipse cx={20} cy={5} rx={16} ry={4} fill={P.soilDeep} />
      </Piece>
    </>
  );
}

function StakeScene({ p, k, crop }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={160} y={GROUND - 100} w={8} h={112} t={{ at: [0, 0.1, 0.3, 1], y: [-40, -40, 0, 0], o: [0, 1, 1, 1] }}>
        <Rect x={1} y={0} width={6} height={112} rx={2} fill={P.wood} />
      </Piece>
      <Plant p={p} k={k} cx={150} crop={crop} h={96} sway={false} t={{ at: [0, 0.4, 0.6, 0.92, 1], r: [-14, -14, 0, 0, -14] }} />
      {[0, 1].map((i) => (
        <Piece key={i} p={p} k={k} x={152} y={GROUND - 80 + i * 34} w={20} h={10} t={{ at: [0, 0.6 + i * 0.08, 0.66 + i * 0.08, 0.92, 1], s: [0, 0, 1, 1, 0] }}>
          <Ellipse cx={10} cy={5} rx={8} ry={3.5} stroke={P.gold} strokeWidth={2.4} fill="none" />
        </Piece>
      ))}
    </>
  );
}

function PrepareScene({ p, k }: SceneProps) {
  return (
    <>
      {[0, 1, 2].map((i) => {
        const t0 = 0.05 + i * 0.28;
        return (
          <React.Fragment key={i}>
            <Piece p={p} k={k} x={0} y={GROUND + 3 + i * 13} w={VB_W} h={9} origin="left" t={{ at: [0, t0, t0 + 0.25, 0.95, 1], sx: [0, 0, 1, 1, 0] }}>
              <Path d={`M0 9 Q8 0 16 9 ${Array.from({ length: 18 }).map((_, j) => `Q${24 + j * 16} 0 ${32 + j * 16} 9`).join(' ')}`} fill={P.soilDeep} />
            </Piece>
            <Piece p={p} k={k} x={-44} y={GROUND - 34 + i * 13} w={44} h={40} t={{ at: [0, t0, t0 + 0.25, t0 + 0.27, 1], x: [0, 0, VB_W + 40, VB_W + 40, VB_W + 40], o: [0, 1, 1, 0, 0] }}>
              <Line x1={2} y1={4} x2={26} y2={28} stroke={P.wood} strokeWidth={4} strokeLinecap="round" />
              <Line x1={8} y1={2} x2={18} y2={2} stroke={P.wood} strokeWidth={4} strokeLinecap="round" />
              <Path d="M22 24 L42 32 L40 38 L24 36 Z" fill={P.steel} />
            </Piece>
          </React.Fragment>
        );
      })}
      {[40, 110, 180, 250].map((x, i) => (
        <Piece key={x} p={p} k={k} x={x} y={GROUND - 8} w={14} h={10} t={{ at: [0, 0.15 + i * 0.12, 0.25 + i * 0.12, 0.95, 1], s: [1, 1, 0.3, 0.3, 1], o: [1, 1, 0.4, 0.4, 1] }}>
          <Ellipse cx={7} cy={6} rx={6} ry={4} fill={P.soilDark} />
        </Piece>
      ))}
    </>
  );
}

function EarthupScene({ p, k, crop }: SceneProps) {
  return (
    <>
      <Plant p={p} k={k} cx={150} crop={crop} h={90} />
      {[-1, 1].map((side) => (
        <Piece key={side} p={p} k={k} x={150 + side * 30 - 34} y={GROUND - 22} w={68} h={26}
          t={{ at: [0, 0.15, 0.55, 0.9, 1], y: [26, 26, 0, 0, 26], x: [side * 20, side * 20, side * -6, side * -6, side * 20] }}>
          <Path d="M0 26 C14 4 54 4 68 26 Z" fill={P.soilDark} />
        </Piece>
      ))}
    </>
  );
}

function TransplantScene({ p, k, crop }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={14} y={GROUND - 26} w={92} h={26}>
        <Rect x={0} y={6} width={92} height={20} rx={3} fill={P.ink} opacity={0.85} />
        {[0, 1, 2, 3].map((i) => <Rect key={i} x={6 + i * 22} y={10} width={16} height={12} rx={2} fill={P.soilDark} />)}
      </Piece>
      {[0, 2, 3].map((i) => (
        <Plant key={i} p={p} k={k} cx={28 + i * 22} crop={crop} h={34} phase={i} t={{ at: [0, 1], y: [-14, -14] }} />
      ))}
      <Piece p={p} k={k} x={205} y={GROUND - 6} w={40} h={12} t={{ at: [0, 0.55, 0.65, 0.95, 1], sx: [1, 1, 0.4, 0.4, 1] }}>
        <Ellipse cx={20} cy={6} rx={18} ry={5} fill={P.soilDeep} />
      </Piece>
      <Plant p={p} k={k} cx={50} crop={crop} h={34} sway={false}
        t={{ at: [0, 0.12, 0.25, 0.5, 0.6, 0.94, 1], x: [0, 0, 0, 175, 175, 175, 0], y: [-14, -14, -50, -40, 0, 0, -14], s: [1, 1, 1, 1, 1.3, 1.3, 1], o: [1, 1, 1, 1, 1, 1, 0] }} />
      {[0, 1].map((i) => (
        <Piece key={`w${i}`} p={p} k={k} x={218 + i * 10} y={40} w={10} h={14} t={{ at: [0, 0.7 + i * 0.06, 0.8 + i * 0.06, 1], y: [0, 0, GROUND - 52, GROUND - 52], o: [0, 1, 0, 0] }}>
          <Drop />
        </Piece>
      ))}
    </>
  );
}

function NetScene({ p, k, crop }: SceneProps) {
  return (
    <>
      {[90, 130, 170, 210].map((x, i) => <Plant key={x} p={p} k={k} cx={x} crop={crop} h={40} phase={i} />)}
      <Piece p={p} k={k} x={60} y={GROUND - 74} w={180} h={76} t={{ at: [0, 0.08, 0.3, 0.94, 1], y: [-90, -90, 0, 0, -90], o: [0, 1, 1, 1, 0] }}>
        <Path d="M4 76 V20 Q90 -8 176 20 V76" stroke={P.steel} strokeWidth={3} fill={P.cream} fillOpacity={0.45} />
        {Array.from({ length: 9 }).map((_, i) => <Line key={i} x1={20 + i * 18} y1={8} x2={20 + i * 18} y2={76} stroke={P.steel} strokeWidth={0.8} opacity={0.6} />)}
        {Array.from({ length: 4 }).map((_, i) => <Line key={`h${i}`} x1={4} y1={28 + i * 14} x2={176} y2={28 + i * 14} stroke={P.steel} strokeWidth={0.8} opacity={0.6} />)}
      </Piece>
      {[0, 1, 2].map((i) => {
        const t0 = 0.38 + i * 0.12;
        return (
          <Piece key={i} p={p} k={k} x={270} y={40 + i * 18} w={10} h={8}
            t={{ at: [0, t0, t0 + 0.12, t0 + 0.26, 1], x: [0, 0, -36, 10, 10], y: [0, 0, 6, -30, -30], o: [0, 1, 1, 0, 0] }}>
            <Ellipse cx={5} cy={4} rx={4.5} ry={3} fill="#FFFFFF" stroke="#9AA39E" strokeWidth={0.8} />
          </Piece>
        );
      })}
    </>
  );
}

function SeedtreatScene({ p, k }: SceneProps) {
  return (
    <>
      <Piece p={p} k={k} x={14} y={6} w={120} h={GROUND - 4}>
        <Rect x={50} y={40} width={12} height={GROUND - 44} fill={P.wood} />
        <Ellipse cx={56} cy={34} rx={54} ry={30} fill={P.leafDark} />
        <Ellipse cx={36} cy={28} rx={28} ry={18} fill={P.leaf} />
      </Piece>
      <Piece p={p} k={k} x={60} y={GROUND - 6} w={170} h={10}>
        <Ellipse cx={85} cy={5} rx={84} ry={4} fill={P.soilDeep} opacity={0.35} />
      </Piece>
      <Piece p={p} k={k} x={100} y={GROUND - 40} w={100} h={44}>
        <Path d="M2 6 H98 C96 30 80 42 50 42 C20 42 4 30 2 6 Z" fill={P.steel} />
      </Piece>
      {Array.from({ length: 7 }).map((_, i) => {
        const ang = (i / 7) * 360;
        return (
          <Piece key={i} p={p} k={k} x={142} y={GROUND - 40} w={16} h={16}
            t={{ at: [0, 0.5, 1], x: [Math.cos((ang * Math.PI) / 180) * 26, Math.cos(((ang + 180) * Math.PI) / 180) * 26, Math.cos(((ang + 360) * Math.PI) / 180) * 26], y: [Math.sin((ang * Math.PI) / 180) * 6, Math.sin(((ang + 180) * Math.PI) / 180) * 6, Math.sin(((ang + 360) * Math.PI) / 180) * 6], r: [0, 180, 360] }}>
            <Ellipse cx={8} cy={8} rx={6} ry={4} fill="#E5D3B0" />
          </Piece>
        );
      })}
      {Array.from({ length: 7 }).map((_, i) => {
        const ang = (i / 7) * 360;
        return (
          <Piece key={`c${i}`} p={p} k={k} x={142} y={GROUND - 40} w={16} h={16}
            t={{ at: [0, 0.2, 0.5, 0.85, 1], o: [0, 0, 1, 1, 0], x: [Math.cos((ang * Math.PI) / 180) * 26, Math.cos((ang * Math.PI) / 180) * 26, Math.cos(((ang + 180) * Math.PI) / 180) * 26, Math.cos(((ang + 300) * Math.PI) / 180) * 26, Math.cos(((ang + 360) * Math.PI) / 180) * 26], y: [Math.sin((ang * Math.PI) / 180) * 6, Math.sin((ang * Math.PI) / 180) * 6, Math.sin(((ang + 180) * Math.PI) / 180) * 6, Math.sin(((ang + 300) * Math.PI) / 180) * 6, Math.sin(((ang + 360) * Math.PI) / 180) * 6] }}>
            <Ellipse cx={8} cy={8} rx={6} ry={4} fill="#3E4F44" />
          </Piece>
        );
      })}
    </>
  );
}

function SortScene({ p, k }: SceneProps) {
  const grains = [0, 1, 2, 3, 4, 5, 6, 7];
  const bad = new Set([2, 5]);
  return (
    <>
      <Piece p={p} k={k} x={10} y={GROUND - 32} w={210} h={14}>
        <Path d="M0 2 H210 L200 14 H10 Z" fill="#B48A55" />
      </Piece>
      <Piece p={p} k={k} x={150} y={GROUND - 2} w={46} h={20}>
        <Path d="M2 2 H44 L38 18 H8 Z" fill={P.ink} opacity={0.7} />
      </Piece>
      <Piece p={p} k={k} x={228} y={GROUND - 60} w={52} h={60}>
        <Path d="M8 8 C4 20 2 40 6 58 H46 C50 40 48 20 44 8 Z" fill={P.sack} />
      </Piece>
      {grains.map((i) => {
        const t0 = (i / grains.length) * 0.7;
        const isBad = bad.has(i);
        return (
          <Piece key={i} p={p} k={k} x={14} y={GROUND - 40} w={12} h={10}
            t={isBad
              ? { at: [0, t0, t0 + 0.14, t0 + 0.2, 1], x: [0, 0, 148, 156, 156], y: [0, 0, 0, 40, 40], o: [0, 1, 1, 0, 0] }
              : { at: [0, t0, t0 + 0.24, t0 + 0.28, 1], x: [0, 0, 210, 230, 230], y: [0, 0, 0, -10, -10], o: [0, 1, 1, 0, 0] }}>
            <Ellipse cx={6} cy={5} rx={5} ry={3.6} fill={isBad ? '#5E5A3A' : P.grain} />
          </Piece>
        );
      })}
    </>
  );
}

/** Tank mixing, as labels say: half-fill with water, add the measured product, top up, shake. */
function MixScene({ p, k }: SceneProps) {
  const TANK_X = 120;
  const TANK_Y = GROUND - 92;
  return (
    <>
      <Piece p={p} k={k} x={TANK_X - 6} y={TANK_Y - 6} w={72} h={100} origin="bottom" t={{ at: [0, 0.82, 0.85, 0.88, 0.91, 0.94, 1], r: [0, 0, 5, -5, 5, 0, 0] }}>
        <Rect x={6} y={6} width={60} height={86} rx={12} fill={P.cream} stroke={P.steel} strokeWidth={3} />
        <Rect x={22} y={0} width={28} height={10} rx={3} fill={P.steel} />
      </Piece>
      <Piece p={p} k={k} x={TANK_X + 3} y={TANK_Y + 3} w={54} h={78} origin="bottom" t={{ at: [0, 0.05, 0.28, 0.6, 0.8, 0.96, 1], sy: [0.02, 0.02, 0.5, 0.5, 1, 1, 0.02] }}>
        <Rect x={0} y={0} width={54} height={78} rx={8} fill={P.water} opacity={0.7} />
      </Piece>
      <Piece p={p} k={k} x={TANK_X + 3} y={TANK_Y + 3} w={54} h={78} origin="bottom" t={{ at: [0, 0.4, 0.55, 0.96, 1], o: [0, 0, 0.55, 0.55, 0], sy: [0.5, 0.5, 0.5, 1, 1] }}>
        <Rect x={0} y={39} width={54} height={39} rx={8} fill={P.leafDark} />
      </Piece>
      <Piece p={p} k={k} x={60} y={TANK_Y - 30} w={40} h={34} t={{ at: [0, 0.3, 0.38, 0.55, 0.6, 1], x: [0, 0, 44, 44, 0, 0], r: [0, 0, 0, 70, 0, 0], o: [0, 1, 1, 1, 1, 1] }}>
        <Path d="M6 4 H30 L27 32 H9 Z" fill="#FFFFFF" stroke={P.steel} strokeWidth={2} />
        <Rect x={9} y={16} width={18} height={14} fill={P.leafDark} />
        <Line x1={8} y1={10} x2={14} y2={10} stroke={P.steel} strokeWidth={1.5} />
        <Line x1={8} y1={16} x2={14} y2={16} stroke={P.steel} strokeWidth={1.5} />
      </Piece>
      {[0, 1, 2].map((i) => (
        <Piece key={i} p={p} k={k} x={TANK_X + 24} y={TANK_Y - 4} w={10} h={14} t={{ at: [0, 0.4 + i * 0.04, 0.46 + i * 0.04, 1], y: [0, 0, 30, 30], o: [0, 1, 0, 0] }}>
          <Path d="M5 0 C7 4 10 7 10 10 A5 5 0 0 1 0 10 C0 7 3 4 5 0 Z" fill={P.leafDark} />
        </Piece>
      ))}
      {[0, 1, 2].map((i) => (
        <Piece key={`w${i}`} p={p} k={k} x={TANK_X + 20 + i * 6} y={TANK_Y - 30} w={10} h={14}
          t={{ at: [0, 0.06 + i * 0.05, 0.14 + i * 0.05, 0.62 + i * 0.05, 0.7 + i * 0.05, 1], y: [0, 0, 36, 0, 36, 36], o: [0, 1, 0, 1, 0, 0] }}>
          <Drop />
        </Piece>
      ))}
    </>
  );
}

function GrowScene({ p, k, crop }: SceneProps) {
  return (
    <>
      {[90, 210].map((x, i) => (
        <Plant key={x} p={p} k={k} cx={x} crop={crop} h={90} sway={false}
          t={{ at: [0, 0.1 + i * 0.1, 0.6 + i * 0.1, 0.92, 1], sy: [0.05, 0.05, 1, 1, 0.05], s: [0.6, 0.6, 1, 1, 0.6] }} />
      ))}
    </>
  );
}

const SCENES: Record<SceneKind, { C: (p: SceneProps) => React.ReactNode; ms: number; still: number; furrows?: number }> = {
  weed: { C: WeedScene, ms: 4200, still: 0.9 },
  topdress: { C: TopdressScene, ms: 4200, still: 0.9 },
  spray: { C: SprayScene, ms: 4000, still: 0.88 },
  water: { C: WaterScene, ms: 3600, still: 0.7 },
  harvest: { C: HarvestScene, ms: 4200, still: 0.9 },
  dry: { C: DryScene, ms: 4600, still: 0.85 },
  store: { C: StoreScene, ms: 4000, still: 0.88 },
  scout: { C: ScoutScene, ms: 4200, still: 0.6 },
  remove: { C: RemoveScene, ms: 4200, still: 0.8 },
  stake: { C: StakeScene, ms: 3800, still: 0.85 },
  prepare: { C: PrepareScene, ms: 4600, still: 0.9 },
  earthup: { C: EarthupScene, ms: 3600, still: 0.7 },
  transplant: { C: TransplantScene, ms: 4400, still: 0.9 },
  net: { C: NetScene, ms: 4200, still: 0.6 },
  seedtreat: { C: SeedtreatScene, ms: 3600, still: 0.6 },
  sort: { C: SortScene, ms: 4400, still: 0.3 },
  mix: { C: MixScene, ms: 5200, still: 0.8 },
  grow: { C: GrowScene, ms: 3800, still: 0.85 },
};

/** The animated scene for one step. `kind` overrides the choice made from `text`. */
export function StoryScene({ text, crop, width, kind, rounded = 18 }: { text: string; crop?: string | null; width: number; kind?: SceneKind; rounded?: number }) {
  const sk = kind ?? sceneFor(text);
  const def = SCENES[sk];
  const k = width / VB_W;
  const p = useLoop(def.ms, def.still, `${sk}:${text}`);
  const dont = isDont(text);
  return (
    <View
      style={{ width, height: VB_H * k, borderRadius: rounded, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ground />
      <def.C p={p} k={k} crop={sceneCrop(crop)} />
      {dont ? (
        <View style={{ position: 'absolute', right: 10 * k, top: 10 * k, width: 40 * k, height: 40 * k }}>
          <Svg width="100%" height="100%" viewBox="0 0 40 40">
            <Circle cx={20} cy={20} r={18} fill={P.clay} />
            <Path d="M12 12 L28 28 M28 12 L12 28" stroke={P.cream} strokeWidth={4} strokeLinecap="round" />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
