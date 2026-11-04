// Scan result — v2.7: alive, not a page to read (Ezra, 29 Oct: "items not information",
// "diagrams, emotions, like just life").
// The leaf with a feeling (Noto: sick / happy / thinking), the disease name and one urgency chip;
// how it spreads as moving pictures; "do this now" as swipeable cards the farmer ticks off
// (a buzz each, a party when all are done); one spray tile (PCPB-registered only); three
// buttons. Everything else is folded under "More". Rule 3: below 75 % nothing names a
// disease or offers a spray.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Linking, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { Easing, FadeInDown, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { Btn, CropIcon, Dot, Header, Icon, ListenButton, ProgressBar, Sheet, Text, tick, type IconName } from '../components/ui';
import { NotoEmoji } from '../components/NotoEmoji';
import { describeLabel, CONFIDENCE_THRESHOLD } from '../lib/classifier';
import { chemicalRules, cropName, getDisease, localizeDisease, pestHints } from '../lib/diseases';
import { PcpbProductCard } from '../components/PcpbProductCard';
import { cropKey, getRegisteredProducts, PCPB_DISCLAIMER, problemKey } from '../lib/pcpb';
import { addFarm, listFarms, saveIncident, type Farm } from '../lib/data';
import { findAgrovets, getPosition, mapsUrl, type Agrovet } from '../lib/geo';
import { openScanner } from '../lib/navigation';
import { useLang } from '../lib/i18n';
import { KIND_PICTURE, URGENCY_LEVEL, spreadPictures, stepIcon, stepTitle, type Picture } from '../lib/resultPictures';
import { C, FONT, URGENCY_META, confidenceBand } from '../lib/theme';

