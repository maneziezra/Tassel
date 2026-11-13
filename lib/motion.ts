// Tassel — the motion rules (Ezra, 13 Nov 2026: 2.9.3 with no motion "looked lifeless";
// he wants it alive but serious, like a work tool).
//
//  1. Motion explains something: a thing arrives, a measurement draws itself, work is in progress.
//     Nothing moves only to decorate.
//  2. Timing curves only, 180–450 ms, easing out. No springs, no overshoot, no bounce, no wobble.
//  3. A loop runs only while work is in progress (satellite check, leaf analysis, live camera
//     scan line) and stops when it is done. A highlight may pulse a few times, then holds.
//  4. Photos may drift (a slow zoom of a few percent), once.
//  5. The phone's reduce-motion setting stills everything (useStill).
// scripts/test-rules.mjs ("decision 13 Nov") checks rules 2 and 3.
import { Easing, FadeIn, FadeInDown, FadeInRight, useReducedMotion } from 'react-native-reanimated';

export const DUR = { quick: 180, base: 280, slow: 450 } as const;
/** Ease-out, no overshoot. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
/** Gap between items that arrive one after another. */
const STAGGER = 60;

/** True when pictures must stand still: the phone's reduce-motion setting is on. */
export function useStill(): boolean {
  return useReducedMotion();
}

/** Entering animation for the i-th item of a list or screen: a short fade and rise. */
export function enterUp(i = 0, base = 0) {
  return FadeInDown.duration(DUR.base).delay(base + i * STAGGER).easing(EASE);
}

/** Entering animation for the i-th card of a horizontal row: a short fade and slide from the right. */
export function enterRight(i = 0, base = 0) {
  return FadeInRight.duration(DUR.base).delay(base + i * STAGGER).easing(EASE);
}

/** A plain fade, for things that change in place (a tick, a badge). */
export function enterFade(delay = 0) {
  return FadeIn.duration(DUR.quick).delay(delay).easing(EASE);
}
