// Tassel — a scanner line that glides down and up over its parent while work is in progress
// (live camera, leaf analysis). lib/motion.ts rule 3: it runs only while `active`, and the
// phone's reduce-motion setting hides it. Timing curve only, no bounce.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useStill } from '../lib/motion';
import { C } from '../lib/theme';

export function ScanLine({ active = true, color = C.gold, duration = 2200 }: { active?: boolean; color?: string; duration?: number }) {
  const still = useStill();
  const [h, setH] = useState(0);
  const y = useSharedValue(0);
  const run = active && !still && h > 0;

  useEffect(() => {
    if (!run) {
      cancelAnimation(y);
      y.value = 0;
      return;
    }
    y.value = 0;
    y.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(y);
  }, [run, duration, y]);

  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * Math.max(0, h - 2) }] }));

  if (still || !active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Animated.View style={[st.wrap, line]}>
        <View style={[st.glow, { backgroundColor: color }]} />
        <View style={[st.line, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: -9, height: 20, justifyContent: 'center' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.16 },
  line: { height: 2, opacity: 0.95 },
});
