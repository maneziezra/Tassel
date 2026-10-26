// AI photo check — a second opinion from one photo for what the offline scanner
// cannot cover: insect pests, nutrient deficiencies, crops outside its 154 classes,
// or an uncertain scan (Plantix covers 780+ problems; this closes that gap).
// The farmer agrees once before any photo leaves the phone.
// Strings are kept here in English and Kiswahili (like methodology.tsx).

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Btn, Card, Chip, Header, Icon, ListenButton, Text, type IconName } from '../components/ui';
import { CROP_CHOICES } from '../lib/counties';
import { chemicalRules } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { openScanner } from '../lib/navigation';
import { givePhotoConsent, hasPhotoConsent, runPhotoCheck, type PhotoCheck, type ProblemType } from '../lib/photoCheck';
import { C, FONT, RADIUS } from '../lib/theme';

type Pair = { en: string; sw: string };

const TXT = {
  title: { en: 'AI photo check', sw: 'Ukaguzi wa picha wa AI' },
  subtitle: { en: 'Pests, deficiencies and other crops', sw: 'Wadudu, upungufu wa virutubisho na mazao mengine' },
  why: {
    en: 'The offline scanner knows 154 leaf conditions on 34 crops. This check looks at your photo for anything else: insect pests, nutrient deficiencies, weather damage and other crops.',
    sw: 'Skana ya bila intaneti inajua hali 154 za majani kwenye mazao 34. Ukaguzi huu unaangalia picha yako kwa mengine yote: wadudu, upungufu wa virutubisho, madhara ya hali ya hewa na mazao mengine.',
  },
  crop: { en: 'Which crop is this?', sw: 'Hili ni zao gani?' },
  note: { en: 'What did you notice? (optional)', sw: 'Uliona nini? (si lazima)' },
  notePh: { en: 'e.g. holes in young leaves, started last week', sw: 'mf. matundu kwenye majani machanga, ilianza wiki iliyopita' },
  privacyTitle: { en: 'Before you send', sw: 'Kabla ya kutuma' },
  privacy: {
    en: 'This photo is shrunk on your phone and sent over the internet to the Tassel server and the Claude AI (Anthropic) to be checked. It is not kept or shown to anyone else. The offline scanner never sends photos.',
    sw: 'Picha hii hupunguzwa ukubwa kwenye simu yako na kutumwa kupitia intaneti kwa seva ya Tassel na AI ya Claude (Anthropic) ili ikaguliwe. Haihifadhiwi wala kuonyeshwa kwa mtu mwingine. Skana ya bila intaneti haitumi picha kamwe.',
  },
  agree: { en: 'Agree and check photo', sw: 'Nakubali, kagua picha' },
  check: { en: 'Check this photo', sw: 'Kagua picha hii' },
  checking: { en: 'Looking at your photo…', sw: 'Inaangalia picha yako…' },
  takes: { en: 'This usually takes 15–25 seconds.', sw: 'Kwa kawaida huchukua sekunde 15–25.' },
  healthy: { en: 'Looks healthy', sw: 'Inaonekana na afya' },
  unclear: { en: 'Not clear from this photo', sw: 'Haieleweki kutoka picha hii' },
  problem: { en: 'Possible problem', sw: 'Tatizo linalowezekana' },
  notPlant: { en: 'This does not look like a plant photo.', sw: 'Hii haionekani kuwa picha ya mmea.' },
  sees: { en: 'What the AI sees', sw: 'Kile AI inachokiona' },
  confirm: { en: 'Check in your field to confirm', sw: 'Kagua shambani kuthibitisha' },
  todo: { en: 'What to do now', sw: 'Cha kufanya sasa' },
  chem: { en: 'Chemical options (active ingredient)', sw: 'Chaguo za kemikali (kiambato hai)' },
  alts: { en: 'Other possible causes', sw: 'Sababu nyingine zinazowezekana' },
  retake: { en: 'For a better answer', sw: 'Kwa jibu bora zaidi' },
  expert: {
    en: 'This could be serious. Show the plant to your county agricultural officer or report it to KEPHIS.',
    sw: 'Hili linaweza kuwa jambo zito. Mwonyeshe afisa wa kilimo wa kaunti mmea huu au ripoti kwa KEPHIS.',
  },
  disclaimer: {
    en: 'AI suggestion from one photo, not a lab test. Confirm with an extension officer or agro-dealer before you spend money.',
    sw: 'Pendekezo la AI kutoka picha moja, si kipimo cha maabara. Thibitisha na afisa wa ugani au muuzaji wa pembejeo kabla ya kutumia pesa.',
  },
  ask: { en: 'Ask the AI advisor', sw: 'Muulize mshauri wa AI' },
  community: { en: 'Ask the community', sw: 'Uliza jamii' },
  again: { en: 'Check another photo', sw: 'Kagua picha nyingine' },
  retry: { en: 'Try again', sw: 'Jaribu tena' },
  cropLabel: { en: 'Crop', sw: 'Zao' },
  unknownCrop: { en: 'Crop not recognised', sw: 'Zao halijatambuliwa' },
  helpTitle: { en: 'Help: what is wrong with my {crop}?', sw: 'Msaada: {crop} yangu ina tatizo gani?' },
  myCrop: { en: 'crop', sw: 'zao' },
};

