// Crop advisory — crop pills → stage accordion → checklist → product cards,
// plus a fertiliser calculator. v2.1: English/Kiswahili, read-aloud per stage
// (like FarmRise's audio advisory) and the calculator can use the measured
// size of your own fields.

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, Icon, ListenButton, SectionLabel, Text, type IconName } from '../../components/ui';
import { CROPS, FERTILIZERS, PRODUCT_TYPE_COLORS } from '../../lib/advisory';
import { localizeGuide } from '../../lib/advisory.sw';
import { listFarms, type Farm } from '../../lib/data';
import { useLang } from '../../lib/i18n';
import { C, SHADOW } from '../../lib/theme';

function FertCalc({ farms }: { farms: Farm[] }) {
  const { t } = useLang();
  const [acres, setAcres] = useState('1');
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, string>>(Object.fromEntries(FERTILIZERS.map((f) => [f.name, String(f.guideKgPerAcre)])));
  const a = Math.max(0, parseFloat(acres.replace(',', '.')) || 0);
  const sized = farms.filter((f) => f.size_acres);
  return (
    <Card>
      <SectionLabel>Fertiliser calculator</SectionLabel>
      {sized.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {sized.map((f) => (
            <Chip
              key={f.id}
              raw
              icon="sprout"
              label={`${f.name}, ${Number(f.size_acres).toFixed(2)} ac`}
              active={fieldId === f.id}
              onPress={() => {
                setFieldId(f.id);
                setAcres(Number(f.size_acres).toFixed(2));
              }}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={st.inputWrap}>
        <Icon name="vector-square" size={18} color={C.primary} />
        <TextInput
          style={st.input}
          value={acres}
          onChangeText={(v) => {
            setAcres(v);
            setFieldId(null);
          }}
          keyboardType="decimal-pad"
          placeholder={t('Field size')}
          placeholderTextColor={C.textLight}
        />
        <Text style={st.unit}>acres</Text>
      </View>
      <Text style={st.calcHint}>Rates below are common guide rates. If you have a soil test, type its rate instead.</Text>
      {FERTILIZERS.map((f) => {
        const rate = Math.max(0, parseFloat((rates[f.name] ?? '0').replace(',', '.')) || 0);
        const kg = rate * a;
        return (
          <View key={f.name} style={st.calcRow}>
            <View style={{ flex: 1 }}>
              <Text raw style={st.calcName}>
                {f.name}
              </Text>
              <Text style={st.calcUse}>{f.use}</Text>
            </View>
            <View style={st.rateWrap}>
              <TextInput style={st.rateInput} value={rates[f.name]} onChangeText={(v) => setRates((r) => ({ ...r, [f.name]: v }))} keyboardType="decimal-pad" />
              <Text style={st.rateUnit}>kg/ac</Text>
            </View>
            <View style={{ alignItems: 'flex-end', minWidth: 74 }}>
              <Text raw style={st.calcResult}>
                {kg.toFixed(0)} kg
              </Text>
              <Text raw style={st.calcUse}>
                {t('{n} bags', { n: (kg / 50).toFixed(1) })}
              </Text>
            </View>
          </View>
        );
      })}
      <Text style={st.calcHint}>Bags = 50 kg. A soil test from your county soil lab or a KALRO centre gives the most accurate rates.</Text>
    </Card>
  );
}

export default function AdvisoryScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const [cropId, setCropId] = useState(CROPS[0].id);
  const [open, setOpen] = useState<number | null>(1);
  const [tab, setTab] = useState<'stages' | 'calc'>('stages');
  const [farms, setFarms] = useState<Farm[]>([]);
  const crop = useMemo(() => localizeGuide(CROPS.find((c) => c.id === cropId) ?? CROPS[0], lang), [cropId, lang]);

  useFocusEffect(
    useCallback(() => {
      listFarms().then(setFarms).catch(() => {});
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.header, { paddingTop: insets.top + 14 }]}>
        <Text style={st.title}>Crop advisory</Text>
        <Text style={st.sub}>Season guide and fertiliser calculator</Text>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {CROPS.map((c) => (
            <Chip key={c.id} raw label={localizeGuide(c, lang).name} icon={c.icon as IconName} active={cropId === c.id} onPress={() => { setCropId(c.id); setOpen(1); }} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={st.cropCard}>
          <View style={[st.cropIcon, { backgroundColor: crop.bg }]}>
            <Icon name={crop.icon as IconName} size={28} color={crop.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text raw style={st.cropName}>
              {crop.name}
            </Text>
            <Text raw style={st.cropMeta}>
              {crop.season}, {crop.duration}
            </Text>
          </View>
          <View style={st.stageBadge}>
            <Text raw style={st.stageBadgeTxt}>
              {t('{n} stages', { n: crop.stages.length })}
            </Text>
          </View>
        </View>

        <View style={st.tabs}>
          {([
            { k: 'stages', label: 'Growth stages', icon: 'chart-timeline-variant' },
            { k: 'calc', label: 'Fertiliser calc', icon: 'calculator-variant-outline' },
          ] as const).map((x) => (
            <TouchableOpacity key={x.k} style={[st.tab, tab === x.k && st.tabActive]} onPress={() => setTab(x.k)}>
              <Icon name={x.icon} size={16} color={tab === x.k ? C.primary : C.textSub} />
              <Text style={[st.tabTxt, tab === x.k && { color: C.primary }]}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'calc' ? (
          <FertCalc farms={farms} />
        ) : (
          crop.stages.map((stage, idx) => {
            const isOpen = open === stage.id;
            return (
              <View key={stage.id} style={st.stage}>
                <TouchableOpacity style={[st.stageHead, isOpen && { backgroundColor: C.primary }]} onPress={() => setOpen(isOpen ? null : stage.id)} activeOpacity={0.85}>
                  <View style={[st.num, isOpen && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text raw style={[st.numTxt, isOpen && { color: '#fff' }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text raw style={[st.stageName, isOpen && { color: '#fff' }]}>
                      {stage.name}
                    </Text>
                    <Text raw style={[st.stageDays, isOpen && { color: 'rgba(255,255,255,0.8)' }]}>
                      {stage.days}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ListenButton
                      compact
                      light
                      text={() => `${crop.name}. ${stage.name}. ${stage.days}. ${stage.activities.join(' ')} ${stage.products.map((p) => `${p.name}: ${p.usage}`).join('. ')}`}
                    />
                  ) : null}
                  <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={isOpen ? '#fff' : C.textSub} />
                </TouchableOpacity>
                {isOpen ? (
                  <View style={st.stageBody}>
                    <SectionLabel>Activities</SectionLabel>
                    {stage.activities.map((a) => (
                      <View key={a} style={st.check}>
                        <View style={st.checkBox}>
                          <Icon name="check" size={12} color={C.primary} />
                        </View>
                        <Text raw style={st.checkTxt}>
                          {a}
                        </Text>
                      </View>
                    ))}
                    {stage.products.length ? (
                      <>
                        <SectionLabel style={{ marginTop: 14 }}>Inputs</SectionLabel>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {stage.products.map((p) => {
                            const tc = PRODUCT_TYPE_COLORS[p.type] ?? { bg: C.bg, text: C.textSub };
                            return (
                              <View key={p.name} style={st.product}>
                                <View style={[st.productIcon, { backgroundColor: tc.bg }]}>
                                  <Icon name={p.icon as IconName} size={20} color={tc.text} />
                                </View>
                                <View style={[st.typeBadge, { backgroundColor: tc.bg }]}>
                                  <Text style={[st.typeTxt, { color: tc.text }]}>{p.type}</Text>
                                </View>
                                <Text raw style={st.productName}>
                                  {p.name}
                                </Text>
                                <Text raw style={st.productUse}>
                                  {p.usage}
                                </Text>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Card style={{ backgroundColor: C.primaryTint }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="calendar-check-outline" size={24} color={C.primary} />
            <Text style={{ flex: 1, color: C.primaryDark, fontWeight: '600' }}>Turn this guide into dated tasks for your own field.</Text>
            <TouchableOpacity onPress={() => router.push('/calendar')}>
              <Text style={{ color: C.primary, fontWeight: '900' }}>Calendar</Text>
            </TouchableOpacity>
          </View>
        </Card>
        <Card style={{ backgroundColor: C.primaryTint }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="robot-outline" size={24} color={C.primary} />
            <Text raw style={{ flex: 1, color: C.primaryDark, fontWeight: '600' }}>
              {t('Have a question about your {crop}?', { crop: crop.name.toLowerCase() })}
            </Text>
            <TouchableOpacity onPress={() => router.push('/chat')}>
              <Text style={{ color: C.primary, fontWeight: '900' }}>Ask AI</Text>
            </TouchableOpacity>
          </View>
        </Card>
        <Text style={st.footnote}>Pesticide guidance follows Kenya PCPB registrations as reviewed in June 2025. Always read the label.</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 6, backgroundColor: C.bg },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: C.textSub, fontWeight: '500', marginTop: 2 },
  cropCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 4, borderRadius: 16, padding: 16, ...SHADOW },
  cropIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cropName: { fontSize: 20, fontWeight: '900', color: C.text },
  cropMeta: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  stageBadge: { backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stageBadgeTxt: { fontSize: 12, fontWeight: '700', color: C.textMid },
  tabs: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  tabActive: { borderColor: C.primary, backgroundColor: C.primaryTint },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.textSub },
  stage: { marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface, ...SHADOW },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  numTxt: { fontSize: 14, fontWeight: '900', color: C.text },
  stageName: { fontSize: 16, fontWeight: '800', color: C.text },
  stageDays: { fontSize: 12, color: C.textSub, fontWeight: '500', marginTop: 2 },
  stageBody: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: C.primaryTint, marginTop: 1 },
  checkTxt: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  product: { width: 170, backgroundColor: C.bg, borderRadius: 12, padding: 12, marginRight: 10 },
  productIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: 6 },
  typeTxt: { fontSize: 10, fontWeight: '800' },
  productName: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 4 },
  productUse: { fontSize: 11, color: C.textMid, lineHeight: 15 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: C.border },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text, padding: 0 },
  unit: { fontSize: 13, fontWeight: '600', color: C.textSub },
  calcHint: { fontSize: 12, color: C.textSub, marginTop: 10, lineHeight: 17 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  calcName: { fontSize: 14, fontWeight: '700', color: C.text },
  calcUse: { fontSize: 11, color: C.textSub, marginTop: 2 },
  rateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: C.border },
  rateInput: { width: 40, fontSize: 14, fontWeight: '800', color: C.text, paddingVertical: 4, textAlign: 'right' },
  rateUnit: { fontSize: 10, color: C.textSub },
  calcResult: { fontSize: 18, fontWeight: '900', color: C.primary },
  footnote: { fontSize: 11, color: C.textLight, marginHorizontal: 20, marginTop: 14, textAlign: 'center' },
});
