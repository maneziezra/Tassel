// Scan result — v1.0 layout (status badge, result card, treatment, agrovets,
// Ask AI, Save to farm, WhatsApp share) rebuilt on structured, verified data.
// v2.1: Kiswahili, read-aloud, and "Ask the community" with the photo attached.

import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Btn, Card, Header, Icon, ListenButton, SectionLabel, Text, type IconName } from '../components/ui';
import { describeLabel, CONFIDENCE_THRESHOLD } from '../lib/classifier';
import { chemicalRules, cropName, getDisease, localizeDisease, pestHints } from '../lib/diseases';
import { addFarm, listFarms, saveIncident, type Farm } from '../lib/data';
import { findAgrovets, getPosition, mapsUrl, type Agrovet } from '../lib/geo';
import { useLang } from '../lib/i18n';
import { C, KIND_META, URGENCY_META, confidenceBand } from '../lib/theme';

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
    ? { text: 'Not sure — check again', icon: 'help-circle', color: C.accent }
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
    `${t('CropGuard AI scan')}\n${t('Crop')}: ${crop}\n${t('Result')}: ${uncertain ? t('Uncertain (best guess: {d})', { d: disease }) : disease}\n${t('Confidence')}: ${pct}\n` +
    (info && !healthy ? `${t('What to do first')}: ${info.cultural[0]}\n` : '') +
    t('Checked on-device with CropGuard AI. Confirm with your extension officer.');

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
        {p.uri ? <Image source={{ uri: p.uri }} style={st.leaf} resizeMode="cover" /> : <View style={[st.leaf, { height: 80, backgroundColor: C.primaryTint }]} />}

        <View style={[st.status, { borderColor: status.color }]}>
          <Icon name={status.icon} size={22} color={status.color} />
          <Text style={[st.statusTxt, { color: status.color }]}>{status.text}</Text>
        </View>

        {/* Main result */}
        <Card>
          <View style={st.rowBetween}>
            <Text raw style={st.cropName}>
              {crop}
            </Text>
            <Badge label={band.label} color={band.color} tint={band.tint} />
          </View>
          <View style={[st.rowBetween, { alignItems: 'flex-start', marginTop: 4 }]}>
            <Text raw style={[st.disease, { color: healthy && !uncertain ? C.primary : C.text }]}>
              {disease}
            </Text>
            <View style={[st.pctBox, { backgroundColor: band.tint }]}>
              <Text raw style={[st.pct, { color: band.color }]}>
                {pct}
              </Text>
            </View>
          </View>
          <View style={st.barBg}>
            <View style={[st.barFill, { width: `${Math.round(confidence * 100)}%`, backgroundColor: band.color }]} />
          </View>
          {info && !healthy ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Badge label={info.kind} color={kind.color} tint={kind.tint} />
                <Badge label={urgency.label} color={urgency.color} tint={urgency.tint} />
                {info.notifiable ? <Badge label="Report to authorities" color={C.error} tint={C.errorTint} /> : null}
              </View>
              {info.pathogen ? (
                <Text raw style={st.pathogen}>
                  {info.pathogen}
                </Text>
              ) : null}
              <Text style={st.label}>What it looks like</Text>
              <Text raw style={st.body}>
                {info.symptoms}
              </Text>
              {info.spread ? (
                <>
                  <Text style={st.label}>How it spreads</Text>
                  <Text raw style={st.body}>
                    {info.spread}
                  </Text>
                </>
              ) : null}
              {info.kenya ? (
                <View style={st.note}>
                  <Icon name="map-marker-radius-outline" size={18} color={C.info} />
                  <Text raw style={st.noteTxt}>
                    {info.kenya}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* Uncertain: no fabricated diagnosis */}
        {uncertain ? (
          <Card style={{ backgroundColor: C.accentTint }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="alert-outline" size={22} color={C.warn} />
              <View style={{ flex: 1 }}>
                <Text style={[st.label, { marginTop: 0, color: C.warn }]}>The scanner is not sure</Text>
                <Text style={st.body}>
                  {t('Confidence is below {n}%, so treat this as a guess. Retake the photo of a single leaf in daylight, or show the plant to an extension officer or agro-dealer.', {
                    n: Math.round(CONFIDENCE_THRESHOLD * 100),
                  })}
                </Text>
                {hints.length ? (
                  <>
                    <Text style={[st.label, { color: C.warn }]}>The scanner cannot detect insects — check for:</Text>
                    {hints.map((h) => (
                      <Text raw key={h} style={[st.body, { marginBottom: 4 }]}>
                        • {h}
                      </Text>
                    ))}
                  </>
                ) : null}
                {p.uri ? <Btn label={photoCheckLabel} icon="image-search-outline" kind="signature" style={{ marginTop: 12 }} onPress={openPhotoCheck} /> : null}
                <Btn label="Ask the community" icon="account-group-outline" kind="secondary" style={{ marginTop: 12 }} onPress={askCommunity} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Other possibilities */}
        {alts.length ? (
          <Card>
            <SectionLabel>Other possibilities</SectionLabel>
            {alts.map(([l, c]) => (
              <View key={l} style={{ marginBottom: 10 }}>
                <View style={st.rowBetween}>
                  <Text raw style={st.altName}>
                    {altName(l)}
                  </Text>
                  <Text raw style={st.altPct}>
                    {(c * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={[st.barBg, { height: 5 }]}>
                  <View style={[st.barFill, { width: `${Math.max(1, Math.round(c * 100))}%`, backgroundColor: C.textLight }]} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Treatment — three explicit pillars */}
        {info ? (
          <Card>
            <View style={st.rowBetween}>
              <SectionLabel>{healthy ? 'Keep it healthy' : 'What to do'}</SectionLabel>
              <ListenButton
                compact
                text={() =>
                  [info.cultural.join(' '), info.biological.join(' '), info.chemical.map((c) => (c.note ? `${c.active}. ${c.note}` : c.active)).join('. ')]
                    .filter(Boolean)
                    .join(' ')
                }
              />
            </View>
            <Pillar icon="hand-heart-outline" color={C.primary} title={healthy ? 'Good practice' : 'Do this first (cultural)'} items={info.cultural} />
            {info.biological.length ? <Pillar icon="leaf" color="#558B2F" title="Organic / biological options" items={info.biological} /> : null}
            {info.chemical.length ? (
              <>
                <Pillar
                  icon="flask-outline"
                  color={C.error}
                  title="Chemical options (active ingredient)"
                  items={info.chemical.map((c) => (c.note ? `${c.active} — ${c.note}` : c.active))}
                />
                <View style={st.rules}>
                  <Icon name="shield-alert-outline" size={16} color={C.textSub} />
                  <Text raw style={st.rulesTxt}>
                    {chemicalRules(lang)}
                  </Text>
                </View>
              </>
            ) : null}
            {!healthy ? (
              <Btn
                label="Open day-by-day treatment plan"
                icon="clipboard-list-outline"
                kind="secondary"
                style={{ marginTop: 14 }}
                onPress={() => router.push({ pathname: '/treatment-plan', params: { label, incidentId: savedId ?? '' } })}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Nearby agro-dealers (OpenStreetMap) */}
        {!healthy ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="store-outline" size={20} color={C.primary} />
              <Text style={st.cardTitle}>Nearby agro-dealers</Text>
            </View>
            {agrovets?.length ? (
              agrovets.map((a, i) => (
                <TouchableOpacity key={a.id} style={[st.agroRow, i === agrovets.length - 1 && { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(mapsUrl(a.lat, a.lng, a.name))}>
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.agroName}>
                      {a.name}
                    </Text>
                    <Text raw style={st.agroSub}>
                      {t('{km} km away', { km: a.distanceKm.toFixed(1) })}
                      {a.address ? `, ${a.address}` : ''}
                    </Text>
                  </View>
                  {a.phone ? (
                    <TouchableOpacity style={st.agroIcon} onPress={() => Linking.openURL(`tel:${a.phone}`)}>
                      <Icon name="phone" size={18} color={C.primary} />
                    </TouchableOpacity>
                  ) : null}
                  <View style={st.agroIcon}>
                    <Icon name="directions" size={18} color={C.primary} />
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
                <Btn label="Find agro-dealers near me" icon="map-marker-radius" kind="ghost" onPress={loadAgrovets} />
              </>
            )}
            <Text style={st.osm}>Data © OpenStreetMap contributors</Text>
          </Card>
        ) : null}

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 12 }}>
          <Btn
            label="Ask the AI advisor"
            icon="robot-outline"
            onPress={() => router.push({ pathname: '/chat', params: { crop: cropEn, disease: diseaseEn, confidence: String(confidence) } })}
          />
          <Btn label={savedId ? 'Saved ✓' : 'Save to my farm'} icon="content-save-outline" kind="secondary" onPress={openSave} loading={saving} disabled={Boolean(savedId)} />
          {!uncertain ? <Btn label="Ask the community" icon="account-group-outline" kind="secondary" onPress={askCommunity} /> : null}
          {!uncertain && p.uri ? <Btn label={photoCheckLabel} icon="image-search-outline" kind="secondary" onPress={openPhotoCheck} /> : null}
          <Btn label="Share on WhatsApp" icon="whatsapp" kind="whatsapp" onPress={shareWhatsApp} />
          <Btn label="Scan another leaf" icon="camera-retake-outline" kind="ghost" onPress={() => router.navigate('/scan')} />
        </View>
      </ScrollView>

      {/* Farm picker */}
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <Pressable style={st.overlay} onPress={() => setPicker(false)}>
          <Pressable style={st.sheet}>
            <Text style={st.sheetTitle}>Save this scan to…</Text>
            {(farms ?? []).map((f) => (
              <TouchableOpacity key={f.id} style={st.farmRow} onPress={() => save(f.id)}>
                <Icon name="sprout" size={22} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text raw style={st.farmName}>
                    {f.name}
                  </Text>
                  <Text raw style={st.agroSub}>
                    {[f.crop ? cropName(f.crop, lang) : null, f.size_acres ? t('{n} acres', { n: Number(f.size_acres).toFixed(2) }) : null].filter(Boolean).join(', ') || t('Field')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {farms && farms.length === 0 ? (
              <TouchableOpacity style={st.farmRow} onPress={quickAddFarm}>
                <Icon name="plus-circle-outline" size={22} color={C.primary} />
                <Text raw style={st.farmName}>
                  {t('Create "{name}" and save', { name: t('{crop} field', { crop }) })}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={st.farmRow} onPress={() => save(null)}>
              <Icon name="history" size={22} color={C.textSub} />
              <Text style={st.farmName}>Scan history only (no field)</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Pillar({ icon, color, title, items }: { icon: IconName; color: string; title: string; items: string[] }) {
  return (
    <View style={[st.pillar, { borderLeftColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon name={icon} size={16} color={color} />
        <Text style={[st.pillarTitle, { color }]}>{title}</Text>
      </View>
      {items.map((x, i) => (
        <Text raw key={i} style={st.pillarTxt}>
          {items.length > 1 ? `${i + 1}. ` : ''}
          {x}
        </Text>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  leaf: { width: '100%', height: 240 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: -20, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, backgroundColor: C.surface, elevation: 4 },
  statusTxt: { fontSize: 15, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cropName: { fontSize: 13, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
  disease: { fontSize: 25, fontWeight: '900', flex: 1 },
  pctBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pct: { fontSize: 16, fontWeight: '900' },
  barBg: { height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden', marginTop: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  pathogen: { fontSize: 13, fontStyle: 'italic', color: C.textSub, marginTop: 10 },
  label: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 14, marginBottom: 4 },
  body: { fontSize: 15, color: C.textMid, lineHeight: 22 },
  note: { flexDirection: 'row', gap: 8, backgroundColor: C.infoTint, borderRadius: 10, padding: 10, marginTop: 14 },
  noteTxt: { flex: 1, color: C.info, fontSize: 13, lineHeight: 19 },
  altName: { flex: 1, fontSize: 14, color: C.textMid, fontWeight: '600' },
  altPct: { fontSize: 13, fontWeight: '800', color: C.textSub },
  pillar: { borderLeftWidth: 4, backgroundColor: '#F8FAF9', borderRadius: 10, padding: 12, marginTop: 10 },
  pillarTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  pillarTxt: { fontSize: 14, color: C.textMid, lineHeight: 21, marginTop: 2 },
  rules: { flexDirection: 'row', gap: 8, marginTop: 10, padding: 10, backgroundColor: C.bg, borderRadius: 10 },
  rulesTxt: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  agroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  agroName: { fontSize: 14, fontWeight: '800', color: C.text },
  agroSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  agroIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryTint, justifyContent: 'center', alignItems: 'center' },
  osm: { fontSize: 10, color: C.textLight, marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 },
  farmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  farmName: { fontSize: 15, fontWeight: '700', color: C.text },
});
