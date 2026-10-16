// Crop calendar — every field's tasks in one list (overdue, now, this week,
// coming up), like FarmRise's crop-stage advisory but tied to your own fields.

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Btn, Card, Chip, Empty, ErrorNote, Header, Icon, ListenButton, Loading, SectionLabel, Text } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { listFarms, type Farm } from '../lib/data';
import { calendarFor, currentStage, fieldTasks, loadTicks, saveTicks, type FieldTask } from '../lib/calendar';
import { cropName } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

type Group = { key: string; title: string; items: FieldTask[] };

export default function CalendarScreen() {
  const { t, lang } = useLang();
  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listFarms();
      const tk: Record<string, string[]> = {};
      for (const f of list) tk[f.id] = await loadTicks(f.id);
      setTicks(tk);
      setFarms(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load your fields.'));
      setFarms([]);
    }
  }, [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (farmId: string, taskId: string) => {
    const cur = ticks[farmId] ?? [];
    const next = cur.includes(taskId) ? cur.filter((x) => x !== taskId) : [...cur, taskId];
    setTicks({ ...ticks, [farmId]: next });
    await saveTicks(farmId, next);
  };

  const planned = (farms ?? []).filter((f) => f.planting_date && calendarFor(f.crop));
  const unplanned = (farms ?? []).filter((f) => !(f.planting_date && calendarFor(f.crop)));
  const all = planned
    .filter((f) => filter === 'all' || f.id === filter)
    .flatMap((f) => fieldTasks(f, ticks[f.id] ?? [], lang))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const groups: Group[] = [
    { key: 'missed', title: 'Overdue', items: all.filter((x) => x.status === 'missed') },
    { key: 'now', title: 'Do it now', items: all.filter((x) => x.status === 'now') },
    { key: 'soon', title: 'This week', items: all.filter((x) => x.status === 'soon') },
    { key: 'later', title: 'Coming up', items: all.filter((x) => x.status === 'later').slice(0, 8) },
    { key: 'done', title: 'Done', items: all.filter((x) => x.status === 'done') },
  ].filter((g) => g.items.length);

  const speakNow = () =>
    all
      .filter((x) => x.status === 'now' || x.status === 'soon')
      .map((x) => `${x.farmName}: ${x.title}. ${x.detail}`)
      .join(' ') || t('Nothing due this week.');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Crop calendar" subtitle="Tasks for all your fields" right={planned.length ? <ListenButton compact text={speakNow} /> : undefined} />
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {farms === null ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[C.primary]} />}
        >
          {planned.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
              <Chip label="All fields" active={filter === 'all'} onPress={() => setFilter('all')} />
              {planned.map((f) => (
                <Chip key={f.id} raw label={f.name} active={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </ScrollView>
          ) : null}

          {planned.length ? (
            <Card>
              {planned.map((f) => {
                const s = currentStage(f, lang);
                return (
                  <TouchableOpacity key={f.id} style={st.stage} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })}>
                    <Icon name="sprout" size={20} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text raw style={st.stageName}>
                        {f.name}, {cropName(f.crop ?? '')}
                      </Text>
                      <Text raw style={st.stageNow}>
                        {s ? t('Week {n}: {stage}', { n: s.week, stage: s.title }) : ''}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={C.textLight} />
                  </TouchableOpacity>
                );
              })}
            </Card>
          ) : null}

          {groups.map((g) => (
            <View key={g.key} style={{ marginHorizontal: 16, marginTop: 18 }}>
              <SectionLabel>{`${t(g.title)} (${g.items.length})`}</SectionLabel>
              {g.items.map((x) => (
                <TaskRow key={x.key} item={x} onToggle={() => toggle(x.farmId, x.task.id)} showField={filter === 'all' && planned.length > 1} />
              ))}
            </View>
          ))}

          {!planned.length ? (
            <Empty
              icon="calendar-blank-outline"
              title="No crop calendar yet"
              text="Add a field with its crop (maize, beans, potato, tomato or wheat) and planting date. CropGuard then plans weeding, top-dressing, scouting and harvest for you."
              action={
                <Btn
                  label={farms.length ? 'Add a planting date' : 'Add a field'}
                  icon="calendar-plus"
                  onPress={() => (unplanned[0] ? router.push({ pathname: '/farm/[id]', params: { id: unplanned[0].id } }) : router.push('/add-farm'))}
                  style={{ marginTop: 12, alignSelf: 'stretch' }}
                />
              }
            />
          ) : unplanned.length ? (
            <Card style={{ backgroundColor: C.accentTint }}>
              <Text style={st.hint}>{t('{n} fields have no calendar yet — add the crop and planting date.', { n: unplanned.length })}</Text>
              {unplanned.map((f) => (
                <TouchableOpacity key={f.id} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })} style={{ marginTop: 8 }}>
                  <Text raw style={st.link}>
                    {f.name} →
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          ) : null}
          <Text style={st.footer}>Timings are typical for Kenyan conditions and change with variety, altitude and rain. Adjust to what you see in your field.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stageName: { fontSize: 14, fontWeight: '800', color: C.text },
  stageNow: { fontSize: 12, color: C.textSub, marginTop: 2 },
  hint: { fontSize: 13, color: C.warn, fontWeight: '700' },
  link: { color: C.primary, fontWeight: '800', fontSize: 14 },
  footer: { fontSize: 11, color: C.textLight, textAlign: 'center', marginHorizontal: 24, marginTop: 20, lineHeight: 16 },
});
