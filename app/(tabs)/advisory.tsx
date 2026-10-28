// Crop advisory — "Show, don't tell".
// Each crop stage is built as a swipeable card story:
// - One action per card with custom SVG editorial illustrations
// - 5–10 word punchy captions
// - Read-aloud button (TTS via speak())
// - "Watch out for" stage disease alert (with Hutton late blight risk indicator)
// - PCPB registered product examples with Reg. No., active ingredient and "Not sponsored" badge.
// - Entry points to Fertiliser Planner, My Calendar, and Pesticide Calculator.

import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Btn,
  CropIcon,
  Dot,
  Header,
  Icon,
  ListenButton,
  Press,
  StatusShade,
  Text,
  tick,
  type IconName,
} from '../../components/ui';
import { CROPS, type Stage } from '../../lib/advisory';
import { localizeGuide } from '../../lib/advisory.sw';
import { FERTS, type FertId } from '../../lib/fertiliser';
import { useLang } from '../../lib/i18n';
import { openScanner } from '../../lib/navigation';
import { NotoEmoji } from '../../components/NotoEmoji';
import { StoryDiagram } from '../../components/StoryDiagram';
import { diagramFacts, type DiagramFact } from '../../lib/diagramFacts';
import { PcpbProductCard } from '../../components/PcpbProductCard';
import { cropKey, getRegisteredProducts, problemKey, type PcpbProduct, type ProblemKey } from '../../lib/pcpb';
import { speak } from '../../lib/speech';
import { C, FONT } from '../../lib/theme';
import { getWeather, type Weather } from '../../lib/weather';
import { getPosition } from '../../lib/geo';
import {
  getActionIllustration,
  WatchOutDiseaseArt,
} from '../../components/AdvisoryStoryArt';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function fertImage(name: string) {
  const id = (['DAP', 'CAN', 'NPK', 'TSP', 'MOP', 'Urea'] as FertId[]).find((f) =>
    name.toUpperCase().includes(f.toUpperCase())
  );
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

/** The step's first sentence is the caption, whole (a cut-off "…" hid facts); the rest goes underneath. */
function splitStep(activity: string): { caption: string; rest: string } {
  const m = activity.match(/^(.+?[.!?])(\s+|$)/); // sentence end, not a decimal point like "2.5"
  const caption = (m ? m[1] : activity).trim();
  return { caption, rest: activity.slice(caption.length).trim() };
}

/** Stage disease watch-outs */
function getStageWatchOut(cropId: string, stageId: number) {
  if (cropId === 'potato') {
    if (stageId === 1) return { disease: 'Bacterial wilt & Blackleg', tip: 'Use certified seed tubers; never plant after potato or tomato.' };
    if (stageId === 2) return { disease: 'Late blight & Early blight', tip: 'Cool, wet weather triggers blight. Protect foliage before rain.' };
    if (stageId === 3) return { disease: 'Late blight & Bacterial wilt', tip: 'Blight moves fast. Rogue out and destroy any wilted plants.' };
    return { disease: 'Potato tuber moth & Scab', tip: 'Ensure tubers stay covered with soil until harvest.' };
  }
  if (cropId === 'maize') {
    if (stageId <= 2) return { disease: 'Cutworms & Seedling rots', tip: 'Check soil moisture; plant certified dressed seed.' };
    if (stageId === 3) return { disease: 'Fall armyworm', tip: 'Scout leaf whorls twice weekly for ragged holes and frass.' };
    if (stageId === 4) return { disease: 'Grey leaf spot & Northern leaf blight', tip: 'Watch for cigar-shaped lesions reaching the ear leaf.' };
    return { disease: 'Ear rots & Aflatoxin', tip: 'Sort out mouldy cobs immediately; dry grain below 13.5%.' };
  }
  if (cropId === 'tomato') {
    if (stageId === 1) return { disease: 'Damping-off & Whiteflies', tip: 'Water only in mornings; cover nursery with insect netting.' };
    if (stageId === 2) return { disease: 'Cutworms & Bacterial wilt', tip: 'Do not plant next to potatoes; handle stems gently.' };
    if (stageId === 3) return { disease: 'Early blight & Tuta absoluta', tip: 'Scout weekly for leaf mines and dark concentric leaf spots.' };
    if (stageId >= 4) return { disease: 'Late blight & Blossom-end rot', tip: 'Blight attacks fruit and leaves; maintain regular watering.' };
  }
  if (cropId === 'beans') {
    if (stageId === 1) return { disease: 'Bean fly & Root rots', tip: 'Plant with onset of rains; earth up soil around seedling stems.' };
    if (stageId === 2) return { disease: 'Bean rust & Aphids', tip: 'Check underside of leaves for red-brown rust pustules.' };
    return { disease: 'Bean thrips & Bruchids', tip: 'Do not weed during flowering; store dry grain in hermetic bags.' };
  }
  if (cropId === 'wheat') {
    if (stageId <= 2) return { disease: 'Stem rust (Ug99) & Yellow rust', tip: 'Scout leaves and stems for orange-yellow powdery pustules.' };
    return { disease: 'Septoria leaf blotch & Aphids', tip: 'Protect flag leaf from disease; it fills over 70% of grain.' };
  }
  return { disease: 'Leaf spot & Pests', tip: 'Inspect leaves closely in morning daylight; scan any suspect spot.' };
}

export default function AdvisoryScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const [cropId, setCropId] = useState(CROPS[0].id);
  const [weather, setWeather] = useState<Weather | null>(null);

  // Story state
  const [storyStage, setStoryStage] = useState<Stage | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  const crop = useMemo(() => localizeGuide(CROPS.find((c) => c.id === cropId) ?? CROPS[0], lang), [cropId, lang]);

  useFocusEffect(
    useCallback(() => {
      getPosition(false).then((pos) => {
        if (pos) getWeather(pos.lat, pos.lng).then(setWeather).catch(() => {});
      });
    }, [])
  );

  const openStory = (stage: Stage) => {
    tick('select');
    setStoryStage(stage);
    setStoryIndex(0);
  };

  const closeStory = () => {
    setStoryStage(null);
    setStoryIndex(0);
  };

  // Build total story cards for the active stage:
  // Card 0: Watch Out Alert
  // Cards 1..N: Action Cards with Custom SVG illustration
  // Card N+1: Inputs & PCPB Products
  const storyCards = useMemo(() => {
    if (!storyStage) return [];

    const watch = getStageWatchOut(cropId, storyStage.id);
    // Examples only for the stage's named threat on this crop (crop + problem from the PCPB register).
    const pcpbProducts = getRegisteredProducts(crop.name, watch.disease);

    const cards: Array<{
      type: 'watchout' | 'action' | 'products';
      title: string;
      caption?: string;
      rest?: string;
      body: string;
      index?: number;
      facts?: DiagramFact[];
      pcpb?: PcpbProduct[];
      problem?: ProblemKey | null;
    }> = [
      {
        type: 'watchout',
        title: t('Watch out for at this stage'),
        caption: watch.disease,
        body: watch.tip,
      },
    ];

    // Diagram facts come from the English source step, so the numbers match lib/advisory.ts exactly.
    const sourceStage = CROPS.find((c) => c.id === cropId)?.stages.find((s) => s.id === storyStage.id);
    storyStage.activities.forEach((act, idx) => {
      cards.push({
        type: 'action',
        title: `${t('Action')} ${idx + 1}`,
        ...splitStep(act),
        body: act,
        index: idx,
        facts: diagramFacts(sourceStage?.activities[idx] ?? act),
      });
    });

    if (storyStage.products.length > 0 || pcpbProducts.length > 0) {
      cards.push({
        type: 'products',
        title: t('Inputs & PCPB Registered Options'),
        body: t('Kenya registered products for this stage:'),
        pcpb: pcpbProducts,
        problem: problemKey(watch.disease),
      });
    }

    return cards;
  }, [storyStage, cropId, crop.name, t]);

  const activeCard = storyCards[storyIndex];

  const nextCard = () => {
    tick('select');
    if (storyIndex < storyCards.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      closeStory();
    }
  };

  const prevCard = () => {
    tick('select');
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    }
  };

  const readCard = () => {
    if (!activeCard) return;
    // An action's caption is part of its body: read the step once.
    const textToSpeak = activeCard.type === 'action' ? `${activeCard.title}. ${activeCard.body}` : `${activeCard.title}. ${activeCard.caption ?? ''}. ${activeCard.body}`;
    speak(textToSpeak, { lang });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        <View style={[st.head, { paddingTop: insets.top + 18 }]}>
          <Text style={st.title}>Advisory</Text>
          <Text style={st.sub}>Season story guides & inputs</Text>
        </View>

        {/* Crop selectors */}
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
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View style={[st.ring, on && st.ringOn]}>
                  <CropIcon crop={c.name} size={58} discColor={on ? C.surface : '#ECE8DE'} />
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

        {/* Fast Action Tools Strip */}
        <View style={st.tools}>
          <Press style={st.tool} onPress={() => router.push('/fertiliser')}>
            <Image source={FERTS.DAP.image} style={{ width: 44, height: 38 }} resizeMode="contain" />
            <Text style={st.toolTitle}>Fertiliser</Text>
            <Text style={st.small}>Live shopping list</Text>
          </Press>
          <Press
            style={st.tool}
            onPress={() =>
              router.push({
                pathname: '/pesticide-calc',
                params: { crop: cropId },
              })
            }
          >
            <Icon name="spray" size={32} color={C.primary} style={{ height: 38 }} />
            <Text style={st.toolTitle}>Pesticides</Text>
            <Text style={st.small}>PCPB tank mixer</Text>
          </Press>
          <Press style={st.tool} onPress={() => router.push('/calendar')}>
            <Icon name="calendar-check-outline" size={32} color={C.text} style={{ height: 38 }} />
            <Text style={st.toolTitle}>Calendar</Text>
            <Text style={st.small}>Dated field tasks</Text>
          </Press>
        </View>

        {/* Season Stage Story Cards */}
        <View style={st.timeline}>
          <Text style={st.sectionHeader}>Season Stages (Tap to play story)</Text>
          {crop.stages.map((stage, idx) => {
            const watch = getStageWatchOut(cropId, stage.id);
            return (
              <TouchableOpacity
                key={stage.id}
                style={st.stageCard}
                onPress={() => openStory(stage)}
                activeOpacity={0.85}
              >
                <View style={st.stageHeader}>
                  <View style={st.stageBadge}>
                    <Text raw style={st.stageNum}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.stageTitle}>
                      {stage.name}
                    </Text>
                    <Text raw style={st.small}>
                      {stage.days} · {stage.activities.length} {t('actions')}
                    </Text>
                  </View>
                  <View style={st.playPill}>
                    <Icon name="play" size={14} color="#FFFFFF" />
                    <Text style={st.playPillTxt}>Story</Text>
                  </View>
                </View>

                {/* Micro watch-out preview */}
                <View style={st.watchPill}>
                  <Icon name="alert-circle-outline" size={14} color={C.error} />
                  <Text raw style={st.watchPillTxt} numberOfLines={1}>
                    {t('Watch out')}: {watch.disease}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI advisor link */}
        <Press style={st.ask} onPress={() => router.push('/chat')}>
          <Icon name="chat-processing-outline" size={24} color={C.primary} />
          <Text raw style={st.askTxt}>
            {t('Have a question about your {crop}?', { crop: crop.name.toLowerCase() })}
          </Text>
          <Text style={st.link}>Ask AI</Text>
        </Press>

        <Text style={st.footnote}>
          Pesticide guidance strictly follows Kenya PCPB registrations as reviewed in June 2025. Always follow product labels. Not sponsored.
        </Text>
      </ScrollView>

      {/* Full-Screen Swipeable Card Story Modal */}
      <Modal visible={storyStage !== null} animationType="fade" transparent onRequestClose={closeStory}>
        <View style={st.storyBackdrop}>
          <View style={[st.storyContainer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
            {/* Story Top Header with Segmented Progress Bar */}
            <View style={st.storyHeader}>
              <View style={st.progressRow}>
                {storyCards.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      st.progressSegment,
                      i <= storyIndex && st.progressSegmentActive,
                    ]}
                  />
                ))}
              </View>

              <View style={st.storyTitleRow}>
                <View>
                  <Text raw style={st.storyStageName}>
                    {crop.name} · {storyStage?.name}
                  </Text>
                  <Text raw style={st.storyCardCount}>
                    {storyIndex + 1} of {storyCards.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeStory} hitSlop={12} style={st.closeStoryBtn}>
                  <Icon name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Interactive Card */}
            {activeCard ? (
              <View style={st.cardContent}>
                {/* 1. Watch Out Alert Card */}
                {activeCard.type === 'watchout' ? (
                  <View style={st.watchCard}>
                    <WatchOutDiseaseArt width={SCREEN_WIDTH - 64} height={150} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <NotoEmoji name="bug" size={40} />
                      <View style={st.alertBadge}>
                        <Text style={st.alertBadgeTxt}>Watch out</Text>
                      </View>
                    </View>
                    <Text raw style={st.watchDiseaseName}>
                      {activeCard.caption}
                    </Text>
                    <Text raw style={st.cardBody}>
                      {activeCard.body}
                    </Text>

                    {/* Hutton late-blight risk status if relevant */}
                    {/* Hutton criteria are for potato and tomato late blight only */}
                    {weather?.blight && /potato|tomato/i.test(cropId) ? (
                      <View style={st.huttonBox}>
                        <Icon name="weather-partly-cloudy" size={16} color={C.primaryDark} />
                        <Text raw style={st.huttonTxt}>
                          {t('Local Hutton blight risk')}: <Text raw style={{ fontFamily: FONT.bodyBold }}>{weather.blight.level}</Text>
                        </Text>
                      </View>
                    ) : null}

                    <Btn
                      label="Scan a leaf right now"
                      icon="camera"
                      kind="primary"
                      onPress={() => {
                        closeStory();
                        openScanner();
                      }}
                      style={{ marginTop: 16, width: '100%' }}
                    />
                  </View>
                ) : null}

                {/* 2. Action Story Card with Custom SVG Art & 5-10 word caption */}
                {activeCard.type === 'action' ? (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.actionCard, { flexGrow: 1, justifyContent: 'center' }]}>
                    <View style={{ alignItems: 'center' }}>
                      {activeCard.facts?.length ? (
                        <StoryDiagram facts={activeCard.facts} crop={cropId} width={SCREEN_WIDTH - 72} k={`${storyStage?.id}:${storyIndex}`} />
                      ) : (
                        getActionIllustration(activeCard.body, storyStage?.name ?? '', activeCard.index ?? 0)
                      )}
                    </View>
                    <Text style={st.actionBadge}>{activeCard.title}</Text>
                    <Text raw style={st.actionCaption}>
                      {activeCard.caption}
                    </Text>
                    {activeCard.rest ? (
                      <Text raw style={[st.cardBody, { textAlign: 'left', marginTop: 8 }]}>
                        {activeCard.rest}
                      </Text>
                    ) : null}

                    <View style={{ marginTop: 18, alignSelf: 'flex-start' }}>
                      <Btn
                        label="Listen"
                        icon="volume-high"
                        kind="secondary"
                        onPress={readCard}
                      />
                    </View>
                  </ScrollView>
                ) : null}

                {/* 3. Inputs & PCPB Commercial Products Card */}
                {activeCard.type === 'products' ? (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={st.inputsHeader}>Registered products in Kenya</Text>
                    <Text style={st.inputsSub}>Not sponsored. Follow the label.</Text>

                    {activeCard.pcpb?.slice(0, 3).map((prod) => (
                      <PcpbProductCard key={prod.r} product={prod} crop={cropKey(crop.name)} problem={activeCard.problem ?? null} onPanel />
                    ))}

                    <View style={{ gap: 8, marginTop: 14 }}>
                      <Btn
                        label="Calculate tank-mix"
                        icon="calculator"
                        kind="primary"
                        onPress={() => {
                          closeStory();
                          router.push({
                            pathname: '/pesticide-calc',
                            params: { crop: cropId, problem: activeCard.problem ?? '' },
                          });
                        }}
                      />
                      <Btn
                        label="Fertiliser shopping list"
                        icon="sack"
                        kind="secondary"
                        onPress={() => {
                          closeStory();
                          router.push('/fertiliser');
                        }}
                      />
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            ) : null}

            {/* Bottom Nav Controls */}
            <View style={st.storyNav}>
              <TouchableOpacity
                onPress={prevCard}
                disabled={storyIndex === 0}
                style={[st.storyNavBtn, storyIndex === 0 && { opacity: 0.3 }]}
              >
                <Icon name="chevron-left" size={24} color="#FFFFFF" />
                <Text style={st.storyNavTxt}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={readCard} style={st.readAloudCircle} accessibilityLabel={t('Read aloud')}>
                <Icon name="volume-high" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity onPress={nextCard} style={st.storyNavBtn}>
                <Text style={st.storyNavTxt}>{storyIndex === storyCards.length - 1 ? 'Done' : 'Next'}</Text>
                <Icon name="chevron-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  tools: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  tool: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, gap: 4, alignItems: 'center' },
  toolTitle: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text, marginTop: 4 },
  small: { fontSize: 13, color: C.textSub, lineHeight: 18 },
  timeline: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  sectionHeader: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, marginBottom: 4 },
  stageCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageNum: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  stageTitle: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  playPillTxt: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT.bodyBold },
  watchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  watchPillTxt: { fontSize: 12, color: C.error, flex: 1 },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 22,
  },
  askTxt: { flex: 1, fontSize: 15, color: C.text },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  footnote: {
    fontSize: 12,
    color: C.textSub,
    marginHorizontal: 28,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Story Modal Styles
  storyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 29, 22, 0.94)', // Brand ground
  },
  storyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  storyHeader: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: C.brandGold,
  },
  storyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  storyStageName: { fontSize: 16, fontFamily: FONT.bodyBold, color: '#FFFFFF' },
  storyCardCount: { fontSize: 12, color: 'rgba(255, 255, 255, 0.65)' },
  closeStoryBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
    justifyContent: 'center',
  },
  watchCard: {
    alignItems: 'center',
    gap: 10,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  alertBadgeTxt: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT.bodyBold, letterSpacing: 0.5 },
  watchDiseaseName: { fontSize: 20, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  cardBody: { fontSize: 15, color: C.textMid, lineHeight: 22, textAlign: 'center', marginTop: 4 },
  huttonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  huttonTxt: { fontSize: 13, color: C.primaryDark },
  actionCard: {
    gap: 12,
  },
  actionBadge: { fontSize: 12, fontFamily: FONT.bodyBold, color: C.primary, textTransform: 'uppercase' },
  actionCaption: { fontSize: 22, fontFamily: FONT.display, color: C.text, lineHeight: 28 },
  inputsHeader: { fontSize: 18, fontFamily: FONT.bodyBold, color: C.text },
  inputsSub: { fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 12 },
  storyNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  storyNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  storyNavTxt: { color: '#FFFFFF', fontSize: 15, fontFamily: FONT.bodyBold },
  readAloudCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
