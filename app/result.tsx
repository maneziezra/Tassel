// Scan result — one clear verdict first (crop, problem, how sure), then what it
// looks like, what to do in order, where to buy inputs, and the next actions.
// v2.2: calm layout (no tinted panels), steps as numbered lists, field picker sheet.

import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, CropIcon, Dot, Header, Icon, ListenButton, ProgressBar, Sheet, Text, type IconName } from '../components/ui';
import { describeLabel, CONFIDENCE_THRESHOLD } from '../lib/classifier';
import { chemicalRules, cropName, getDisease, localizeDisease, pestHints } from '../lib/diseases';
import { getRegisteredProducts, PCPB_DISCLAIMER } from '../lib/pcpb';
import { addFarm, listFarms, saveIncident, type Farm } from '../lib/data';
import { findAgrovets, getPosition, mapsUrl, type Agrovet } from '../lib/geo';
import { openScanner } from '../lib/navigation';
import { useLang } from '../lib/i18n';
import { C, FONT, KIND_META, URGENCY_META, confidenceBand } from '../lib/theme';

export default function ResultScreen() {
  const p = useLocalSearchParams<{ label: string; confidence: string; uri?: string; alts?: string; prepareMs?: string; inferMs?: string; incidentId?: string }>();
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
  const pcpbProducts = useMemo(() => getRegisteredProducts(label || raw?.disease || base.disease), [label, raw, base]);

  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(p.incidentId ?? null);
  const [agrovets, setAgrovets] = useState<Agrovet[] | null>(null);
  const [agroStatus, setAgroStatus] = useState('');

  // English names are stored in the database; the screen shows the app language.
  const cropEn = raw?.crop ?? base.crop;
  const diseaseEn = raw?.disease ?? base.disease;
  const crop = info?.crop ?? cropName(base.crop, lang);
  const disease = info?.disease ?? base.disease;
  const healthy = base.healthy;
  const pct = `${(confidence * 100).toFixed(1)}%`;
  const altName = (l: string) => {
    const d = getDisease(l);
    const loc = d ? localizeDisease(d, lang) : null;
    const b = describeLabel(l);
    return `${loc?.crop ?? cropName(b.crop, lang)} — ${loc?.disease ?? b.disease}`;
  };

  const status: { text: string; icon: IconName; color: string } = uncertain
    ? { text: 'Not sure — check again', icon: 'help-circle', color: C.warn }
    : healthy
    ? { text: 'Healthy leaf', icon: 'check-circle', color: C.primary }
    : { text: 'Disease detected', icon: 'alert-circle', color: C.error };

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
    `${t('Tassel scan')}\n${t('Crop')}: ${crop}\n${t('Result')}: ${uncertain ? t('Uncertain (best guess: {d})', { d: disease }) : disease}\n${t('Confidence')}: ${pct}\n` +
    (info && !healthy ? `${t('What to do first')}: ${info.cultural[0]}\n` : '') +
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
  const photoCheckLabel = lang === 'sw' ? 'Ukaguzi wa picha wa AI (wadudu, upungufu)' : 'AI photo check (pests, deficiencies)';
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
    const parts = [t(status.text), `${crop}. ${disease}. ${t('Confidence')} ${Math.round(confidence * 100)}%.`];
    if (uncertain) parts.push(t('Confidence is low. Retake the photo of a single leaf in daylight, or ask an extension officer.'));
    if (info) {
      parts.push(info.symptoms);
      parts.push(`${t(healthy ? 'Good practice' : 'Do this first (cultural)')}: ${info.cultural.join(' ')}`);
      if (info.biological.length) parts.push(`${t('Organic / biological options')}: ${info.biological.join(' ')}`);
    }
    return parts.join(' ');
  };

  const kind = info ? KIND_META[info.kind] : KIND_META.Fungal;
  const urgency = info ? URGENCY_META[info.urgency] : URGENCY_META.medium;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="Scan result"
        subtitle={p.inferMs ? t('Analysed on this phone in {ms} ms', { ms: Number(p.prepareMs ?? 0) + Number(p.inferMs) }) : undefined}
        right={<ListenButton compact text={listenText} />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {p.uri ? <Image source={{ uri: p.uri }} style={st.leaf} resizeMode="cover" /> : null}

        {/* Verdict */}
        <View style={st.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <CropIcon crop={cropEn} size={44} />
            <View style={{ flex: 1 }}>
              <Text raw style={st.crop}>
                {crop}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Dot color={status.color} />
                <Text style={[st.status, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>
          </View>
          <Text raw style={st.disease}>
            {disease}
          </Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.small}>{band.label}</Text>
              <Text raw style={[st.small, { color: band.color, fontFamily: FONT.bodyBold }]}>
                {pct}
              </Text>
            </View>
            <ProgressBar value={confidence} color={band.color} height={8} />
          </View>
          {info && !healthy ? (
            <Text raw style={[st.small, { marginTop: 12 }]}>
              {[t(info.kind), info.pathogen].filter(Boolean).join(' · ')}
              {'  '}
              <Text raw style={{ color: urgency.color, fontFamily: FONT.bodyBold }}>
                {t(urgency.label)}
              </Text>
            </Text>
          ) : null}
          {info?.notifiable ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <Dot color={C.error} />
              <Text style={[st.small, { color: C.error, fontFamily: FONT.bodyBold }]}>Report to authorities</Text>
            </View>
          ) : null}
        </View>

        {/* Uncertain: no fabricated diagnosis */}
        {uncertain ? (
          <View style={st.panel}>
            <Text style={st.h}>The scanner is not sure</Text>
            <Text style={st.body}>
              {t('Confidence is below {n}%, so treat this as a guess. Retake the photo of a single leaf in daylight, or show the plant to an extension officer or agro-dealer.', {
                n: Math.round(CONFIDENCE_THRESHOLD * 100),
              })}
            </Text>
            {hints.length ? (
              <>
                <Text style={[st.h2, { marginTop: 14 }]}>Also check for pests the scanner can miss:</Text>
                {hints.map((h) => (
                  <View key={h} style={st.li}>
                    <View style={{ paddingTop: 8 }}>
                      <Dot color={C.textLight} size={5} />
                    </View>
                    <Text raw style={[st.body, { flex: 1 }]}>
                      {h}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
            {p.uri ? <Btn label={photoCheckLabel} icon="image-search-outline" kind="signature" style={{ marginTop: 14 }} onPress={openPhotoCheck} /> : null}
            <Btn label="Ask the community" icon="account-group-outline" kind="secondary" style={{ marginTop: 10 }} onPress={askCommunity} />
          </View>
        ) : null}

        {/* What it looks like */}
        {info && !healthy ? (
          <View style={st.panel}>
            <Text style={st.h}>What it looks like</Text>
            <Text raw style={st.body}>
              {info.symptoms}
            </Text>
            {info.spread ? (
              <>
                <Text style={[st.h2, { marginTop: 14 }]}>How it spreads</Text>
                <Text raw style={st.body}>
                  {info.spread}
                </Text>
              </>
            ) : null}
            {info.kenya ? (
              <View style={[st.li, { marginTop: 14 }]}>
                <Icon name="map-marker-outline" size={18} color={C.textSub} />
                <Text raw style={[st.small, { flex: 1 }]}>
                  {info.kenya}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Other possibilities */}
        {alts.length ? (
          <View style={st.panel}>
            <Text style={st.h}>Other possibilities</Text>
            {alts.map(([l, c]) => (
              <View key={l} style={{ marginTop: 10, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text raw style={[st.body, { flex: 1 }]}>
                    {altName(l)}
                  </Text>
                  <Text raw style={st.small}>
                    {(c * 100).toFixed(1)}%
                  </Text>
                </View>
                <ProgressBar value={c} color={C.textLight} height={5} />
              </View>
            ))}
          </View>
        ) : null}

        {/* What to do */}
        {info ? (
          <View style={st.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={st.h}>{healthy ? 'Keep it healthy' : 'What to do'}</Text>
              <ListenButton
                compact
                text={() =>
                  [info.cultural.join(' '), info.biological.join(' '), info.chemical.map((c) => (c.note ? `${c.active}. ${c.note}` : c.active)).join('. ')]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            </View>
            <Steps title={healthy ? 'Good practice' : 'Do this first (cultural)'} items={info.cultural} />
            {info.biological.length ? <Steps title="Organic / biological options" items={info.biological} /> : null}
            {info.chemical.length ? (
              <>
                <Steps title="Chemical options (active ingredient)" items={info.chemical.map((c) => (c.note ? `${c.active} — ${c.note}` : c.active))} />
                <Text raw style={[st.small, { marginTop: 12 }]}>
                  {chemicalRules(lang)}
                </Text>

                {pcpbProducts.length > 0 ? (
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Text style={[st.h2, { fontSize: 15 }]}>Registered product examples (Kenya PCPB)</Text>
                    {pcpbProducts.map((prod) => (
                      <View key={prod.regNo} style={st.pcpbCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text raw style={st.pcpbName}>{prod.name}</Text>
                          <View style={st.pcpbBadge}>
                            <Text raw style={st.pcpbBadgeText}>{prod.regNo}</Text>
                          </View>
                        </View>
                        <Text raw style={st.pcpbActive}>Active: {prod.active}</Text>
                        {prod.warning ? (
                          <Text raw style={st.pcpbWarning}>{prod.warning}</Text>
                        ) : null}
                      </View>
                    ))}
                    <Text style={st.pcpbDisclaimer}>
                      Not sponsored. Commercial examples registered with Kenya's Pest Control Products Board. Always follow label.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            {!healthy ? (
              <Btn
                label="Open day-by-day treatment plan"
                icon="clipboard-list-outline"
                kind="secondary"
                style={{ marginTop: 16 }}
                onPress={() => router.push({ pathname: '/treatment-plan', params: { label, incidentId: savedId ?? '' } })}
              />
            ) : null}
          </View>
        ) : null}

        {/* Nearby agro-dealers (OpenStreetMap) */}
        {!healthy ? (
          <View style={st.panel}>
            <Text style={st.h}>Nearby agro-dealers</Text>
            {agrovets?.length ? (
              agrovets.map((a) => (
                <TouchableOpacity key={a.id} style={st.agroRow} onPress={() => Linking.openURL(mapsUrl(a.lat, a.lng, a.name))}>
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.agroName}>
                      {a.name}
                    </Text>
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
                {agroStatus ? (
                  <Text raw style={[st.body, { marginBottom: 10 }]}>
                    {agroStatus}
                  </Text>
                ) : null}
                <Btn label="Find agro-dealers near me" icon="map-marker-radius-outline" kind="secondary" onPress={loadAgrovets} />
              </>
            )}
            <Text style={[st.small, { marginTop: 10, fontSize: 13 }]}>Data © OpenStreetMap contributors</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 10 }}>
          <Btn
            label="Ask the AI advisor"
            icon="chat-processing-outline"
            onPress={() => router.push({ pathname: '/chat', params: { crop: cropEn, disease: diseaseEn, confidence: String(confidence) } })}
          />
          <Btn label={savedId ? 'Saved ✓' : 'Save to my farm'} icon="content-save-outline" kind="secondary" onPress={openSave} loading={saving} disabled={Boolean(savedId)} />
          {!uncertain ? <Btn label="Ask the community" icon="account-group-outline" kind="secondary" onPress={askCommunity} /> : null}
          {!uncertain && p.uri ? <Btn label={photoCheckLabel} icon="image-search-outline" kind="secondary" onPress={openPhotoCheck} /> : null}
          <Btn label="Share on WhatsApp" icon="whatsapp" kind="secondary" onPress={shareWhatsApp} />
          <Btn label="Scan another leaf" icon="camera-retake-outline" kind="ghost" onPress={openScanner} />
        </View>
      </ScrollView>

      {/* Field picker */}
      <Sheet visible={picker} onClose={() => setPicker(false)} title="Save this scan to…">
        {(farms ?? []).map((f) => (
          <TouchableOpacity key={f.id} style={st.farmRow} onPress={() => save(f.id)}>
            <CropIcon crop={f.crop} size={40} />
            <View style={{ flex: 1 }}>
              <Text raw style={st.agroName}>
                {f.name}
              </Text>
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

function Steps({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={st.h2}>{title}</Text>
      {items.map((x, i) => (
        <View key={i} style={st.li}>
          <Text raw style={st.num}>
            {items.length > 1 ? `${i + 1}` : '•'}
          </Text>
          <Text raw style={[st.body, { flex: 1 }]}>
            {x}
          </Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  leaf: { height: 240, marginHorizontal: 16, borderRadius: 16, marginTop: 4 },
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12 },
  crop: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  status: { fontSize: 15, fontFamily: FONT.bodyBold },
  disease: { fontSize: 32, lineHeight: 38, fontFamily: FONT.display, color: C.text, marginTop: 14, marginBottom: 14 },
  h: { fontSize: 21, fontFamily: FONT.display, color: C.text, marginBottom: 8 },
  h2: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, marginBottom: 6 },
  body: { fontSize: 16, color: C.textMid, lineHeight: 23 },
  small: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  li: { flexDirection: 'row', gap: 10, marginTop: 6 },
  num: { width: 18, fontSize: 16, lineHeight: 23, fontFamily: FONT.bodyBold, color: C.primary },
  agroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  agroName: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  agroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  farmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  pcpbCard: { backgroundColor: C.sunken, padding: 12, borderRadius: 12, gap: 4, marginTop: 4 },
  pcpbName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  pcpbBadge: { backgroundColor: C.primaryTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pcpbBadgeText: { fontSize: 11, fontFamily: FONT.bodyBold, color: C.primaryDark },
  pcpbActive: { fontSize: 13, color: C.textMid },
  pcpbWarning: { fontSize: 12, color: C.warn, fontFamily: FONT.bodyBold, marginTop: 2 },
  pcpbDisclaimer: { fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 17 },
});
