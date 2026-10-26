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
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  classMeta,
  interpret,
  latestByFarm as latestSatellite,
  listObservations,
  listZones,
  zoneName,
  type Observation,
  type Reading,
  type ZoneStat,
} from '../../lib/satellite';
import { cropName, getDiseaseL } from '../../lib/diseases';
import { getPosition } from '../../lib/geo';
import { describeCode, getWeather, type Weather } from '../../lib/weather';
import { loadCached, saveCached } from '../../lib/store';
import { currentStage, daysSince, fieldTasks, loadTicks, saveTicks, type FieldTask } from '../../lib/calendar';
import { alertOnce } from '../../lib/notify';
import { locale, useLang } from '../../lib/i18n';
import { fmtArea, usePrefs } from '../../lib/prefs';
import { openScanner } from '../../lib/navigation';
import { C, FONT, RADIUS } from '../../lib/theme';

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

/** SVG Field Boundary Mini-map renderer */
function MiniFieldBoundary({
  polygon,
  tone,
  width = 150,
  height = 94,
}: {
  polygon: [number, number][] | null;
  tone: 'normal' | 'watch' | 'act' | 'none';
  width?: number;
  height?: number;
}) {
  const strokeColor =
    tone === 'normal' ? '#8FC2A5' : tone === 'watch' ? '#E8C25A' : tone === 'act' ? '#E2876A' : '#5E6B64';
  const fillColor =
    tone === 'normal'
      ? 'rgba(46, 106, 79, 0.45)'
      : tone === 'watch'
      ? 'rgba(217, 169, 58, 0.40)'
      : tone === 'act'
      ? 'rgba(168, 71, 42, 0.45)'
      : 'rgba(30, 58, 42, 0.45)';

  const points = useMemo(() => {
    if (!polygon || polygon.length < 3) {
      // Stylized default field contour
      return '18,34 56,16 126,24 138,72 96,86 28,78';
    }
    const lats = polygon.map((p) => p[0]);
    const lngs = polygon.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const spanLat = maxLat - minLat || 0.0001;
    const spanLng = maxLng - minLng || 0.0001;
    const pad = 12;
    const w = width - pad * 2;
    const h = height - pad * 2;

    return polygon
      .map(([lat, lng]) => {
        const x = pad + ((lng - minLng) / spanLng) * w;
        const y = pad + ((maxLat - lat) / spanLat) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [polygon, width, height]);

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.22)' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Subtle coordinate grid lines */}
        <Line x1={width * 0.33} y1="0" x2={width * 0.33} y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <Line x1={width * 0.66} y1="0" x2={width * 0.66} y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <Line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Drawn Polygon */}
        <Polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />

        {/* Radar beam center pulse */}
        <Circle cx={width * 0.52} cy={height * 0.48} r="3" fill="#E2B33C" />
        <Circle cx={width * 0.52} cy={height * 0.48} r="7" stroke="#E2B33C" strokeWidth="1" strokeOpacity="0.4" />

        {/* North Indicator */}
        <G x={width - 16} y={16}>
          <Path d="M0,-5 L3,4 L0,2 L-3,4 Z" fill="#F4F1E6" />
          <SvgText x="0" y="12" fontSize="8" fill="#F4F1E6" textAnchor="middle" fontFamily={FONT.bodyBold}>
            N
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

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
      return;
    }
    try {
      const obs = await listObservations(farm.id);
      const latestUsable = [...obs].reverse().find((x) => x.quality !== 'unusable' && !x.suspect);
      const zones: ZoneStat[] = latestUsable ? await listZones(latestUsable.id) : [];
      const reading = interpret(obs, zones, farm.crop, farm.planting_date);
      setActiveReading(reading);
    } catch {
      setActiveReading(null);
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

  // Plain-language satellite verdict for active field
  const fieldVerdict = useMemo(() => {
    if (!activeFarm) return null;
    const crop = (activeFarm.crop ? cropName(activeFarm.crop) : '') || 'crop';
    if (!activeReading || activeReading.tone === 'none') {
      return {
        text: t('Checking your field from space… about a minute'),
        badge: t('Learning this field'),
        tone: 'none' as const,
      };
    }
    if (activeReading.headline === 'Looks normal' || activeReading.tone === 'normal') {
      return {
        text: t('Your {crop} field looks healthy', { crop: crop.toLowerCase() }),
        badge: activeReading.latest
          ? t('Sentinel-2 · {when} · Clear image', { when: timeAgo(activeReading.latest.observed_at) })
          : t('Sentinel-2 · Clear image'),
        tone: 'normal' as const,
      };
    }
    if (activeReading.tone === 'act') {
      return {
        text: activeReading.action ?? t('Possible stress detected — inspect {zone} today', { zone: zoneName(activeReading.zone) }),
        badge: t('Action needed'),
        tone: 'act' as const,
      };
    }
    return {
      text: t('Part of your field is drying — go and check {zone}', { zone: zoneName(activeReading.zone) }),
      badge: t('Watch zone'),
      tone: 'watch' as const,
    };
  }, [activeFarm, activeReading, t]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 64 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* ── TOP EDITORIAL HEADER ────────────────────────────────────────── */}
        <View style={[st.header, { paddingTop: insets.top + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text raw style={st.dateText}>
              {todayFormatted}
            </Text>
            <Text raw style={st.greetingText}>
              {first ? `${t(greeting())}, ${first}` : t(greeting())}
            </Text>
            {profile?.county ? (
              <Text raw style={st.subLocation}>
                {[
                  t('{county} County', { county: profile.county }),
                  farms.length ? t('{n} fields', { n: farms.length }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => router.navigate('/profile')} hitSlop={8}>
                <Text style={[st.subLocation, { color: C.brandGold, fontFamily: FONT.bodyBold }]}>
                  Add your county for local alerts
                </Text>
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

        {offline ? (
          <View style={st.offlineNotice}>
            <Dot color={C.warn} />
            <Text style={st.offlineNoticeText}>
              Offline. Scanning still works; your fields load when you reconnect.
            </Text>
          </View>
        ) : null}

        {/* ── FIELD SWITCHER PILLS (when multiple fields) ────────────────── */}
        {farms.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.fieldPillsContainer}
          >
            {farms.map((f) => {
              const isSelected = f.id === activeFarm?.id;
              return (
                <Press
                  key={f.id}
                  onPress={() => {
                    tick('select');
                    setActiveFarmId(f.id);
                  }}
                  style={[st.fieldPill, isSelected && st.fieldPillActive]}
                >
                  <CropIcon crop={f.crop} size={22} disc={false} />
                  <Text raw style={[st.fieldPillText, isSelected && st.fieldPillTextActive]}>
                    {f.name}
                  </Text>
                </Press>
              );
            })}
            <Press
              onPress={() => router.push('/add-farm')}
              style={st.fieldPillAdd}
              accessibilityLabel={t('Add a field')}
            >
              <Icon name="plus" size={16} color={C.brandGold} />
              <Text style={st.fieldPillAddText}>Add</Text>
            </Press>
          </ScrollView>
        ) : null}

        {/* ── HERO: FIELD-FIRST SATELLITE CARD ──────────────────────────── */}
        <View style={st.heroWrapper}>
          {farms.length > 0 && activeFarm ? (
            <Press
              style={st.fieldHeroCard}
              onPress={() => {
                tick('select');
                router.push({ pathname: '/satellite/[id]', params: { id: activeFarm.id } });
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Tap to inspect field from space')}
            >
              {/* Field info & satellite tag */}
              <View style={st.fieldHeroHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <CropIcon crop={activeFarm.crop} size={28} discColor="rgba(255,255,255,0.14)" />
                    <Text raw style={st.heroFieldName} numberOfLines={1}>
                      {activeFarm.name}
                    </Text>
                  </View>
                  <Text raw style={st.heroFieldSub} numberOfLines={1}>
                    {[
                      activeFarm.crop ? cropName(activeFarm.crop) : null,
                      activeFarm.size_acres ? fmtArea(Number(activeFarm.size_acres), prefs.units) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('Field')}
                  </Text>
                </View>

                {fieldVerdict?.badge ? (
                  <View
                    style={[
                      st.satelliteBadge,
                      fieldVerdict.tone === 'act' && { backgroundColor: 'rgba(168, 71, 42, 0.35)', borderColor: C.error },
                    ]}
                  >
                    <Icon name="satellite-variant" size={13} color={C.brandGold} />
                    <Text raw style={st.satelliteBadgeText}>
                      {fieldVerdict.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Graphic center: Mini Field Boundary SVG */}
              <View style={st.heroVisualRow}>
                <MiniFieldBoundary
                  polygon={activeFarm.polygon}
                  tone={fieldVerdict?.tone ?? 'none'}
                  width={Math.min(160, Math.round(width * 0.4))}
                  height={94}
                />
                <View style={{ flex: 1, paddingLeft: 14, justifyContent: 'center', gap: 6 }}>
                  <Text raw style={st.heroVerdictText}>
                    {fieldVerdict?.text}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={st.heroInspectLink}>Tap to inspect field from space</Text>
                    <Icon name="arrow-right" size={14} color={C.brandGold} />
                  </View>
                </View>
              </View>
            </Press>
          ) : !loaded ? (
            <View style={[st.fieldHeroCard, { height: 160, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: C.brandCream }}>Checking your fields…</Text>
            </View>
          ) : (
            /* First run empty state: "Draw your field from space" */
            <Press
              style={[st.fieldHeroCard, st.emptyHeroCard]}
              onPress={() => router.push('/add-farm')}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <SatellitePassArt size={90} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.emptyHeroTitle}>See your crop from space</Text>
                  <Text style={st.emptyHeroSub}>
                    Draw your boundary in 60 seconds to get Sentinel-2 satellite health and soil moisture.
                  </Text>
                  <View style={st.drawFieldBtn}>
                    <Icon name="vector-polygon" size={16} color={C.brandDark} />
                    <Text style={st.drawFieldBtnText}>Draw field</Text>
                  </View>
                </View>
              </View>
            </Press>
          )}
        </View>

        {/* ── GIANT THUMB-REACHABLE SCAN BAR ─────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Press
            style={st.scanBar}
            onPress={openScanner}
            haptic
            accessibilityRole="button"
            accessibilityLabel={t('Scan a leaf')}
          >
            <View style={st.scanIconCircle}>
              <Icon name="line-scan" size={30} color={C.brandGold} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.scanBarTitle}>Scan a leaf</Text>
              <Text style={st.scanBarSub}>154 plant conditions · Works offline</Text>
            </View>
            <View style={st.scanCameraGlyph}>
              <Icon name="camera" size={20} color="#FFFFFF" />
            </View>
          </Press>
        </View>

        {/* ── "TODAY" ACTION CARDS (MAX 3) ────────────────────────────────── */}
        <View style={st.sectionHeader}>
          <SectionLabel>Today on your farm</SectionLabel>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: C.textSub,
  },
  greetingText: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.display,
    color: C.text,
    marginTop: 2,
  },
  subLocation: {
    fontSize: 14,
    color: C.textSub,
    marginTop: 2,
  },
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
  fieldPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  fieldPillActive: {
    backgroundColor: C.brandDark,
    borderColor: C.brandDark,
  },
  fieldPillText: {
    fontSize: 14,
    color: C.textMid,
  },
  fieldPillTextActive: {
    color: C.brandCream,
    fontFamily: FONT.bodyBold,
  },
  fieldPillAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.brandGold,
  },
  fieldPillAddText: {
    fontSize: 14,
    color: C.brandGold,
    fontFamily: FONT.bodyBold,
  },

  // Hero Card: Field-First
  heroWrapper: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  fieldHeroCard: {
    backgroundColor: C.brandDark,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#101D16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  fieldHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroFieldName: {
    fontSize: 20,
    fontFamily: FONT.display,
    color: C.brandCream,
  },
  heroFieldSub: {
    fontSize: 13,
    color: '#8FC2A5',
  },
  satelliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 179, 60, 0.4)',
  },
  satelliteBadgeText: {
    fontSize: 12,
    color: C.brandCream,
    fontFamily: FONT.bodyBold,
  },
  heroVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroVerdictText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FONT.body,
    color: C.brandCream,
  },
  heroInspectLink: {
    fontSize: 13,
    color: C.brandGold,
    fontFamily: FONT.bodyBold,
  },

  // First run empty hero card
  emptyHeroCard: {
    backgroundColor: C.brandDark,
    padding: 20,
  },
  emptyHeroTitle: {
    fontSize: 19,
    fontFamily: FONT.display,
    color: C.brandCream,
  },
  emptyHeroSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8FC2A5',
  },
  drawFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: C.brandGold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginTop: 6,
  },
  drawFieldBtnText: {
    fontSize: 14,
    fontFamily: FONT.bodyBold,
    color: C.brandDark,
  },

  // Giant Scan Bar
  scanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.primaryDark,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(226,179,60,0.3)',
    shadowColor: '#101D16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  scanIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBarTitle: {
    fontSize: 20,
    fontFamily: FONT.display,
    color: '#FFFFFF',
  },
  scanBarSub: {
    fontSize: 13,
    color: '#A2CBB4',
  },
  scanCameraGlyph: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
