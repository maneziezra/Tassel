// Crop calendar — one field's season as something you can scrub through.
// A strip of weeks shows where the crop is today; tap any week to see what
// happens then. Tasks are short lines you tick off; the how-to opens on tap.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Btn, Chip, CropIcon, Dot, Empty, ErrorNote, Header, Icon, Loading, ProgressBar, SectionLabel, Sheet, Text, tick } from '../components/ui';
import Animated from 'react-native-reanimated';
import { enterFade } from '../lib/motion';
import { TaskRow } from '../components/TaskRow';
import { DateField } from '../components/DateField';
import { listFarms, updateFarm, type Farm } from '../lib/data';
import { calendarFor, daysSince, fieldTasks, loadTicks, parseDate, saveTicks, toIsoDate, type FieldTask } from '../lib/calendar';
import { cropName } from '../lib/diseases';
import { locale, useLang } from '../lib/i18n';
import { fmtArea, usePrefs } from '../lib/prefs';
import { C, FONT } from '../lib/theme';

const WEEK_W = 46;
const DAY = 86400000;

export default function CalendarScreen() {
  const { units } = usePrefs();
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

  // Guided Planting Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedField, setSelectedField] = useState<Farm | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>('Maize');
  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(new Date()));
  const [savingPlanting, setSavingPlanting] = useState(false);

  const openPlantingWizard = (f?: Farm) => {
    if (f) {
      setSelectedField(f);
      setSelectedCrop(f.crop && calendarFor(f.crop) ? f.crop : 'Maize');
      setSelectedDate(f.planting_date || toIsoDate(new Date()));
      setWizardStep(2);
    } else {
      const defaultField = unplanned[0] ?? farms?.[0] ?? null;
      setSelectedField(defaultField);
      setSelectedCrop(defaultField?.crop && calendarFor(defaultField.crop) ? defaultField.crop : 'Maize');
      setSelectedDate(toIsoDate(new Date()));
      setWizardStep(1);
    }
    setWizardOpen(true);
  };

  const savePlanting = async () => {
    if (!selectedField) return;
    setSavingPlanting(true);
    try {
      await updateFarm(selectedField.id, { crop: selectedCrop, planting_date: selectedDate });
      tick('success');
      await load();
      setFieldId(selectedField.id);
      setWizardStep(4);
    } catch (e) {
      Alert.alert(t('Could not save planting'), e instanceof Error ? e.message : '');
    } finally {
      setSavingPlanting(false);
    }
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
          text="Add a field with its crop (maize, beans, potato, tomato or wheat) and planting date. Tassel then plans the whole season."
          action={
            <Btn
              label={farms.length ? t('Add a planting') : t('Add a field')}
              icon="calendar-plus"
              onPress={() => (farms.length ? openPlantingWizard() : router.push('/add-farm'))}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
            {planned.map((f) => (
              <Chip key={f.id} raw crop={f.crop ?? undefined} label={f.name} active={farm.id === f.id} onPress={() => setFieldId(f.id)} />
            ))}
            <Chip icon="plus" label={t('Add planting')} onPress={() => openPlantingWizard()} />
          </ScrollView>

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
              inWeek.map((x) => <TaskRow key={x.key} item={x} crop={farm.crop} onToggle={() => toggle(farm.id, x.task.id)} />)
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
                  <TaskRow key={x.key} item={x} crop={farm.crop} onToggle={() => toggle(farm.id, x.task.id)} />
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
                  <TaskRow key={x.key} item={x} crop={farm.crop} onToggle={() => toggle(farm.id, x.task.id)} />
                ))}
              </View>
            </>
          ) : null}

          {unplanned.length ? (
            <TouchableOpacity style={st.hint} onPress={() => openPlantingWizard(unplanned[0])}>
              <Text style={[st.small, { flex: 1 }]}>{t('{n} fields have no calendar yet — add the crop and planting date.', { n: unplanned.length })}</Text>
              <Text style={st.link}>{t('Add')}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={st.footer}>Timings are typical for Kenyan conditions and change with variety, altitude and rain. Adjust to what you see in your field.</Text>
        </ScrollView>
      )}

      {/* Guided Planting Wizard Sheet */}
      <Sheet visible={wizardOpen} onClose={() => setWizardOpen(false)} title={t('Plan a crop season')}>
        {wizardStep === 1 ? (
          <View style={{ gap: 14 }}>
            <Text style={st.stepLabel}>{t('Step 1 of 3: Choose field')}</Text>
            <Text style={st.small}>{t('Which field are you planting?')}</Text>
            <View style={{ gap: 8 }}>
              {(farms ?? []).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[st.wizardRow, selectedField?.id === f.id && st.wizardRowSelected]}
                  onPress={() => {
                    tick('select');
                    setSelectedField(f);
                    if (f.crop && calendarFor(f.crop)) setSelectedCrop(f.crop);
                    setWizardStep(2);
                  }}
                >
                  <CropIcon crop={f.crop} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.wizardRowTitle}>{f.name}</Text>
                    <Text raw style={st.small}>
                      {[
                        f.crop ? cropName(f.crop, lang) : null,
                        f.size_acres ? fmtArea(Number(f.size_acres), units) : null,
                        f.planting_date ? t('Planted') : t('Not planted yet'),
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={C.textLight} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[st.wizardRow, { borderStyle: 'dashed', borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center' }]}
              onPress={() => {
                setWizardOpen(false);
                router.push('/add-farm');
              }}
            >
              <Icon name="plus" size={20} color={C.primary} />
              <Text style={{ color: C.primary, fontFamily: FONT.bodyBold, fontSize: 15 }}>{t('Add a field')}</Text>
            </TouchableOpacity>
          </View>
        ) : wizardStep === 2 ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={st.stepLabel}>{t('Step 2 of 3: Choose crop')}</Text>
              <TouchableOpacity onPress={() => setWizardStep(1)}>
                <Text style={st.link}>{t('Back')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.small}>{t('Which crop are you planting in {name}?', { name: selectedField?.name ?? '' })}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {['Maize', 'Beans', 'Potato', 'Tomato', 'Wheat'].map((c) => {
                const on = calendarFor(selectedCrop)?.id === calendarFor(c)?.id;
                return (
                <TouchableOpacity
                  key={c}
                  style={[st.cropChoice, on && st.cropChoiceSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tick('select');
                    setSelectedCrop(c);
                    setWizardStep(3);
                  }}
                >
                  <CropIcon crop={c} size={50} />
                  <Text raw style={[st.cropChoiceText, on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]}>
                    {cropName(c, lang)}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : wizardStep === 3 ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={st.stepLabel}>{t('Step 3 of 3: Planting date')}</Text>
              <TouchableOpacity onPress={() => setWizardStep(2)}>
                <Text style={st.link}>{t('Back')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.small}>
              {calendarFor(selectedCrop)?.id === 'tomato' ? t('When were the seedlings transplanted?') : t('When was this crop planted?')}
            </Text>

            {/* Quick dates: paper tiles like the crop choices (white chips vanish on the white sheet) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { l: t('Today'), d: toIsoDate(new Date()) },
                { l: t('1 week ago'), d: toIsoDate(new Date(Date.now() - 7 * DAY)) },
                { l: t('2 weeks ago'), d: toIsoDate(new Date(Date.now() - 14 * DAY)) },
                { l: t('3 weeks ago'), d: toIsoDate(new Date(Date.now() - 21 * DAY)) },
                { l: t('1 month ago'), d: toIsoDate(new Date(Date.now() - 30 * DAY)) },
              ].map((chip) => {
                const on = selectedDate === chip.d;
                return (
                  <TouchableOpacity
                    key={chip.d}
                    style={[st.dateChoice, on && st.cropChoiceSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tick('select');
                      setSelectedDate(chip.d);
                    }}
                  >
                    <Text raw style={[st.cropChoiceText, { fontSize: 15 }, on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]}>
                      {chip.l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={[st.small, { marginBottom: 6 }]}>{t('Or pick a specific date')}</Text>
              <DateField value={selectedDate} onChange={(iso) => iso && setSelectedDate(iso)} />
            </View>

            {/* A field holds one crop: say so before a planting replaces what is there (e.g. coffee). */}
            {selectedField?.crop && selectedField.crop.toLowerCase() !== selectedCrop.toLowerCase() ? (
              <View style={st.replaceNote}>
                <Icon name="swap-horizontal" size={20} color={C.accentDark} />
                <Text raw style={[st.small, { flex: 1, color: C.text }]}>
                  {t('This replaces {old} in {field}.', { old: cropName(selectedField.crop, lang), field: selectedField.name })}
                </Text>
              </View>
            ) : null}

            <Btn
              label={t('Confirm planting')}
              icon="check"
              loading={savingPlanting}
              onPress={savePlanting}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 14, paddingVertical: 12 }}>
            {/* the season starts: the crop fades in, then the tick */}
            <Animated.View entering={enterFade(100)} style={{ width: 96, height: 80, alignItems: 'center', justifyContent: 'center' }}>
              <CropIcon crop={selectedCrop} size={64} />
              <Animated.View entering={enterFade(400)} style={{ position: 'absolute', right: 4, bottom: 0, backgroundColor: C.surface, borderRadius: 14 }}>
                <Icon name="check-circle" size={28} color={C.primary} />
              </Animated.View>
            </Animated.View>
            <Text style={{ fontSize: 22, fontFamily: FONT.display, color: C.text, textAlign: 'center' }}>
              {t('Planting calendar ready!')}
            </Text>
            <Text raw style={[st.small, { textAlign: 'center' }]}>
              {`${selectedField?.name} · ${cropName(selectedCrop, lang)} · ${fmt(parseDate(selectedDate), { day: 'numeric', month: 'long' })}`}
            </Text>
            <View style={{ width: '100%', gap: 10, marginTop: 12 }}>
              <Btn
                label={t('View calendar')}
                icon="calendar-check-outline"
                onPress={() => {
                  setWizardOpen(false);
                  if (selectedField) setFieldId(selectedField.id);
                }}
              />
              <Btn
                label={t('Add another planting')}
                kind="secondary"
                icon="plus"
                onPress={() => {
                  // A new planting starts fresh: today's date, not the one just saved.
                  setSelectedField(unplanned.find((u) => u.id !== selectedField?.id) ?? null);
                  setSelectedCrop('Maize');
                  setSelectedDate(toIsoDate(new Date()));
                  setWizardStep(1);
                }}
              />
            </View>
          </View>
        )}
      </Sheet>
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
  stepLabel: { fontSize: 17, fontFamily: FONT.display, color: C.text },
  wizardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1.5, borderColor: 'transparent' },
  wizardRowSelected: { borderColor: C.primary, backgroundColor: C.primaryTint },
  wizardRowTitle: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  cropChoice: { width: '30%', minWidth: 90, flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1.5, borderColor: 'transparent' },
  cropChoiceSelected: { borderColor: C.primary, backgroundColor: C.primaryTint },
  replaceNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.accentTint },
  dateChoice: { width: '47%', flexGrow: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1.5, borderColor: 'transparent' },
  cropChoiceText: { fontSize: 14, color: C.textMid, textAlign: 'center' },
});
