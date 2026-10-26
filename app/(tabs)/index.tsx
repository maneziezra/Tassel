// Home — "Field-First Editorial" (Direction A).
//
// Shows the farmer how their field is doing from space, and what to do today.
// Full-bleed Sentinel-2 satellite field hero, giant thumb-height leaf scan bar,
// context-aware "Today" action cards (spray suitability, due tasks, county outbreaks),
// and fast access to agricultural tools.
// Zero invented numbers: real Sentinel-2 satellite data, Open-Meteo weather,
// Hutton blight criteria, and PCPB registered crop guidance.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FieldHero } from '../../components/FieldHero';
import {
  Btn,
  CropIcon,
  Dot,
  Icon,
  Press,
  ProgressBar,
  SatellitePassArt,
  SectionLabel,
  Sheet,
  StatusShade,
  TasselMark,
  Text,
  tick,
  timeAgo,
  type IconName,
} from '../../components/ui';
import {
  getProfile,
  listFarms,
  listIncidents,
  listOutbreaks,
  type Farm,
  type Incident,
  type Outbreak,
  type Profile,
} from '../../lib/data';
import {
  getGrid,
  interpret,
  latestByFarm as latestSatellite,
  listObservations,
  listZones,
  zoneName,
  type Reading,
  type ZoneStat,
} from '../../lib/satellite';
import { cropName, getDiseaseL } from '../../lib/diseases';
import { getPosition } from '../../lib/geo';
import { describeCode, getWeather, type Weather } from '../../lib/weather';
import type { Grid } from '../../lib/satelliteCore';
import { loadCached, saveCached } from '../../lib/store';
import { currentStage, daysSince, fieldTasks, loadTicks, saveTicks, type FieldTask } from '../../lib/calendar';
import { alertOnce } from '../../lib/notify';
import { locale, useLang } from '../../lib/i18n';
import { fmtArea, usePrefs } from '../../lib/prefs';
import { openScanner } from '../../lib/navigation';
import { C, FONT, RADIUS } from '../../lib/theme';

const HERO_ART_H = 230;
const NAIROBI = { lat: -1.2864, lng: 36.8172 };
const FALLBACK_PLACE = 'Nairobi (location off)';

function greeting() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening';
}

