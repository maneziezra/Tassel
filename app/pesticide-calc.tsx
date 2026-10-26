// Tassel — Pesticide & Herbicide Calculator (Knapsack Tank-Mix & Safety).
// Built strictly from Kenya PCPB registered products (pcpb.go.ke).
// Excludes June 2025 banned/restricted chemicals. Mancozeb under review.
// Computes knapsack loads (16L / 20L), total product, PPE, PHI, and spray weather suitability.

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Chip, Header, Icon, Press, Segmented, Stepper, Text, tick } from '../components/ui';
import { listFarms, type Farm } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { cropName } from '../lib/diseases';
import { getPosition } from '../lib/geo';
import { useLang } from '../lib/i18n';
import {
  ALL_PCPB_PRODUCTS,
  calculateKnapsackMix,
  findPcpbProducts,
  PCPB_DISCLAIMER,
  type PcpbCategory,
  type PcpbProduct,
} from '../lib/pcpb';
import { fmtArea, fromAcres, setPrefs, toAcres, usePrefs, type Units } from '../lib/prefs';
import { C, FONT } from '../lib/theme';
import { getWeather, type Weather } from '../lib/weather';

const CATEGORIES: Array<{ id: PcpbCategory; label: string; icon: 'spray' | 'leaf' | 'bug-outline' }> = [
  { id: 'herbicide', label: 'Herbicides (Weeds)', icon: 'leaf' },
  { id: 'fungicide', label: 'Fungicides (Blight & Rust)', icon: 'spray' },
  { id: 'insecticide', label: 'Insecticides (Pests)', icon: 'bug-outline' },
];

