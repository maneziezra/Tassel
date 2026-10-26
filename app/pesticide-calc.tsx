// Tassel — spray calculator for PCPB-registered products.
// Flow (handoff P2): crop → problem (from the scan, or pick) → registered options →
// tank mix (label rate × the farmer's tank and field) → safety → today's spray window.
// Crop and field come from the farmer's saved fields; the problem from the scan.
// A dose appears only when it is quoted from the product label (lib/pcpbCore.ts).

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Btn, Chip, Header, Icon, Press, Segmented, Stepper, Text, tick } from '../components/ui';
import { PcpbProductCard } from '../components/PcpbProductCard';
import { listFarms, type Farm } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { cropName } from '../lib/diseases';
import { getPosition } from '../lib/geo';
import { useLang } from '../lib/i18n';
import {
  cropKey,
  fmtDose,
  PCPB,
  PCPB_DISCLAIMER,
  planMix,
  PPE_EN,
  problemKey,
  PROBLEMS,
  productsFor,
  type ProblemKey,
} from '../lib/pcpb';
import { fmtArea, fromAcres, setPrefs, toAcres, usePrefs, type Units } from '../lib/prefs';
import { C, FONT } from '../lib/theme';
import { getWeather, type Weather } from '../lib/weather';

const HA_PER_ACRE = 0.404686;
const SHOWN = 4;

const KIND_ICON = { fungicide: 'mushroom-outline', insecticide: 'bug-outline', herbicide: 'sprout-outline', other: 'flask-outline' } as const;

