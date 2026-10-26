// Tassel — Google Noto Animated Emoji (Lottie), the same on every phone.
// Ezra's decision of 26 Oct 2026: no system emoji (they look different on
// Tecno, Samsung and Infinix); this small bundled set instead.
// Source: fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json
// Licence: CC BY 4.0, Google. Credited on the Methodology screen.

import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';

const FILES = {
  plant: require('../assets/lottie/noto-plant.json'), // U+1F331
  corn: require('../assets/lottie/noto-corn.json'), // U+1F33D
  tomato: require('../assets/lottie/noto-tomato.json'), // U+1F345
  potato: require('../assets/lottie/noto-potato.json'), // U+1F954
  bug: require('../assets/lottie/noto-bug.json'), // U+1F41B
  rain: require('../assets/lottie/noto-rain.json'), // U+1F327
  droplet: require('../assets/lottie/noto-droplet.json'), // U+1F4A7
  sparkles: require('../assets/lottie/noto-sparkles.json'), // U+2728
  party: require('../assets/lottie/noto-party.json'), // U+1F389
  leaves: require('../assets/lottie/noto-leaves.json'), // U+1F343
} as const;

export type NotoName = keyof typeof FILES;

/** Plays once by default (a confirmation, not a distraction). Still under reduce-motion. */
export function NotoEmoji({ name, size = 40, loop = false }: { name: NotoName; size?: number; loop?: boolean }) {
  const reduce = useReducedMotion();
  // Decorative: the words next to it carry the meaning, so screen readers skip it.
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <LottieView source={FILES[name]} autoPlay={!reduce} loop={loop && !reduce} progress={reduce ? 1 : undefined} style={{ width: size, height: size }} />
    </View>
  );
}