const TYPE: Record<ProblemType, Pair & { icon: IconName }> = {
  disease: { en: 'Disease', sw: 'Ugonjwa', icon: 'virus-outline' },
  pest: { en: 'Pest', sw: 'Mdudu', icon: 'bug-outline' },
  nutrient_deficiency: { en: 'Nutrient deficiency', sw: 'Upungufu wa virutubisho', icon: 'flask-outline' },
  environmental: { en: 'Weather or growing conditions', sw: 'Hali ya hewa au mazingira', icon: 'weather-partly-rainy' },
  other: { en: 'Other', sw: 'Nyingine', icon: 'help-circle-outline' },
};

const CONF: Record<PhotoCheck['confidence'], Pair & { color: string; tint: string }> = {
  high: { en: 'AI is fairly sure', sw: 'AI ina uhakika kiasi', color: C.primaryDark, tint: C.primaryTint },
  medium: { en: 'AI is partly sure', sw: 'AI ina uhakika kidogo', color: C.accentDark, tint: C.accentTint },
  low: { en: 'AI is not sure', sw: 'AI haina uhakika', color: C.error, tint: C.errorTint },
};

export default function PhotoCheckScreen() {
  const p = useLocalSearchParams<{ uri?: string; crop?: string; scanLabel?: string; scanConfidence?: string }>();
  const { lang } = useLang();
  const L = (x: Pair) => x[lang];

  const [consented, setConsented] = useState<boolean | null>(null);
  const [crop, setCrop] = useState(p.crop && CROP_CHOICES.includes(p.crop) ? p.crop : '');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'form' | 'checking' | 'done' | 'error'>('form');
  const [result, setResult] = useState<PhotoCheck | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    hasPhotoConsent().then(setConsented);
  }, []);

  const run = async () => {
    if (!p.uri) return;
    if (!consented) {
      await givePhotoConsent();
      setConsented(true);
    }
    setPhase('checking');
    setError('');
    try {
      const conf = p.scanConfidence ? Number(p.scanConfidence) : undefined;
      const r = await runPhotoCheck({
        uri: p.uri,
        lang,
        crop: crop || p.crop || undefined,
        note,
        scan: p.scanLabel ? { label: p.scanLabel, confidence: Number.isFinite(conf) ? conf : undefined } : undefined,
      });
      setResult(r);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  if (!p.uri) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title={L(TXT.title)} />
        <Card>
          <Text raw style={st.body}>
            {L(TXT.why)}
          </Text>
          <Btn label={L(TXT.again)} icon="camera-outline" kind="signature" style={{ marginTop: 14 }} onPress={openScanner} />
        </Card>
      </View>
    );
  }

  const r = result;
  const statusMeta =
    r?.status === 'healthy'
      ? { title: L(TXT.healthy), color: C.primary, tint: C.primaryTint, icon: 'check-circle' as IconName }
      : r?.status === 'problem'
      ? r.urgency === 'high' || r.see_expert
        ? { title: r.problem_name || L(TXT.problem), color: C.error, tint: C.errorTint, icon: 'alert-circle' as IconName }
        : { title: r.problem_name || L(TXT.problem), color: C.warn, tint: C.warnTint, icon: 'alert' as IconName }
      : { title: L(TXT.unclear), color: C.textSub, tint: C.sunken, icon: 'help-circle' as IconName };

  const listenText = () =>
    r
      ? [
          statusMeta.title,
          r.crop ? `${L(TXT.cropLabel)}: ${r.crop}.` : '',
          r.signs.length ? `${L(TXT.sees)}: ${r.signs.join('. ')}.` : '',
          r.actions_now.length ? `${L(TXT.todo)}: ${r.actions_now.join('. ')}.` : '',
          r.retake_tips.length && r.status === 'unclear' ? `${L(TXT.retake)}: ${r.retake_tips.join('. ')}.` : '',
          r.see_expert ? L(TXT.expert) : '',
          L(TXT.disclaimer),
        ]
          .filter(Boolean)
          .join(' ')
      : '';

  const cropForPosts = crop || p.crop || '';
  const askAdvisor = () => {
    if (!r) return;
    router.push({ pathname: '/chat', params: { crop: r.crop || cropForPosts || L(TXT.myCrop), disease: r.problem_name || statusMeta.title } });
  };
  const askCommunity = () =>
    router.push({
      pathname: '/new-post',
      params: {
        photo: p.uri ?? '',
        crop: cropForPosts,
        category: r?.problem_type === 'pest' ? 'Pests' : r?.status === 'problem' ? 'Diseases' : 'General',
        title: L(TXT.helpTitle).replace('{crop}', r?.crop || cropForPosts || L(TXT.myCrop)),
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={L(TXT.title)} subtitle={L(TXT.subtitle)} right={phase === 'done' ? <ListenButton compact text={listenText} /> : undefined} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View>
          <Image source={{ uri: p.uri }} style={st.photo} resizeMode="cover" />
          {phase === 'checking' ? (
            <View style={st.overlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text raw style={st.overlayTitle}>
                {L(TXT.checking)}
              </Text>
              <Text raw style={st.overlaySub}>
                {L(TXT.takes)}
              </Text>
            </View>
          ) : null}
        </View>

        {phase === 'form' || phase === 'checking' ? (
          <>
            <Card>
              <Text raw style={st.body}>
                {L(TXT.why)}
              </Text>
              <Text raw style={st.label}>
                {L(TXT.crop)}
              </Text>
              <View style={st.wrap}>
                {CROP_CHOICES.map((c) => (
                  <Chip key={c} label={c} active={crop === c} onPress={() => setCrop(crop === c ? '' : c)} />
                ))}
              </View>
              <Text raw style={st.label}>
                {L(TXT.note)}
              </Text>
              <TextInput
                style={st.input}
                value={note}
                onChangeText={setNote}
                maxLength={300}
                multiline
                placeholder={L(TXT.notePh)}
                placeholderTextColor={C.textLight}
                editable={phase === 'form'}
              />
            </Card>
            <Card style={{ backgroundColor: C.infoTint }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="shield-lock-outline" size={22} color={C.info} />
                <View style={{ flex: 1 }}>
                  <Text raw style={[st.label, { marginTop: 0, color: C.info }]}>
                    {L(TXT.privacyTitle)}
                  </Text>
                  <Text raw style={[st.body, { color: C.text }]}>
                    {L(TXT.privacy)}
                  </Text>
                </View>
              </View>
            </Card>
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Btn
                label={consented ? L(TXT.check) : L(TXT.agree)}
                icon="image-search-outline"
                kind="signature"
                onPress={run}
                loading={phase === 'checking'}
                disabled={consented === null}
              />
            </View>
          </>
        ) : null}

        {phase === 'error' ? (
          <Card style={{ backgroundColor: C.errorTint }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="alert-circle-outline" size={22} color={C.error} />
              <Text raw style={[st.body, { flex: 1, color: C.error }]}>
                {error}
              </Text>
            </View>
            <Btn label={L(TXT.retry)} icon="refresh" kind="secondary" style={{ marginTop: 12 }} onPress={run} />
          </Card>
        ) : null}

        {phase === 'done' && r ? (
          <>
            <View style={[st.status, { borderColor: statusMeta.color, backgroundColor: statusMeta.tint }]}>
              <Icon name={statusMeta.icon} size={26} color={statusMeta.color} />
              <View style={{ flex: 1 }}>
                <Text raw style={[st.statusTitle, { color: statusMeta.color }]}>
                  {statusMeta.title}
                </Text>
                <Text raw style={st.statusSub}>
                  {r.crop ? `${L(TXT.cropLabel)}: ${r.crop}` : L(TXT.unknownCrop)}
                </Text>
              </View>
            </View>
            <View style={st.badges}>
              {r.problem_type ? <Badge label={L(TYPE[r.problem_type])} color={C.textMid} tint="#E4EAE7" /> : null}
              <Badge label={L(CONF[r.confidence])} color={CONF[r.confidence].color} tint={CONF[r.confidence].tint} />
            </View>

            {!r.is_plant_photo ? (
              <Card>
                <Text raw style={st.body}>
                  {L(TXT.notPlant)}
                </Text>
              </Card>
            ) : null}

            {r.see_expert ? (
              <Card style={{ backgroundColor: C.errorTint }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Icon name="account-tie-voice-outline" size={22} color={C.error} />
                  <Text raw style={[st.body, { flex: 1, color: C.error, fontFamily: FONT.bodyBold }]}>
                    {L(TXT.expert)}
                  </Text>
                </View>
              </Card>
            ) : null}

            <Section icon="eye-outline" title={L(TXT.sees)} items={r.signs} />
            <Section icon="magnify-scan" title={L(TXT.confirm)} items={r.check_to_confirm} />
            <Section icon="hand-heart-outline" title={L(TXT.todo)} items={r.actions_now} numbered />
            {r.chemical_options.length ? (
              <Card>
                <SectionHead icon="flask-outline" title={L(TXT.chem)} />
                {r.chemical_options.map((c, i) => (
                  <Text raw key={i} style={st.item}>
                    • {c}
                  </Text>
                ))}
                <View style={st.rules}>
                  <Icon name="shield-alert-outline" size={16} color={C.textSub} />
                  <Text raw style={st.rulesTxt}>
                    {chemicalRules(lang)}
                  </Text>
                </View>
              </Card>
            ) : null}
            <Section icon="format-list-bulleted" title={L(TXT.alts)} items={r.alternatives} />
            {r.status === 'unclear' || r.photo_quality === 'poor' ? <Section icon="camera-retake-outline" title={L(TXT.retake)} items={r.retake_tips} /> : null}

            <Text raw style={st.disclaimer}>
              {L(TXT.disclaimer)}
            </Text>

            <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
              {r.status !== 'unclear' ? <Btn label={L(TXT.ask)} icon="robot-outline" onPress={askAdvisor} /> : null}
              <Btn label={L(TXT.community)} icon="account-group-outline" kind="secondary" onPress={askCommunity} />
              <Btn label={L(TXT.again)} icon="camera-retake-outline" kind="ghost" onPress={openScanner} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionHead({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Icon name={icon} size={20} color={C.primary} />
      <Text raw style={st.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

function Section({ icon, title, items, numbered }: { icon: IconName; title: string; items: string[]; numbered?: boolean }) {
  if (!items.length) return null;
  return (
    <Card>
      <SectionHead icon={icon} title={title} />
      {items.map((x, i) => (
        <Text raw key={i} style={st.item}>
          {numbered ? `${i + 1}. ` : '• '}
          {x}
        </Text>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  photo: { width: '100%', height: 240, backgroundColor: C.dark },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,30,26,0.72)', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  overlayTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  overlaySub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' },
  body: { fontSize: 15, color: C.textMid, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 14, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 70, backgroundColor: C.bg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, textAlignVertical: 'top', fontFamily: FONT.body },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1.5 },
  statusTitle: { fontSize: 22, fontWeight: '700' },
  statusSub: { fontSize: 14, color: C.textSub, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: C.text, flex: 1 },
  item: { fontSize: 15, color: C.textMid, lineHeight: 22, marginTop: 4 },
  rules: { flexDirection: 'row', gap: 8, marginTop: 10, padding: 10, backgroundColor: C.bg, borderRadius: RADIUS.sm },
  rulesTxt: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
  disclaimer: { fontSize: 13, color: C.textSub, lineHeight: 18, marginHorizontal: 20, marginTop: 16, textAlign: 'center' },
});