const TOOLS: { label: string; icon: IconName; href: string }[] = [
  { label: 'Calendar', icon: 'calendar-check-outline', href: '/calendar' },
  { label: 'Fertiliser', icon: 'sack', href: '/fertiliser' },
  { label: 'Prices', icon: 'chart-line', href: '/market' },
  { label: 'Outbreaks', icon: 'map-marker-radius-outline', href: '/outbreaks' },
  { label: 'Library', icon: 'book-open-variant', href: '/encyclopedia' },
  { label: 'AI advisor', icon: 'chat-processing-outline', href: '/chat' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, lang } = useLang();
  const prefs = usePrefs();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [satSummaries, setSatSummaries] = useState<Awaited<ReturnType<typeof latestSatellite>>>({});
  const [activeReading, setActiveReading] = useState<Reading | null>(null);
  const [activeGrid, setActiveGrid] = useState<Grid | null>(null);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [weather, setWeather] = useState<(Weather & { place: string }) | null>(null);
  const [blightOpen, setBlightOpen] = useState(false);
  const [spraySheetOpen, setSpraySheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const activeFarm = useMemo(() => {
    if (!farms.length) return null;
    return farms.find((f) => f.id === activeFarmId) ?? farms[0];
  }, [farms, activeFarmId]);

  const loadWeather = useCallback(async (fieldList: Farm[], ask = false) => {
    const cached = await loadCached<Weather & { place: string }>('weather');
    if (cached) setWeather(cached);
    try {
      const pos = await getPosition(ask);
      const field = fieldList.find((f) => f.center_lat != null && f.center_lng != null);
      const at = pos ?? (field ? { lat: field.center_lat!, lng: field.center_lng! } : null) ?? NAIROBI;
      const place = pos ? 'Your location' : field ? field.name : FALLBACK_PLACE;
      const w = await getWeather(at.lat, at.lng);
      const withPlace = { ...w, place };
      setWeather(withPlace);
      saveCached('weather', withPlace);
    } catch {
      // keep cached weather
    }
  }, []);

  const loadOutbreaks = useCallback(
    async (county: string | null) => {
      if (!county) return setOutbreaks([]);
      try {
        const list = (await listOutbreaks(county, 14)) ?? [];
        setOutbreaks(list);
        const top = list[0];
        if (top) {
          const d = getDiseaseL(top.class_label);
          alertOnce(
            `${top.county}:${top.class_label}`,
            t('Outbreak alert: {county}', { county: top.county }),
            t('{disease} on {crop} reported by {n} farmers nearby. Check your crop and open the treatment guide.', {
              disease: d?.disease ?? top.disease,
              crop: cropName(top.crop),
              n: top.farmers,
            })
          );
        }
      } catch {
        setOutbreaks([]);
      }
    },
    [t]
  );

  const loadActiveFarmSatellite = useCallback(async (farm: Farm | null) => {
    if (!farm) {
      setActiveReading(null);
      setActiveGrid(null);
      return;
    }
    try {
      const obs = await listObservations(farm.id);
      const latestUsable = [...obs].reverse().find((x) => x.quality !== 'unusable' && !x.suspect);
      const zones: ZoneStat[] = latestUsable ? await listZones(latestUsable.id) : [];
      const reading = interpret(obs, zones, farm.crop, farm.planting_date);
      setActiveReading(reading);
      // The hero draws the field's latest clear grid; cached so it still shows offline.
      const grid = latestUsable ? await getGrid(latestUsable.id) : null;
      setActiveGrid(grid);
      if (grid) saveCached(`grid:${farm.id}`, grid);
    } catch {
      setActiveReading(null);
      setActiveGrid(await loadCached<Grid>(`grid:${farm.id}`));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      loadOutbreaks(p?.county ?? null);
    } catch {
      // offline: keep cached profile
    }

    try {
      const [f, i] = await Promise.all([listFarms(), listIncidents({ limit: 30 })]);
      setFarms(f);
      setIncidents(i);
      setOffline(false);

      if (f.length > 0 && !activeFarmId) {
        setActiveFarmId(f[0].id);
      }

      const tk: Record<string, string[]> = {};
      for (const x of f) tk[x.id] = await loadTicks(x.id);
      setTicks(tk);

      loadWeather(f);
      latestSatellite().then(setSatSummaries).catch(() => {});
    } catch {
      setOffline(true);
      loadWeather([]);
    } finally {
      setLoaded(true);
    }
  }, [loadWeather, loadOutbreaks, activeFarmId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (activeFarm) {
      loadActiveFarmSatellite(activeFarm);
    }
  }, [activeFarm, loadActiveFarmSatellite]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    if (activeFarm) await loadActiveFarmSatellite(activeFarm);
    setRefreshing(false);
  };

  const tasks = useMemo(() => {
    const all: FieldTask[] = [];
    for (const f of farms) if (f.planting_date) all.push(...fieldTasks(f, ticks[f.id] ?? [], lang));
    return all
      .filter((x) => x.status === 'now' || x.status === 'soon' || (x.status === 'done' && x.endDate.getTime() > Date.now()))
      .sort((a, b) => Number(a.ticked) - Number(b.ticked) || a.startDate.getTime() - b.startDate.getTime());
  }, [farms, ticks, lang]);

  const toggleTask = async (x: FieldTask) => {
    const cur = ticks[x.farmId] ?? [];
    const next = cur.includes(x.task.id) ? cur.filter((id) => id !== x.task.id) : [...cur, x.task.id];
    tick(next.length > cur.length ? 'success' : 'light');
    setTicks({ ...ticks, [x.farmId]: next });
    await saveTicks(x.farmId, next);
  };

  const todaySpray = weather?.spray?.[0];
  const primaryTask = tasks.find((t) => !t.ticked) ?? tasks[0] ?? null;
  const topOutbreak = outbreaks[0] ?? null;

  const first = profile?.name?.trim().split(' ')[0];
  const initials = (profile?.name || 'F')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const todayFormatted = new Date().toLocaleDateString(locale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Plain-language satellite verdict for the active field, from interpret() (lib/satellite.ts).
  const fieldVerdict = useMemo(() => {
    if (!activeFarm) return null;
    const crop = (activeFarm.crop ? cropName(activeFarm.crop) : '') || t('crop');
    const seen = activeReading?.latest
      ? new Date(activeReading.latest.observed_at).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' })
      : null;
    const meta = seen ? t('Clear picture from space · {date} · tap to open', { date: seen }) : t('Tap to open the field from space');
    if (!activeFarm.polygon) {
      return { text: t('Draw this field to see it from space'), meta: t('Tap to open the field'), tone: 'none' as const };
    }
    if (!activeReading || activeReading.tone === 'none') {
      return { text: t('Checking your field from space… about a minute'), meta: t('Tassel needs a few clear pictures to learn this field'), tone: 'none' as const };
    }
    if (activeReading.tone === 'normal') {
      return { text: t('Your {crop} looks healthy', { crop: crop.toLowerCase() }), meta, tone: 'normal' as const };
    }
    if (activeReading.tone === 'act') {
      return {
        text: activeReading.action ?? t('Possible stress — check {zone} today', { zone: zoneName(activeReading.zone) }),
        meta,
        tone: 'act' as const,
      };
    }
    return { text: t('Part of your field is drying — check {zone}', { zone: zoneName(activeReading.zone) }), meta, tone: 'watch' as const };
  }, [activeFarm, activeReading, t, lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* ── HERO: THE FIELD FROM SPACE (Direction A) ───────────────────── */}
        <View style={[st.hero, { paddingTop: insets.top + 12 }]}>
          <View style={st.heroTop}>
            <View style={{ flex: 1 }}>
              <Text raw style={st.heroGreeting} numberOfLines={1}>
                {first ? `${t(greeting())}, ${first}` : t(greeting())}
              </Text>
              {activeFarm ? (
                <Text raw style={st.heroSub} numberOfLines={1}>
                  {[
                    activeFarm.name,
                    activeFarm.crop ? cropName(activeFarm.crop) : null,
                    activeFarm.size_acres ? fmtArea(Number(activeFarm.size_acres), prefs.units) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : profile?.county ? (
                <Text raw style={st.heroSub}>
                  {t('{county} County', { county: profile.county })}
                </Text>
              ) : (
                <TouchableOpacity onPress={() => router.navigate('/profile')} hitSlop={8}>
                  <Text style={[st.heroSub, { color: C.brandGold, fontFamily: FONT.bodyBold }]}>Add your county for local alerts</Text>
                </TouchableOpacity>
              )}
            </View>
            <Press
              onPress={() => router.navigate('/profile')}
              accessibilityLabel={t('Profile')}
              style={[st.avatarBtn, { backgroundColor: prefs.avatarTone || C.primaryDark }]}
            >
              {prefs.avatarCrop ? (
                <CropIcon crop={prefs.avatarCrop} size={44} disc={false} />
              ) : (
                <Text raw style={st.avatarInitials}>
                  {initials}
                </Text>
              )}
            </Press>
          </View>

          {farms.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.fieldPillsContainer}>
              {farms.map((f) => {
                const isSelected = f.id === activeFarm?.id;
                return (
                  <Press
                    key={f.id}
                    onPress={() => {
                      tick('select');
                      setActiveFarmId(f.id);
                    }}
                    accessibilityState={{ selected: isSelected }}
                    style={[st.fieldPill, isSelected && st.fieldPillActive]}
                  >
                    <CropIcon crop={f.crop} size={22} disc={false} />
                    <Text raw style={[st.fieldPillText, isSelected && st.fieldPillTextActive]}>
                      {f.name}
                    </Text>
                  </Press>
                );
              })}
            </ScrollView>
          ) : null}

          {activeFarm ? (
            <Press
              onPress={() => {
                tick('select');
                router.push({ pathname: '/satellite/[id]', params: { id: activeFarm.id } });
              }}
              accessibilityRole="button"
              accessibilityLabel={`${fieldVerdict?.text ?? ''}. ${t('Open the field from space')}`}
            >
              <View style={st.heroArt}>
                {activeFarm.polygon || activeGrid ? (
                  <FieldHero
                    polygon={activeFarm.polygon}
                    grid={activeGrid}
                    width={width - 32}
                    height={HERO_ART_H}
                    checking={!activeGrid}
                    playKey={activeFarm.id}
                  />
                ) : (
                  <SatellitePassArt size={150} />
                )}
              </View>
              <Text raw style={st.heroVerdict}>
                {fieldVerdict?.text}
              </Text>
              <Text raw style={st.heroMeta}>
                {fieldVerdict?.meta}
              </Text>
            </Press>
          ) : !loaded ? (
            <View style={[st.heroArt, { justifyContent: 'center' }]}>
              <Text style={st.heroSub}>Checking your fields…</Text>
            </View>
          ) : (
            <Press onPress={() => router.push('/add-farm')} accessibilityRole="button">
              <View style={st.heroArt}>
                <SatellitePassArt size={150} />
              </View>
              <Text style={st.heroVerdict}>Draw your field from space</Text>
              <Text style={st.heroMeta}>Tap the corners. We measure it for you.</Text>
            </Press>
          )}
        </View>

        {/* ── THE ONE BIG ACTION ─────────────────────────────────────────── */}
        <View style={st.actionWrap}>
          {activeFarm || !loaded ? (
            <Press style={st.bigAction} onPress={openScanner} haptic accessibilityRole="button" accessibilityLabel={t('Scan a leaf')}>
              <Icon name="line-scan" size={36} color={C.brandGround} />
              <View style={{ flex: 1 }}>
                <Text style={st.bigActionTitle}>Scan a leaf</Text>
                <Text style={st.bigActionSub}>Works without data</Text>
              </View>
            </Press>
          ) : (
            <Press style={st.bigAction} onPress={() => router.push('/add-farm')} haptic accessibilityRole="button">
              <Icon name="vector-polygon" size={36} color={C.brandGround} />
              <View style={{ flex: 1 }}>
                <Text style={st.bigActionTitle}>Draw my field</Text>
                <Text style={st.bigActionSub}>About 1 minute</Text>
              </View>
            </Press>
          )}
        </View>

        {offline ? (
          <View style={st.offlineNotice}>
            <Dot color={C.warn} />
            <Text style={st.offlineNoticeText}>Offline. Scanning still works; your fields load when you reconnect.</Text>
          </View>
        ) : null}

        {!activeFarm && loaded ? (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Press style={st.actionCard} onPress={openScanner} accessibilityRole="button">
              <View style={st.actionCardIconWrap}>
                <Icon name="line-scan" size={26} color={C.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.actionCardTitle}>Scan a sick leaf</Text>
                <Text style={st.actionCardDesc}>No field needed · works offline</Text>
              </View>
              <Icon name="chevron-right" size={20} color={C.textLight} />
            </Press>
          </View>
        ) : null}

        {/* ── "TODAY" ACTION CARDS (MAX 3) ────────────────────────────────── */}
        <View style={st.sectionHeader}>
          <SectionLabel>Today</SectionLabel>
        </View>

        <View style={st.todayCardsContainer}>
          {/* Action Card 1: Spray Suitability / Weather Advice */}
          <Press
            style={st.actionCard}
            onPress={() => setSpraySheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Spray hours & forecast')}
          >
            <View style={st.actionCardIconWrap}>
              <Icon
                name={todaySpray?.window ? 'weather-partly-cloudy' : 'weather-rainy'}
                size={26}
                color={todaySpray?.window ? C.primary : C.warn}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={st.actionCardTitle}>
                  {todaySpray?.window ? 'Good spray window today' : 'Spray window closed today'}
                </Text>
                {weather ? (
                  <Text raw style={st.tempSnippet}>
                    {Math.round(weather.temp)}°C
                  </Text>
                ) : null}
              </View>
              <Text raw style={st.actionCardDesc}>
                {todaySpray?.window
                  ? t('Safe to spray until {time} · Wind {w} km/h, {t}°C', {
                      time: todaySpray.window.split('–')[1] ?? todaySpray.window,
                      w: Math.round(weather?.wind ?? 8),
                      t: Math.round(weather?.temp ?? 22),
                    })
                  : todaySpray?.reason
                  ? t(todaySpray.reason)
                  : t('Rain or high wind expected. Wait for clear conditions.')}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={C.textLight} />
          </Press>

          {/* Action Card 2: Due Calendar Task (if any) */}
          {primaryTask ? (
            <View style={st.actionCard}>
              <TouchableOpacity
                onPress={() => toggleTask(primaryTask)}
                hitSlop={12}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: primaryTask.ticked }}
                style={st.actionCardIconWrap}
              >
                <Icon
                  name={primaryTask.ticked ? 'check-circle' : 'circle-outline'}
                  size={28}
                  color={primaryTask.ticked ? C.primary : C.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, gap: 3 }}
                onPress={() => router.push('/calendar')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text raw style={[st.actionCardTitle, primaryTask.ticked && st.taskDone]}>
                    {primaryTask.title}
                  </Text>
                  <Text style={[st.taskBadge, { color: primaryTask.status === 'now' ? C.error : C.primaryDark }]}>
                    {primaryTask.status === 'now' ? 'Due today' : 'Due this week'}
                  </Text>
                </View>
                <Text raw style={st.actionCardDesc}>
                  {`${primaryTask.farmName} · ${t('Tap to open calendar')}`}
                </Text>
              </TouchableOpacity>
              <Icon name="chevron-right" size={20} color={C.textLight} />
            </View>
          ) : null}

          {/* Action Card 3: County Outbreak Alert (if any) */}
          {topOutbreak ? (
            <Press
              style={[st.actionCard, { borderColor: 'rgba(168,71,42,0.25)' }]}
              onPress={() => router.push('/outbreaks')}
              accessibilityRole="button"
            >
              <View style={[st.actionCardIconWrap, { backgroundColor: C.errorTint }]}>
                <Icon name="shield-alert-outline" size={26} color={C.error} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[st.actionCardTitle, { color: C.error }]}>
                  {t('Outbreak: {disease}', {
                    disease: getDiseaseL(topOutbreak.class_label)?.disease ?? topOutbreak.disease,
                  })}
                </Text>
                <Text raw style={st.actionCardDesc}>
                  {t('{n} farmers reported nearby in {county}. Inspect your {crop} field.', {
                    n: topOutbreak.farmers,
                    county: topOutbreak.county,
                    crop: cropName(topOutbreak.crop).toLowerCase(),
                  })}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={C.textLight} />
            </Press>
          ) : null}

          {/* Quiet Reassurance Card if no due tasks, no outbreaks, calm weather */}
          {!primaryTask && !topOutbreak && todaySpray?.window ? (
            <View style={st.actionCard}>
              <View style={[st.actionCardIconWrap, { backgroundColor: C.primaryTint }]}>
                <Icon name="shield-check-outline" size={26} color={C.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.actionCardTitle}>All quiet on your farm today</Text>
                <Text style={st.actionCardDesc}>
                  No overdue tasks or nearby disease outbreaks. Check your fields or scan any suspicious leaves.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── QUICK TOOLS GRID ────────────────────────────────────────────── */}
        <View style={st.sectionHeader}>
          <SectionLabel>Tools</SectionLabel>
        </View>

        <View style={st.toolsGrid}>
          {TOOLS.map((item) => (
            <Press
              key={item.label}
              style={st.toolItem}
              onPress={() => router.push(item.href as never)}
              accessibilityLabel={t(item.label)}
            >
              <View style={st.toolItemIcon}>
                <Icon name={item.icon} size={26} color={C.brandDark} />
              </View>
              <Text style={st.toolItemText} numberOfLines={1}>
                {item.label}
              </Text>
            </Press>
          ))}
        </View>

        {/* ── RECENT SCANS (IF ANY) ───────────────────────────────────────── */}
        {incidents.length > 0 ? (
          <>
            <View style={st.sectionHeader}>
              <SectionLabel action="History" onAction={() => router.push('/outbreaks')}>
                Recent scans
              </SectionLabel>
            </View>
            <View style={st.recentScansContainer}>
              {incidents.slice(0, 3).map((item) => {
                const disease = getDiseaseL(item.class_label)?.disease ?? item.disease;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={st.recentScanRow}
                    onPress={() =>
                      router.push({
                        pathname: '/result',
                        params: {
                          label: item.class_label,
                          confidence: String(item.confidence),
                          incidentId: item.id,
                        },
                      })
                    }
                  >
                    <CropIcon crop={item.crop} size={42} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text raw style={st.recentScanTitle} numberOfLines={1}>
                        {disease === 'Healthy'
                          ? t('Healthy {crop}', { crop: cropName(item.crop).toLowerCase() })
                          : disease}
                      </Text>
                      <Text raw style={st.recentScanSub}>
                        {`${cropName(item.crop)} · ${Math.round(item.confidence * 100)}% · ${timeAgo(item.created_at)}`}
                      </Text>
                    </View>
                    <Dot color={item.uncertain ? C.warn : item.disease === 'Healthy' ? C.primary : C.error} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* ── SPRAY HOURS & 5-DAY WEATHER SHEET ───────────────────────────── */}
      <Sheet
        visible={spraySheetOpen}
        onClose={() => setSpraySheetOpen(false)}
        title={t('Spray hours & forecast')}
      >
        <View style={{ gap: 14 }}>
          {weather?.spray?.[selectedDay]?.hours ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={st.sheetSubHead}>Today's safe spray window</Text>
                <Text
                  raw
                  style={{
                    color: weather.spray[selectedDay].window ? C.primaryDark : C.warn,
                    fontFamily: FONT.bodyBold,
                  }}
                >
                  {weather.spray[selectedDay].window ?? t('None')}
                </Text>
              </View>
              <View style={st.sprayHourBars}>
                {weather.spray[selectedDay].hours.map((ok, k) => (
                  <View
                    key={k}
                    style={[st.sprayHourSegment, { backgroundColor: ok ? C.primary : C.sunken }]}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text raw style={st.sprayTimeTick}>06:00</Text>
                <Text raw style={st.sprayTimeTick}>12:00</Text>
                <Text raw style={st.sprayTimeTick}>18:00</Text>
              </View>
              {weather.spray[selectedDay].reason ? (
                <Text raw style={st.sheetMutedText}>{weather.spray[selectedDay].reason}</Text>
              ) : null}
            </View>
          ) : null}

          {/* 5-day strip inside sheet */}
          {weather?.days ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={st.sheetSubHead}>5-Day Forecast</Text>
              <View style={st.sheetDaysRow}>
                {weather.days.map((d, i) => {
                  const on = i === selectedDay;
                  return (
                    <TouchableOpacity
                      key={d.date}
                      style={[st.sheetDayChip, on && st.sheetDayChipOn]}
                      onPress={() => {
                        tick('select');
                        setSelectedDay(i);
                      }}
                    >
                      <Text
                        raw
                        style={[st.sheetDayName, on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]}
                      >
                        {i === 0
                          ? t('Today')
                          : new Date(d.date + 'T12:00:00').toLocaleDateString(locale(lang), { weekday: 'short' })}
                      </Text>
                      <Icon
                        name={describeCode(d.code).icon as IconName}
                        size={22}
                        color={C.textMid}
                      />
                      <Text raw style={st.sheetDayTemp}>
                        {Math.round(d.tMax)}°
                      </Text>
                      <Text raw style={st.sheetDayRain}>
                        {d.rainChance != null ? `${d.rainChance}%` : `${d.rainMm.toFixed(0)}mm`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Text style={st.sheetMutedText}>
            Safe spraying requires wind under 15 km/h, temperature 10–30°C, and no rain within 6 hours. Always check and follow the product label.
          </Text>
        </View>
      </Sheet>

      <StatusShade />
    </View>
  );
}

const st = StyleSheet.create({
  // Direction A hero: the field from space on the dark brand ground.
  hero: { backgroundColor: C.brandDark, paddingHorizontal: 16, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroGreeting: { fontSize: 28, fontFamily: FONT.display, color: C.brandCream },
  heroSub: { fontSize: 15, color: C.secondary, marginTop: 2 },
  heroArt: { height: HERO_ART_H, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  heroVerdict: { fontSize: 32, lineHeight: 36, fontFamily: FONT.display, color: C.brandCream, marginTop: 14 },
  heroMeta: { fontSize: 15, color: C.secondary, marginTop: 6 },
  fieldPillsContainer: { gap: 8, paddingTop: 14 },
  fieldPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  fieldPillActive: { backgroundColor: C.brandCream },
  fieldPillText: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.brandCream },
  fieldPillTextActive: { color: C.brandGround },
  // The one big action, overlapping the hero's edge.
  actionWrap: { paddingHorizontal: 16, marginTop: -40 },
  bigAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 78,
    paddingHorizontal: 22,
    borderRadius: RADIUS.xl,
    backgroundColor: C.brandGold,
    shadowColor: C.brandGround,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  bigActionTitle: { fontSize: 26, fontFamily: FONT.display, color: C.brandGround },
  bigActionSub: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.brandDark },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarInitials: {
    fontSize: 18,
    fontFamily: FONT.display,
    color: C.brandCream,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: C.warnTint,
    padding: 10,
    borderRadius: 12,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 13,
    color: C.warn,
  },

  // Field selector pills

  // Hero Card: Field-First

  // First run empty hero card

  // Giant Scan Bar

  // Today Action Cards
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  todayCardsContainer: {
    gap: 10,
    paddingHorizontal: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#1E2E26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 15,
    fontFamily: FONT.bodyBold,
    color: C.text,
  },
  actionCardDesc: {
    fontSize: 13,
    color: C.textSub,
    lineHeight: 18,
  },
  tempSnippet: {
    fontSize: 14,
    fontFamily: FONT.bodyBold,
    color: C.textMid,
  },
  taskBadge: {
    fontSize: 12,
    fontFamily: FONT.bodyBold,
  },
  taskDone: {
    color: C.textLight,
    textDecorationLine: 'line-through',
  },

  // Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    rowGap: 14,
  },
  toolItem: {
    width: '33.33%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  toolItemIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  toolItemText: {
    fontSize: 13,
    color: C.text,
    fontFamily: FONT.body,
  },

  // Recent Scans
  recentScansContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 4,
  },
  recentScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentScanTitle: {
    fontSize: 15,
    fontFamily: FONT.bodyBold,
    color: C.text,
  },
  recentScanSub: {
    fontSize: 13,
    color: C.textSub,
  },

  // Spray Sheet
  sheetSubHead: {
    fontSize: 16,
    fontFamily: FONT.bodyBold,
    color: C.text,
  },
  sprayHourBars: {
    flexDirection: 'row',
    gap: 3,
    height: 14,
  },
  sprayHourSegment: {
    flex: 1,
    borderRadius: 3,
  },
  sprayTimeTick: {
    fontSize: 12,
    color: C.textLight,
  },
  sheetMutedText: {
    fontSize: 13,
    color: C.textSub,
    lineHeight: 18,
  },
  sheetDaysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sheetDayChip: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.sunken,
  },
  sheetDayChipOn: {
    backgroundColor: C.primaryTint,
  },
  sheetDayName: {
    fontSize: 12,
    color: C.textSub,
  },
  sheetDayTemp: {
    fontSize: 13,
    fontFamily: FONT.bodyBold,
    color: C.text,
  },
  sheetDayRain: {
    fontSize: 11,
    color: C.textSub,
  },
});
