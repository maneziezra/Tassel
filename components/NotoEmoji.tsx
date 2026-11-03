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
  // The scan result's feeling (Ezra, 29 Oct: "emotions, like just life")
  sick: require('../assets/lottie/noto-sick.json'), // U+1F912 face with thermometer
  happy: require('../assets/lottie/noto-happy.json'), // U+1F60A smiling face with smiling eyes
  thinking: require('../assets/lottie/noto-thinking.json'), // U+1F914 thinking face
  // 3 Nov: calendar, treatment and calculator steps
  sun: require('../assets/lottie/noto-sun.json'), // U+1F31E
  tractor: require('../assets/lottie/noto-tractor.json'), // U+1F69C
  ant: require('../assets/lottie/noto-ant.json'), // U+1F41C
  check: require('../assets/lottie/noto-check.json'), // U+2705
  herb: require('../assets/lottie/noto-herb.json'), // U+1F33F
  fungus: require('../assets/lottie/noto-fungus.json'), // U+1F344
  microbe: require('../assets/lottie/noto-microbe.json'), // U+1F9A0
  warning: require('../assets/lottie/noto-warning.json'), // U+26A0
  eyes: require('../assets/lottie/noto-eyes.json'), // U+1F440
  fallenleaf: require('../assets/lottie/noto-fallenleaf.json'), // U+1F342
  beans: require('../assets/lottie/noto-beans.json'), // U+1FAD8
  greens: require('../assets/lottie/noto-greens.json'), // U+1F96C
  thumbsup: require('../assets/lottie/noto-thumbsup.json'), // U+1F44D
  siren: require('../assets/lottie/noto-siren.json'), // U+1F6A8
} as const;

export type NotoName = keyof typeof FILES;

/**
 * The Noto set is designed to loop: the first and last frames of some files are
 * mid-transition (on the TECNO a play-once droplet ended blank). Under
 * reduce-motion a mid-animation frame is shown, where the emoji is fully drawn.
 */
export function NotoEmoji({ name, size = 40 }: { name: NotoName; size?: number }) {
  const reduce = useReducedMotion();
  // Decorative: the words next to it carry the meaning, so screen readers skip it.
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {reduce ? (
        <LottieView source={FILES[name]} autoPlay={false} progress={0.5} style={{ width: size, height: size }} />
      ) : (
        <LottieView source={FILES[name]} autoPlay loop style={{ width: size, height: size }} />
      )}
    </View>
  );
}
