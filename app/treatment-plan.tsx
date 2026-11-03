// Treatment plan — day steps, task checkboxes, urgency colours, progress bar,
// share. Generated for every detectable disease from the knowledge base, in
// English or Kiswahili, with read-aloud. Ticks are saved on the phone.

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Btn, Card, Empty, Header, Icon, ListenButton, Text } from '../components/ui';
import { StoryScene } from '../components/StoryScene';
import { buildPlan, chemicalRules, getDisease, localizeDisease } from '../lib/diseases';
import { loadPlanProgress, planKey, savePlanProgress } from '../lib/store';
import { useLang } from '../lib/i18n';
import { C, URGENCY_META } from '../lib/theme';

export default function TreatmentPlanScreen() {
  const { label = '', incidentId } = useLocalSearchParams<{ label: string; incidentId?: string }>();
  const { t, lang } = useLang();
  const raw = getDisease(label);
  const info = raw ? localizeDisease(raw, lang) : undefined;
  const plan = useMemo(() => (raw ? buildPlan(raw, lang) : []), [raw, lang]);
  // Scenes are picked from the English plan so both languages show the same picture.
  const planEn = useMemo(() => (raw ? buildPlan(raw, 'en') : []), [raw]);
  const { width } = useWindowDimensions();
  const key = planKey(label, incidentId || undefined);
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(plan[0]?.id ?? null);

  useEffect(() => {
    loadPlanProgress(key).then(setDone);
  }, [key]);

  if (!info || !raw) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Treatment plan" />
        <Empty icon="clipboard-alert-outline" title="No plan for this result" text="Scan a leaf first, then open the plan from the result screen." />
      </View>
    );
  }

  const total = plan.reduce((n, s) => n + s.tasks.length, 0);
  const progress = total ? done.length / total : 0;

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    savePlanProgress(key, next);
  };

  const share = () => {
    const lines = [
      `${t('Tassel treatment plan')} — ${info.crop}: ${info.disease}`,
      '',
      ...plan.flatMap((s) => [`${s.when}: ${s.title}`, ...s.tasks.map((x) => `${done.includes(x.id) ? '[x]' : '[ ]'} ${x.text}`), '']),
      chemicalRules(lang),
    ];
    Share.share({ message: lines.join('\n') });
  };

  const stepSpeech = (id: string) => {
    const s = plan.find((x) => x.id === id);
    return s ? `${s.when}. ${s.title}. ${s.tasks.map((x) => x.text).join(' ')}` : '';
  };

  const urgency = URGENCY_META[info.urgency];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="Treatment plan"
        subtitle={`${info.crop}, ${info.disease}`}
        right={
          <TouchableOpacity onPress={share} accessibilityLabel={t('Share plan')} style={st.iconBtn}>
            <Icon name="share-variant-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text raw style={st.title}>
              {info.disease}
            </Text>
            <Badge label={urgency.label} color={urgency.color} tint={urgency.tint} />
          </View>
          <Text raw style={st.summary}>
            {info.symptoms}
          </Text>
          <View style={st.progressRow}>
            <View style={st.barBg}>
              <View style={[st.barFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text raw style={st.progressTxt}>
              {t('{done}/{total} done', { done: done.length, total })}
            </Text>
          </View>
        </Card>

        {plan.map((step, idx) => {
          const meta = URGENCY_META[step.urgency];
          const isOpen = open === step.id;
          const stepDone = step.tasks.every((x) => done.includes(x.id));
          return (
            <View key={step.id} style={st.step}>
              <TouchableOpacity style={st.stepHead} onPress={() => setOpen(isOpen ? null : step.id)} activeOpacity={0.85}>
                <View style={[st.stepNum, { backgroundColor: isOpen ? C.primary : C.bg }]}>
                  {stepDone ? (
                    <Icon name="check" size={16} color={isOpen ? '#fff' : C.primary} />
                  ) : (
                    <Text raw style={[st.stepNumTxt, { color: isOpen ? '#fff' : C.textMid }]}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text raw style={st.stepWhen}>
                    {step.when}
                  </Text>
                  <Text raw style={st.stepTitle}>
                    {step.title}
                  </Text>
                </View>
                {isOpen ? <ListenButton compact light text={() => stepSpeech(step.id)} /> : null}
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={isOpen ? '#fff' : C.textSub} />
              </TouchableOpacity>
              {isOpen ? (
                <View style={{ padding: 14 }}>
                  <View style={{ marginBottom: 12 }}>
                    <StoryScene
                      text={planEn[idx] ? `${planEn[idx].title}. ${planEn[idx].tasks.map((x) => x.text).join(' ')}` : step.title}
                      crop={raw?.crop}
                      width={width - 60}
                      rounded={14}
                    />
                  </View>
                  {step.tasks.map((x) => {
                    const checked = done.includes(x.id);
                    return (
                      <TouchableOpacity key={x.id} style={st.task} onPress={() => toggle(x.id)} activeOpacity={0.7}>
                        <View style={[st.box, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>{checked ? <Icon name="check" size={14} color="#fff" /> : null}</View>
                        <Text raw style={[st.taskTxt, checked && { color: C.textLight, textDecorationLine: 'line-through' }]}>
                          {x.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Icon name="shield-alert-outline" size={18} color={C.warn} />
            <Text raw style={{ flex: 1, color: C.textMid, fontSize: 13, lineHeight: 19 }}>
              {chemicalRules(lang)} {t('Costs vary by shop and pack size — ask your agro-dealer for a quote.')}
            </Text>
          </View>
        </Card>

        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
          <Btn label="Ask the AI advisor about this plan" icon="robot-outline" onPress={() => router.push({ pathname: '/chat', params: { crop: raw.crop, disease: raw.disease } })} />
          <Btn label="Share plan" icon="share-variant" kind="secondary" onPress={share} />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  summary: { fontSize: 16, color: C.textMid, lineHeight: 23, marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  barBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.sunken, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.primary, borderRadius: 5 },
  progressTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  step: { marginHorizontal: 16, marginTop: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stepNum: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepNumTxt: { fontSize: 14, fontWeight: '900' },
  stepWhen: { fontSize: 14, color: C.textSub },
  stepTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  taskTxt: { flex: 1, fontSize: 16, color: C.text, lineHeight: 22 },
});