export default function PesticideCalcScreen() {
  const { t } = useLang();
  const prefs = usePrefs();
  const units: Units = prefs.units;
  const prm = useLocalSearchParams<{ crop?: string; category?: string; problem?: string }>();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [crop, setCrop] = useState<string>(prm.crop ? prm.crop.charAt(0).toUpperCase() + prm.crop.slice(1) : 'Maize');
  const [category, setCategory] = useState<PcpbCategory>(
    prm.category === 'fungicide' || prm.category === 'insecticide' || prm.category === 'herbicide'
      ? prm.category
      : 'herbicide'
  );
  const [selectedProduct, setSelectedProduct] = useState<PcpbProduct | null>(null);
  const [knapsackSize, setKnapsackSize] = useState<16 | 20>(20);
  const [acres, setAcres] = useState<number>(1);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  useFocusEffect(
    useCallback(() => {
      listFarms().then((list) => {
        setFarms(list);
        if (list.length > 0 && !fieldId && list[0].size_acres) {
          setFieldId(list[0].id);
          setAcres(Number(list[0].size_acres));
          if (list[0].crop) {
            setCrop(list[0].crop);
          }
        }
      }).catch(() => {});

      getPosition().then((pos) => {
        if (pos) getWeather(pos.lat, pos.lng).then(setWeather).catch(() => {});
      });
    }, [fieldId])
  );

  // Filter registered products matching crop and category
  const matchingProducts = useMemo(() => {
    const list = findPcpbProducts({ crop: crop.toLowerCase(), category });
    if (list.length > 0) return list;
    return ALL_PCPB_PRODUCTS.filter((p) => p.category === category);
  }, [crop, category]);

  // Active product
  const activeProduct = useMemo(() => {
    if (selectedProduct && matchingProducts.some((p) => p.id === selectedProduct.id)) {
      return selectedProduct;
    }
    return matchingProducts[0] ?? ALL_PCPB_PRODUCTS[0];
  }, [selectedProduct, matchingProducts]);

  // Live tank-mix calculations
  const calc = useMemo(() => {
    return calculateKnapsackMix(activeProduct, knapsackSize, acres);
  }, [activeProduct, knapsackSize, acres]);

  // Weather spray window suitability
  const sprayAssessment = useMemo(() => {
    if (!weather) return null;
    const currentWind = weather.wind ?? 5;
    const currentRain = weather.rainMm ?? 0;
    const isRaining = currentRain > 0.5 || weather.code >= 51;
    const isWindy = currentWind > 15;

    if (isRaining) {
      return {
        level: 'Poor',
        color: C.error,
        title: t('Hold off spraying — Rain active'),
        reason: t('Rain washes chemical wash-off into soil. Wait for foliage to dry.'),
      };
    }
    if (isWindy) {
      return {
        level: 'Fair',
        color: C.warn,
        title: t('Caution — High wind ({spd} km/h)', { spd: Math.round(currentWind) }),
        reason: t('Spray drift danger to non-target crops and beneficial insects.'),
      };
    }
    return {
      level: 'Good',
      color: C.primary,
      title: t('Favourable spraying conditions now'),
      reason: t('Calm winds (< 15 km/h) and no heavy rain expected in the immediate window.'),
    };
  }, [weather, t]);

  const shareRecipe = () => {
    tick('success');
    const head = `🧪 *${t('Tassel Knapsack Spray Recipe')}*\n`;
    const details = [
      `*${t('Crop')}*: ${cropName(crop)} (${fmtArea(acres, units)})`,
      `*${t('Product')}*: ${activeProduct.name} (${activeProduct.regNo})`,
      `*${t('Active')}*: ${activeProduct.active}`,
      `*${t('Knapsack size')}*: ${knapsackSize} Litres`,
      `\n*${t('Tank Mix')}*:`,
      `• *${t('Dose per tank')}*: ${calc.tankDose}`,
      `• *${t('Tanks needed')}*: ~${calc.totalTanks} ${t('knapsack loads')}`,
      `• *${t('Total product needed')}*: ${calc.totalProductText}`,
      `\n*${t('Safety & Harvest')}*:`,
      activeProduct.phiDays ? `• ${t('Pre-Harvest Interval (PHI)')}: ${activeProduct.phiDays} ${t('days')}` : '',
      activeProduct.reiHours ? `• ${t('Re-Entry Interval (REI)')}: ${activeProduct.reiHours} ${t('hours')}` : '',
      activeProduct.ppe ? `• ${t('Required PPE')}: ${activeProduct.ppe.join(', ')}` : '',
      `\n${PCPB_DISCLAIMER}`,
      `— ${t('Planned with Tassel (ke.tassel.app)')}`,
    ].filter(Boolean).join('\n');

    Share.share({ message: head + details });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Pesticide Calculator" subtitle={t('PCPB registered tank-mixes & safety')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        {/* Step 1: Crop Selection */}
        <View style={st.panel}>
          <Text style={st.sectionTitle}>1. Select Crop</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
            {CROP_CHOICES.slice(0, 10).map((c) => (
              <Chip key={c} crop={c} label={cropName(c)} raw active={crop === c} onPress={() => { setCrop(c); setSelectedProduct(null); }} />
            ))}
          </ScrollView>
        </View>

        {/* Step 2: Problem Category */}
        <View style={st.panel}>
          <Text style={st.sectionTitle}>2. Choose Problem Category</Text>
          <View style={st.categoryRow}>
            {CATEGORIES.map((cat) => {
              const on = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[st.catBtn, on && st.catBtnOn]}
                  onPress={() => {
                    tick('select');
                    setCategory(cat.id);
                    setSelectedProduct(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name={cat.icon} size={20} color={on ? C.primaryDark : C.textMid} />
                  <Text raw style={[st.catBtnTxt, on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Registered PCPB Products */}
        <View style={st.panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={st.sectionTitle}>3. Registered PCPB Options</Text>
            <Text style={st.small}>{matchingProducts.length} legal options</Text>
          </View>
          <Text style={st.subNotice}>Only PCPB verified products. Excludes banned active ingredients.</Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            {matchingProducts.map((p) => {
              const on = p.id === activeProduct.id;
              return (
                <Press
                  key={p.id}
                  haptic
                  style={[st.prodCard, on && st.prodCardOn]}
                  onPress={() => setSelectedProduct(p)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text raw style={st.prodName}>
                        {p.name}
                      </Text>
                      <Text raw style={st.prodActive}>
                        {p.active}
                      </Text>
                    </View>
                    <View style={st.regBadge}>
                      <Text raw style={st.regBadgeTxt}>
                        {p.regNo}
                      </Text>
                    </View>
                  </View>
                  <Text raw style={st.prodTargets}>
                    {t('Targets')}: {p.targets}
                  </Text>
                  {p.warning ? (
                    <Text raw style={st.warningTxt}>
                      ⚠ {p.warning}
                    </Text>
                  ) : null}
                </Press>
              );
            })}
          </View>
        </View>

        {/* Step 4: Knapsack & Field Size Dial */}
        <View style={st.panel}>
          <Text style={st.sectionTitle}>4. Field & Sprayer Calibration</Text>

          {/* Knapsack Sprayer Size */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <View>
              <Text style={st.label}>Knapsack Sprayer Tank</Text>
              <Text style={st.small}>Standard Kenyan backpack size</Text>
            </View>
            <Segmented
              value={String(knapsackSize)}
              onChange={(v) => setKnapsackSize(Number(v) as 16 | 20)}
              options={[
                { value: '16', label: '16 Litres' },
                { value: '20', label: '20 Litres' },
              ]}
              style={{ width: 170 }}
            />
          </View>

          {/* Field Area Stepper */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={st.label}>Field Size</Text>
            <Segmented
              value={units}
              onChange={(u) => setPrefs({ units: u })}
              options={[
                { value: 'acres', label: 'Acres' },
                { value: 'hectares', label: 'Hectares' },
              ]}
              style={{ width: 170 }}
            />
          </View>
          <Stepper
            big
            value={Number(fromAcres(acres, units).toFixed(2))}
            step={units === 'acres' ? 0.25 : 0.1}
            min={units === 'acres' ? 0.25 : 0.1}
            max={100}
            unit={units === 'acres' ? 'acres' : 'hectares'}
            onChange={(v) => {
              setFieldId(null);
              setAcres(toAcres(v, units));
            }}
          />

          {/* Saved field chips */}
          {farms.some((f) => f.size_acres) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {farms.filter((f) => f.size_acres).map((f) => (
                <Chip
                  key={f.id}
                  crop={f.crop ?? undefined}
                  label={`${f.name} · ${fmtArea(Number(f.size_acres), units)}`}
                  raw
                  active={fieldId === f.id}
                  onPress={() => {
                    setFieldId(f.id);
                    setAcres(Number(f.size_acres));
                    if (f.crop) setCrop(f.crop);
                  }}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Step 5: Tank-Mix Recipe Card */}
        <View style={[st.panel, { backgroundColor: C.primaryTint }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="flask-outline" size={24} color={C.primary} />
            <Text style={st.appTitle}>Knapsack Tank Mix</Text>
          </View>

          <View style={st.metricGrid}>
            <View style={st.metricBox}>
              <Text style={st.metricLbl}>Dose per Tank ({knapsackSize}L)</Text>
              <Text raw style={st.metricVal}>
                {calc.tankDose}
              </Text>
            </View>
            <View style={st.metricBox}>
              <Text style={st.metricLbl}>Estimated Loads</Text>
              <Text raw style={st.metricVal}>
                ~{calc.totalTanks} tanks
              </Text>
            </View>
          </View>

          <View style={st.totalBanner}>
            <Text style={st.totalLbl}>Total product to purchase for field:</Text>
            <Text raw style={st.totalVal}>
              {calc.totalProductText}
            </Text>
          </View>

          {activeProduct.timing ? (
            <View style={st.timingBox}>
              <Icon name="clock-outline" size={16} color={C.primaryDark} />
              <Text raw style={st.timingTxt}>
                {activeProduct.timing}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Step 6: Safety, PPE, Pre-Harvest Interval (PHI) */}
        <View style={st.panel}>
          <Text style={st.sectionTitle}>Safety & Harvest Intervals</Text>

          <View style={st.safetyRow}>
            {activeProduct.phiDays !== undefined ? (
              <View style={st.safetyBadge}>
                <Icon name="calendar-alert" size={18} color={C.error} />
                <View>
                  <Text raw style={st.safetyNum}>
                    {activeProduct.phiDays} {t('days')}
                  </Text>
                  <Text style={st.safetyLbl}>Pre-Harvest Interval (PHI)</Text>
                </View>
              </View>
            ) : null}

            {activeProduct.reiHours !== undefined ? (
              <View style={st.safetyBadge}>
                <Icon name="account-clock-outline" size={18} color={C.warn} />
                <View>
                  <Text raw style={st.safetyNum}>
                    {activeProduct.reiHours} {t('hours')}
                  </Text>
                  <Text style={st.safetyLbl}>Re-Entry Interval (REI)</Text>
                </View>
              </View>
            ) : null}
          </View>

          {activeProduct.ppe ? (
            <View style={{ marginTop: 12 }}>
              <Text style={st.label}>Required PPE:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {activeProduct.ppe.map((item) => (
                  <View key={item} style={st.ppeChip}>
                    <Icon name="shield-check" size={14} color={C.primary} />
                    <Text raw style={st.ppeChipTxt}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Step 7: Spray Weather Suitability */}
        {sprayAssessment ? (
          <View style={st.panel}>
            <Text style={st.sectionTitle}>Local Spraying Weather Window</Text>
            <View style={[st.weatherBanner, { borderColor: sprayAssessment.color }]}>
              <Icon name="weather-windy" size={22} color={sprayAssessment.color} />
              <View style={{ flex: 1 }}>
                <Text raw style={[st.weatherTitle, { color: sprayAssessment.color }]}>
                  {sprayAssessment.title}
                </Text>
                <Text raw style={st.weatherSub}>
                  {sprayAssessment.reason}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          <Btn label="Share mix recipe" icon="share-variant" kind="primary" onPress={shareRecipe} />
        </View>

        <Text style={st.foot}>
          {PCPB_DISCLAIMER} Registered under the Pest Control Products Act (Cap 346, Laws of Kenya).
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  sectionTitle: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  label: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  appTitle: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  small: { fontSize: 13, color: C.textSub },
  subNotice: { fontSize: 12, color: C.textSub, marginTop: 2 },
  categoryRow: { gap: 8, marginTop: 10 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catBtnOn: {
    borderColor: C.primary,
    backgroundColor: C.primaryTint,
  },
  catBtnTxt: { fontSize: 14, color: C.textMid },
  prodCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  prodCardOn: {
    borderColor: C.primary,
    backgroundColor: C.primaryTint,
  },
  prodName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  prodActive: { fontSize: 13, color: C.textMid },
  regBadge: {
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  regBadgeTxt: { fontSize: 11, fontFamily: FONT.bodyBold, color: C.primary },
  prodTargets: { fontSize: 12, color: C.textSub, marginTop: 2 },
  warningTxt: { fontSize: 12, color: C.error, marginTop: 2 },
  metricGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metricBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricLbl: { fontSize: 12, color: C.textSub, textAlign: 'center' },
  metricVal: { fontSize: 18, fontFamily: FONT.display, color: C.primaryDark },
  totalBanner: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  totalLbl: { fontSize: 13, color: C.textSub },
  totalVal: { fontSize: 22, fontFamily: FONT.display, color: C.text, marginTop: 2 },
  timingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  timingTxt: { flex: 1, fontSize: 12, color: C.primaryDark },
  safetyRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  safetyBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    padding: 10,
    borderRadius: 12,
  },
  safetyNum: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  safetyLbl: { fontSize: 11, color: C.textSub },
  ppeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ppeChipTxt: { fontSize: 12, color: C.textMid },
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  weatherTitle: { fontSize: 14, fontFamily: FONT.bodyBold },
  weatherSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  foot: { fontSize: 12, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 20, lineHeight: 18 },
});
