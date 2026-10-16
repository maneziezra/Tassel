import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { ensureSession } from '../lib/session';
import { loadLang } from '../lib/i18n';
import { onNotificationTap } from '../lib/notify';
import { C } from '../lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // Mche typefaces. If they cannot load, the phone's own font is used instead.
  const [fontsLoaded, fontError] = useFonts({ ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });

  useEffect(() => {
    // Language first (it decides every label), then the session in the background.
    loadLang().finally(() => setReady(true));
    // Start (or restore) this phone's session. Scanning works offline regardless.
    ensureSession().catch(() => {});
    // Tapping a reminder or outbreak alert opens the right screen.
    return onNotificationTap((url) => router.push(url as never));
  }, []);

  if (!ready || (!fontsLoaded && !fontError)) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="result" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="treatment-plan" />
        <Stack.Screen name="encyclopedia" />
        <Stack.Screen name="market" />
        <Stack.Screen name="farm-map" />
        <Stack.Screen name="add-farm" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="farm/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="new-post" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="report-price" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="outbreaks" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="methodology" />
      </Stack>
    </>
  );
}
