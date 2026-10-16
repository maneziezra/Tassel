// Add field — v1.0 AddFarmScreen (name, crop chips, size, location, notes),
// saved to Supabase. If the field was drawn on the map, its measured area and
// boundary are filled in automatically. v2.1: planting date → crop calendar.

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, Icon, Text } from '../components/ui';
import { DateField } from '../components/DateField';
import { addFarm, type LatLng } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { centroid, getPosition } from '../lib/geo';
import { calendarFor, fieldTasks } from '../lib/calendar';
import { ensurePermission, scheduleFieldReminders } from '../lib/notify';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

const STAGES = ['Land preparation', 'Planted', 'Vegetative', 'Flowering', 'Fruiting / grain fill', 'Harvested'];

export default function AddFarmScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const params = useLocalSearchParams<{ polygon?: string; acres?: string }>();
  const polygon: LatLng[] | null = (() => {
    try {
      return params.polygon ? JSON.parse(params.polygon) : null;
    } catch {
      return null;
    }
  })();
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('');
  const [size, setSize] = useState(params.acres ? Number(params.acres).toFixed(2) : '');
  const [stage, setStage] = useState('');
  const [planted, setPlanted] = useState<string | null>(null);
  const [remind, setRemind] = useState(true);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(polygon ? centroid(polygon) : null);
  const [saving, setSaving] = useState(false);
  const cal = calendarFor(crop);

  const useMyLocation = async () => {
    const pos = await getPosition();
    if (pos) setGps(pos);
    else Alert.alert(t('Location off'), t('Allow location access to pin the field.'));
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('Name needed'), t('Give the field a name, e.g. "Shamba la juu".'));
      return;
    }
    const acres = size ? Number(size.replace(',', '.')) : null;
    if (acres !== null && (!Number.isFinite(acres) || acres < 0 || acres > 10000)) {
      Alert.alert(t('Check the size'), t('Enter the size in acres, e.g. 1.5'));
      return;
    }
    setSaving(true);
    try {
      const farm = await addFarm({
        name: name.trim(),
        crop: crop.trim() || null,
        size_acres: acres,
        stage: stage || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        polygon,
        center_lat: gps?.lat ?? null,
        center_lng: gps?.lng ?? null,
        ...(planted ? { planting_date: planted } : {}),
      });
      if (planted && cal && remind && (await ensurePermission())) {
        await scheduleFieldReminders(farm.id, fieldTasks(farm, [], lang));
      }
      router.back();
    } catch (e) {
      Alert.alert(t('Could not save'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('Close')}>
          <Icon name="close" size={26} color={C.textMid} />
        </TouchableOpacity>
        <Text style={st.title}>Add field</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 6, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {polygon ? (
          <View style={st.mapped}>
            <Icon name="vector-polygon" size={20} color={C.primary} />
            <Text style={st.mappedTxt}>{t('Boundary drawn on the map, {n} acres measured', { n: Number(params.acres).toFixed(2) })}</Text>
          </View>
        ) : (
          <TouchableOpacity style={st.mapBtn} onPress={() => router.replace('/farm-map')}>
            <Icon name="map-marker-path" size={20} color={C.primary} />
            <Text style={st.mapBtnTxt}>Draw the field on the satellite map to measure its size</Text>
          </TouchableOpacity>
        )}
        <Text style={st.label}>Field name *</Text>
        <TextInput style={st.input} value={name} onChangeText={setName} maxLength={80} placeholder={t("e.g. Muthoni's tomato plot")} placeholderTextColor={C.textLight} />
        <Text style={st.label}>Main crop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {CROP_CHOICES.map((c) => (
            <Chip key={c} label={c} active={crop === c} onPress={() => setCrop(crop === c ? '' : c)} />
          ))}
        </ScrollView>

        <Text style={st.label}>{cal ? cal.plantingLabel[lang] : t('Planting date')}</Text>
        <DateField value={planted} onChange={setPlanted} placeholder="Choose the planting date" />
        {planted && cal ? (
          <TouchableOpacity style={st.remind} onPress={() => setRemind(!remind)}>
            <Icon name={remind ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={C.primary} />
            <Text style={st.remindTxt}>Remind me of each task (weeding, top-dressing, scouting, harvest)</Text>
          </TouchableOpacity>
        ) : (
          <Text style={st.hint}>{crop && !cal ? t('A crop calendar is available for maize, beans, potato, tomato and wheat.') : t('With a planting date you get a week-by-week crop calendar.')}</Text>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Size (acres)</Text>
            <TextInput style={st.input} value={size} onChangeText={setSize} keyboardType="decimal-pad" placeholder={t('e.g. 2.5')} placeholderTextColor={C.textLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Village / area</Text>
            <TextInput style={st.input} value={location} onChangeText={setLocation} maxLength={80} placeholder={t('e.g. Ruiru')} placeholderTextColor={C.textLight} />
          </View>
        </View>
        <Text style={st.label}>Crop stage</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STAGES.map((s) => (
            <Chip key={s} label={s} active={stage === s} onPress={() => setStage(stage === s ? '' : s)} />
          ))}
        </View>
        {!polygon ? (
          <TouchableOpacity style={st.gpsRow} onPress={useMyLocation}>
            <Icon name={gps ? 'map-marker-check' : 'crosshairs-gps'} size={20} color={gps ? C.primary : C.info} />
            <Text style={[st.mapBtnTxt, { color: gps ? C.primary : C.info }]}>
              {gps ? t('Pinned at {lat}, {lng}', { lat: gps.lat.toFixed(4), lng: gps.lng.toFixed(4) }) : t("I'm at the field — pin my location")}
            </Text>
          </TouchableOpacity>
        ) : null}
        <Text style={st.label}>Notes</Text>
        <TextInput
          style={[st.input, { height: 90, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
          placeholder={t('Variety, soil, irrigation…')}
          placeholderTextColor={C.textLight}
        />
        <Btn label="Save field" icon="check-circle-outline" onPress={save} loading={saving} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  label: { fontSize: 13, fontWeight: '800', color: C.textMid, marginTop: 12 },
  hint: { fontSize: 12, color: C.textSub, marginTop: 6 },
  input: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border, marginTop: 6 },
  mapped: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primaryTint, padding: 12, borderRadius: 12 },
  mappedTxt: { flex: 1, color: C.primaryDark, fontWeight: '700' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary },
  mapBtnTxt: { flex: 1, color: C.primary, fontWeight: '700' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: C.surface },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  remindTxt: { flex: 1, fontSize: 13, color: C.textMid, fontWeight: '600' },
});
