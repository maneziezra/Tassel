// Fertiliser planner — an instrument, not a table. Pick the crop, dial in the
// field size, and see how many bags to buy for each application. Tap another
// fertiliser and the amount changes so the crop gets the same nutrient. Rates
// are guide rates and can be set from a soil test. Shopping list can be shared.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Chip, CropIcon, Header, Icon, Press, Segmented, Stepper, Text, tick } from '../components/ui';
import { listFarms, type Farm } from '../lib/data';
import { cropName } from '../lib/diseases';
import { BAG_KG, FERTS, PLANS, equivalentRate, planFor, toBags, type Application, type FertId } from '../lib/fertiliser';
import { useLang } from '../lib/i18n';
import { fmtArea, fromAcres, setPrefs, toAcres, usePrefs, type Units } from '../lib/prefs';
import { C, FONT } from '../lib/theme';

type Choice = { product: FertId; rate: number };
const PRICE_KEY = 'fert:prices';

export default function FertiliserScreen() {
  const { t } = useLang();
  const prefs = usePrefs();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crop, setCrop] = useState('Maize');
  const [acres, setAcres] = useState(1);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [prices, setPrices] = useState<Partial<Record<FertId, number>>>({});
  const [editRate, setEditRate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listFarms()
        .then((list) => {
          setFarms(list);
          const first = list.find((f) => f.size_acres && f.crop);
          if (first && !fieldId) pickField(first);
        })
        .catch(() => {});
      AsyncStorage.getItem(PRICE_KEY)
        .then((raw) => raw && setPrices(JSON.parse(raw)))
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const plan = useMemo(() => planFor(crop), [crop]);
  const choiceFor = (a: Application): Choice => choices[`${crop}:${a.key}`] ?? { product: a.ref, rate: a.refKgPerAcre };
  const setChoice = (a: Application, c: Choice) => setChoices((x) => ({ ...x, [`${crop}:${a.key}`]: c }));

  function pickField(f: Farm) {
    setFieldId(f.id);
    if (f.size_acres) setAcres(Number(f.size_acres));
    if (f.crop) setCrop(planFor(f.crop).crop);
  }

  const savePrice = (id: FertId, v: number) => {
    const next = { ...prices, [id]: v };
    setPrices(next);
    AsyncStorage.setItem(PRICE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const units: Units = prefs.units;
  const shownArea = Number(fromAcres(acres, units).toFixed(2));
  const lines = plan.apps.map((a) => {
    const c = choiceFor(a);
    const kg = Math.round(c.rate * acres);
    return { a, c, kg, ...toBags(kg) };
  });
  const totals = new Map<FertId, number>();
  lines.forEach((l) => totals.set(l.c.product, (totals.get(l.c.product) ?? 0) + l.kg));
  const cost = [...totals].reduce((sum, [id, kg]) => sum + (prices[id] ? (kg / BAG_KG) * prices[id]! : 0), 0);
  const priced = [...totals.keys()].every((id) => prices[id]);

  const bagText = (bags: number, extra: number) =>
    bags && extra ? t('{n} bags + {kg} kg', { n: bags, kg: extra }) : bags ? t(bags === 1 ? '1 bag' : '{n} bags', { n: bags }) : t('{kg} kg', { kg: extra });

  const share = () => {
    const field = farms.find((f) => f.id === fieldId);
    const head = `${t('Fertiliser for {crop}', { crop: cropName(crop) })}${field ? ` · ${field.name}` : ''} · ${fmtArea(acres, units)}`;
    const body = [...totals].map(([id, kg]) => {
      const b = toBags(kg);
      return `• ${FERTS[id].name} ${FERTS[id].grade}: ${bagText(b.bags, b.extraKg)} (${kg} kg)`;
    });
    Share.share({ message: [head, ...body, cost ? t('About KES {n}', { n: Math.round(cost).toLocaleString() }) : '', '— Tassel'].filter(Boolean).join('\n') });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Fertiliser" subtitle="What to buy for one field" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Crop */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {PLANS.map((p) => (
            <Chip key={p.crop} crop={p.crop} label={cropName(p.crop)} raw active={crop === p.crop} onPress={() => setCrop(p.crop)} />
          ))}
        </ScrollView>

        {/* Area dial */}
        <View style={st.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={st.label}>Field size</Text>
            <Segmented
              value={units}
              onChange={(u) => setPrefs({ units: u })}
              options={[
                { value: 'acres', label: 'Acres' },
                { value: 'hectares', label: 'Hectares' },
              ]}
              style={{ width: 190 }}
            />
          </View>
          <Stepper
            big
            value={shownArea}
            step={units === 'acres' ? 0.25 : 0.1}
            min={units === 'acres' ? 0.25 : 0.1}
            max={500}
            unit={units === 'acres' ? 'acres' : 'hectares'}
            onChange={(v) => {
              setFieldId(null);
              setAcres(toAcres(v, units));
            }}
          />
          {farms.some((f) => f.size_acres) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 14 }}>
              {farms
                .filter((f) => f.size_acres)
                .map((f) => (
                  <Chip key={f.id} raw crop={f.crop ?? undefined} label={`${f.name} · ${fmtArea(Number(f.size_acres), units)}`} active={fieldId === f.id} onPress={() => pickField(f)} />
                ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Applications */}
        {lines.map(({ a, c, kg, bags, extraKg, exactBags }) => {
          const f = FERTS[c.product];
          const equivalent = c.product !== a.ref;
          const editing = editRate === a.key;
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
                      onPress={() => setChoice(a, { product: id, rate: equivalentRate(a, id) })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${FERTS[id].name} ${FERTS[id].grade}`}
                    >
                      <Image source={FERTS[id].image} style={{ width: 52, height: 46 }} resizeMode="contain" />
                      <Text raw style={[st.productName, on && { color: C.primaryDark }]}>
                        {FERTS[id].name}
                      </Text>
                    </Press>
                  );
                })}
              </View>

              {/* Result */}
              <View style={st.result}>
                <Image source={f.image} style={{ width: 96, height: 84 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text raw style={st.big}>
                    {bagText(bags, extraKg)}
                  </Text>
                  <Text raw style={st.small}>
                    {bags ? `${kg} kg · ${f.name} ${f.grade}` : `${f.name} ${f.grade}`}
                  </Text>
                </View>
              </View>
              <View style={st.bagRow} accessibilityLabel={t('{n} bags', { n: exactBags.toFixed(1) })}>
                {Array.from({ length: Math.min(24, Math.ceil(exactBags)) }, (_, i) => {
                  const fill = Math.min(1, exactBags - i);
                  return (
                    <View key={i} style={st.bagSlot}>
                      <Icon name="sack" size={26} color={C.sunken} style={{ position: 'absolute' }} />
                      <View style={{ width: 26 * fill, overflow: 'hidden' }}>
                        <Icon name="sack" size={26} color={C.primary} />
                      </View>
                    </View>
                  );
                })}
                {exactBags > 24 ? <Text raw style={st.small}>{`+${Math.ceil(exactBags) - 24}`}</Text> : null}
              </View>

              <Text style={st.how}>{a.how}</Text>
              {equivalent ? (
                <Text raw style={st.small}>
                  {t('Gives the same {nutrient} as {kg} kg of {ref} per acre.', {
                    nutrient: t(f.nutrient === 'N' ? 'nitrogen' : f.nutrient === 'P' ? 'phosphorus' : 'potassium'),
                    kg: a.refKgPerAcre,
                    ref: FERTS[a.ref].name,
                  })}
                </Text>
              ) : null}

              {/* Rate */}
              <TouchableOpacity style={st.rateRow} onPress={() => setEditRate(editing ? null : a.key)} accessibilityRole="button">
                <Text raw style={[st.rateTxt, { flex: 1 }]}>
                  {t('Rate: {kg} kg per acre', { kg: c.rate })}
                </Text>
                <Text style={st.link}>{editing ? 'Done' : 'From a soil test?'}</Text>
              </TouchableOpacity>
              {editing ? (
                <View style={{ marginTop: 8 }}>
                  <Stepper value={c.rate} step={5} min={0} max={600} unit="kg per acre" decimals={0} onChange={(v) => setChoice(a, { ...c, rate: v })} />
                  <TouchableOpacity onPress={() => setChoice(a, { product: c.product, rate: equivalentRate(a, c.product) })} style={{ alignSelf: 'center', marginTop: 8 }} hitSlop={8}>
                    <Text style={st.link}>Back to the guide rate</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={[st.small, { marginTop: 10 }]}>{f.looks}</Text>
            </View>
          );
        })}

        {/* Shopping list and cost */}
        <View style={st.panel}>
          <Text style={st.appTitle}>Shopping list</Text>
          {[...totals].map(([id, kg]) => {
            const b = toBags(kg);
            return (
              <View key={id} style={st.shopRow}>
                <Image source={FERTS[id].image} style={{ width: 40, height: 35 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text raw style={st.shopName}>{`${FERTS[id].name} ${FERTS[id].grade}`}</Text>
                  <Text raw style={st.small}>{b.bags ? `${bagText(b.bags, b.extraKg)} · ${kg} kg` : bagText(b.bags, b.extraKg)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.priceLbl}>Price per bag</Text>
                  <View style={st.priceBox}>
                    <TouchableOpacity onPress={() => { tick('select'); savePrice(id, Math.max(0, (prices[id] ?? 0) - 100)); }} hitSlop={6} accessibilityLabel={t('Less')}>
                      <Icon name="minus" size={18} color={C.text} />
                    </TouchableOpacity>
                    <Text raw style={st.priceVal}>
                      {prices[id] ? prices[id]!.toLocaleString() : t('Add')}
                    </Text>
                    <TouchableOpacity onPress={() => { tick('select'); savePrice(id, (prices[id] ?? 2400) + 100); }} hitSlop={6} accessibilityLabel={t('More')}>
                      <Icon name="plus" size={18} color={C.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          {cost > 0 ? (
            <View style={st.costRow}>
              <Text style={st.label}>{priced ? 'Total' : 'Total so far'}</Text>
              <Text raw style={st.cost}>{`KES ${Math.round(cost).toLocaleString()}`}</Text>
            </View>
          ) : (
            <Text style={[st.small, { marginTop: 10 }]}>Add the price your agro-dealer charges to see the total.</Text>
          )}
          <Btn label="Share list" icon="share-variant" kind="secondary" onPress={share} style={{ marginTop: 14 }} />
        </View>

        <Text style={st.foot}>Guide rates for Kenyan smallholders. A soil test from your county soil lab or a KALRO centre gives the right rate for your field. Bags are 50 kg.</Text>
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
  products: { flexDirection: 'row', gap: 10, marginTop: 14 },
  product: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 2, borderColor: 'transparent' },
  productOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  productName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.textMid },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  big: { fontSize: 34, lineHeight: 38, fontFamily: FONT.display, color: C.text },
  bagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, alignItems: 'center' },
  bagSlot: { width: 26, height: 26 },
  how: { fontSize: 15, color: C.textMid, lineHeight: 21, marginTop: 12 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.bg },
  rateTxt: { fontSize: 15, color: C.text },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  shopName: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  priceLbl: { fontSize: 13, color: C.textSub, marginBottom: 4 },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  priceVal: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text, minWidth: 48, textAlign: 'center' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 },
  cost: { fontSize: 28, fontFamily: FONT.display, color: C.text },
  foot: { fontSize: 13, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 18, lineHeight: 19 },
});
