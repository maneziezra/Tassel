// Tassel — a real photo for one farming step (13 Nov 2026; it replaces the cartoon StoryScene:
// Ezra, "real images, not cartoons"). Same props as StoryScene, so screens swap one for the other.
//
// The photo is picked from the step's own words (lib/storyScene.ts sceneFor), so it never shows
// work the text does not say. It drifts in very slowly once (a 6% zoom over 8 s, lib/motion.ts
// rule 4) and stands still under reduce-motion. Steps that say "Do not…" get a clay mark.
// Every photo is openly licensed and credited in its corner (lib/storyPhotos.ts).
import React, { useEffect } from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, Text } from './ui';
import { useLang } from '../lib/i18n';
import { useStill } from '../lib/motion';
import { isDont, sceneFor, type SceneKind } from '../lib/storyScene';
import { STORY_PHOTO_CREDITS, creditLine } from '../lib/storyPhotos';
import { C, FONT } from '../lib/theme';

const PHOTOS: Record<SceneKind, ImageSourcePropType> = {
  weed: require('../assets/story/weed.jpg'),
  topdress: require('../assets/story/topdress.jpg'),
  spray: require('../assets/story/spray.jpg'),
  water: require('../assets/story/water.jpg'),
  harvest: require('../assets/story/harvest.jpg'),
  dry: require('../assets/story/dry.jpg'),
  store: require('../assets/story/store.jpg'),
  scout: require('../assets/story/scout.jpg'),
  remove: require('../assets/story/remove.jpg'),
  stake: require('../assets/story/stake.jpg'),
  prepare: require('../assets/story/prepare.jpg'),
  earthup: require('../assets/story/earthup.jpg'),
  transplant: require('../assets/story/transplant.jpg'),
  net: require('../assets/story/net.jpg'),
  seedtreat: require('../assets/story/seedtreat.jpg'),
  sort: require('../assets/story/sort.jpg'),
  mix: require('../assets/story/mix.jpg'),
  grow: require('../assets/story/grow.jpg'),
};

export function StoryPhoto({
  text,
  kind,
  width,
  rounded = 16,
}: {
  text: string;
  kind?: SceneKind;
  /** Accepted for the same props as StoryScene; the photos are not crop-specific. */
  crop?: string | null;
  width: number;
  rounded?: number;
}) {
  const { t, lang } = useLang();
  const still = useStill();
  const k = kind ?? sceneFor(text);
  const credit = STORY_PHOTO_CREDITS[k];
  const height = Math.round((width * 2) / 3);
  const zoom = useSharedValue(1);

  useEffect(() => {
    zoom.value = 1;
    if (still) return;
    zoom.value = withTiming(1.06, { duration: 8000, easing: Easing.inOut(Easing.quad) });
  }, [k, still, zoom]);

  const drift = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const dont = isDont(text);

  return (
    <View style={[st.frame, { width, height, borderRadius: rounded }]} accessible accessibilityRole="image" accessibilityLabel={`${credit.alt[lang]}${dont ? `. ${t('Do not')}` : ''}`}>
      <Animated.Image source={PHOTOS[k]} style={[StyleSheet.absoluteFill, { width, height }, drift]} resizeMode="cover" />
      {dont ? (
        <View style={st.dont}>
          <Icon name="cancel" size={16} color="#fff" />
          <Text style={st.dontTxt}>Do not</Text>
        </View>
      ) : null}
      <View style={st.credit} importantForAccessibility="no-hide-descendants">
        <Text raw style={st.creditTxt} numberOfLines={1}>
          {creditLine(credit)}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: C.sunken },
  dont: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  dontTxt: { color: '#fff', fontSize: 14, fontFamily: FONT.bodyBold },
  credit: { position: 'absolute', right: 6, bottom: 6, maxWidth: '80%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  creditTxt: { color: '#fff', fontSize: 10 },
});
