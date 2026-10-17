// Crop advisory — pick a crop, follow its season on a timeline. Each stage
// opens to a short checklist and the inputs it needs; it can be read aloud
// (like FarmRise's audio advisory). The fertiliser planner and the calendar
// for your own fields are one tap away.

import React, { useMemo, useState } from 'react';
import { Image, LayoutAnimation, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CropIcon, Dot, Icon, ListenButton, Press, StatusShade, Text, tick, type IconName } from '../../components/ui';
import { CROPS } from '../../lib/advisory';
import { localizeGuide } from '../../lib/advisory.sw';
import { FERTS, type FertId } from '../../lib/fertiliser';
import { useLang } from '../../lib/i18n';
import { C, FONT } from '../../lib/theme';

/** A fertiliser product line ("DAP (18-46-0) or NPK") → its granule picture. */
function fertImage(name: string) {
  const id = (['DAP', 'CAN', 'NPK', 'TSP', 'MOP', 'Urea'] as FertId[]).find((f) => name.toUpperCase().includes(f.toUpperCase()));
  return id ? FERTS[id].image : null;
}

const TYPE_ICON: Record<string, IconName> = {
  Seed: 'seed-outline',
  Fertilizer: 'sack',
  Herbicide: 'spray',
  Fungicide: 'spray',
  Insecticide: 'spray',
  Storage: 'archive-outline',
  Monitoring: 'magnify',
  'Bio-input': 'leaf',
};

