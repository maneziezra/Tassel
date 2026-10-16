import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { classifyPhoto, ScanResult, CONFIDENCE_THRESHOLD } from '../../lib/classifier';

const MODEL = require('../../assets/model/cropguard.tflite');

export default function ScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const tflite = useTensorflowModel(MODEL, []);

  const [busy, setBusy] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const modelReady = tflite.state === 'loaded';

  const analyze = async (photo: { uri: string; width: number; height: number }) => {
    if (tflite.state !== 'loaded') return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPhotoUri(photo.uri);
    try {
      const t0 = Date.now();
      const r = await classifyPhoto(tflite.model, photo);
      setElapsedMs(Date.now() - t0);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyse this photo.');
    } finally {
      setBusy(false);
    }
  };

  const scanWithCamera = async () => {
    if (!cameraRef.current || busy) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) await analyze(photo);
    } catch {
      setError('Could not take a photo. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!picked.canceled && picked.assets?.[0]) {
      const a = picked.assets[0];
      await analyze({ uri: a.uri, width: a.width, height: a.height });
    }
  };

  const askAdvisor = () => {
    if (!result) return;
    router.push({
      pathname: '/advisor',
      params: {
        crop: result.top.crop,
        disease: result.top.disease,
        confidence: String(Math.round(result.top.confidence * 100)),
      },
    });
  };

  const reset = () => {
    setResult(null);
    setPhotoUri(null);
    setError(null);
  };

  // ---------- Camera viewport ----------
  let viewport: React.ReactNode;
  if (photoUri) {
    viewport = <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />;
  } else if (!permission) {
    viewport = <ActivityIndicator color="white" />;
  } else if (!permission.granted) {
    viewport = (
      <View className="items-center px-6">
        <FontAwesome5 name="camera" size={40} color="#9CA3AF" />
        <Text className="text-gray-300 mt-3 text-center">CropGuard needs the camera to photograph leaves.</Text>
        <TouchableOpacity className="mt-4 bg-green-600 px-5 py-2 rounded-xl" onPress={requestPermission}>
          <Text className="text-white font-bold">Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    viewport = <CameraView ref={cameraRef} style={{ width: '100%', height: '100%' }} facing="back" />;
  }

  const pct = (p: number) => `${Math.round(p * 100)}%`;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <View className="mb-6 mt-4">
        <Text className="text-3xl font-extrabold text-green-800">Scanner</Text>
        <Text className="text-gray-500 mt-1 text-base">
          {modelReady
            ? 'Detects 38 leaf conditions on the phone — works offline.'
            : tflite.state === 'error'
            ? 'The disease model failed to load.'
            : 'Loading disease model…'}
        </Text>
      </View>

      {/* Viewport */}
      <View className="w-full h-80 bg-gray-900 rounded-3xl overflow-hidden justify-center items-center shadow-lg border-4 border-gray-200 relative">
        {viewport}
        {!photoUri && permission?.granted && (
          <View pointerEvents="none" className="absolute inset-0 border-2 border-green-500/40 m-8 rounded-xl" />
        )}
      </View>
      {!photoUri && permission?.granted && (
        <Text className="text-gray-400 text-xs text-center mt-2">Fill the square with one leaf, in good light.</Text>
      )}

      {/* Actions */}
      {photoUri ? (
        <TouchableOpacity
          className="mt-6 bg-gray-800 py-4 rounded-2xl flex-row justify-center items-center"
          onPress={reset}
          disabled={busy}
        >
          <FontAwesome5 name="redo" size={16} color="white" />
          <Text className="text-white font-bold text-lg ml-3">Scan another leaf</Text>
        </TouchableOpacity>
      ) : (
        <View className="mt-6 flex-row">
          <TouchableOpacity
            className={`flex-1 ${modelReady && permission?.granted ? 'bg-green-600' : 'bg-gray-400'} py-4 rounded-2xl flex-row justify-center items-center mr-2`}
            onPress={scanWithCamera}
            disabled={!modelReady || !permission?.granted || busy}
          >
            <FontAwesome5 name="camera" size={18} color="white" />
            <Text className="text-white font-bold text-lg ml-3">Scan Crop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`${modelReady ? 'bg-white border border-green-600' : 'bg-gray-200'} px-5 rounded-2xl justify-center items-center`}
            onPress={pickFromGallery}
            disabled={!modelReady || busy}
          >
            <FontAwesome5 name="image" size={20} color={modelReady ? '#16A34A' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      )}

      {busy && (
        <View className="mt-6 flex-row items-center justify-center">
          <ActivityIndicator color="#16A34A" />
          <Text className="text-gray-600 ml-3 font-medium">Analysing leaf…</Text>
        </View>
      )}

      {tflite.state === 'error' && (
        <Text className="mt-6 text-red-600 text-center">Model error: {tflite.error.message}</Text>
      )}

      {error && <Text className="mt-6 text-red-600 text-center">{error}</Text>}

      {/* Result */}
      {result && (
        <View
          className={`mt-6 bg-white p-6 rounded-3xl shadow-sm border ${
            result.uncertain ? 'border-amber-200' : result.top.healthy ? 'border-green-200' : 'border-red-100'
          }`}
        >
          <View className="flex-row items-center mb-3">
            <View
              className={`p-2 rounded-full mr-3 ${
                result.uncertain ? 'bg-amber-100' : result.top.healthy ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <FontAwesome5
                name={result.uncertain ? 'question' : result.top.healthy ? 'check' : 'exclamation-triangle'}
                size={16}
                color={result.uncertain ? '#D97706' : result.top.healthy ? '#16A34A' : '#DC2626'}
              />
            </View>
            <Text className="text-xl font-bold text-gray-800">
              {result.uncertain ? 'Not sure' : result.top.healthy ? 'Looks healthy' : 'Disease detected'}
            </Text>
          </View>

          <Text className="text-gray-500 text-sm">{result.top.crop}</Text>
          <Text
            className={`text-2xl font-black mb-2 ${
              result.uncertain ? 'text-amber-600' : result.top.healthy ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {result.top.disease}
          </Text>

          {/* Confidence bar */}
          <View className="flex-row items-center mb-1">
            <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
              <View
                className={`h-2 ${result.uncertain ? 'bg-amber-500' : 'bg-green-600'}`}
                style={{ width: pct(result.top.confidence) as `${number}%` }}
              />
            </View>
            <Text className="text-gray-700 font-bold">{pct(result.top.confidence)}</Text>
          </View>
          <Text className="text-gray-400 text-xs mb-4">
            Confidence{elapsedMs !== null ? ` · analysed on-device in ${(elapsedMs / 1000).toFixed(1)}s` : ''}
          </Text>

          {result.uncertain && (
            <Text className="text-amber-700 bg-amber-50 p-3 rounded-xl mb-4 leading-relaxed">
              Confidence is below {Math.round(CONFIDENCE_THRESHOLD * 100)}%. Retake the photo in better light, or confirm
              with an agricultural extension officer.
            </Text>
          )}

          {result.alternatives.length > 0 && (
            <View className="mb-4">
              <Text className="text-gray-500 text-xs mb-1">Other possibilities</Text>
              {result.alternatives.map((a) => (
                <Text key={a.label} className="text-gray-600 text-sm">
                  {a.crop} — {a.disease} ({pct(a.confidence)})
                </Text>
              ))}
            </View>
          )}

          {!result.top.healthy && (
            <TouchableOpacity className="bg-red-50 py-3 rounded-xl border border-red-200 items-center" onPress={askAdvisor}>
              <Text className="text-red-700 font-bold">Ask AI Advisor for Treatment</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}
