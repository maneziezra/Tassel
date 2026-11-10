// Scan screen — dark full-screen camera from v1.0, now running the real model.
// v1.0's "Processing" screen showed 4 fake timed steps (3.8 s). Here every step
// shown is real and its measured time is displayed.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiseaseModel } from '../../lib/useDiseaseModel';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { classifyPhoto, type ScanStep } from '../../lib/classifier';
import { FRAME_SHARE, frameFraction } from '../../lib/scanFrame';

import { Icon, Text, tick } from '../../components/ui';
import { NotoEmoji } from '../../components/NotoEmoji';
import { takeScanField, type ScanField } from '../../lib/navigation';
import { useLang } from '../../lib/i18n';
import { C } from '../../lib/theme';


const TIPS = [
  'Fill the frame with one leaf',
  'Use daylight — avoid flash glare',
  'Show the spots or damage clearly',
  'Hold the phone steady and close',
  'Photograph the upper side of the leaf',
];

const STEP_TEXT: Record<ScanStep, string> = {
  prepare: 'Preparing photo (crop & resize to 224×224)',
  infer: 'Running the disease model on this phone',
  done: 'Matching the treatment guide',
};

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const [focused, setFocused] = useState(true);
  // Set synchronously so a double tap cannot start two scans before React re-renders.
  const running = useRef(false);
  // Found on the TECNO (26 Oct): a tap on "Scan a leaf" elsewhere could land on this
  // screen as it appeared and press the shutter (a photo of nothing) or open the
  // gallery. A farmer's double tap does the same. The camera's own buttons wait a
  // moment after the screen opens.
  const openedAt = useRef(0);
  const settled = () => Date.now() - openedAt.current > 600;
  useFocusEffect(
    useCallback(() => {
      openedAt.current = Date.now();
      setFocused(true);
      setField(takeScanField());
      return () => setFocused(false);
    }, [])
  );
  const cameraRef = useRef<CameraView>(null);
  // The guide frame breathes gently so the eye finds it; still when reduce-motion is on.
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(withTiming(1.035, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduceMotion, breathe]);
  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const [permission, requestPermission] = useCameraPermissions();
  const tflite = useDiseaseModel();
  const [torch, setTorch] = useState(false);
  const [field, setField] = useState<ScanField | null>(null);
  const [tip, setTip] = useState(0);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ step: ScanStep; ms?: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = photoUri !== null && !error;

  useEffect(() => {
    const timer = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focused) {
      setPhotoUri(null);
      setSteps([]);
      setError(null);
      setTorch(false);
    }
  }, [focused]);

  const analyze = async (photo: { uri: string; width: number; height: number; frame?: number }) => {
    if (tflite.state !== 'loaded' || running.current) return;
    running.current = true;
    setPhotoUri(photo.uri);
    setError(null);
    setSteps([]);
    try {
      const result = await classifyPhoto(tflite.model, photo, (step, ms) => {
        setSteps((prev) => {
          const next = prev.map((p, i) => (i === prev.length - 1 && p.ms === undefined ? { ...p, ms } : p));
          return step === 'done' ? next : [...next, { step }];
        });
      });
      setSteps((prev) => [...prev, { step: 'done', ms: 0 }]);
      router.push({
        pathname: '/result',
        params: {
          label: result.top.label,
          confidence: String(result.top.confidence),
          uri: photo.uri,
          alts: JSON.stringify(result.alternatives.map((a) => [a.label, a.confidence])),
          prepareMs: String(result.timings.prepareMs),
          inferMs: String(result.timings.inferMs),
          q: result.quality.dark ? 'dark' : result.quality.blurry ? 'blurry' : '',
          ...(field ? { farmId: field.id, farmName: field.name } : {}),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyse this photo.');
    } finally {
      running.current = false;
    }
  };

  // The shutter always works (Ezra, 29 Oct: "it can't even press to shoot"): if the model is
  // still loading, the photo waits on screen and is checked the moment the model is ready.
  const [pending, setPending] = useState<{ uri: string; width: number; height: number; frame?: number } | null>(null);
  const win = useWindowDimensions();
  useEffect(() => {
    if (pending && tflite.state === 'loaded') {
      const photo = pending;
      setPending(null);
      analyze(photo);
    }
    if (pending && tflite.state === 'error') setError(t('The disease model failed to load'));
  }, [pending, tflite.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const capture = async () => {
    if (!cameraRef.current || busy || running.current || !settled()) return;
    try {
      tick('select');
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!shot) return;
      // The model sees only what was inside the gold frame, as in training.
      const photo = { uri: shot.uri, width: shot.width, height: shot.height, frame: frameFraction(win.width, win.height, shot.width, shot.height) };
      if (tflite.state === 'loaded') await analyze(photo);
      else {
        setPhotoUri(photo.uri);
        setPending(photo);
      }
    } catch {
      setError(t('Could not take a photo. Please try again.'));
    }
  };

  const pick = async () => {
    if (busy || running.current || !settled()) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!picked.canceled && picked.assets?.[0]) {
      const a = picked.assets[0];
      const photo = { uri: a.uri, width: a.width, height: a.height };
      if (tflite.state === 'loaded') await analyze(photo);
      else {
        setPhotoUri(photo.uri);
        setPending(photo);
      }
    }
  };

  // AI photo check (online): for pests, deficiencies and crops the offline model does not know.
  const sw = lang === 'sw';
  const photoCheck = () => {
    if (busy || running.current || !settled()) return;
    const go = (uri: string) => router.push({ pathname: '/photo-check', params: { uri } });
    const fromCamera = async () => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
        if (photo) go(photo.uri);
      } catch {
        setError(t('Could not take a photo. Please try again.'));
      }
    };
    const fromGallery = async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!picked.canceled && picked.assets?.[0]) go(picked.assets[0].uri);
    };
    Alert.alert(
      sw ? 'Ukaguzi wa picha wa AI' : 'AI photo check',
      sw
        ? 'Kwa wadudu, upungufu wa virutubisho na mazao ambayo skana haiyajui. Inahitaji intaneti.'
        : 'For pests, nutrient deficiencies and crops the scanner does not know. Needs internet.',
      [
        ...(permission?.granted ? [{ text: sw ? 'Piga picha' : 'Take photo', onPress: fromCamera }] : []),
        { text: sw ? 'Chagua kutoka picha' : 'Choose from gallery', onPress: fromGallery },
        { text: sw ? 'Ghairi' : 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const status = tflite.state === 'error' ? t('The disease model failed to load') : t('Works without data');

  let viewport: React.ReactNode;
  if (photoUri) {
    viewport = <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  } else if (!permission) {
    viewport = <ActivityIndicator color="#fff" />;
  } else if (!permission.granted) {
    viewport = (
      <View style={{ alignItems: 'center', paddingHorizontal: 32, gap: 12 }}>
        <Icon name="camera-off-outline" size={44} color="#9CA3AF" />
        <Text style={st.permTxt}>Tassel needs the camera to photograph leaves. You can also choose a photo from your gallery.</Text>
        <TouchableOpacity style={st.permBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    viewport = <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} active={focused} />;
  }

  return (
    <View style={st.root}>
      <View style={st.viewport}>{viewport}</View>

      {/* Top bar */}
      <View style={[st.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={st.roundBtn} onPress={() => settled() && router.navigate('/')} accessibilityLabel={t('Close scanner')}>
          <Icon name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={st.title}>Scan a leaf</Text>
          <Text raw style={st.status}>{field ? t('For {name}', { name: field.name }) : status}</Text>
        </View>
        <TouchableOpacity style={st.roundBtn} onPress={() => setTorch((v) => !v)} accessibilityLabel={t('Toggle torch')}>
          <Icon name={torch ? 'flashlight' : 'flashlight-off'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Frame + tip */}
      {!photoUri && permission?.granted ? (
        <View pointerEvents="none" style={st.frameWrap}>
          <Animated.View style={[st.frame, frameStyle]}>
            {['tl', 'tr', 'bl', 'br'].map((k) => (
              <View key={k} style={[st.corner, st[k as 'tl']]} />
            ))}
          </Animated.View>
          <View style={st.tipPill}>
            <Icon name="lightbulb-on-outline" size={14} color={C.gold} />
            <Text style={st.tipTxt}>{TIPS[tip]}</Text>
          </View>
        </View>
      ) : null}

      {/* Checking: a moving leaf and three words (the timed technical steps live in More details) */}
      {photoUri ? (
        <View style={st.overlay}>
          <View style={st.overlayCard}>
            {error ? (
              <>
                <Icon name="alert-circle-outline" size={48} color="#F2B8A6" />
                <Text style={st.overlayTitle}>{error}</Text>
                <TouchableOpacity style={st.permBtn} onPress={() => { setPhotoUri(null); setPending(null); setError(null); }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <NotoEmoji name="leaves" size={72} />
                <Text style={st.overlayTitle}>Checking your leaf…</Text>
                <ActivityIndicator color={C.gold} />
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* AI photo check entry (pests, deficiencies, other crops) */}
      {!photoUri ? (
        <TouchableOpacity style={[st.aiPill, { top: insets.top + 76 }]} onPress={photoCheck} accessibilityRole="button">
          <Icon name="bug-check-outline" size={18} color={C.gold} />
          <Text raw style={st.aiPillTxt}>
            {sw ? 'Wadudu au zao jingine? Kagua mtandaoni' : 'Pest or other crop? Check online'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Bottom controls */}
      <View style={[st.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={st.sideBtn} onPress={pick} disabled={busy} accessibilityLabel={t('Choose from gallery')}>
          <Icon name="image-multiple-outline" size={28} color="#fff" />
          <Text style={st.sideTxt}>Gallery</Text>
        </TouchableOpacity>
        {/* Big and never greyed out by the model (it waits for it instead) */}
        <TouchableOpacity
          style={[st.shutter, (!permission?.granted || busy) && { opacity: 0.4 }]}
          onPress={capture}
          disabled={!permission?.granted || busy}
          accessibilityLabel={t('Take photo and scan')}
          hitSlop={12}
        >
          <View style={st.shutterInner}>
            <Icon name="camera" size={34} color={C.dark} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={st.sideBtn} onPress={() => settled() && router.push('/encyclopedia')} accessibilityLabel={t('Disease library')}>
          <Icon name="book-open-page-variant-outline" size={26} color="#fff" />
          <Text style={st.sideTxt}>Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CORNER = 28;
const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  viewport: { ...FILL, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.35)' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '900' },
  status: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  frameWrap: { ...FILL, justifyContent: 'center', alignItems: 'center' },
  frame: { width: `${FRAME_SHARE * 100}%`, aspectRatio: 1 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.gold },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  tipPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  tipTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  overlay: { ...FILL, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  overlayCard: { backgroundColor: C.dark, borderRadius: 24, padding: 28, gap: 16, alignItems: 'center' },
  overlayTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepTxt: { flex: 1, color: '#E8ECE9', fontSize: 14 },
  stepMs: { color: C.secondary, fontWeight: '800', fontSize: 12 },
  errorTxt: { color: '#F2B8A6', fontSize: 14 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  sideBtn: { alignItems: 'center', width: 72, gap: 4 },
  sideTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  shutter: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  permTxt: { color: '#C9D2CC', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  aiPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.darkRaised, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, maxWidth: '92%' },
  aiPillTxt: { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 },
});