export default function PesticideCalcScreen() {
  const { t } = useLang();
  const prefs = usePrefs();
  const units: Units = prefs.units;
  const prm = useLocalSearchParams<{ crop?: string; problem?: string }>();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [cropText, setCropText] = useState<string>(prm.crop ?? '');
  const [problem, setProblem] = useState<ProblemKey | null>(problemKey(prm.problem));
  const [regNo, setRegNo] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [tankL, setTankL] = useState<16 | 20>(20);
  const [acres, setAcres] = useState(1);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [tanksOverride, setTanksOverride] = useState<number | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  useFocusEffect(
    useCallback(() => {
      listFarms()
        .then((list) => {
          setFarms(list);
          // Pre-fill from the farmer's first field unless a crop was passed in.
          const first = list.find((f) => f.size_acres);
          if (first && !fieldId) {
            setFieldId(first.id);
            setAcres(Number(first.size_acres));
            if (!prm.crop && first.crop) setCropText(first.crop);
          }
        })
        .catch(() => {});
      getPosition(false).then((pos) => {
        if (pos) getWeather(pos.lat, pos.lng).then(setWeather).catch(() => {});
      });
    }, [fieldId, prm.crop])
  );

  const crop = cropKey(cropText) ?? cropKey(prefs.avatarCrop) ?? 'maize';

  // Problems that have at least one registered product for this crop.
  const problems = useMemo(
    () => (Object.keys(PROBLEMS) as ProblemKey[]).filter((k) => productsFor(PCPB, { crop, problem: k, limit: 1 }).length > 0),
    [crop]
  );
  const activeProblem = problem && problems.includes(problem) ? problem : null;

  const products = useMemo(() => (activeProblem ? productsFor(PCPB, { crop, problem: activeProblem }) : []), [crop, activeProblem]);
  const product = products.find((p) => p.r === regNo) ?? products[0] ?? null;

  const hectares = acres * HA_PER_ACRE;
  const plan = product ? planMix(product, crop, activeProblem, tankL, hectares, tanksOverride) : null;
  const use = plan?.use ?? null;
  const today = weather?.spray?.[0] ?? null;

  const chooseCrop = (c: string) => {
    tick('select');
    setCropText(c);
    setProblem(null);
    setRegNo(null);
    setShowAll(false);
    setTanksOverride(null);
  };

  const shareRecipe = () => {
    if (!product) return;
    tick('success');
    const lines = [
      t('Spray plan from Tassel'),
      `${t('Crop')}: ${cropName(cropLabel(crop))} · ${fmtArea(acres, units)}`,
      `${t('Problem')}: ${activeProblem ? t(PROBLEMS[activeProblem].en) : '-'}`,
      `${t('Product')}: ${product.d} (${product.r})`,
      `${t('Active ingredient')}: ${product.a}`,
      plan?.perTank ? `${t('Per {n} L tank', { n: tankL })}: ${fmtDose(plan.perTank)}` : t('See the label for the dose'),
      plan?.tanks ? `${t('Tanks for this field')}: ${plan.tanks}` : '',
      plan?.total ? `${t('Product for this field')}: ${fmtDose(plan.total)}` : '',
      use?.phiDays !== undefined ? t('Harvest {n} days after spraying', { n: use.phiDays }) : '',
      product.lab?.reiHours !== undefined ? t('Stay out of the field for {n} hours', { n: product.lab.reiHours }) : '',
      product.lab?.ppe.length ? `${t('Wear')}: ${product.lab.ppe.map((k) => t(PPE_EN[k])).join(', ')}` : '',
      t(PCPB_DISCLAIMER),
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Spray calculator" subtitle={t('PCPB registered products only')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        {/* 1. Crop */}
        <Text style={st.step}>Your crop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {CROP_CHOICES.filter((c) => cropKey(c)).map((c) => (
            <Chip key={c} crop={c} label={cropName(c)} raw active={cropKey(c) === crop} onPress={() => chooseCrop(c)} />
          ))}
        </ScrollView>

        {/* 2. Problem */}
        <Text style={st.step}>What are you fighting?</Text>
        {problems.length ? (
          <View style={st.problemGrid}>
            {problems.map((k) => {
              const on = k === activeProblem;
              return (
                <Press
                  key={k}
                  haptic
                  onPress={() => {
                    setProblem(k);
                    setRegNo(null);
                    setShowAll(false);
                    setTanksOverride(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[st.problem, on && st.problemOn]}
                >
                  <Icon name={KIND_ICON[PROBLEMS[k].kind]} size={22} color={on ? C.surface : C.textMid} />
                  <Text style={[st.problemTxt, on && { color: C.surface }]}>{PROBLEMS[k].en}</Text>
                </Press>
              );
            })}
          </View>
        ) : (
          <Text style={st.note}>No registered products for this crop in the PCPB list. Ask your extension officer.</Text>
        )}

        {/* 3. Registered options */}
        {activeProblem ? (
          <>
            <View style={st.stepRow}>
              <Text style={st.step}>Registered products</Text>
              <Text raw style={st.count}>
                {t('{n} on the PCPB list', { n: products.length })}
              </Text>
            </View>
            <View style={{ gap: 10, paddingHorizontal: 16 }}>
              {(showAll ? products : products.slice(0, SHOWN)).map((p) => (
                <PcpbProductCard
                  key={p.r}
                  product={p}
                  crop={crop}
                  problem={activeProblem}
                  selected={p.r === product?.r}
                  onPress={() => {
                    setRegNo(p.r);
                    setTanksOverride(null);
                  }}
                />
              ))}
              {products.length > SHOWN ? (
                <Btn
                  label={showAll ? t('Show fewer') : t('Show all {n}', { n: products.length })}
                  kind="secondary"
                  onPress={() => setShowAll(!showAll)}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {/* 4. Tank mix */}
        {product ? (
          <>
            <Text style={st.step}>Your sprayer and field</Text>
            <View style={st.panel}>
              <View style={st.row}>
                <Text style={st.label}>Knapsack</Text>
                <Segmented
                  value={String(tankL)}
                  onChange={(v) => {
                    tick('select');
                    setTankL(Number(v) as 16 | 20);
                  }}
                  options={[
                    { value: '16', label: '16 L' },
                    { value: '20', label: '20 L' },
                  ]}
                  style={{ width: 160 }}
                />
              </View>
              <View style={[st.row, { marginTop: 14 }]}>
                <Text style={st.label}>Field size</Text>
                <Segmented
                  value={units}
                  onChange={(u) => setPrefs({ units: u })}
                  options={[
                    { value: 'acres', label: 'Acres' },
                    { value: 'hectares', label: 'Hectares' },
                  ]}
                  style={{ width: 160 }}
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
              {farms.some((f) => f.size_acres) ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
                  {farms
                    .filter((f) => f.size_acres)
                    .map((f) => (
                      <Chip
                        key={f.id}
                        crop={f.crop ?? undefined}
                        label={`${f.name} · ${fmtArea(Number(f.size_acres), units)}`}
                        raw
                        active={fieldId === f.id}
                        onPress={() => {
                          setFieldId(f.id);
                          setAcres(Number(f.size_acres));
                          if (f.crop) chooseCrop(f.crop);
                        }}
                      />
                    ))}
                </ScrollView>
              ) : null}
            </View>

            <View style={st.mix} accessibilityLiveRegion="polite">
              {plan?.perTank ? (
                <>
                  <Text raw style={st.mixLabel}>
                    {t('Per {n} L tank', { n: tankL })}
                  </Text>
                  <Text raw style={st.mixBig}>
                    {fmtDose(plan.perTank)}
                  </Text>
                  <View style={st.mixRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.mixLabel}>Tanks for this field</Text>
                      {plan.tanks ? (
                        <Text raw style={st.mixNum}>
                          {plan.tanks}
                        </Text>
                      ) : (
                        <Stepper value={tanksOverride ?? 1} step={1} min={1} max={500} decimals={0} unit="tanks" onChange={(v) => setTanksOverride(v)} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.mixLabel}>Product to buy</Text>
                      <Text raw style={st.mixNum}>
                        {fmtDose(plan.total) ?? '—'}
                      </Text>
                    </View>
                  </View>
                  {!plan.tanks ? <Text style={st.mixNote}>The label gives no water volume. Count the tanks you use on this field.</Text> : null}
                  {use ? (
                    <Text raw style={st.mixNote}>
                      {t('From the label: {crop}, {problem}', { crop: use.labelCrop, problem: use.labelProblem })}
                      {use.interval ? ` · ${t('repeat every {d} days', { d: use.interval })}` : ''}
                      {use.maxSprays ? ` · ${t('at most {n} sprays a season', { n: use.maxSprays })}` : ''}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={st.mixBigSmall}>See the label for the dose</Text>
                  <Text style={st.mixNote}>We only show a dose that we have read on this product's PCPB label for your crop.</Text>
                </>
              )}
            </View>

            {/* 5. Safety */}
            {use?.phiDays !== undefined || product.lab?.reiHours !== undefined || product.lab?.ppe.length ? (
              <>
                <Text style={st.step}>Stay safe</Text>
                <View style={st.panel}>
                  {use?.phiDays !== undefined ? (
                    <SafetyRow icon="calendar-clock" text={t('Harvest {n} days after spraying', { n: use.phiDays })} />
                  ) : null}
                  {product.lab?.reiHours !== undefined ? (
                    <SafetyRow icon="account-clock-outline" text={t('Stay out of the field for {n} hours', { n: product.lab.reiHours })} />
                  ) : null}
                  {product.lab?.ppe.length ? (
                    <SafetyRow icon="shield-account-outline" text={`${t('Wear')}: ${product.lab.ppe.map((k) => t(PPE_EN[k])).join(', ')}`} />
                  ) : null}
                </View>
              </>
            ) : null}

            {/* 6. Spray window */}
            {today ? (
              <>
                <Text style={st.step}>Spray today?</Text>
                <View style={[st.panel, st.row, { gap: 12 }]}>
                  <Icon
                    name={today.level === 'Poor' ? 'weather-pouring' : 'weather-partly-cloudy'}
                    size={28}
                    color={today.level === 'Good' ? C.primary : today.level === 'Fair' ? C.warn : C.error}
                  />
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.label}>
                      {today.window ? t('Good spraying {window}', { window: today.window }) : t('Not a spraying day')}
                    </Text>
                    <Text style={st.note2}>{today.reason}</Text>
                  </View>
                </View>
              </>
            ) : null}

            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Btn label="Share spray plan" icon="share-variant" kind="primary" onPress={shareRecipe} />
            </View>
          </>
        ) : null}

        <Text raw style={st.foot}>
          {t(PCPB_DISCLAIMER)} {t('Source: PCPB register of crop products, {date}.', { date: PCPB.table.match(/Aug-24H-2026/) ? '24 Aug 2026' : PCPB.fetched })}
        </Text>
      </ScrollView>
    </View>
  );
}

function SafetyRow({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return (
    <View style={st.safety}>
      <Icon name={icon} size={22} color={C.primaryDark} />
      <Text raw style={st.safetyTxt}>
        {text}
      </Text>
    </View>
  );
}

/** The crop chip label for a catalogue crop key. */
function cropLabel(key: string): string {
  return CROP_CHOICES.find((c) => cropKey(c) === key) ?? key;
}

const st = StyleSheet.create({
  step: { fontSize: 22, color: C.text, marginHorizontal: 16, marginTop: 28, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingRight: 16 },
  count: { fontSize: 13, color: C.textSub },
  chips: { gap: 8, paddingHorizontal: 16 },
  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  problem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
  },
  problemOn: { backgroundColor: C.primaryDark },
  problemTxt: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  note: { fontSize: 16, color: C.textSub, marginHorizontal: 16 },
  note2: { fontSize: 15, color: C.textSub, marginTop: 2 },
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  mix: { backgroundColor: C.brandDark, borderRadius: 20, padding: 20, marginHorizontal: 16, marginTop: 14 },
  mixLabel: { fontSize: 15, color: C.secondary },
  mixBig: { fontSize: 44, fontFamily: FONT.display, color: C.brandCream, marginTop: 2 },
  mixBigSmall: { fontSize: 22, fontFamily: FONT.display, color: C.brandCream },
  mixRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
  mixNum: { fontSize: 32, fontFamily: FONT.display, color: C.brandCream },
  mixNote: { fontSize: 14, color: C.brandCream, opacity: 0.85, marginTop: 10, lineHeight: 20 },
  safety: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  safetyTxt: { flex: 1, fontSize: 16, color: C.text },
  foot: { fontSize: 13, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 24, lineHeight: 19 },
});
