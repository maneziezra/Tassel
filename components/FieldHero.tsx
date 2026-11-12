// Tassel — the Home hero: the farmer's own field from space.
// 12 Nov: shown still (lib/motion.ts): the final picture at once, no sweep, no pulsing squares.
// The animated version below runs only if DECORATIVE_MOTION is turned back on.
//
// The signature moment: a gold satellite line sweeps across and reveals the
// field's real Sentinel-2 squares, then the boundary draws itself. Cells the
// 20 m joint mask flags as possible stress pulse in clay. While the first
// satellite check is still running the sweep keeps passing over the outline.
// Reduce-motion shows the final picture at once.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useStill } from '../lib/motion';
import type { Grid } from '../lib/satelliteCore';
import { layoutField, ndviColor } from '../lib/fieldArt';
import { C, FONT } from '../lib/theme';
import { Text } from './ui';
import { useLang } from '../lib/i18n';

export function FieldHero({
  polygon,
  grid,
  width,
  height,
  checking,
  playKey,
  flagStress,
  showKey,
}: {
  polygon: [number, number][] | null;
  grid: Grid | null;
  width: number;
  height: number;
  /** The first satellite check is still running: keep the sweep passing. */
  checking?: boolean;
  /** Change it to replay the reveal (e.g. when the farmer switches field). */
  playKey?: string;
  /** Pulse the 20 m stress squares. Only when the verdict itself says watch/act,
   *  so a "looks normal" field never shows alarm marks (scattered cells under the
   *  20 % rule in lib/satellite.ts interpret()). */
  flagStress?: boolean;
  /** Show the colour key under the field (Home hero). */
  showKey?: boolean;
}) {
  const reduce = useStill();
  const { t } = useLang();
  const art = useMemo(() => layoutField(polygon, grid, width, height), [polygon, grid, width, height]);

  const outlinePath = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    if (!art?.outline.length) return b.build();
    art.outline.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
    return b.close().build();
  }, [art]);

  const reveal = useSharedValue(reduce ? 1 : 0);
  const draw = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(1);
  const sweep = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      reveal.value = 1;
      draw.value = 1;
      sweep.value = 1; // no satellite line resting over the field
      return;
    }
    reveal.value = 0;
    draw.value = 0;
    sweep.value = 0;
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    if (checking) {
      draw.value = withTiming(1, { duration: 1400, easing: ease });
      sweep.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, false);
    } else {
      reveal.value = withTiming(1, { duration: 1500, easing: ease });
      sweep.value = withTiming(1, { duration: 1500, easing: ease });
      draw.value = withDelay(700, withTiming(1, { duration: 1100, easing: ease }));
      pulse.value = withDelay(1800, withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false));
    }
  }, [reduce, checking, playKey, reveal, draw, sweep, pulse]);

  const clip = useDerivedValue(() => Skia.XYWHRect(0, 0, width * reveal.value, height));
  const sweepX = useDerivedValue(() => [{ translateX: width * sweep.value - 44 }]);
  const sweepOpacity = useDerivedValue(() => (reduce ? 0 : checking ? 1 : 1 - Math.max(0, (sweep.value - 0.85) / 0.15)));

  if (!art) return null;
  const hasCloud = art.cells.some((c) => c.noData);
  const canvas = (
    <Canvas style={{ width, height }} accessible={false}>
      <Group clip={clip}>
        {/* The field sits on a paper plate: dense green (#1F4D39) would vanish into the
            dark hero, and the healthiest part of the field would read as empty. */}
        {art.outline.length ? <Path path={outlinePath} color={art.cells.length ? C.bg : 'rgba(244,241,230,0.07)'} /> : null}
        {art.cells.map((c, i) =>
          c.noData ? (
            // No clear view (cloud): an empty square, so it never reads as bare soil or dense crop
            <Rect key={i} x={c.x + 1.25} y={c.y + 1.25} width={Math.max(1, c.s - 2.5)} height={Math.max(1, c.s - 2.5)} color={C.textLight} style="stroke" strokeWidth={0.75} opacity={0.6} />
          ) : (
            <Rect key={i} x={c.x + 0.75} y={c.y + 0.75} width={Math.max(1, c.s - 1.5)} height={Math.max(1, c.s - 1.5)} color={c.color} />
          )
        )}
        {flagStress && art.stress.length ? (
          <Group opacity={pulse}>
            {art.stress.map((c, i) => (
              <Rect key={i} x={c.x + 1} y={c.y + 1} width={c.s - 2} height={c.s - 2} color={C.error} style="stroke" strokeWidth={2} />
            ))}
          </Group>
        ) : null}
      </Group>
      {art.outline.length ? (
        <Path path={outlinePath} color={C.brandGold} style="stroke" strokeWidth={2.5} strokeJoin="round" strokeCap="round" start={0} end={draw} />
      ) : null}
      <Group transform={sweepX} opacity={sweepOpacity}>
        <Rect x={0} y={0} width={44} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(44, 0)} colors={['rgba(226,179,60,0)', 'rgba(226,179,60,0.38)']} />
        </Rect>
        <Rect x={42} y={0} width={2.5} height={height} color={C.brandGold} />
      </Group>
    </Canvas>
  );
  if (!showKey || !art.cells.length) return canvas;
  return (
    <View style={{ alignItems: 'center' }}>
      {canvas}
      <View
        style={st.key}
        accessible
        accessibilityLabel={t('Lighter squares: bare soil. Darker: dense crop.') + (hasCloud ? ' ' + t('Empty squares: no clear view.') : '')}
      >
        <Text style={st.keyText}>Bare</Text>
        {[0.1, 0.3, 0.5, 0.65, 0.85].map((v) => (
          <View key={v} style={[st.sq, { backgroundColor: ndviColor(v) }]} />
        ))}
        <Text style={st.keyText}>Dense</Text>
        {hasCloud ? (
          <>
            <View style={[st.sq, st.sqCloud]} />
            <Text style={st.keyText}>Cloud</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  // a small paper pill: the dense-green swatch would vanish on the dark hero
  key: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.bg },
  sq: { width: 12, height: 12, borderRadius: 2 },
  sqCloud: { borderWidth: 1, borderColor: C.textLight, marginLeft: 8 },
  keyText: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.textMid, marginHorizontal: 3 },
});
