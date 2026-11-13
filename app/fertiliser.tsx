// Fertiliser planner: what to buy, and how to put it on.
//
// The farmer's own fields come in by themselves (all selected). Each crop gets one
// card with its own products and rates, so a maize field and a potato field never
// share one set of controls (3 Nov fix: only the first field's crop could be changed,
// while the others still went on the list). Each application shows how to apply it as
// an animated scene, the amount for the selected area in kg and 50 kg bags, and the
// guide rate it came from. Coffee is fed per tree (Kenya Coffee Sustainability Manual).
// The shopping list adds everything up; prices are the farmer's own quotes.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Btn, Chip, CropIcon, Header, Icon, Press, Segmented, Stepper, Text, tick } from '../components/ui';
import { StoryPhoto } from '../components/StoryPhoto';
import { listFarms, type Farm } from '../lib/data';
import { cropName } from '../lib/diseases';
import { BAG_KG, FERTS, PLANS, equivalentRate, guideFor, toBags, type Application, type CropPlan, type FertId } from '../lib/fertiliser';
import { useLang } from '../lib/i18n';
import { fmtArea, fromAcres, setPrefs, toAcres, usePrefs, type Units } from '../lib/prefs';
import { C, FONT } from '../lib/theme';

type Choice = { product: FertId; rate: number };
const PRICE_KEY = 'fert:prices';

/** A field can go on the list only with a size and a crop the guide covers (no maize rates for tea). */
const plannable = (f: Farm) => !!(f.size_acres && Number(f.size_acres) > 0 && guideFor(f.crop));

type Group = { plan: CropPlan; acres: number; fields: Farm[] };