export default function ResultScreen() {
  const p = useLocalSearchParams<{ label: string; confidence: string; uri?: string; alts?: string; prepareMs?: string; inferMs?: string; incidentId?: string; q?: string }>();
  const { t, lang } = useLang();
  const label = p.label ?? '';
  const confidence = Number(p.confidence ?? 0);
  const base = describeLabel(label);
  const raw = getDisease(label);
  const info = raw ? localizeDisease(raw, lang) : undefined;
  const uncertain = confidence < CONFIDENCE_THRESHOLD;
  const band = confidenceBand(confidence);
  const alts = useMemo<[string, number][]>(() => {
    try {
      return p.alts ? JSON.parse(p.alts) : [];
    } catch {
      return [];
    }
  }, [p.alts]);
  const hints = uncertain ? pestHints([base.crop, ...alts.map(([l]) => describeLabel(l).crop)], lang) : [];
  // Registered product examples only for a confident diagnosis (rule 3: never act on "Not sure").
  const pcpbCrop = cropKey(base.crop);
  const pcpbProblem = problemKey(label) ?? problemKey(raw?.disease);
  const pcpbProducts = useMemo(
    () => (uncertain ? [] : getRegisteredProducts(base.crop, label || raw?.disease || base.disease)),
    [uncertain, label, raw, base]
  );

  // A confirmation you can feel: success for a healthy leaf, a light tap otherwise.
  useEffect(() => {
    tick(!uncertain && base.healthy ? 'success' : 'light');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(p.incidentId ?? null);
  const [agrovets, setAgrovets] = useState<Agrovet[] | null>(null);
  const [agroStatus, setAgroStatus] = useState('');
  const [step, setStep] = useState<number | null>(null); // the "do this now" tile opened
  const [sprays, setSprays] = useState(false);
  const [details, setDetails] = useState(false);
  const [done, setDone] = useState<number[]>([]); // "do this now" cards ticked off

  // A new scan can arrive on this same screen: start fresh (the TECNO showed "3 of 2 done").
  const page = useRef<ScrollView>(null);
  const scanKey = `${label}|${p.confidence}|${p.uri ?? ''}`;
  useEffect(() => {
    setDone([]);
    setStep(null);
    setSprays(false);
    setDetails(false);
    setSavedId(p.incidentId ?? null);
    setAgrovets(null);
    setAgroStatus('');
    page.current?.scrollTo({ y: 0, animated: false });
  }, [scanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // English names are stored in the database; the screen shows the app language.
  const cropEn = raw?.crop ?? base.crop;
  const diseaseEn = raw?.disease ?? base.disease;
  const crop = info?.crop ?? cropName(base.crop, lang);
  const disease = info?.disease ?? base.disease;
  const healthy = base.healthy;
  const pct = `${Math.round(confidence * 100)}%`;
  const altName = (l: string) => {
    const d = getDisease(l);
    const loc = d ? localizeDisease(d, lang) : null;
    const b = describeLabel(l);
    return `${loc?.crop ?? cropName(b.crop, lang)} — ${loc?.disease ?? b.disease}`;
  };

  // Pictures come from the English guide text (same pictures in Kiswahili); words from the app language.
  const kindPic = info && !healthy ? KIND_PICTURE[info.kind] : undefined;
  const spreadPics = !healthy ? spreadPictures(raw?.spread) : [];
  const steps = (info?.cultural ?? []).slice(0, 3).map((text, i) => ({ text, title: stepTitle(text), icon: stepIcon(raw?.cultural[i] ?? text) as IconName }));
  const urgency = info ? URGENCY_META[info.urgency] : URGENCY_META.medium;
  const urgencyLevel = info ? URGENCY_LEVEL[info.urgency] ?? 2 : 0;

  const openSave = async () => {
    try {
      setFarms(await listFarms());
      setPicker(true);
    } catch (e) {
      Alert.alert(t('Could not load your fields'), e instanceof Error ? e.message : '');
    }
  };

  const save = async (farmId: string | null) => {
    setPicker(false);
    setSaving(true);
    try {
      const rec = await saveIncident({ farm_id: farmId, class_label: label, crop: cropEn, disease: diseaseEn, confidence, uncertain, notes: null });
      setSavedId(rec.id);
      tick('success');
      Alert.alert(t('Saved'), farmId ? t("Added to the field's disease history.") : t('Saved to your scan history.'));
    } catch (e) {
      Alert.alert(t('Save failed'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const quickAddFarm = async () => {
    try {
      const f = await addFarm({ name: t('{crop} field', { crop }), crop: cropEn });
      await save(f.id);
    } catch (e) {
      Alert.alert(t('Could not add a field'), e instanceof Error ? e.message : '');
    }
  };

  const shareText = () =>
    `${t('Tassel scan')}\n${t('Crop')}: ${crop}\n${t('Result')}: ${uncertain ? t('Not sure') : disease}\n${t('Confidence')}: ${pct}\n` +
    (info && !healthy && !uncertain ? `${t('What to do first')}: ${info.cultural[0]}\n` : '') +
    t('Checked on-device with Tassel. Confirm with your extension officer.');

  const shareWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareText())}`;
    try {
      await Linking.openURL(url);
    } catch {
      await Share.share({ message: shareText() });
    }
  };

  const askCommunity = () =>
    router.push({
      pathname: '/new-post',
      params: {
        photo: p.uri ?? '',
        crop: cropEn,
        scanLabel: label,
        scanConfidence: String(confidence),
        category: healthy ? 'General' : info?.kind === 'Pest' ? 'Pests' : 'Diseases',
        title: uncertain ? t('Help: what is wrong with my {crop}?', { crop }) : t('{crop}: {disease}?', { crop, disease }),
      },
    });

  // AI photo check (online): second opinion for pests, deficiencies and crops the offline model does not know.
  const openPhotoCheck = () =>
    router.push({ pathname: '/photo-check', params: { uri: p.uri ?? '', crop: cropEn, scanLabel: label, scanConfidence: String(confidence) } });

  const loadAgrovets = async () => {
    setAgroStatus(t('Getting your location…'));
    const pos = await getPosition();
    if (!pos) {
      setAgroStatus(t('Location permission is needed to find nearby agro-dealers.'));
      return;
    }
    setAgroStatus(t('Searching OpenStreetMap…'));
    try {
      const list = await findAgrovets(pos);
      setAgrovets(list);
      setAgroStatus(list.length ? '' : t('No agro-dealers are mapped within 15 km yet.'));
    } catch {
      setAgroStatus(t('Could not search right now. Check your internet connection.'));
    }
  };

  const listenText = () => {
    if (uncertain) return `${t('Not sure')}. ${t('Retake the photo of one leaf, in daylight, close and steady.')}`;
    const parts = [`${crop}. ${healthy ? t('Healthy leaf') : disease}. ${t(band.word)}.`];
    if (info && !healthy) parts.push(t(urgency.label));
    if (steps.length) parts.push(`${t(healthy ? 'Keep it healthy' : 'Do this now')}: ${steps.map((s) => s.text).join(' ')}`);
    return parts.join(' ');
  };

  // Three buttons on the screen; the rest live under "More".
  type Action = { icon: IconName; label: string; onPress: () => void; on?: boolean };
  const save3: Action = { icon: savedId ? 'check-circle' : 'content-save-outline', label: savedId ? 'Saved' : 'Save', onPress: () => !savedId && openSave(), on: Boolean(savedId) };
  const mainActions: Action[] = uncertain
    ? [
        ...(p.uri ? [{ icon: 'image-search-outline' as IconName, label: 'Check online', onPress: openPhotoCheck }] : []),
        { icon: 'account-group-outline', label: 'Ask farmers', onPress: askCommunity },
        save3,
      ]
    : [save3, { icon: 'account-group-outline', label: 'Ask farmers', onPress: askCommunity }, { icon: 'camera-retake-outline', label: 'Scan again', onPress: openScanner }];
  const moreActions: Action[] = [
    ...(info && !healthy && !uncertain
      ? [{ icon: 'calendar-clock' as IconName, label: 'Day-by-day plan', onPress: () => router.push({ pathname: '/treatment-plan', params: { label, incidentId: savedId ?? '' } }) }]
      : []),
    ...(!uncertain && p.uri ? [{ icon: 'image-search-outline' as IconName, label: 'Check online (AI)', onPress: openPhotoCheck }] : []),
    ...(!uncertain ? [{ icon: 'chat-processing-outline' as IconName, label: 'Ask the AI advisor', onPress: () => router.push({ pathname: '/chat', params: { crop: cropEn, disease: diseaseEn, confidence: String(confidence) } }) }] : []),
    { icon: 'whatsapp', label: 'Share', onPress: shareWhatsApp },
  ];
  const feeling = uncertain ? 'thinking' : healthy ? 'happy' : 'sick';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Scan result" right={<ListenButton compact text={listenText} />} />
      <ScrollView ref={page} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* ── The leaf, with a feeling ────────────────────────────── */}
        <View style={st.hero}>
          {p.uri ? (
            <Image source={{ uri: p.uri }} style={st.leaf} resizeMode="cover" accessibilityLabel={t('Your photo')} />
          ) : (
            <View style={[st.leaf, { backgroundColor: C.sunken, alignItems: 'center', justifyContent: 'center' }]}>
              <CropIcon crop={cropEn} size={96} disc={false} />
            </View>
          )}
          <Animated.View entering={ZoomIn.delay(200).springify().damping(10)} style={st.face}>
            <NotoEmoji name={feeling} size={84} />
          </Animated.View>
        </View>

        {/* ── Name and one chip ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(16)} style={st.verdict}>
          {uncertain ? (
            // Rule 3: no crop or disease as fact; the guess is small.
            <>
              <Text style={st.verdictWord}>{p.q === 'dark' ? 'Too dark to read' : p.q === 'blurry' ? 'Too blurry to read' : 'Not sure yet'}</Text>
              <Text raw style={st.small}>{t('Most likely: {d}', { d: `${crop} — ${disease}` })}</Text>
            </>
          ) : (
            <>
              <View style={st.cropRow}>
                <CropIcon crop={cropEn} size={28} disc={false} />
                <Text raw style={st.cropName}>{crop}</Text>
              </View>
              <Text raw style={st.verdictWord}>{healthy ? t('Healthy leaf') : disease}</Text>
            </>
          )}
          <View style={st.chipRow}>
            {info && !healthy && !uncertain ? (
              <View style={[st.chip, { backgroundColor: urgency.tint }]}>
                <Icon name={urgencyLevel >= 3 ? 'alarm-light-outline' : 'clock-outline'} size={18} color={urgency.color} />
                <Text style={[st.chipTxt, { color: urgency.color }]}>{urgency.label}</Text>
              </View>
            ) : null}
            <View style={[st.chip, { backgroundColor: band.tint }]}>
              <Text raw style={[st.chipTxt, { color: band.color }]}>{`${t(band.word)} · ${pct}`}</Text>
            </View>
          </View>

          {info?.notifiable && !uncertain ? (
            <View style={st.alertRow}>
              <Icon name="bullhorn-outline" size={20} color={C.error} />
              <Text style={[st.small, { color: C.error, fontFamily: FONT.bodyBold, flex: 1 }]}>Report to your county agricultural officer</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Not sure: what to fix first, then the likely candidates ─ */}
        {uncertain ? (
          <View style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            <View style={st.tipRow}>
              {[
                { icon: 'white-balance-sunny' as IconName, label: 'Daylight', hot: p.q === 'dark' },
                { icon: 'leaf' as IconName, label: 'One leaf', hot: false },
                { icon: 'hand-back-right-outline' as IconName, label: 'Close and steady', hot: p.q === 'blurry' },
              ].map((x) => (
                <View key={x.label} style={st.tipItem}>
                  <View style={[st.tipIcon, x.hot && { backgroundColor: C.errorTint }]}>
                    <Icon name={x.icon} size={28} color={x.hot ? C.error : C.primaryDark} />
                  </View>
                  <Text style={[st.tipLabel, x.hot && { color: C.error, fontFamily: FONT.bodyBold }]}>{x.label}</Text>
                </View>
              ))}
            </View>
            <Btn label="Retake the photo" icon="camera-retake-outline" kind="signature" onPress={openScanner} />
            <View style={st.whatCard}>
              <Text style={st.cardHead}>Could be</Text>
              {[[label, confidence] as [string, number], ...alts].map(([l, c]) => {
                const d = describeLabel(l);
                return (
                  <View key={l} style={st.candRow}>
                    <CropIcon crop={d.crop} size={30} disc={false} />
                    <Text raw style={st.candName} numberOfLines={2}>{`${cropName(d.crop)} · ${d.healthy ? t('Healthy leaf') : d.disease}`}</Text>
                    <Text raw style={st.candPct}>{`${Math.round(c * 100)}%`}</Text>
                  </View>
                );
              })}
              <Text style={st.small}>These are guesses from one photo. Do not treat from this: retake, or ask the farmers or the AI.</Text>
            </View>
          </View>
        ) : null}

        {/* ── What it is · how it spreads ─────────────────────────── */}
        {!uncertain && (kindPic || spreadPics.length) ? (
          // One card: what it is on top, then the spread pictures in one row ("Spreads by" once).
          <View style={[st.section, st.whatCard]}>
            {kindPic ? (
              <View style={st.whatRow}>
                <View style={[st.picIcon, { backgroundColor: C.errorTint }]}>
                  {kindPic.noto ? <NotoEmoji name={kindPic.noto} size={40} /> : <Icon name={kindPic.icon as IconName} size={32} color={C.error} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.picCaption}>What it is</Text>
                  <Text style={st.whatLabel}>{kindPic.label}</Text>
                </View>
              </View>
            ) : null}
            {spreadPics.length ? (
              <>
                <Text style={[st.picCaption, { marginTop: kindPic ? 14 : 0 }]}>Spreads by</Text>
                <View style={st.picRow}>
                  {spreadPics.map((pic) => (
                    <PictureItem key={pic.key} pic={pic} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* ── Do this now: swipe the cards, tick each one off ──────── */}
        {!uncertain && steps.length ? (
          <View style={{ marginTop: 18 }}>
            <View style={[st.sectionHead, { marginHorizontal: 16 }]}>
              <Text style={st.h}>{healthy ? 'Keep it healthy' : 'Do this now'}</Text>
              <Text raw style={st.small}>{t('{done} of {n} done', { done: done.length, n: steps.length })}</Text>
            </View>
            <ScrollView
              key={scanKey}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_W + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {steps.map((s, i) => (
                <ActionCard
                  key={i}
                  n={i + 1}
                  icon={s.icon}
                  title={s.title}
                  done={done.includes(i)}
                  onOpen={() => setStep(i)}
                  onDone={() => {
                    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
                    setDone(next);
                    tick(next.length === steps.length && !done.includes(i) ? 'success' : 'select');
                  }}
                />
              ))}
            </ScrollView>
            {done.length === steps.length ? (
              <Animated.View entering={ZoomIn.springify().damping(11)} style={st.allDone}>
                <NotoEmoji name="party" size={44} />
                <Text style={st.allDoneTxt}>Well done! Scan again in a few days.</Text>
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        {/* ── Spray: one tile, PCPB-registered only ───────────────── */}
        {!uncertain && !healthy && info?.chemical.length ? (
          <View style={st.section}>
            <TouchableOpacity style={st.sprayTile} onPress={() => setSprays((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: sprays }}>
              <View style={[st.stepIcon, { backgroundColor: C.accentTint }]}>
                <Icon name="spray" size={30} color={C.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.stepTitle}>Spray only if needed</Text>
                <Text raw style={st.small}>
                  {pcpbProducts.length ? t('{n} registered products in Kenya', { n: pcpbProducts.length }) : t('See the active ingredients in More details')}
                </Text>
              </View>
              <Icon name={sprays ? 'chevron-up' : 'chevron-down'} size={22} color={C.textLight} />
            </TouchableOpacity>
            {sprays ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                {pcpbProducts.map((prod) => (
                  <PcpbProductCard key={prod.r} product={prod} crop={pcpbCrop} problem={pcpbProblem} />
                ))}
                {pcpbProducts.length ? <Text style={st.disclaimer}>{PCPB_DISCLAIMER}</Text> : null}
                <Btn
                  label="Work out the spray mix"
                  icon="calculator-variant-outline"
                  kind="secondary"
                  onPress={() => router.push({ pathname: '/pesticide-calc', params: { crop: base.crop, problem: label } })}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Three buttons ───────────────────────────────────────── */}
        <View style={[st.section, st.grid]}>
          {mainActions.map((a) => (
            <TouchableOpacity key={a.label} style={st.gridItem} onPress={a.onPress} disabled={saving && a === save3} accessibilityRole="button">
              <View style={[st.gridIcon, a.on && { backgroundColor: C.primaryTint }]}>
                <Icon name={a.icon} size={28} color={a.on ? C.primary : C.primaryDark} />
              </View>
              <Text style={st.gridLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── More: the other actions and the long text, folded ──── */}
        <TouchableOpacity style={st.moreBtn} onPress={() => setDetails((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: details }}>
          <Text style={st.moreTxt}>More</Text>
          <Icon name={details ? 'chevron-up' : 'chevron-down'} size={20} color={C.primary} />
        </TouchableOpacity>
        {details ? (
          <View style={st.panel}>
            <View style={{ gap: 2 }}>
              {moreActions.map((a) => (
                <TouchableOpacity key={a.label} style={st.moreRow} onPress={a.onPress} accessibilityRole="button">
                  <Icon name={a.icon} size={22} color={C.primaryDark} />
                  <Text style={[st.agroName, { flex: 1 }]}>{a.label}</Text>
                  <Icon name="chevron-right" size={20} color={C.textLight} />
                </TouchableOpacity>
              ))}
            </View>
            {uncertain ? (
              <>
                <Text raw style={st.body}>
                  {t('Confidence is below {n}%, so treat this as a guess. Retake the photo of a single leaf in daylight, or show the plant to an extension officer or agro-dealer.', {
                    n: Math.round(CONFIDENCE_THRESHOLD * 100),
                  })}
                </Text>
                {hints.length ? <Bullets title="Also check for pests the scanner can miss:" items={hints} /> : null}
              </>
            ) : null}
            {info && !healthy && !uncertain ? (
              <>
                <Bullets title="What it looks like" items={[info.symptoms]} />
                {info.spread ? <Bullets title="How it spreads" items={[info.spread]} /> : null}
                {info.kenya ? <Bullets title="In Kenya" items={[info.kenya]} /> : null}
                {info.pathogen ? <Bullets title="Cause" items={[info.pathogen]} /> : null}
              </>
            ) : null}
            {info && !uncertain ? <Bullets title={healthy ? 'Good practice' : 'All steps'} items={info.cultural} numbered /> : null}
            {info && !uncertain && info.biological.length ? <Bullets title="Organic / biological options" items={info.biological} numbered /> : null}
            {info && !uncertain && info.chemical.length ? (
              <>
                <Bullets title="Chemical options (active ingredient)" items={info.chemical.map((c) => (c.note ? `${c.active} — ${c.note}` : c.active))} />
                <Text raw style={[st.small, { marginTop: 8 }]}>{chemicalRules(lang)}</Text>
              </>
            ) : null}
            {alts.length ? (
              <View style={{ marginTop: 16 }}>
                <Text style={st.h2}>Other possibilities</Text>
                {alts.map(([l, c]) => (
                  <View key={l} style={{ marginTop: 8, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text raw style={[st.body, { flex: 1 }]}>{altName(l)}</Text>
                      <Text raw style={st.small}>{`${Math.round(c * 100)}%`}</Text>
                    </View>
                    <ProgressBar value={c} color={C.textLight} height={5} />
                  </View>
                ))}
              </View>
            ) : null}
            {!healthy && !uncertain ? (
              <View style={{ marginTop: 16 }}>
                <Text style={st.h2}>Nearby agro-dealers</Text>
                {agrovets?.length ? (
                  agrovets.map((a) => (
                    <TouchableOpacity key={a.id} style={st.agroRow} onPress={() => Linking.openURL(mapsUrl(a.lat, a.lng, a.name))}>
                      <View style={{ flex: 1 }}>
                        <Text raw style={st.agroName}>{a.name}</Text>
                        <Text raw style={st.small}>
                          {t('{km} km away', { km: a.distanceKm.toFixed(1) })}
                          {a.address ? `, ${a.address}` : ''}
                        </Text>
                      </View>
                      {a.phone ? (
                        <TouchableOpacity style={st.agroIcon} onPress={() => Linking.openURL(`tel:${a.phone}`)} accessibilityLabel={t('Call')}>
                          <Icon name="phone-outline" size={20} color={C.text} />
                        </TouchableOpacity>
                      ) : null}
                      <View style={st.agroIcon}>
                        <Icon name="directions" size={20} color={C.text} />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    {agroStatus ? <Text raw style={[st.body, { marginBottom: 10 }]}>{agroStatus}</Text> : null}
                    <Btn label="Find agro-dealers near me" icon="map-marker-radius-outline" kind="secondary" onPress={loadAgrovets} />
                  </>
                )}
                <Text style={[st.small, { marginTop: 10 }]}>Data © OpenStreetMap contributors</Text>
              </View>
            ) : null}
            {p.inferMs ? (
              <Text raw style={[st.small, { marginTop: 16 }]}>
                {t('Analysed on this phone in {ms} ms', { ms: Number(p.prepareMs ?? 0) + Number(p.inferMs) })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* The full step behind a tile */}
      <Sheet visible={step !== null} onClose={() => setStep(null)} title={step !== null ? t('Step {n}', { n: step + 1 }) : undefined}>
        {step !== null && steps[step] ? (
          <View style={{ gap: 16, alignItems: 'center', paddingBottom: 8 }}>
            <View style={[st.bigBadge, { backgroundColor: C.primaryTint }]}>
              <Icon name={steps[step].icon} size={48} color={C.primaryDark} />
            </View>
            <Text raw style={[st.body, { fontSize: 18, lineHeight: 26, textAlign: 'center', color: C.text }]}>{steps[step].text}</Text>
            <ListenButton text={steps[step].text} />
          </View>
        ) : null}
      </Sheet>

      {/* Field picker */}
      <Sheet visible={picker} onClose={() => setPicker(false)} title="Save this scan to…">
        {(farms ?? []).map((f) => (
          <TouchableOpacity key={f.id} style={st.farmRow} onPress={() => save(f.id)}>
            <CropIcon crop={f.crop} size={40} />
            <View style={{ flex: 1 }}>
              <Text raw style={st.agroName}>{f.name}</Text>
              <Text raw style={st.small}>
                {[f.crop ? cropName(f.crop, lang) : null, f.size_acres ? t('{n} acres', { n: Number(f.size_acres).toFixed(2) }) : null].filter(Boolean).join(', ') || t('Field')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {farms && farms.length === 0 ? (
          <TouchableOpacity style={st.farmRow} onPress={quickAddFarm}>
            <Icon name="plus" size={24} color={C.primary} />
            <Text raw style={[st.agroName, { color: C.primary }]}>
              {t('Create "{name}" and save', { name: t('{crop} field', { crop }) })}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={st.farmRow} onPress={() => save(null)}>
          <Icon name="history" size={24} color={C.textSub} />
          <Text style={st.agroName}>Scan history only (no field)</Text>
        </TouchableOpacity>
      </Sheet>
    </View>
  );
}

const CARD_W = Math.min(300, Dimensions.get('window').width * 0.74);

/** One "do this now" card: a moving picture, a short title, Done. Tap the picture for the full step. */
function ActionCard({ n, icon, title, done, onOpen, onDone }: { n: number; icon: IconName; title: string; done: boolean; onOpen: () => void; onDone: () => void }) {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce || done) {
      bob.value = 0;
      return;
    }
    bob.value = withDelay(n * 250, withRepeat(withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduce, done, n, bob]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  return (
    <Animated.View entering={FadeInDown.delay(100 + n * 80)} style={[st.card, done && { backgroundColor: C.primaryTint }]}>
      <TouchableOpacity onPress={onOpen} style={{ alignItems: 'center', gap: 12 }} accessibilityRole="button" accessibilityHint={t('Opens the full step')}>
        <View style={st.cardNum}>
          <Text raw style={st.stepNumTxt}>{String(n)}</Text>
        </View>
        <Animated.View style={[st.cardIcon, bobStyle, done && { backgroundColor: C.primary }]}>
          {done ? (
            <Animated.View entering={ZoomIn.springify().damping(10)}>
              <Icon name="check-bold" size={44} color="#fff" />
            </Animated.View>
          ) : (
            <Icon name={icon} size={44} color={C.primaryDark} />
          )}
        </Animated.View>
        <Text raw style={st.cardTitle}>{title}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.doneBtn, done && { backgroundColor: C.primary }]}
        onPress={onDone}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
      >
        <Icon name={done ? 'check-circle' : 'checkbox-blank-circle-outline'} size={22} color={done ? '#fff' : C.primaryDark} />
        <Text style={[st.doneTxt, done && { color: '#fff' }]}>{done ? 'Done' : 'Mark done'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** One picture with a word under it: an icon, or a Noto emoji where it carries the meaning. */
function PictureItem({ pic }: { pic: Picture }) {
  // A sky disc behind rain and water: the white Noto cloud vanished on the pale green one (TECNO).
  const sky = pic.noto === 'rain' || pic.noto === 'droplet';
  return (
    <View style={st.picItem}>
      <View style={[st.picIcon, sky && { backgroundColor: '#CFE0EA' }]}>
        {pic.noto ? <NotoEmoji name={pic.noto} size={40} /> : <Icon name={pic.icon as IconName} size={32} color={C.primaryDark} />}
      </View>
      <Text style={st.picLabel}>{pic.label}</Text>
    </View>
  );
}

function Bullets({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={st.h2}>{title}</Text>
      {items.map((x, i) => (
        <View key={i} style={st.li}>
          {numbered && items.length > 1 ? (
            <Text raw style={st.num}>{String(i + 1)}</Text>
          ) : (
            <View style={{ paddingTop: 9 }}>
              <Dot color={C.textLight} size={5} />
            </View>
          )}
          <Text raw style={[st.body, { flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  cardHead: { fontSize: 18, fontFamily: FONT.display, color: C.text, marginBottom: 6 },
  candRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  candName: { flex: 1, fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  candPct: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.textSub },
  hero: { marginHorizontal: 16, marginTop: 4 },
  leaf: { height: 220, borderRadius: 20 },
  face: { position: 'absolute', right: 12, bottom: -34, width: 104, height: 104, borderRadius: 52, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  verdict: { marginHorizontal: 16, marginTop: 8, paddingRight: 112, gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, minHeight: 36 },
  chipTxt: { fontSize: 15, fontFamily: FONT.bodyBold },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10 },
  card: { width: CARD_W, backgroundColor: C.surface, borderRadius: 22, padding: 16, gap: 14, justifyContent: 'space-between' },
  cardNum: { alignSelf: 'flex-start', width: 26, height: 26, borderRadius: 13, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 19, lineHeight: 25, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center', minHeight: 50 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14, backgroundColor: C.primaryTint },
  doneTxt: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.primaryDark },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: C.primaryTint },
  allDoneTxt: { flex: 1, fontSize: 16, fontFamily: FONT.bodyBold, color: C.primaryDark },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  bigBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  verdictWord: { fontSize: 30, lineHeight: 36, fontFamily: FONT.display, color: C.text },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cropName: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.textMid },
  disease: { fontSize: 32, lineHeight: 38, fontFamily: FONT.display, color: C.text },
  meterRow: { gap: 6 },
  meterLabel: { fontSize: 13, color: C.textSub, fontFamily: FONT.bodyBold, textTransform: 'uppercase', letterSpacing: 0.6 },
  meter: { flexDirection: 'row', gap: 6 },
  meterSeg: { flex: 1, height: 10, borderRadius: 5 },
  meterWord: { fontSize: 16, fontFamily: FONT.bodyBold },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.errorTint, borderRadius: 12, padding: 12 },
  section: { marginHorizontal: 16, marginTop: 18 },
  h: { fontSize: 22, fontFamily: FONT.display, color: C.text, marginBottom: 10 },
  h2: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, marginBottom: 4 },
  body: { fontSize: 16, color: C.textMid, lineHeight: 23 },
  small: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  picRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  whatCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16 },
  whatRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whatLabel: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  picItem: { flex: 1, alignItems: 'center', gap: 6 },
  picCaption: { fontSize: 13, color: C.textSub },
  picIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  picLabel: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  stepTile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 12, minHeight: 72 },
  stepIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  stepNum: { position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: '#fff', fontSize: 13, fontFamily: FONT.bodyBold },
  stepTitle: { flex: 1, fontSize: 17, lineHeight: 22, fontFamily: FONT.bodyBold, color: C.text },
  sprayTile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 12, minHeight: 72 },
  disclaimer: { fontSize: 13, color: C.textSub, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, minHeight: 104 },
  gridIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 14, lineHeight: 18, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  tipRow: { flexDirection: 'row', gap: 10 },
  tipItem: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 12 },
  tipIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  tipLabel: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.text, textAlign: 'center' },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, marginTop: 18 },
  moreTxt: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.primary },
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 4 },
  li: { flexDirection: 'row', gap: 10, marginTop: 6 },
  num: { width: 18, fontSize: 16, lineHeight: 23, fontFamily: FONT.bodyBold, color: C.primary },
  agroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  agroName: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  agroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  farmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
});
