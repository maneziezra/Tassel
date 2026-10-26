// Field detail — facts, crop calendar (from the planting date, with reminders),
// disease history from saved scans, redraw and delete.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Badge, Btn, Card, Empty, ErrorNote, Header, Icon, ListenButton, Loading, SectionLabel, Text, timeAgo } from '../../components/ui';
import { DateField, formatDate } from '../../components/DateField';
import { TaskRow } from '../../components/TaskRow';
import { deleteFarm, deleteIncident, getFarm, listIncidents, updateFarm, type Farm, type Incident } from '../../lib/data';
import { calendarFor, currentStage, fieldTasks, loadTicks, saveTicks, type FieldTask } from '../../lib/calendar';
import { cancelFieldReminders, countFieldReminders, ensurePermission, scheduleFieldReminders } from '../../lib/notify';
import { cropName, getDiseaseL } from '../../lib/diseases';
import { locale, useLang } from '../../lib/i18n';
import { openScanner } from '../../lib/navigation';
import { C, FONT, confidenceBand } from '../../lib/theme';

export default function FarmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const [farm, setFarm] = useState<Farm | null | undefined>(undefined);
  const [items, setItems] = useState<Incident[]>([]);
  const [ticks, setTicks] = useState<string[]>([]);
  const [reminders, setReminders] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [f, i, tk] = await Promise.all([getFarm(id), listIncidents({ farmId: id }), loadTicks(id)]);
      setFarm(f);
      setItems(i);
      setTicks(tk);
      setReminders(await countFieldReminders(id).catch(() => 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load the field.'));
    }
  }, [id, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tasks: FieldTask[] = farm ? fieldTasks(farm, ticks, lang) : [];
  const cal = farm ? calendarFor(farm.crop) : null;
  const stage = farm ? currentStage(farm, lang) : null;

  // Keep scheduled reminders in step with ticks and language
  useEffect(() => {
    if (farm && reminders > 0) scheduleFieldReminders(farm.id, fieldTasks(farm, ticks, lang)).then(setReminders).catch(() => {});
  }, [ticks, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (taskId: string) => {
    const next = ticks.includes(taskId) ? ticks.filter((x) => x !== taskId) : [...ticks, taskId];
    setTicks(next);
    await saveTicks(id, next);
  };

  const setPlanting = async (iso: string | null) => {
    if (!farm) return;
    try {
      await updateFarm(farm.id, { planting_date: iso });
      setFarm({ ...farm, planting_date: iso });
      if (!iso) {
        await cancelFieldReminders(farm.id);
        setReminders(0);
      }
    } catch (e) {
      Alert.alert(t('Could not save'), e instanceof Error ? e.message : '');
    }
  };

  const toggleReminders = async () => {
    if (!farm) return;
    if (reminders > 0) {
      await cancelFieldReminders(farm.id);
      setReminders(0);
      return;
    }
    if (!(await ensurePermission())) {
      Alert.alert(t('Notifications are off'), t('Allow notifications for Tassel in your phone settings to get reminders.'));
      return;
    }
    const n = await scheduleFieldReminders(farm.id, tasks);
    setReminders(n);
    Alert.alert(t('Reminders on'), n ? t('{n} reminders scheduled at 7:00 on the first day of each task.', { n }) : t('There are no upcoming tasks to remind you about.'));
  };

  const remove = () =>
    Alert.alert(t('Delete this field?'), t('Its saved scans stay in your scan history.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelFieldReminders(id);
            await deleteFarm(id);
            router.back();
          } catch (e) {
            Alert.alert(t('Could not delete'), e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  const diseaseName = (i: Incident) => getDiseaseL(i.class_label)?.disease ?? i.disease;
  const removeIncident = (inc: Incident) =>
    Alert.alert(t('Delete this record?'), `${cropName(inc.crop)} — ${diseaseName(inc)}`, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => deleteIncident(inc.id).then(load).catch(() => {}) },
    ]);

  const diseased = items.filter((i) => i.disease !== 'Healthy' && !i.uncertain);
  const upcoming = tasks.filter((x) => x.status !== 'done' && x.status !== 'missed');
  const visible = showAll ? tasks : tasks.filter((x) => x.status === 'now' || x.status === 'soon' || x.status === 'missed').concat(upcoming.filter((x) => x.status === 'later').slice(0, 1));
  const listenText = () => visible.map((x) => `${x.title}. ${x.detail}`).join(' ');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title={farm?.name ?? t('Field')}
        subtitle={stage ? t('Week {n}: {stage}', { n: stage.week, stage: stage.title }) : t('Field details')}
        right={
          farm ? (
            <TouchableOpacity onPress={remove} style={st.iconBtn} accessibilityLabel={t('Delete field')}>
              <Icon name="delete-outline" size={20} color={C.error} />
            </TouchableOpacity>
          ) : null
        }
      />
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {farm === undefined && !error ? (
        <Loading />
      ) : farm === null ? (
        <Empty icon="sprout-outline" title="Field not found" />
      ) : farm ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Card>
            <View style={st.facts}>
              <Fact label={t('Crop')} value={farm.crop ? cropName(farm.crop) : '—'} />
              <Fact label={t('Size')} value={farm.size_acres ? `${Number(farm.size_acres).toFixed(2)} ac` : '—'} />
              <Fact label={t('Planted')} value={farm.planting_date ? formatDate(farm.planting_date, lang) : '—'} />
            </View>
            {farm.location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="map-marker-outline" size={16} color={C.textSub} />
                <Text raw style={[st.meta, { marginTop: 0 }]}>{farm.location}</Text>
              </View>
            ) : null}
            {farm.notes ? <Text raw style={st.meta}>{farm.notes}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Btn
                label={farm.polygon ? 'Redraw boundary' : 'Map this field'}
                icon="vector-polygon"
                kind="secondary"
                style={{ flex: 1, minHeight: 46 }}
                onPress={() => router.push({ pathname: '/farm-map', params: { farmId: farm.id } })}
              />
              <Btn label="Scan" icon="line-scan" style={{ flex: 1, minHeight: 46 }} onPress={openScanner} />
            </View>
          </Card>

          {/* Crop health from space */}
          <TouchableOpacity style={st.sat} onPress={() => router.push({ pathname: '/satellite/[id]', params: { id: farm.id } })} accessibilityRole="button">
            <View style={st.satIcon}>
              <Icon name="satellite-variant" size={24} color={C.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.satTitle}>Crop health from space</Text>
              <Text style={st.satSub}>{farm.polygon ? 'Green cover and leaf water from Sentinel-2, every few days' : 'Map the field to switch this on'}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={C.textLight} />
          </TouchableOpacity>

          {/* Crop calendar */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel>Crop calendar</SectionLabel>
              {tasks.length ? <ListenButton compact text={listenText} /> : null}
            </View>
            {!cal ? (
              <Text style={st.meta}>{farm.crop ? t('A crop calendar is available for maize, beans, potato, tomato and wheat.') : t('Set the crop for this field to get a crop calendar.')}</Text>
            ) : (
              <>
                <Text style={st.label}>{cal.plantingLabel[lang]}</Text>
                <DateField value={farm.planting_date ?? null} onChange={setPlanting} placeholder="Choose the planting date" />
                {tasks.length ? (
                  <>
                    <TouchableOpacity style={st.remind} onPress={toggleReminders}>
                      <Icon name={reminders > 0 ? 'bell-ring' : 'bell-outline'} size={20} color={reminders > 0 ? C.primary : C.textSub} />
                      <Text style={[st.remindTxt, reminders > 0 && { color: C.primary }]}>
                        {reminders > 0 ? t('Reminders on ({n} scheduled) — tap to turn off', { n: reminders }) : t('Remind me of each task')}
                      </Text>
                    </TouchableOpacity>
                    {visible.map((x) => (
                      <TaskRow key={x.key} item={x} onToggle={() => toggle(x.task.id)} />
                    ))}
                    <TouchableOpacity onPress={() => setShowAll(!showAll)} style={{ marginTop: 12, alignSelf: 'center' }}>
                      <Text style={st.link}>{showAll ? t('Show fewer') : t('Show the whole season ({n} tasks)', { n: tasks.length })}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </>
            )}
          </Card>

          <Text style={st.section}>
            {t('{n} saved scans', { n: items.length })}
            {diseased.length ? `, ${t('{n} with disease', { n: diseased.length })}` : ''}
          </Text>
          {items.length === 0 ? <Empty icon="clipboard-check-outline" title="No scans yet" text='Scan a leaf from this field, then tap "Save to my farm".' /> : null}
          {items.map((item) => {
            const band = confidenceBand(item.confidence);
            return (
              <TouchableOpacity
                key={item.id}
                style={st.item}
                onPress={() => router.push({ pathname: '/result', params: { label: item.class_label, confidence: String(item.confidence), incidentId: item.id } })}
                onLongPress={() => removeIncident(item)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge label={cropName(item.crop)} color={C.primary} tint={C.primaryTint} />
                  <Text style={[st.conf, { color: band.color }]}>{t('{n}% confidence', { n: Math.round(item.confidence * 100) })}</Text>
                </View>
                <Text raw style={st.disease}>
                  {item.uncertain ? t('Unclear (best guess: {d})', { d: diseaseName(item) }) : diseaseName(item)}
                </Text>
                <Text raw style={st.meta}>
                  {new Date(item.created_at).toLocaleString(locale(lang), { dateStyle: 'medium', timeStyle: 'short' })}, {timeAgo(item.created_at)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text raw style={st.factLabel}>
        {label}
      </Text>
      <Text raw style={st.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.errorTint, justifyContent: 'center', alignItems: 'center' },
  facts: { flexDirection: 'row', gap: 10 },
  factLabel: { fontSize: 13, color: C.textSub },
  factValue: { fontSize: 15, color: C.text, fontWeight: '800', marginTop: 2 },
  meta: { fontSize: 13, color: C.textSub, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '800', color: C.textMid, marginTop: 4 },
  link: { color: C.primary, fontWeight: '800', fontSize: 14 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: C.bg },
  remindTxt: { flex: 1, fontSize: 13, color: C.textMid, fontWeight: '700' },
  section: { fontSize: 20, fontWeight: '700', color: C.text, marginHorizontal: 20, marginTop: 20, marginBottom: 4 },
  item: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 10 },
  conf: { fontSize: 12, fontWeight: '800' },
  sat: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12 },
  satIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  satTitle: { fontSize: 18, fontFamily: FONT.display, color: C.text },
  satSub: { fontSize: 14, color: C.textSub, marginTop: 2 },
  disease: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 8 },
});
