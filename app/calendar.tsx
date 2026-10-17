// Crop calendar — one field's season as something you can scrub through.
// A strip of weeks shows where the crop is today; tap any week to see what
// happens then. Tasks are short lines you tick off; the how-to opens on tap.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Btn, Chip, CropIcon, Dot, Empty, ErrorNote, Header, Loading, ProgressBar, SectionLabel, Text, tick } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { listFarms, type Farm } from '../lib/data';
import { calendarFor, daysSince, fieldTasks, loadTicks, parseDate, saveTicks, type FieldTask } from '../lib/calendar';
import { cropName } from '../lib/diseases';
import { locale, useLang } from '../lib/i18n';
import { C, FONT } from '../lib/theme';

const WEEK_W = 46;
const DAY = 86400000;

export default function CalendarScreen() {
  const { t, lang } = useLang();
  const params = useLocalSearchParams<{ id?: string }>();
  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [fieldId, setFieldId] = useState<string | null>(params.id ?? null);
  const [week, setWeek] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const strip = useRef<ScrollView>(null);

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
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const planned = (farms ?? []).filter((f) => f.planting_date && calendarFor(f.crop));
  const unplanned = (farms ?? []).filter((f) => !(f.planting_date && calendarFor(f.crop)));
  const farm = planned.find((f) => f.id === fieldId) ?? planned[0];
  const cal = farm ? calendarFor(farm.crop) : null;
  const tasks: FieldTask[] = useMemo(() => (farm ? fieldTasks(farm, ticks[farm.id] ?? [], lang) : []), [farm, ticks, lang]);

  const day = farm?.planting_date ? daysSince(farm.planting_date) : 0;
  const harvestDay = cal ? cal.tasks[cal.tasks.length - 1].start : 0;
  const totalWeeks = cal ? Math.ceil(cal.tasks[cal.tasks.length - 1].end / 7) + 1 : 0;
  const nowWeek = Math.max(0, Math.min(totalWeeks - 1, Math.floor(day / 7)));
  const selWeek = week ?? nowWeek;
  const planted = farm?.planting_date ? parseDate(farm.planting_date) : new Date();
  const weekStart = new Date(planted.getTime() + selWeek * 7 * DAY);
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY);
  const inWeek = tasks.filter((x) => x.task.start <= selWeek * 7 + 6 && x.task.end >= selWeek * 7);
  const later = tasks.filter((x) => x.task.start > selWeek * 7 + 6).slice(0, 3);
  const missed = tasks.filter((x) => x.status === 'missed');

  // Jump the strip to today's week when a field opens.
  useEffect(() => {
    setWeek(null);
    const id = setTimeout(() => strip.current?.scrollTo({ x: Math.max(0, (nowWeek - 2) * WEEK_W), animated: false }), 50);
    return () => clearTimeout(id);
  }, [farm?.id, nowWeek]);

  const toggle = async (farmId: string, taskId: string) => {
    const cur = ticks[farmId] ?? [];
    const next = cur.includes(taskId) ? cur.filter((x) => x !== taskId) : [...cur, taskId];
    setTicks({ ...ticks, [farmId]: next });
    await saveTicks(farmId, next);
  };

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale(lang), opts);
  const weekLabel = selWeek === nowWeek ? t('This week') : t('Week {n}', { n: selWeek + 1 });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Crop calendar" />
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {farms === null ? (
        <Loading />
      ) : !farm || !cal ? (
        <Empty
          icon="calendar-blank-outline"
          crop="Crop"
          title="No crop calendar yet"
          text="Add a field with its crop (maize, beans, potato, tomato or wheat) and planting date. CropGuard then plans the whole season."
          action={
            <Btn
              label={farms.length ? 'Add a planting date' : 'Add a field'}
              icon="calendar-plus"
              onPress={() => (unplanned[0] ? router.push({ pathname: '/farm/[id]', params: { id: unplanned[0].id } }) : router.push('/add-farm'))}
              style={{ marginTop: 12, alignSelf: 'stretch' }}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              colors={[C.primary]}
            />
          }
        >
          {planned.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
              {planned.map((f) => (
                <Chip key={f.id} raw crop={f.crop ?? undefined} label={f.name} active={farm.id === f.id} onPress={() => setFieldId(f.id)} />
              ))}
            </ScrollView>
          ) : null}

          {/* Season */}
          <View style={st.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CropIcon crop={farm.crop} size={52} />
              <View style={{ flex: 1 }}>
                <Text raw style={st.fieldName}>
                  {farm.name}
                </Text>
                <Text raw style={st.small}>
                  {`${cropName(farm.crop ?? '')} · ${t(cal.plantingLabel.en === 'Transplanting date' ? 'transplanted {date}' : 'planted {date}', {
                    date: fmt(planted, { day: 'numeric', month: 'short' }),
                  })}`}
                </Text>
              </View>
            </View>

            <View style={st.stats}>
              <View style={{ flex: 1 }}>
                <Text raw style={st.bigNum}>
                  {day < 0 ? t('In {n} days', { n: -day }) : t('Day {n}', { n: day })}
                </Text>
                <Text raw style={st.small}>
                  {t('Week {n} of {total}', { n: nowWeek + 1, total: totalWeeks })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text raw style={st.bigNum}>
                  {harvestDay - day > 0 ? String(harvestDay - day) : '0'}
                </Text>
                <Text style={st.small}>days to harvest</Text>
              </View>
            </View>
            <ProgressBar value={day / Math.max(1, harvestDay)} height={8} />
          </View>

          {/* Week strip */}
          <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.strip}>
            {Array.from({ length: totalWeeks }, (_, w) => {
              const starts = tasks.filter((x) => Math.floor(x.task.start / 7) === w);
              const on = w === selWeek;
              const past = w < nowWeek;
              const isNow = w === nowWeek;
              return (
                <TouchableOpacity
                  key={w}
                  style={[st.week, on && st.weekOn]}
                  onPress={() => {
                    tick('select');
                    setWeek(w);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t('Week {n}', { n: w + 1 })}
                >
                  <Text raw style={[st.weekNum, on && { color: '#fff' }, isNow && !on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]}>
                    {w + 1}
                  </Text>
                  <View style={[st.weekBar, { backgroundColor: on ? 'rgba(255,255,255,0.35)' : past ? C.primary : isNow ? C.primaryDark : C.sunken }]} />
                  <View style={st.weekDots}>
                    {starts.slice(0, 3).map((x) => (
                      <Dot key={x.key} size={6} color={on ? '#fff' : x.ticked ? C.primary : x.status === 'missed' ? C.error : C.textLight} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected week */}
          <View style={st.section}>
            <SectionLabel action={selWeek !== nowWeek ? 'Today' : undefined} onAction={() => setWeek(null)}>
              {weekLabel}
            </SectionLabel>
            <Text raw style={[st.small, { marginTop: -6 }]}>
              {`${fmt(weekStart, { day: 'numeric', month: 'short' })} – ${fmt(weekEnd, { day: 'numeric', month: 'short' })}`}
            </Text>
          </View>
          <View style={[st.panel, { paddingVertical: 4 }]}>
            {inWeek.length ? (
              inWeek.map((x) => <TaskRow key={x.key} item={x} onToggle={() => toggle(farm.id, x.task.id)} />)
            ) : (
              <Text style={[st.small, { paddingVertical: 14 }]}>Nothing planned this week. Walk the field and scan anything that looks wrong.</Text>
            )}
          </View>

          {missed.length && selWeek === nowWeek ? (
            <>
              <View style={st.section}>
                <SectionLabel>Missed</SectionLabel>
              </View>
              <View style={[st.panel, { paddingVertical: 4 }]}>
                {missed.map((x) => (
                  <TaskRow key={x.key} item={x} onToggle={() => toggle(farm.id, x.task.id)} />
                ))}
              </View>
            </>
          ) : null}

          {later.length ? (
            <>
              <View style={st.section}>
                <SectionLabel>Coming up</SectionLabel>
              </View>
              <View style={[st.panel, { paddingVertical: 4 }]}>
                {later.map((x) => (
                  <TaskRow key={x.key} item={x} onToggle={() => toggle(farm.id, x.task.id)} />
                ))}
              </View>
            </>
          ) : null}

          {unplanned.length ? (
            <TouchableOpacity style={st.hint} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: unplanned[0].id } })}>
              <Text style={[st.small, { flex: 1 }]}>{t('{n} fields have no calendar yet — add the crop and planting date.', { n: unplanned.length })}</Text>
              <Text style={st.link}>Add</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={st.footer}>Timings are typical for Kenyan conditions and change with variety, altitude and rain. Adjust to what you see in your field.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12 },
  fieldName: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  small: { fontSize: 14, color: C.textSub, lineHeight: 19 },
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18, marginBottom: 12 },
  bigNum: { fontSize: 34, lineHeight: 38, fontFamily: FONT.display, color: C.text },
  strip: { gap: 2, paddingHorizontal: 14, paddingTop: 14 },
  week: { width: WEEK_W - 2, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 12 },
  weekOn: { backgroundColor: C.primaryDark },
  weekNum: { fontSize: 14, color: C.textSub },
  weekBar: { width: 28, height: 6, borderRadius: 3 },
  weekDots: { flexDirection: 'row', gap: 3, height: 6 },
  section: { marginHorizontal: 20, marginTop: 26 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 20 },
  link: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  footer: { fontSize: 13, color: C.textSub, textAlign: 'center', marginHorizontal: 28, marginTop: 20, lineHeight: 19 },
});
