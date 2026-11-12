// Tassel — the motion rule (Ezra, 12 Nov 2026: "make my app serious", like xFarm).
// Nothing loops, bounces, breathes or celebrates. Illustrations show their finished frame;
// the satellite field appears at once. A screen may still slide to show where it came from.
// This replaces the 26 Oct "alive" direction (animated emoji, moving scenes).
import { useReducedMotion } from 'react-native-reanimated';

/** Decorative motion (loops, springs, reveals). Off: the app is a work tool. */
export const DECORATIVE_MOTION = false;

/** True when pictures must stand still: always, unless decorative motion is turned back on
 * (and then still honouring the phone's reduce-motion setting). */
export function useStill(): boolean {
  const reduce = useReducedMotion();
  return reduce || !DECORATIVE_MOTION;
}
