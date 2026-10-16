// New community post — with an optional photo, and pre-filled from a scan when
// the farmer taps "Ask the community" (like Plantix's fallback to its community
// when the diagnosis is unclear).

import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Chip, Icon, Text } from '../components/ui';
import { createPost, type Post } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { cropName, getDiseaseL } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

const CATS: Post['category'][] = ['General', 'Pests', 'Diseases', 'Market'];

export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const prm = useLocalSearchParams<{ photo?: string; crop?: string; scanLabel?: string; scanConfidence?: string; category?: string; title?: string }>();
  const scanInfo = prm.scanLabel ? getDiseaseL(prm.scanLabel) : undefined;
  const scanPct = prm.scanConfidence ? Math.round(Number(prm.scanConfidence) * 100) : null;
  const [title, setTitle] = useState(prm.title ?? '');
  const [body, setBody] = useState(
    prm.scanLabel
      ? t('The CropGuard scanner suggested {d} ({pct}% confidence). What I see: ', { d: scanInfo?.disease ?? prm.scanLabel, pct: scanPct ?? 0 })
      : ''
  );
  const [crop, setCrop] = useState(prm.crop && CROP_CHOICES.includes(prm.crop) ? prm.crop : prm.crop ?? '');
  const [category, setCategory] = useState<Post['category']>((CATS as string[]).includes(prm.category ?? '') ? (prm.category as Post['category']) : 'General');
  const [photo, setPhoto] = useState<string | null>(prm.photo || null);
  const [attachScan, setAttachScan] = useState(Boolean(prm.scanLabel));
  const [saving, setSaving] = useState(false);

  const valid = title.trim().length >= 3 && body.trim().length >= 1;

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('Camera off'), t('Allow camera access to take a photo.'));
        return;
      }
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
  };

  const post = async () => {
    if (!valid) {
      Alert.alert(t('Almost there'), t('Add a title (at least 3 letters) and some details.'));
      return;
    }
    setSaving(true);
    try {
      const p = await createPost({
        title,
        body,
        crop,
        category,
        photoUri: photo,
        scanLabel: attachScan ? prm.scanLabel ?? null : null,
        scanConfidence: attachScan && prm.scanConfidence ? Number(prm.scanConfidence) : null,
      });
      router.replace({ pathname: '/post/[id]', params: { id: p.id } });
    } catch (e) {
      Alert.alert(t('Could not post'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('Cancel')}>
          <Icon name="close" size={26} color={C.textMid} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{prm.scanLabel ? 'Ask the community' : 'New post'}</Text>
        <TouchableOpacity onPress={post} disabled={saving}>
          <Text style={[st.postBtn, (!valid || saving) && { opacity: 0.4 }]}>{saving ? 'Posting…' : 'Post'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        {photo ? (
          <View>
            <Image source={{ uri: photo }} style={st.photo} resizeMode="cover" />
            <TouchableOpacity style={st.removePhoto} onPress={() => setPhoto(null)} accessibilityLabel={t('Remove photo')}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={st.photoBtn} onPress={() => pick(true)}>
              <Icon name="camera-outline" size={22} color={C.primary} />
              <Text style={st.photoBtnTxt}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.photoBtn} onPress={() => pick(false)}>
              <Icon name="image-outline" size={22} color={C.primary} />
              <Text style={st.photoBtnTxt}>From gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {prm.scanLabel ? (
          <TouchableOpacity style={st.scanBox} onPress={() => setAttachScan(!attachScan)}>
            <Icon name={attachScan ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={st.scanTitle}>Attach the scan result</Text>
              <Text raw style={st.scanSub}>
                {cropName(prm.crop ?? '')} — {scanInfo?.disease ?? prm.scanLabel}, {scanPct}%
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <Text style={st.label}>Category</Text>
        <View style={st.row}>
          {CATS.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <Text style={st.label}>Crop (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CROP_CHOICES.map((c) => (
            <Chip key={c} label={c} active={crop === c} onPress={() => setCrop(crop === c ? '' : c)} />
          ))}
        </ScrollView>
        <Text style={st.label}>Title *</Text>
        <TextInput style={st.input} value={title} onChangeText={setTitle} maxLength={140} placeholder={t('What is your question or topic?')} placeholderTextColor={C.textLight} />
        <Text style={st.label}>Details *</Text>
        <TextInput
          style={[st.input, { height: 170, textAlignVertical: 'top' }]}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={4000}
          placeholder={t('Describe the problem: crop, age, what you see, what you have tried, your county.')}
          placeholderTextColor={C.textLight}
        />
        <Text style={st.hint}>Your profile name is shown with the post. Be respectful — posts reported by 3 people are hidden.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  postBtn: { fontSize: 17, color: C.primary, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '800', color: C.textMid, marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  hint: { fontSize: 12, color: C.textSub, marginTop: 10, lineHeight: 17 },
  photo: { width: '100%', height: 200, borderRadius: 14, backgroundColor: C.bg },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary, backgroundColor: C.primaryTint },
  photoBtnTxt: { color: C.primary, fontWeight: '800' },
  scanBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.bg },
  scanTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  scanSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
});
