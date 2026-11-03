// Dev only: every story scene on one screen, for checking them on a phone. Not linked from the app.
import React from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { StoryScene } from '../components/StoryScene';
import { Text } from '../components/ui';
import type { SceneKind } from '../lib/storyScene';

const KINDS: SceneKind[] = ['weed', 'topdress', 'spray', 'water', 'harvest', 'dry', 'store', 'scout', 'remove', 'stake', 'prepare', 'earthup', 'transplant', 'net', 'seedtreat', 'sort', 'mix', 'grow'];

export default function DevScenes() {
  const { crop = 'maize', from = '0' } = useLocalSearchParams<{ crop?: string; from?: string }>();
  const { width } = useWindowDimensions();
  if (!__DEV__) return <Redirect href="/" />;
  const w = (width - 36) / 2;
  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingTop: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {KINDS.slice(Number(from), Number(from) + 8).map((k) => (
        <View key={k} style={{ width: w }}>
          <StoryScene text={k === 'weed' ? 'Do not weed during flowering' : k} kind={k} crop={crop} width={w} rounded={10} />
          <Text raw style={{ fontSize: 12 }}>{k}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

