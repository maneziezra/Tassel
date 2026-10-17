// Report a price — what a farmer was paid (or saw) at a market. Shown to other
// farmers only as the median per crop, county and unit, never individually.

import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, Icon, Text } from '../components/ui';
import { addPriceReport, getProfile, type PriceUnit } from '../lib/data';
import { COUNTIES, CROP_CHOICES } from '../lib/counties';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

const UNITS: PriceUnit[] = ['kg', '90kg bag', '50kg bag', 'crate', 'piece'];
// Plausible KES ranges per unit, to catch typing mistakes (e.g. an extra zero)
const RANGE: Record<PriceUnit, [number, number]> = {
  kg: [1, 2000],
  '90kg bag': [300, 30000],
  '50kg bag': [200, 20000],
  crate: [100, 15000],
  piece: [1, 5000],
};

export default function ReportPriceScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const [crop, setCrop] = useState('');
  const [county, setCounty] = useState('');
  const [market, setMarket] = useState('');
  const [unit, setUnit] = useState<PriceUnit>('kg');
  const [price, setPrice] = useState('');
  const [showCounties, setShowCounties] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p.county) setCounty(p.county);
      })
      .catch(() => {});
  }, []);

  const value = Number(price.replace(/[, ]/g, ''));
  const valid = crop && county && Number.isFinite(value) && value > 0;

  const send = async () => {
    if (!valid) {
      Alert.alert(t('Almost there'), t('Choose the crop and county and enter the price.'));
      return;
    }
    const [lo, hi] = RANGE[unit];
    if (value < lo || value > hi) {
      Alert.alert(t('Check the price'), t('KES {v} per {unit} looks unusual. Please check the number and the unit.', { v: value.toLocaleString(), unit: t(unit) }));
      return;
    }
    setSaving(true);
    try {
      await addPriceReport({ crop, county, market, unit, price_kes: value });
      Alert.alert(t('Thank you'), t('Your price helps other farmers get a fair deal.'));
      router.back();
    } catch (e) {
      Alert.alert(t('Could not send'), e instanceof Error ? e.message : '');
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
        <Text style={st.title}>Report a price</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 6, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text style={st.label}>Crop *</Text>
        <View style={st.wrap}>
          {CROP_CHOICES.map((c) => (
            <Chip key={c} label={c} active={crop === c} onPress={() => setCrop(c)} />
          ))}
        </View>

        <Text style={st.label}>County *</Text>
        <TouchableOpacity style={st.select} onPress={() => setShowCounties(!showCounties)}>
          <Icon name="map-marker-outline" size={20} color={county ? C.primary : C.textLight} />
          <Text raw style={[st.selectTxt, !county && { color: C.textLight }]}>
            {county || t('Choose county')}
          </Text>
          <Icon name={showCounties ? 'chevron-up' : 'chevron-down'} size={20} color={C.textSub} />
        </TouchableOpacity>
        {showCounties ? (
          <View style={st.wrap}>
            {COUNTIES.map((c) => (
              <Chip
                key={c}
                raw
                label={c}
                active={county === c}
                onPress={() => {
                  setCounty(c);
                  setShowCounties(false);
                }}
              />
            ))}
          </View>
        ) : null}

        <Text style={st.label}>Market (optional)</Text>
        <TextInput style={st.input} value={market} onChangeText={setMarket} maxLength={60} placeholder={t('e.g. Wakulima market, farm gate')} placeholderTextColor={C.textLight} />

        <Text style={st.label}>Unit *</Text>
        <View style={st.wrap}>
          {UNITS.map((u) => (
            <Chip key={u} label={u} active={unit === u} onPress={() => setUnit(u)} />
          ))}
        </View>

        <Text style={st.label}>Price (KES) *</Text>
        <TextInput style={[st.input, st.price]} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="0" placeholderTextColor={C.textLight} maxLength={7} />
        <Text style={st.hint}>Report the price you were paid or saw today. Reports are anonymous: a price shows only as a median once 3 or more farmers have reported that crop in the county.</Text>
        <Btn label="Send price" icon="send" onPress={send} loading={saving} disabled={!valid} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.surface },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  label: { fontSize: 13, fontWeight: '800', color: C.textMid, marginTop: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: C.border, marginTop: 6 },
  selectTxt: { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
  input: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border, marginTop: 6 },
  price: { fontSize: 24, fontWeight: '900' },
  hint: { fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 17 },
});
