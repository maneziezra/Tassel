// New community post — camera-first story style.
// Fast and effortless: take or pick a photo → 1 line of caption → 1-tap post.
// Title, category, and crop are automatically inferred from the scan result.
// Edit details only if necessary.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Btn, Chip, Icon, Text, tick } from '../components/ui';
import { createPost, type Post } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { cropName, getDiseaseL } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C, FONT } from '../lib/theme';

const CATS: Post['category'][] = ['Diseases', 'Pests', 'General', 'Market'];

export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const prm = useLocalSearchParams<{
    photo?: string;
    crop?: string;
    scanLabel?: string;
    scanConfidence?: string;
    category?: string;
    title?: string;
  }>();

  const scanInfo = prm.scanLabel ? getDiseaseL(prm.scanLabel) : undefined;
  const scanPct = prm.scanConfidence ? Math.round(Number(prm.scanConfidence) * 100) : null;

  // Auto-filled defaults
  const defaultCategory: Post['category'] = useMemo(() => {
    if (prm.category && (CATS as string[]).includes(prm.category)) return prm.category as Post['category'];
    if (prm.scanLabel) {
      if (/pest|borer|armyworm|aphid|mite|caterpillar|tuta|fly/i.test(prm.scanLabel)) return 'Pests';
      return 'Diseases';
    }
    return 'General';
  }, [prm.category, prm.scanLabel]);

  const defaultTitle = useMemo(() => {
    if (prm.title) return prm.title;
    if (prm.scanLabel) {
      return `${cropName(prm.crop ?? '')}: ${scanInfo?.disease ?? prm.scanLabel}`;
    }
    if (prm.crop) {
      return `${cropName(prm.crop)} field inquiry`;
    }
    return 'Farm question';
  }, [prm.title, prm.scanLabel, prm.crop, scanInfo?.disease]);

  const defaultBody = useMemo(() => {
    if (prm.scanLabel) {
      return `Scanner detected ${scanInfo?.disease ?? prm.scanLabel} (${scanPct ?? 0}%). Need advice on treatment from fellow farmers.`;
    }
    return '';
  }, [prm.scanLabel, scanInfo?.disease, scanPct]);

  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [crop, setCrop] = useState(prm.crop && CROP_CHOICES.includes(prm.crop) ? prm.crop : prm.crop ?? '');
  const [category, setCategory] = useState<Post['category']>(defaultCategory);
  const [photo, setPhoto] = useState<string | null>(prm.photo || null);
  const [attachScan, setAttachScan] = useState(Boolean(prm.scanLabel));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = title.trim().length >= 3 && (body.trim().length >= 1 || photo !== null);

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
    if (!res.canceled && res.assets?.[0]) {
      tick('select');
      setPhoto(res.assets[0].uri);
    }
  };

  const post = async () => {
    if (!valid) {
      Alert.alert(t('Almost there'), t('Add a photo or a short note (at least 3 letters).'));
      return;
    }
    setSaving(true);
    try {
      const p = await createPost({
        title: title.trim() || defaultTitle,
        body: body.trim() || t('Shared from farm story'),
        crop,
        category,
        photoUri: photo,
        scanLabel: attachScan ? prm.scanLabel ?? null : null,
        scanConfidence: attachScan && prm.scanConfidence ? Number(prm.scanConfidence) : null,
      });
      tick('success');
      router.replace({ pathname: '/post/[id]', params: { id: p.id } });
    } catch (e) {
      Alert.alert(t('Could not post'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top Header */}
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel={t('Cancel')}>
          <Icon name="close" size={26} color={C.textMid} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>
          {prm.scanLabel ? t('Ask Community') : t('New Farm Story')}
        </Text>
        <TouchableOpacity onPress={post} disabled={saving || !valid} hitSlop={12}>
          <Text style={[st.postBtn, (!valid || saving) && { opacity: 0.4 }]}>
            {saving ? t('Posting…') : t('Post')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {/* 1. Camera / Photo First Story Hero */}
        {photo ? (
          <View style={st.photoHero}>
            <Image source={{ uri: photo }} style={st.photo} resizeMode="cover" />
            <TouchableOpacity style={st.removePhoto} onPress={() => setPhoto(null)} accessibilityLabel={t('Remove photo')}>
              <Icon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={st.changePhotoBtn} onPress={() => pick(true)}>
              <Icon name="camera-retake-outline" size={16} color="#FFFFFF" />
              <Text style={st.changePhotoTxt}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.cameraPrompt}>
            <View style={{ alignItems: 'center', gap: 6, paddingVertical: 10 }}>
              <Icon name="camera-plus-outline" size={38} color={C.primary} />
              <Text style={st.cameraPromptTitle}>Add a leaf photo</Text>
              <Text style={st.cameraPromptSub}>Photos help agronomists and neighbours diagnose issues</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={st.pickBtn} onPress={() => pick(true)}>
                <Icon name="camera" size={18} color={C.primaryDark} />
                <Text style={st.pickBtnTxt}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.pickBtn} onPress={() => pick(false)}>
                <Icon name="image" size={18} color={C.primaryDark} />
                <Text style={st.pickBtnTxt}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Scan Attachment Badge */}
        {prm.scanLabel ? (
          <TouchableOpacity style={st.scanBadge} onPress={() => setAttachScan(!attachScan)} activeOpacity={0.8}>
            <Icon name={attachScan ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={st.scanTitle}>Attach AI scan result</Text>
              <Text raw style={st.scanSub}>
                {cropName(prm.crop ?? '')} · {scanInfo?.disease ?? prm.scanLabel} ({scanPct}%)
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Story Caption Input */}
        <View style={st.captionBox}>
          <TextInput
            style={st.captionInput}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
            placeholder={t('Add a caption or ask your question...')}
            placeholderTextColor={C.textLight}
          />
        </View>

        {/* Quick Category Chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={st.quickLabel}>Topic:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {CATS.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        </View>

        {/* Primary 1-Tap Post Action */}
        <Btn
          label={saving ? 'Posting story…' : 'Share with Community'}
          icon="send"
          kind="primary"
          loading={saving}
          disabled={!valid}
          onPress={post}
          style={{ marginTop: 8 }}
        />

        {/* Expandable Advanced Details */}
        <TouchableOpacity
          style={st.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
          hitSlop={8}
        >
          <Text style={st.advancedToggleTxt}>
            {showAdvanced ? t('Hide edit details') : t('Edit title or crop details')}
          </Text>
          <Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color={C.primary} />
        </TouchableOpacity>

        {showAdvanced ? (
          <View style={st.advancedCard}>
            <Text style={st.label}>Post Title</Text>
            <TextInput
              style={st.input}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              placeholder={t('e.g. Yellow leaves on my maize')}
              placeholderTextColor={C.textLight}
            />

            <Text style={[st.label, { marginTop: 10 }]}>Crop</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
              {CROP_CHOICES.slice(0, 10).map((c) => (
                <Chip key={c} crop={c} label={cropName(c)} raw active={crop === c} onPress={() => setCrop(crop === c ? '' : c)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Text style={st.hint}>
          Posts are shared with registered farmers in your community. Photos stay on phone unless posted.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontFamily: FONT.bodyBold, color: C.text },
  postBtn: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.primary },
  photoHero: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: C.sunken,
  },
  photo: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  changePhotoTxt: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT.bodyBold },
  cameraPrompt: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.primary,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  cameraPromptTitle: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  cameraPromptSub: { fontSize: 13, color: C.textSub, textAlign: 'center' },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.primaryTint,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickBtnTxt: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.primaryDark },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  scanTitle: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.text },
  scanSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  captionBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    borderWidth: 1,
    borderColor: C.border,
  },
  captionInput: {
    fontSize: 16,
    color: C.text,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickLabel: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.textSub },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  advancedToggleTxt: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.primary },
  advancedCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.textSub },
  input: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  hint: { fontSize: 12, color: C.textSub, textAlign: 'center', marginHorizontal: 20, marginTop: 6, lineHeight: 17 },
});