export default function AdvisoryScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const [cropId, setCropId] = useState(CROPS[0].id);
  const [open, setOpen] = useState<number | null>(null);
  const crop = useMemo(() => localizeGuide(CROPS.find((c) => c.id === cropId) ?? CROPS[0], lang), [cropId, lang]);

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    tick('select');
    setOpen(open === id ? null : id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={[st.head, { paddingTop: insets.top + 18 }]}>
        <Text style={st.title}>Advisory</Text>
        <Text style={st.sub}>A season guide for each crop</Text>
      </View>

      {/* Crop portraits */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.crops}>
        {CROPS.map((c) => {
          const on = c.id === cropId;
          return (
            <TouchableOpacity
              key={c.id}
              style={st.cropPick}
              onPress={() => {
                tick('select');
                setCropId(c.id);
                setOpen(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={[st.ring, on && st.ringOn]}>
                <CropIcon crop={c.name} size={60} discColor={on ? C.surface : '#ECE8DE'} />
              </View>
              <Text raw style={[st.cropName, on && { color: C.text, fontFamily: FONT.bodyBold }]}>
                {localizeGuide(c, lang).name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={st.summary}>
        <Text raw style={st.cropTitle}>
          {crop.name}
        </Text>
        <Text raw style={st.sub}>
          {`${crop.season} · ${crop.duration}`}
        </Text>
      </View>

      {/* Tools for this crop */}
      <View style={st.tools}>
        <Press style={st.tool} onPress={() => router.push('/fertiliser')}>
          <Image source={FERTS.DAP.image} style={{ width: 48, height: 42 }} resizeMode="contain" />
          <Text style={st.toolTitle}>Fertiliser planner</Text>
          <Text style={st.small}>Bags for your field size</Text>
        </Press>
        <Press style={st.tool} onPress={() => router.push('/calendar')}>
          <Icon name="calendar-check-outline" size={36} color={C.text} style={{ height: 42 }} />
          <Text style={st.toolTitle}>My calendar</Text>
          <Text style={st.small}>Dated tasks for your fields</Text>
        </Press>
      </View>

      {/* Season timeline */}
      <View style={st.timeline}>
        {crop.stages.map((stage, idx) => {
          const isOpen = open === stage.id;
          const last = idx === crop.stages.length - 1;
          return (
            <View key={stage.id} style={{ flexDirection: 'row' }}>
              <View style={st.rail}>
                <View style={[st.node, isOpen && st.nodeOn]}>
                  <Text raw style={[st.nodeTxt, isOpen && { color: '#fff' }]}>
                    {idx + 1}
                  </Text>
                </View>
                {!last ? <View style={st.railLine} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                <TouchableOpacity style={[st.stage, isOpen && st.stageOpen]} onPress={() => toggle(stage.id)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text raw style={st.stageName}>
                        {stage.name}
                      </Text>
                      <Text raw style={st.small}>
                        {stage.days}
                      </Text>
                    </View>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={C.textLight} />
                  </View>

                  {isOpen ? (
                    <View style={{ marginTop: 14, gap: 12 }}>
                      {stage.activities.map((a) => (
                        <View key={a} style={st.act}>
                          <View style={{ paddingTop: 8 }}>
                            <Dot color={C.primary} size={6} />
                          </View>
                          <Text raw style={st.actTxt}>
                            {a}
                          </Text>
                        </View>
                      ))}
                      {stage.products.length ? (
                        <View style={{ gap: 10, marginTop: 4 }}>
                          <Text style={st.inputsHead}>You will need</Text>
                          {stage.products.map((p) => {
                            const img = p.type === 'Fertilizer' ? fertImage(p.name) : null;
                            return (
                              <View key={p.name} style={st.product}>
                                {img ? (
                                  <Image source={img} style={{ width: 40, height: 35 }} resizeMode="contain" />
                                ) : (
                                  <View style={st.productIcon}>
                                    <Icon name={TYPE_ICON[p.type] ?? 'circle-small'} size={20} color={C.textMid} />
                                  </View>
                                )}
                                <View style={{ flex: 1 }}>
                                  <Text raw style={st.productName}>
                                    {p.name}
                                  </Text>
                                  <Text raw style={st.small}>
                                    {`${t(p.type)} · ${p.usage}`}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                      <ListenButton
                        text={() => `${crop.name}. ${stage.name}. ${stage.days}. ${stage.activities.join(' ')} ${stage.products.map((p) => `${p.name}: ${p.usage}`).join('. ')}`}
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <Press style={st.ask} onPress={() => router.push('/chat')}>
        <Icon name="chat-processing-outline" size={24} color={C.primary} />
        <Text raw style={st.askTxt}>
          {t('Have a question about your {crop}?', { crop: crop.name.toLowerCase() })}
        </Text>
        <Text style={st.link}>Ask AI</Text>
      </Press>
      <Text style={st.footnote}>Pesticide guidance follows Kenya PCPB registrations as reviewed in June 2025. Always read the label.</Text>
    </ScrollView>
    <StatusShade />
    </View>
  );
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 4 },
  title: { fontSize: 32, lineHeight: 38, fontFamily: FONT.display, color: C.text },
  sub: { fontSize: 15, color: C.textSub, marginTop: 2 },
  crops: { gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  cropPick: { alignItems: 'center', gap: 6, width: 72 },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: C.primary },
  cropName: { fontSize: 14, color: C.textSub },
  summary: { paddingHorizontal: 20, marginTop: 4 },
  cropTitle: { fontSize: 26, fontFamily: FONT.display, color: C.text },
  tools: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  tool: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 6 },
  toolTitle: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, marginTop: 4 },
  small: { fontSize: 14, color: C.textSub, lineHeight: 19 },
  timeline: { marginHorizontal: 16, marginTop: 26 },
  rail: { width: 40, alignItems: 'center' },
  node: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  nodeOn: { backgroundColor: C.primary },
  nodeTxt: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.textMid },
  railLine: { flex: 1, width: 2, backgroundColor: '#DDD8CC', marginTop: 4, marginBottom: -18 },
  stage: { backgroundColor: C.surface, borderRadius: 16, padding: 16 },
  stageOpen: {},
  stageName: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  act: { flexDirection: 'row', gap: 12 },
  actTxt: { flex: 1, fontSize: 15, color: C.textMid, lineHeight: 22 },
  inputsHead: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 12, padding: 10 },
  productIcon: { width: 40, height: 35, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 24 },
  askTxt: { flex: 1, fontSize: 15, color: C.text },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  footnote: { fontSize: 13, color: C.textSub, marginHorizontal: 28, marginTop: 16, textAlign: 'center', lineHeight: 19 },
});