export default function FertiliserScreen() {
  const { t } = useLang();
  const prefs = usePrefs();
  const units: Units = prefs.units;
  const { width } = useWindowDimensions();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selected, setSelected] = useState<string[] | null>(null); // null = not loaded yet
  const [manualCrop, setManualCrop] = useState('Maize');
  const [manualAcres, setManualAcres] = useState(1);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [prices, setPrices] = useState<Partial<Record<FertId, number>>>({});
  const [editRate, setEditRate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listFarms()
        .then((list) => {
          setFarms(list);
          setSelected((prev) => prev ?? list.filter(plannable).map((f) => f.id));
        })
        .catch(() => setSelected((prev) => prev ?? []));
      AsyncStorage.getItem(PRICE_KEY)
        .then((raw) => raw && setPrices(JSON.parse(raw)))
        .catch(() => {});
    }, [])
  );

  const fields = farms.filter(plannable);
  const chosen = fields.filter((f) => selected?.includes(f.id));
  const manual = chosen.length === 0;

  // One group per crop: its fields and their total area.
  const groups: Group[] = useMemo(() => {
    if (manual) return [{ plan: guideFor(manualCrop)!, acres: manualAcres, fields: [] }];
    const m = new Map<string, Group>();
    for (const f of chosen) {
      const plan = guideFor(f.crop)!;
      const g = m.get(plan.crop) ?? { plan, acres: 0, fields: [] };
      g.acres += Number(f.size_acres);
      g.fields.push(f);
      m.set(plan.crop, g);
    }
    return [...m.values()];
  }, [manual, manualCrop, manualAcres, chosen]);

  const choiceFor = (crop: string, a: Application): Choice => choices[`${crop}:${a.key}`] ?? { product: a.ref, rate: a.refKgPerAcre };
  const setChoice = (crop: string, a: Application, c: Choice) => setChoices((x) => ({ ...x, [`${crop}:${a.key}`]: c }));

  const totals = useMemo(() => {
    const m = new Map<FertId, number>();
    for (const g of groups)
      for (const a of g.plan.apps) {
        const c = choiceFor(g.plan.crop, a);
        m.set(c.product, (m.get(c.product) ?? 0) + Math.round(c.rate * g.acres));
      }
    return m;
  }, [groups, choices]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalAcres = groups.reduce((s, g) => s + g.acres, 0);

  const savePrice = (id: FertId, v: number) => {
    const next = { ...prices, [id]: v };
    setPrices(next);
    AsyncStorage.setItem(PRICE_KEY, JSON.stringify(next)).catch(() => {});
  };
  const cost = [...totals].reduce((sum, [id, kg]) => sum + (prices[id] ? (kg / BAG_KG) * prices[id]! : 0), 0);
  const priced = [...totals.keys()].every((id) => prices[id]);

  const bagText = (kg: number) => {
    const { bags, extraKg } = toBags(kg);
    return bags && extraKg ? t('{n} bags + {kg} kg', { n: bags, kg: extraKg }) : bags ? t(bags === 1 ? '1 bag' : '{n} bags', { n: bags }) : t('{kg} kg', { kg: extraKg });
  };

  const toggle = (id: string) => {
    tick('select');
    setSelected((prev) => (prev?.includes(id) ? prev.filter((x) => x !== id) : [...(prev ?? []), id]));
  };

  const shareList = () => {
    tick('success');
    const lines = [
      `*${t('Tassel Fertiliser Shopping List')}*`,
      ...groups.map((g) => `• ${cropName(g.plan.crop)}, ${fmtArea(g.acres, units)}${g.fields.length ? ` (${g.fields.map((f) => f.name).join(', ')})` : ''}`),
      '',
      `*${t('Total to buy (50 kg bags):')}*`,
      ...[...totals].map(([id, kg]) => `• ${FERTS[id].name} ${FERTS[id].grade}: ${bagText(kg)} (${kg} kg)`),
      cost > 0 ? `\n*${t('Estimated cost:')}* KES ${Math.round(cost).toLocaleString()}` : '',
      `\n— ${t('Planned with Tassel (ke.tassel.app). Confirm with local soil test.')}`,
    ];
    Share.share({ message: lines.filter((l) => l !== '').join('\n') });
  };

  const sceneW = width - 64;
  const unsupported = farms.filter((f) => f.crop && !guideFor(f.crop));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Fertiliser" subtitle={t('What to buy, and how to put it on')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        {/* Your fields: all selected by default */}
        {fields.length ? (
          <View style={st.panel}>
            <Text style={st.label}>Your fields</Text>
            <Text raw style={st.small}>
              {chosen.length ? `${chosen.length} ${t('selected')} · ${fmtArea(totalAcres, units)}` : t('Tap a field to plan it')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {fields.map((f) => {
                const on = !!selected?.includes(f.id);
                return (
                  <Press key={f.id} haptic style={[st.farmCard, on && st.farmCardOn]} onPress={() => toggle(f.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <CropIcon crop={f.crop} size={30} disc={false} />
                      <Icon name={on ? 'check-circle' : 'circle-outline'} size={22} color={on ? C.primary : C.textLight} />
                    </View>
                    <Text raw style={[st.farmName, on && { color: C.primaryDark }]} numberOfLines={1}>{f.name}</Text>
                    <Text raw style={st.farmSize}>{`${cropName(f.crop ?? '')} · ${fmtArea(Number(f.size_acres), units)}`}</Text>
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {unsupported.length ? (
          <View style={[st.note]}>
            <Icon name="information-outline" size={18} color={C.textSub} />
            <Text raw style={[st.small, { flex: 1 }]}>
              {t('No fertiliser guide for {crops} yet, so {fields} are not on this list.', {
                crops: [...new Set(unsupported.map((f) => cropName(f.crop!)))].join(', '),
                fields: unsupported.map((f) => f.name).join(', '),
              })}
            </Text>
          </View>
        ) : null}

        {/* No field chosen: plan one by hand */}
        {manual && selected !== null ? (
          <View style={st.panel}>
            <Text style={st.label}>{fields.length ? 'Or plan a crop by hand' : 'Plan a crop'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
              {PLANS.map((p) => (
                <Chip key={p.crop} crop={p.crop} label={cropName(p.crop)} raw active={manualCrop === p.crop} onPress={() => setManualCrop(p.crop)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
              <Text style={st.label}>Field size</Text>
              <Segmented value={units} onChange={(u) => setPrefs({ units: u })} options={[{ value: 'acres', label: 'Acres' }, { value: 'hectares', label: 'Hectares' }]} style={{ width: 180 }} />
            </View>
            <Stepper big value={Number(fromAcres(manualAcres, units).toFixed(2))} step={units === 'acres' ? 0.25 : 0.1} min={units === 'acres' ? 0.25 : 0.1} max={500} unit={units === 'acres' ? 'acres' : 'hectares'} onChange={(v) => setManualAcres(toAcres(v, units))} />
          </View>
        ) : null}

        {/* One card per crop */}
        {groups.map((g) => (
          <View key={g.plan.crop} style={st.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <CropIcon crop={g.plan.crop} size={48} />
              <View style={{ flex: 1 }}>
                <Text raw style={st.cropTitle}>{cropName(g.plan.crop)}</Text>
                <Text raw style={st.small}>
                  {fmtArea(g.acres, units)}
                  {g.fields.length ? ` · ${g.fields.map((f) => f.name).join(', ')}` : ''}
                </Text>
              </View>
            </View>

            {g.plan.apps.map((a) => {
              const c = choiceFor(g.plan.crop, a);
              const kg = Math.round(c.rate * g.acres);
              const swapped = c.product !== a.ref;
              const editKey = `${g.plan.crop}:${a.key}`;
              const trees = a.treesPerAcre ? Math.round(a.treesPerAcre * g.acres) : 0;
              return (
                <View key={a.key} style={st.app}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Text raw style={st.appTitle}>{t(a.title)}</Text>
                    <Text raw style={st.when}>{t(a.when)}</Text>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <StoryPhoto text={`Top-dress. ${a.how}`} kind="topdress" crop={g.plan.crop} width={sceneW} rounded={14} />
                  </View>
                  <Text raw style={st.how}>{t(a.how)}</Text>

                  {a.options.length > 1 ? (
                    <View style={st.products}>
                      {a.options.map((id) => {
                        const on = id === c.product;
                        return (
                          <Press key={id} haptic style={[st.product, on && st.productOn]} onPress={() => setChoice(g.plan.crop, a, { product: id, rate: equivalentRate(a, id) })} accessibilityRole="button" accessibilityState={{ selected: on }}>
                            <Image source={FERTS[id].image} style={{ width: 44, height: 38 }} resizeMode="contain" />
                            <Text raw style={[st.productName, on && { color: C.primaryDark }]}>{FERTS[id].name}</Text>
                            <Text raw style={st.grade}>{FERTS[id].grade}</Text>
                          </Press>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* The answer: how much, for this area */}
                  <View style={st.amount}>
                    <Image source={FERTS[c.product].image} style={{ width: 52, height: 46 }} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Animated.View key={`${c.product}:${kg}`} entering={FadeIn.duration(250)}>
                        <Text raw style={st.amountBig}>{`${kg} kg ${FERTS[c.product].name}`}</Text>
                        <Text raw style={st.amountSub}>{bagText(kg)}</Text>
                      </Animated.View>
                    </View>
                  </View>
                  <Text raw style={st.rate}>
                    {a.perTreeG && !swapped && c.rate === a.refKgPerAcre
                      ? t('{g} g per tree · about {n} trees ({per} per acre)', { g: a.perTreeG, n: trees, per: a.treesPerAcre ?? 0 })
                      : t('{kg} kg per acre', { kg: c.rate })}
                    {swapped ? ` · ${t('same {nutrient} as {kg} kg {ref}', { nutrient: t(FERTS[c.product].nutrient === 'N' ? 'nitrogen' : 'phosphorus'), kg: a.refKgPerAcre, ref: FERTS[a.ref].name })}` : ''}
                  </Text>

                  <TouchableOpacity onPress={() => setEditRate(editRate === editKey ? null : editKey)} hitSlop={8} accessibilityRole="button">
                    <Text style={st.link}>{editRate === editKey ? t('Done') : t('Have a soil test? Change the rate')}</Text>
                  </TouchableOpacity>
                  {editRate === editKey ? (
                    <View style={{ marginTop: 8 }}>
                      <Stepper value={c.rate} step={5} min={0} max={800} unit="kg per acre" decimals={0} onChange={(v) => setChoice(g.plan.crop, a, { ...c, rate: v })} />
                      <TouchableOpacity onPress={() => setChoice(g.plan.crop, a, { product: c.product, rate: equivalentRate(a, c.product) })} style={{ alignSelf: 'center', marginTop: 8 }} hitSlop={8}>
                        <Text style={st.link}>Back to the guide rate</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {g.plan.source ? <Text raw style={[st.small, { marginTop: 12 }]}>{`${t('Source')}: ${g.plan.source}`}</Text> : null}
          </View>
        ))}

        {/* The shopping list */}
        <View style={st.panel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={st.cropTitle}>Shopping list</Text>
            <Text raw style={st.small}>{t('{area} total', { area: fmtArea(totalAcres, units) })}</Text>
          </View>
          {[...totals].map(([id, kg]) => (
            <Animated.View key={id} style={st.shopRow} entering={FadeInDown} exiting={FadeOut} layout={LinearTransition}>
              <Image source={FERTS[id].image} style={{ width: 44, height: 38 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text raw style={st.shopName}>{`${FERTS[id].name} ${FERTS[id].grade}`}</Text>
                <Animated.View key={`${id}:${kg}`} entering={FadeIn.duration(250)}>
                  <Text raw style={st.shopBags}>{bagText(kg)}</Text>
                  <Text raw style={st.small}>{t('{kg} kg total', { kg })}</Text>
                </Animated.View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.priceLbl}>Price/bag (KES)</Text>
                <TextInput
                  style={st.priceBox}
                  value={prices[id] ? String(prices[id]) : ''}
                  onChangeText={(v) => savePrice(id, Number(v.replace(/[^0-9]/g, '')))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder={t('Add')}
                  placeholderTextColor={C.textSub}
                  accessibilityLabel={t('Price per 50 kg bag of {name}, in KES', { name: FERTS[id].name })}
                />
              </View>
            </Animated.View>
          ))}
          {cost > 0 ? (
            <View style={st.costRow}>
              <Text style={st.label}>{priced ? 'Total estimated cost' : 'Total so far'}</Text>
              <Animated.View key={Math.round(cost)} entering={FadeIn.duration(250)}>
                <Text raw style={st.cost} numberOfLines={1} adjustsFontSizeToFit>{`KES ${Math.round(cost).toLocaleString()}`}</Text>
              </Animated.View>
            </View>
          ) : (
            <Text style={[st.small, { marginTop: 12 }]}>Add your agro-dealer's bag price to see the total cost.</Text>
          )}
          <View style={{ gap: 10, marginTop: 16 }}>
            <Btn label="Share list" icon="share-variant" kind="primary" onPress={shareList} />
            <Btn label="Agro-dealers" icon="store-outline" kind="secondary" onPress={() => router.push('/market')} />
          </View>
        </View>

        <Text style={st.foot}>
          Guide rates for Kenyan smallholders. A soil test from your county soil lab or KALRO gives the exact rate for your field. Bags are 50 kg. Not sponsored.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: 20, marginTop: 12 },
  label: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  small: { fontSize: 14, color: C.textSub, lineHeight: 19 },
  farmCard: { backgroundColor: C.bg, borderRadius: 14, padding: 12, width: 150, borderWidth: 2, borderColor: 'transparent', gap: 4 },
  farmCardOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  farmName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text, marginTop: 4 },
  farmSize: { fontSize: 13, color: C.textSub },
  cropTitle: { fontSize: 24, fontFamily: FONT.display, color: C.text },
  app: { marginTop: 18, paddingTop: 16, borderTopWidth: 6, borderTopColor: C.bg },
  appTitle: { fontSize: 19, fontFamily: FONT.display, color: C.text },
  when: { fontSize: 14, color: C.accentDark, fontFamily: FONT.bodyBold },
  how: { fontSize: 15, color: C.textMid, lineHeight: 21, marginTop: 10 },
  products: { flexDirection: 'row', gap: 10, marginTop: 14 },
  product: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 2, borderColor: 'transparent' },
  productOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  productName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.textMid },
  grade: { fontSize: 12, color: C.textSub },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: C.primaryTint },
  amountBig: { fontSize: 26, fontFamily: FONT.display, color: C.primaryDark },
  amountSub: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  rate: { fontSize: 14, color: C.textSub, marginTop: 8, lineHeight: 19 },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary, marginTop: 10 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  shopName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  shopBags: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.primary },
  priceLbl: { fontSize: 13, color: C.textSub, marginBottom: 3 },
  priceBox: { minWidth: 96, minHeight: 48, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  costRow: { gap: 2, marginTop: 18, paddingTop: 14, borderTopWidth: 6, borderTopColor: C.bg },
  cost: { fontSize: 32, fontFamily: FONT.display, color: C.text },
  foot: { fontSize: 13, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 18, lineHeight: 19 },
});
