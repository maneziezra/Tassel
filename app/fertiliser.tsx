// Fertiliser planner — an instrument, not a table.
// Select multiple fields (all selected by default), see per-field requirements
// and a live aggregated shopping list. Swap products with 1 tap ("Or, instead of DAP..."),
// estimate total costs, share via WhatsApp, or find nearby agro-dealers.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Btn, Chip, CropIcon, Header, Icon, Press, Segmented, Stepper, Text, tick } from '../components/ui';
import { listFarms, type Farm } from '../lib/data';
import { cropName } from '../lib/diseases';
import { BAG_KG, FERTS, PLANS, equivalentRate, guideFor, planFor, toBags, type Application, type FertId } from '../lib/fertiliser';
import { useLang } from '../lib/i18n';
import { fmtArea, fromAcres, setPrefs, toAcres, usePrefs, type Units } from '../lib/prefs';
import { C, FONT } from '../lib/theme';

type Choice = { product: FertId; rate: number };
const PRICE_KEY = 'fert:prices';

/** A field can go on the list only with a size and a crop the guide covers (no maize rates for coffee). */
const plannable = (f: Farm) => !!(f.size_acres && Number(f.size_acres) > 0 && guideFor(f.crop));

export default function FertiliserScreen() {
  const { t } = useLang();
  const prefs = usePrefs();
  const units: Units = prefs.units;

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState(false);
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
          const valid = list.filter(plannable);
          if (valid.length > 0) {
            // All saved fields selected by default per P2 spec
            setSelectedFieldIds((prev) => (prev.length === 0 ? valid.map((f) => f.id) : prev));
            setManualMode(false);
          } else {
            setManualMode(true);
          }
        })
        .catch(() => {});

      AsyncStorage.getItem(PRICE_KEY)
        .then((raw) => raw && setPrices(JSON.parse(raw)))
        .catch(() => {});
    }, [])
  );

  const selectedFarms = useMemo(() => {
    return farms.filter((f) => selectedFieldIds.includes(f.id));
  }, [farms, selectedFieldIds]);

  const toggleField = (id: string) => {
    tick('select');
    setSelectedFieldIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter((x) => x !== id);
        if (next.length === 0) setManualMode(true);
        return next;
      } else {
        setManualMode(false);
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    tick('select');
    const valid = farms.filter(plannable);
    if (selectedFieldIds.length === valid.length) {
      setSelectedFieldIds([]);
      setManualMode(true);
    } else {
      setSelectedFieldIds(valid.map((f) => f.id));
      setManualMode(false);
    }
  };

  // Primary active crop for application customisation
  const activeCrop = useMemo(() => {
    if (manualMode || selectedFarms.length === 0) return manualCrop;
    return guideFor(selectedFarms[0].crop)?.crop ?? manualCrop;
  }, [manualMode, selectedFarms, manualCrop]);

  const plan = useMemo(() => planFor(activeCrop), [activeCrop]);

  const choiceFor = (cropStr: string, a: Application): Choice =>
    choices[`${cropStr}:${a.key}`] ?? { product: a.ref, rate: a.refKgPerAcre };

  const setChoice = (cropStr: string, a: Application, c: Choice) =>
    setChoices((x) => ({ ...x, [`${cropStr}:${a.key}`]: c }));

  const savePrice = (id: FertId, v: number) => {
    const next = { ...prices, [id]: v };
    setPrices(next);
    AsyncStorage.setItem(PRICE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const bagText = (bags: number, extra: number) =>
    bags && extra
      ? t('{n} bags + {kg} kg', { n: bags, kg: extra })
      : bags
      ? t(bags === 1 ? '1 bag' : '{n} bags', { n: bags })
      : t('{kg} kg', { kg: extra });

  // Compute live requirements per field and aggregated totals
  const { fieldBreakdowns, grandTotals, totalAcreage } = useMemo(() => {
    const breakdowns: Array<{
      farm: Farm;
      crop: string;
      acres: number;
      products: Array<{ product: FertId; kg: number; bags: number; extraKg: number }>;
    }> = [];

    const totals = new Map<FertId, number>();
    let sumAcres = 0;

    if (!manualMode && selectedFarms.length > 0) {
      selectedFarms.forEach((f) => {
        const fPlan = guideFor(f.crop);
        if (!fPlan) return; // only plannable fields are selectable; never fill in another crop's plan
        const fCrop = fPlan.crop;
        const fAcres = Number(f.size_acres) || 1;
        sumAcres += fAcres;

        const prods = fPlan.apps.map((a) => {
          const c = choices[`${fCrop}:${a.key}`] ?? { product: a.ref, rate: a.refKgPerAcre };
          const kg = Math.round(c.rate * fAcres);
          totals.set(c.product, (totals.get(c.product) ?? 0) + kg);
          return { product: c.product, kg, ...toBags(kg) };
        });

        breakdowns.push({ farm: f, crop: fCrop, acres: fAcres, products: prods });
      });
    } else {
      sumAcres = manualAcres;
      const mPlan = planFor(manualCrop);
      const prods = mPlan.apps.map((a) => {
        const c = choices[`${manualCrop}:${a.key}`] ?? { product: a.ref, rate: a.refKgPerAcre };
        const kg = Math.round(c.rate * manualAcres);
        totals.set(c.product, (totals.get(c.product) ?? 0) + kg);
        return { product: c.product, kg, ...toBags(kg) };
      });
      breakdowns.push({
        farm: { id: 'manual', name: t('Custom field'), size_acres: manualAcres, crop: manualCrop } as Farm,
        crop: manualCrop,
        acres: manualAcres,
        products: prods,
      });
    }

    return { fieldBreakdowns: breakdowns, grandTotals: totals, totalAcreage: sumAcres };
  }, [manualMode, selectedFarms, manualCrop, manualAcres, choices, t]);

  const cost = [...grandTotals].reduce(
    (sum, [id, kg]) => sum + (prices[id] ? (kg / BAG_KG) * prices[id]! : 0),
    0
  );
  const priced = [...grandTotals.keys()].every((id) => prices[id]);

  const shareList = () => {
    tick('success');
    const header = `*${t('Tassel Fertiliser Shopping List')}*\n${t('Total land')}: ${fmtArea(totalAcreage, units)} (${
      selectedFarms.length > 0 && !manualMode ? `${selectedFarms.length} ${t('fields')}` : '1 field'
    })\n`;

    const fieldLines = fieldBreakdowns.map((fb) => {
      const prods = fb.products
        .map((p) => `${FERTS[p.product].name} (${p.bags ? `${p.bags} bag${p.bags > 1 ? 's' : ''}` : ''}${p.extraKg ? ` + ${p.extraKg}kg` : ''})`)
        .join(', ');
      return `• *${fb.farm.name}* (${cropName(fb.crop)}, ${fmtArea(fb.acres, units)}): ${prods}`;
    });

    const summaryHead = `\n*${t('Total to buy (50 kg bags):')}*`;
    const summaryLines = [...grandTotals].map(([id, kg]) => {
      const b = toBags(kg);
      return `• *${FERTS[id].name} ${FERTS[id].grade}*: ${bagText(b.bags, b.extraKg)} (${kg} kg)`;
    });

    const costLine = cost > 0 ? `\n*${t('Estimated cost:')}* KES ${Math.round(cost).toLocaleString()}` : '';
    const footer = `\n— ${t('Planned with Tassel (ke.tassel.app). Confirm with local soil test.')}`;

    const message = [header, ...fieldLines, summaryHead, ...summaryLines, costLine, footer].filter(Boolean).join('\n');
    Share.share({ message });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Fertiliser" subtitle={t('What to buy for your fields')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        {/* Field selector strip */}
        {farms.some(plannable) ? (
          <View style={st.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={st.label}>Select fields to plan for</Text>
                <Text style={st.small}>
                  {selectedFarms.length > 0
                    ? `${selectedFarms.length} ${t('selected')} · ${fmtArea(totalAcreage, units)}`
                    : t('No fields selected')}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleSelectAll} hitSlop={8}>
                <Text style={st.link}>
                  {selectedFieldIds.length === farms.filter(plannable).length ? t('Clear all') : t('Select all')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {farms
                .filter(plannable)
                .map((f) => {
                  const on = selectedFieldIds.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[st.farmCard, on && st.farmCardOn]}
                      onPress={() => toggleField(f.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CropIcon crop={f.crop ?? 'Maize'} size={24} disc={false} />
                        <Icon name={on ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={18} color={on ? C.primary : C.textLight} />
                      </View>
                      <Text raw style={[st.farmName, on && { color: C.primaryDark }]}>
                        {f.name}
                      </Text>
                      <Text raw style={st.farmSize}>
                        {fmtArea(Number(f.size_acres), units)} · {cropName(f.crop ?? 'Maize')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        ) : null}

        {/* Fields whose crop the guide doesn't cover are named, not planned with another crop's rates */}
        {farms.some((f) => f.crop && !guideFor(f.crop)) ? (
          <View style={[st.panel, { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }]}>
            <Icon name="information-outline" size={20} color={C.textSub} />
            <Text raw style={[st.small, { flex: 1 }]}>
              {t('No fertiliser guide for {crops} yet, so {fields} are not on this list.', {
                crops: [...new Set(farms.filter((f) => f.crop && !guideFor(f.crop)).map((f) => cropName(f.crop!)))].join(', '),
                fields: farms.filter((f) => f.crop && !guideFor(f.crop)).map((f) => f.name).join(', '),
              })}
            </Text>
          </View>
        ) : null}

        {/* Manual or single crop picker */}
        {manualMode || farms.length === 0 ? (
          <View style={st.panel}>
            <Text style={st.label}>Plan a single field</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[st.chips, { paddingHorizontal: 0, marginTop: 10 }]}>
              {PLANS.map((p) => (
                <Chip key={p.crop} crop={p.crop} label={cropName(p.crop)} raw active={manualCrop === p.crop} onPress={() => setManualCrop(p.crop)} />
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
              <Text style={st.label}>Field size</Text>
              <Segmented
                value={units}
                onChange={(u) => setPrefs({ units: u })}
                options={[
                  { value: 'acres', label: 'Acres' },
                  { value: 'hectares', label: 'Hectares' },
                ]}
                style={{ width: 180 }}
              />
            </View>
            <Stepper
              big
              value={Number(fromAcres(manualAcres, units).toFixed(2))}
              step={units === 'acres' ? 0.25 : 0.1}
              min={units === 'acres' ? 0.25 : 0.1}
              max={500}
              unit={units === 'acres' ? 'acres' : 'hectares'}
              onChange={(v) => setManualAcres(toAcres(v, units))}
            />
          </View>
        ) : null}

        {/* Applications & Product Substitution */}
        {plan.apps.map((a) => {
          const c = choiceFor(activeCrop, a);
          const f = FERTS[c.product];
          const equivalent = c.product !== a.ref;
          const editing = editRate === a.key;

          // Find alternative products in the same role for substitution
          const alternativeOptions = a.options.filter((id) => id !== c.product);

          return (
            <View key={a.key} style={st.panel}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={st.appTitle}>{a.title}</Text>
                <Text style={st.small}>{a.when}</Text>
              </View>

              {/* Product picker */}
              <View style={st.products}>
                {a.options.map((id) => {
                  const on = id === c.product;
                  return (
                    <Press
                      key={id}
                      haptic
                      style={[st.product, on && st.productOn]}
                      onPress={() => setChoice(activeCrop, a, { product: id, rate: equivalentRate(a, id) })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Image source={FERTS[id].image} style={{ width: 48, height: 42 }} resizeMode="contain" />
                      <Text raw style={[st.productName, on && { color: C.primaryDark }]}>
                        {FERTS[id].name}
                      </Text>
                    </Press>
                  );
                })}
              </View>

              {/* One-tap substitution helper */}
              {alternativeOptions.length > 0 ? (
                <View style={st.substituteBox}>
                  <Icon name="swap-horizontal" size={16} color={C.primary} />
                  <Text style={st.substituteTxt}>
                    {t('Or, instead of {ref}:', { ref: FERTS[c.product].name })}
                  </Text>
                  {alternativeOptions.map((altId) => (
                    <TouchableOpacity
                      key={altId}
                      style={st.substituteBtn}
                      onPress={() => {
                        tick('select');
                        setChoice(activeCrop, a, { product: altId, rate: equivalentRate(a, altId) });
                      }}
                    >
                      <Text raw style={st.substituteBtnTxt}>
                        {FERTS[altId].name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {equivalent ? (
                <View style={st.equivNotice}>
                  <Icon name="information-outline" size={16} color={C.primary} />
                  <Text raw style={st.equivTxt}>
                    {t('Gives the same {nutrient} as {kg} kg of {ref} per acre.', {
                      nutrient: t(f.nutrient === 'N' ? 'nitrogen' : f.nutrient === 'P' ? 'phosphorus' : 'potassium'),
                      kg: a.refKgPerAcre,
                      ref: FERTS[a.ref].name,
                    })}
                  </Text>
                </View>
              ) : null}

              <Text style={st.how}>{a.how}</Text>

              {/* Rate */}
              <TouchableOpacity style={st.rateRow} onPress={() => setEditRate(editing ? null : a.key)} accessibilityRole="button">
                <Text raw style={[st.rateTxt, { flex: 1 }]}>
                  {t('Rate: {kg} kg per acre', { kg: c.rate })}
                </Text>
                <Text style={st.link}>{editing ? t('Done') : t('From a soil test?')}</Text>
              </TouchableOpacity>
              {editing ? (
                <View style={{ marginTop: 8 }}>
                  <Stepper
                    value={c.rate}
                    step={5}
                    min={0}
                    max={600}
                    unit="kg per acre"
                    decimals={0}
                    onChange={(v) => setChoice(activeCrop, a, { ...c, rate: v })}
                  />
                  <TouchableOpacity
                    onPress={() => setChoice(activeCrop, a, { product: c.product, rate: equivalentRate(a, c.product) })}
                    style={{ alignSelf: 'center', marginTop: 8 }}
                    hitSlop={8}
                  >
                    <Text style={st.link}>Back to the guide rate</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Per-field breakdown card if multiple fields are planned */}
        {fieldBreakdowns.length > 1 ? (
          <View style={st.panel}>
            <Text style={st.appTitle}>Per-field breakdown</Text>
            <Text style={st.small}>Exact bags needed for each shamba:</Text>
            {fieldBreakdowns.map((fb) => (
              <View key={fb.farm.id} style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text raw style={st.fieldName}>
                    {fb.farm.name} ({fmtArea(fb.acres, units)})
                  </Text>
                  <Text raw style={st.small}>
                    {cropName(fb.crop)} ·{' '}
                    {fb.products
                      .map((p) => `${FERTS[p.product].name}: ${bagText(p.bags, p.extraKg)}`)
                      .join('; ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Live Aggregated Shopping list and cost */}
        <View style={st.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={st.appTitle}>Live shopping list</Text>
            <Text style={st.small}>{fmtArea(totalAcreage, units)} total</Text>
          </View>

          {[...grandTotals].map(([id, kg]) => {
            const b = toBags(kg);
            return (
              // Rows slide in and out as fields or products change; the bag count re-fades on each change.
              <Animated.View key={id} style={st.shopRow} entering={FadeInDown} exiting={FadeOut} layout={LinearTransition}>
                <Image source={FERTS[id].image} style={{ width: 44, height: 38 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text raw style={st.shopName}>{`${FERTS[id].name} ${FERTS[id].grade}`}</Text>
                  <Animated.View key={`${id}:${kg}`} entering={FadeIn.duration(250)}>
                    <Text raw style={st.shopBags}>
                      {bagText(b.bags, b.extraKg)}
                    </Text>
                    <Text raw style={st.small}>
                      {t('{kg} kg total', { kg })}
                    </Text>
                  </Animated.View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.priceLbl}>Price/bag (KES)</Text>
                  {/* The farmer types the price they were quoted. The old ± buttons started from an
                      invented KES 2,500 and were 16 px targets. */}
                  <TextInput
                    style={st.priceBox}
                    value={prices[id] ? String(prices[id]) : ''}
                    onChangeText={(v) => {
                      const n = Number(v.replace(/[^0-9]/g, ''));
                      savePrice(id, n);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder={t('Add')}
                    placeholderTextColor={C.textSub}
                    accessibilityLabel={t('Price per 50 kg bag of {name}, in KES', { name: FERTS[id].name })}
                  />
                </View>
              </Animated.View>
            );
          })}

          {cost > 0 ? (
            // Stacked: side by side, "KES 5,600" ran off a 360 dp card.
            <View style={st.costRow}>
              <Text style={st.label}>{priced ? 'Total estimated cost' : 'Total so far'}</Text>
              <Animated.View key={Math.round(cost)} entering={FadeIn.duration(250)}>
                <Text raw style={st.cost} numberOfLines={1} adjustsFontSizeToFit>{`KES ${Math.round(cost).toLocaleString()}`}</Text>
              </Animated.View>
              <Text style={st.small}>Based on 50 kg bag prices</Text>
            </View>
          ) : (
            <Text style={[st.small, { marginTop: 12 }]}>Add your agro-dealer's bag price to calculate total expenditure.</Text>
          )}

          {/* full-width buttons: side by side, "Agro-dealers" broke into "Agro-dealer / s" */}
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
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  label: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  appTitle: { fontSize: 22, fontFamily: FONT.display, color: C.text },
  small: { fontSize: 14, color: C.textSub, lineHeight: 19 },
  farmCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 10,
    minWidth: 130,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  farmCardOn: {
    borderColor: C.primary,
    backgroundColor: C.primaryTint,
  },
  farmName: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.text },
  farmSize: { fontSize: 12, color: C.textSub },
  products: { flexDirection: 'row', gap: 10, marginTop: 14 },
  product: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 2, borderColor: 'transparent' },
  productOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  productName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.textMid },
  substituteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  substituteTxt: { fontSize: 13, color: C.textMid },
  substituteBtn: {
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.primary,
  },
  substituteBtnTxt: { fontSize: 12, fontFamily: FONT.bodyBold, color: C.primary },
  equivNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryTint,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  equivTxt: { flex: 1, fontSize: 12, color: C.primaryDark },
  how: { fontSize: 15, color: C.textMid, lineHeight: 21, marginTop: 12 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.bg },
  rateTxt: { fontSize: 15, color: C.text },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  fieldRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  fieldName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  shopName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  shopBags: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.primary },
  priceLbl: { fontSize: 13, color: C.textSub, marginBottom: 3 },
  priceBox: { minWidth: 96, minHeight: 48, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  costRow: { gap: 2, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  cost: { fontSize: 32, fontFamily: FONT.display, color: C.text },
  foot: { fontSize: 13, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 18, lineHeight: 19 },
});
