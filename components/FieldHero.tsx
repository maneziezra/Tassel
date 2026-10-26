// Tassel — the Home hero: the farmer's own field from space, animated.
//
// The signature moment: a gold satellite line sweeps across and reveals the
// field's real Sentinel-2 squares, then the boundary draws itself. Cells the
// 20 m joint mask flags as possible stress pulse in clay. While the first
// satellite check is still running the sweep keeps passing over the outline.
// Reduce-motion shows the final picture at once.

import React, { useEffect, useMemo } from 'react';
import { Canvas, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Grid } from '../lib/satelliteCore';
import { layoutField } from '../lib/fieldArt';
import { C } from '../lib/theme';

export function FieldHero({
  polygon,
  grid,
  width,
  height,
  checking,
  playKey,
}: {
  polygon: [number, number][] | null;
  grid: Grid | null;
  width: number;
  height: number;
  /** The first satellite check is still running: keep the sweep passing. */
  checking?: boolean;
  /** Change it to replay the reveal (e.g. when the farmer switches field). */
  playKey?: string;
}) {
  const reduce = useReducedMotion();
  const art = useMemo(() => layoutField(polygon, grid, width, height), [polygon, grid, width, height]);

  const outlinePath = useMemo(() => {
    const p = Skia.Path.Make();
    if (!art?.outline.length) return p;
    art.outline.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.close();
    return p;
  }, [art]);

  const reveal = useSharedValue(reduce ? 1 : 0);
  const draw = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(1);
  const sweep = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      reveal.value = 1;
      draw.value = 1;
      sweep.value = checking ? 0.5 : 1;
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
  const sweepOpacity = useDerivedValue(() => (checking ? 1 : 1 - Math.max(0, (sweep.value - 0.85) / 0.15)));

  if (!art) return null;
  return (
    <Canvas style={{ width, height }} accessible={false}>
      <Group clip={clip}>
        {art.cells.map((c, i) => (
          <Rect key={i} x={c.x + 0.75} y={c.y + 0.75} width={Math.max(1, c.s - 1.5)} height={Math.max(1, c.s - 1.5)} color={c.color} opacity={c.noData ? 0.5 : 1} />
        ))}
        {art.stress.length ? (
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
}
