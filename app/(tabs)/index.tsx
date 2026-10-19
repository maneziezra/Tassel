// Home — one calm page that answers "what does my farm need today?".
// Weather with an interactive spray window, the blight risk as one quiet line
// (detail in a sheet), the scan action, fields with their season progress,
// this week's tasks you can tick off, and the tools. Real data throughout:
// Open-Meteo weather, Hutton blight criteria, county outbreaks, Supabase fields.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, CropIcon, Dot, Icon, Press, ProgressBar, SectionLabel, Sheet, StatusShade, Text, tick, timeAgo, type IconName } from '../../components/ui';
import { getProfile, listFarms, listIncidents, listOutbreaks, type Farm, type Incident, type Outbreak, type Profile } from '../../lib/data';
import { STRESS, classMeta, latestByFarm as latestSatellite } from '../../lib/satellite';
import { DETECTABLE_CROPS, SCANNABLE_DISEASES, cropName, getDiseaseL } from '../../lib/diseases';
import { getPosition } from '../../lib/geo';
import { describeCode, getWeather, type Weather } from '../../lib/weather';
import { loadCached, saveCached } from '../../lib/store';
import { calendarFor, currentStage, daysSince, fieldTasks, loadTicks, saveTicks, type FieldTask } from '../../lib/calendar';
import { alertOnce } from '../../lib/notify';
import { locale, useLang } from '../../lib/i18n';
import { fmtArea, usePrefs } from '../../lib/prefs';
import { C, FONT } from '../../lib/theme';

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
  { label: 'Library', icon: 'book-open-variant', href: '/encyclopedia' },
  { label: 'Outbreaks', icon: 'map-marker-radius-outline', href: '/outbreaks' },
  { label: 'AI advisor', icon: 'chat-processing-outline', href: '/chat' },
  { label: 'Field map', icon: 'map-outline', href: '/farm-map' },
  { label: 'Report price', icon: 'tag-outline', href: '/report-price' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const prefs = usePrefs();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sat, setSat] = useState<Awaited<ReturnType<typeof latestSatellite>>>({});
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [weather, setWeather] = useState<(Weather & { place: string }) | null>(null);
  const [day, setDay] = useState(0);
  const [blightOpen, setBlightOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [wxTried, setWxTried] = useState(false);
  const usingFallback = weather?.place === FALLBACK_PLACE;

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
    } finally {
      setWxTried(true);
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

  const load = useCallback(async () => {
    try {
      const [p, f, i] = await Promise.all([getProfile(), listFarms(), listIncidents({ limit: 30 })]);
      setProfile(p);
      setFarms(f);
      setIncidents(i);
      setOffline(false);
      const tk: Record<string, string[]> = {};
      for (const x of f) tk[x.id] = await loadTicks(x.id);
      setTicks(tk);
      loadWeather(f);
      loadOutbreaks(p.county);
      latestSatellite().then(setSat).catch(() => {});
    } catch {
      setOffline(true);
      loadWeather([]);
    } finally {
      setLoaded(true);
    }
  }, [loadWeather, loadOutbreaks]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // This week's tasks across fields (recomputed when the language or ticks change)
  const tasks = useMemo(() => {
    const all: FieldTask[] = [];
    for (const f of farms) if (f.planting_date) all.push(...fieldTasks(f, ticks[f.id] ?? [], lang));
    return all
      .filter((x) => x.status === 'now' || x.status === 'soon' || (x.status === 'done' && x.endDate.getTime() > Date.now()))
      .sort((a, b) => Number(a.ticked) - Number(b.ticked) || a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 4);
  }, [farms, ticks, lang]);

  const toggleTask = async (x: FieldTask) => {
    const cur = ticks[x.farmId] ?? [];
    const next = cur.includes(x.task.id) ? cur.filter((id) => id !== x.task.id) : [...cur, x.task.id];
    tick(next.length > cur.length ? 'success' : 'light');
    setTicks({ ...ticks, [x.farmId]: next });
    await saveTicks(x.farmId, next);
  };

  const latestByFarm = useMemo(() => {
    const m = new Map<string, Incident>();
    incidents.forEach((i) => {
      if (i.farm_id && !m.has(i.farm_id)) m.set(i.farm_id, i);
    });
    return m;
  }, [incidents]);

  useEffect(() => setDay(0), [weather?.fetchedAt]);

  const first = profile?.name?.split(' ')[0];
  const initials = (profile?.name || 'F').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' });
  const blight = weather?.blight;
  const cond = weather ? describeCode(weather.code) : null;
  const spray = weather?.spray?.[day];
  const dayName = (iso: string, i: number) => (i === 0 ? t('Today') : new Date(iso + 'T12:00:00').toLocaleDateString(locale(lang), { weekday: 'short' }));
  const top = outbreaks[0];
  const diseaseName = (i: Incident) => getDiseaseL(i.class_label)?.disease ?? i.disease;
  const blightCrops = farms.filter((f) => /potato|tomato|viazi|nyanya/i.test(f.crop ?? ''));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}>
        {/* Greeting */}
        <View style={[st.head, { paddingTop: insets.top + 18 }]}>
          <View style={{ flex: 1 }}>
            <Text raw style={st.date}>
              {today}
            </Text>
            <Text raw style={st.hello}>
              {first ? `${t(greeting())}, ${first}` : t(greeting())}
            </Text>
            {profile?.county ? (
              <Text raw style={st.sub}>
                {[t('{county} County', { county: profile.county }), prefs.farmName || null, farms.length ? t('{n} fields', { n: farms.length }) : null].filter(Boolean).join(' · ')}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => router.navigate('/profile')} hitSlop={8}>
                <Text style={[st.sub, { color: C.primary, fontFamily: FONT.bodyBold }]}>Add your county for local alerts</Text>
              </TouchableOpacity>
            )}
          </View>
          <Press onPress={() => router.navigate('/profile')} accessibilityLabel={t('Profile')} style={[st.avatar, { backgroundColor: prefs.avatarTone }]}>
            {prefs.avatarCrop ? <CropIcon crop={prefs.avatarCrop} size={46} disc={false} /> : <Text raw style={st.avatarTxt}>{initials}</Text>}
          </Press>
        </View>

        {offline ? (
          <View style={st.note}>
            <Dot color={C.warn} />
            <Text style={st.noteTxt}>Offline. Scanning still works; your fields load when you reconnect.</Text>
          </View>
        ) : null}

        {/* Weather */}
        <View style={st.panel}>
          {weather && cond ? (
            <>
              <View style={st.wxTop}>
                <Icon name={cond.icon as IconName} size={40} color={C.text} />
                <View style={{ flex: 1 }}>
                  <Text raw style={st.temp}>
                    {Math.round(weather.temp)}°
                  </Text>
                  <Text raw style={st.sub}>
                    {`${t(cond.label)} · ${t(weather.place)}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={st.metric}>{t('Humidity {n}%', { n: Math.round(weather.humidity) })}</Text>
                  <Text style={st.metric}>{t('Wind {n} km/h', { n: Math.round(weather.wind) })}</Text>
                </View>
              </View>

              <View style={st.days}>
                {weather.days.map((d, i) => {
                  const on = i === day;
                  return (
                    <TouchableOpacity
                      key={d.date}
                      style={[st.day, on && st.dayOn]}
                      onPress={() => {
                        tick('select');
                        setDay(i);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text raw style={[st.dayName, on && { color: C.primaryDark, fontFamily: FONT.bodyBold }]} numberOfLines={1}>
                        {dayName(d.date, i)}
                      </Text>
                      <Icon name={describeCode(d.code).icon as IconName} size={20} color={C.textMid} />
                      <Text raw style={st.dayT}>
                        {Math.round(d.tMax)}°
                      </Text>
                      <Text raw style={st.dayRain}>
                        {d.rainChance != null ? `${d.rainChance}%` : `${d.rainMm.toFixed(0)} mm`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {spray?.hours ? (
                <View style={{ marginTop: 16, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={st.metric}>Spray window</Text>
                    <Text raw style={[st.metric, { color: spray.window ? C.primaryDark : C.textSub, fontFamily: FONT.bodyBold }]}>
                      {spray.window ?? t('None')}
                    </Text>
                  </View>
                  <View style={st.hours}>
                    {spray.hours.map((ok, k) => (
                      <View key={k} style={[st.hour, { backgroundColor: ok ? C.primary : C.sunken }]} />
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text raw style={st.tickLbl}>06:00</Text>
                    <Text raw style={st.tickLbl}>12:00</Text>
                    <Text raw style={st.tickLbl}>18:00</Text>
                  </View>
                  {!spray.window ? <Text style={st.small}>{spray.reason}</Text> : null}
                </View>
              ) : null}

              {usingFallback ? (
                <TouchableOpacity onPress={() => loadWeather(farms, true)} style={{ marginTop: 12 }} hitSlop={8}>
                  <Text style={st.link}>Use my location for the forecast</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : wxTried ? (
            <TouchableOpacity onPress={() => loadWeather(farms, true)}>
              <Text style={st.link}>Allow location to see the forecast for your farm</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 120, justifyContent: 'center' }}>
              <Text style={st.small}>Loading the forecast…</Text>
            </View>
          )}
        </View>

        {/* Risk lines: one quiet row each, detail on tap */}
        {blight && blight.level !== 'Low' ? (
          <Press style={st.row} onPress={() => setBlightOpen(true)} accessibilityRole="button">
            <Dot color={blight.level === 'High' ? C.error : C.warn} />
            <Text style={st.rowTxt}>{blight.level === 'High' ? 'Late blight risk is high for potatoes and tomatoes' : 'Some late blight risk for potatoes and tomatoes'}</Text>
            <Icon name="chevron-right" size={20} color={C.textLight} />
          </Press>
        ) : null}
        {top ? (
          <Press style={st.row} onPress={() => router.push('/outbreaks')} accessibilityRole="button">
            <Dot color={C.error} />
            <Text style={st.rowTxt}>
              {t('{disease} on {crop} near you · {n} farmers', {
                disease: getDiseaseL(top.class_label)?.disease ?? top.disease,
                crop: cropName(top.crop),
                n: top.farmers,
              })}
            </Text>
            <Icon name="chevron-right" size={20} color={C.textLight} />
          </Press>
        ) : null}

        {/* Scan */}
        <Press style={st.scan} onPress={() => router.navigate('/scan')} accessibilityRole="button" accessibilityLabel={t('Scan a leaf')}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.scanTitle}>Scan a leaf</Text>
            <Text raw style={st.scanSub}>
              {[t('{n} diseases', { n: SCANNABLE_DISEASES }), t('{n} crops', { n: DETECTABLE_CROPS.length }), t('works offline')].join(' · ')}
            </Text>
          </View>
          <View style={st.scanIcon}>
            <Icon name="line-scan" size={30} color={C.gold} />
          </View>
        </Press>

        {/* Fields */}
        <View style={st.section}>
          <SectionLabel action={farms.length ? 'Map' : undefined} onAction={() => router.push('/farm-map')}>
            Your fields
          </SectionLabel>
        </View>
        {farms.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {farms.map((f) => {
              const stage = currentStage(f, lang);
              const cal = calendarFor(f.crop);
              const end = cal ? cal.tasks[cal.tasks.length - 1].start : 0;
              const d = f.planting_date ? daysSince(f.planting_date) : null;
              const last = latestByFarm.get(f.id);
              const status = last
                ? last.uncertain
                  ? { c: C.warn, txt: t('Unclear scan, {when}', { when: timeAgo(last.created_at) }) }
                  : last.disease === 'Healthy'
                  ? { c: C.primary, txt: t('Healthy, {when}', { when: timeAgo(last.created_at) }) }
                  : { c: C.error, txt: `${diseaseName(last)}, ${timeAgo(last.created_at)}` }
                : null;
              return (
                <Press key={f.id} style={st.field} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })}>
                  <CropIcon crop={f.crop} size={44} />
                  <View style={{ gap: 2 }}>
                    <Text raw style={st.fieldName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text raw style={st.small} numberOfLines={1}>
                      {[f.crop ? cropName(f.crop) : null, f.size_acres ? fmtArea(Number(f.size_acres), prefs.units) : null].filter(Boolean).join(' · ') || t('Field')}
                    </Text>
                  </View>
                  {stage && d != null && end ? (
                    <View style={{ gap: 6 }}>
                      <ProgressBar value={d / end} />
                      <Text raw style={st.small} numberOfLines={2}>
                        {t('Week {n} of {total}', { n: stage.week, total: Math.ceil(end / 7) })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[st.small, { color: C.primary }]}>Add planting date</Text>
                  )}
                  {status ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Dot color={status.c} size={7} />
                      <Text raw style={st.small} numberOfLines={1}>
                        {status.txt}
                      </Text>
                    </View>
                  ) : null}
                  {sat[f.id] && sat[f.id].baseline_n >= 3 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="satellite-variant" size={13} color={STRESS.has(sat[f.id].dominant_class) && sat[f.id].quality !== 'limited' ? C.error : C.textSub} />
                      <Text raw style={st.small} numberOfLines={1}>
                        {t(classMeta(sat[f.id].dominant_class).short)}, {timeAgo(sat[f.id].observed_at)}
                      </Text>
                    </View>
                  ) : null}
                </Press>
              );
            })}
            <Press style={[st.field, st.addField]} onPress={() => router.push('/add-farm')} accessibilityLabel={t('Add a field')}>
              <Icon name="plus" size={28} color={C.primary} />
              <Text style={[st.small, { color: C.primary, fontFamily: FONT.bodyBold }]}>Add a field</Text>
            </Press>
          </ScrollView>
        ) : !loaded ? (
          <View style={[st.panel, { height: 150 }]} />
        ) : (
          <View style={[st.panel, { alignItems: 'center', gap: 10 }]}>
            <CropIcon crop="Crop" size={64} />
            <Text style={st.emptyTitle}>Add your first field</Text>
            <Text style={[st.small, { textAlign: 'center' }]}>Draw it on the map or type its size. Tassel then plans the season for you.</Text>
            <Btn label="Add a field" icon="plus" onPress={() => router.push('/add-farm')} style={{ alignSelf: 'stretch', marginTop: 4 }} />
          </View>
        )}

        {/* This week */}
        <View style={st.section}>
          <SectionLabel action="Calendar" onAction={() => router.push('/calendar')}>
            This week
          </SectionLabel>
        </View>
        <View style={[st.panel, { marginTop: 0, paddingVertical: 4 }]}>
          {tasks.length ? (
            tasks.map((x) => (
              <View key={x.key} style={st.task}>
                <TouchableOpacity onPress={() => toggleTask(x)} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: x.ticked }}>
                  <Icon name={x.ticked ? 'check-circle' : 'circle-outline'} size={28} color={x.ticked ? C.primary : C.textLight} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: x.farmId } })}>
                  <Text raw style={[st.taskTitle, x.ticked && st.taskDone]}>
                    {x.title}
                  </Text>
                  <Text raw style={st.small}>
                    {`${x.farmName} · ${
                      x.status === 'now' || x.ticked ? t('now') : x.startDate.toLocaleDateString(locale(lang), { weekday: 'long' })
                    }`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[st.small, { paddingVertical: 12 }]}>
              {farms.length ? (farms.some((f) => f.planting_date) ? 'Nothing due this week.' : 'Add a planting date to a field to get its tasks here.') : 'Your tasks appear here once you add a field.'}
            </Text>
          )}
        </View>

        {/* Tools */}
        <View style={st.tools}>
          {TOOLS.map((a) => (
            <Press key={a.label} style={st.tool} onPress={() => router.push(a.href as never)} accessibilityLabel={t(a.label)}>
              <View style={st.toolIcon}>
                <Icon name={a.icon} size={26} color={C.text} />
              </View>
              <Text style={st.toolTxt} numberOfLines={1}>
                {a.label}
              </Text>
            </Press>
          ))}
        </View>

        {/* Recent scans */}
        {incidents.length ? (
          <>
            <View style={st.section}>
              <SectionLabel>Recent scans</SectionLabel>
            </View>
            <View style={[st.panel, { marginTop: 0, paddingVertical: 4 }]}>
              {incidents.slice(0, 3).map((i) => (
                <TouchableOpacity
                  key={i.id}
                  style={st.task}
                  onPress={() => router.push({ pathname: '/result', params: { label: i.class_label, confidence: String(i.confidence), incidentId: i.id } })}
                >
                  <CropIcon crop={i.crop} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.taskTitle} numberOfLines={1}>
                      {diseaseName(i) === 'Healthy' ? t('Healthy {crop}', { crop: cropName(i.crop).toLowerCase() }) : diseaseName(i)}
                    </Text>
                    <Text raw style={st.small}>
                      {`${cropName(i.crop)} · ${Math.round(i.confidence * 100)}% · ${timeAgo(i.created_at)}`}
                    </Text>
                  </View>
                  <Dot color={i.uncertain ? C.warn : i.disease === 'Healthy' ? C.primary : C.error} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <StatusShade />

      <Sheet visible={blightOpen} onClose={() => setBlightOpen(false)} title={blight?.level === 'High' ? 'High late blight risk' : 'Medium late blight risk'}>
        <View style={{ gap: 14 }}>
          <Text style={st.sheetTxt}>
            {blight?.level === 'High'
              ? 'The next days are warm and humid enough for late blight to spread fast on potatoes and tomatoes.'
              : 'At least one warm, humid day is coming. Late blight could start on potatoes and tomatoes.'}
          </Text>
          {blight?.days.length ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {blight.days.map((d) => (
                <View key={d} style={st.pill}>
                  <Text raw style={st.pillTxt}>
                    {new Date(d + 'T12:00:00').toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <Text style={st.sheetHead}>What to do</Text>
            <Text style={st.sheetTxt}>Walk your potato and tomato rows and look for dark, water-soaked patches on leaves.</Text>
            <Text style={st.sheetTxt}>If you plan to spray a protectant, do it before the wet days, in a spray window.</Text>
          </View>
          {blightCrops.length ? (
            <Text raw style={st.small}>
              {t('Your fields at risk: {list}', { list: blightCrops.map((f) => f.name).join(', ') })}
            </Text>
          ) : null}
          <Text style={st.small}>Based on the Hutton criteria: two days in a row with a minimum of 10 °C and at least 6 hours of humidity above 90%.</Text>
          <Btn
            label="Read about late blight"
            kind="secondary"
            icon="book-open-variant"
            onPress={() => {
              setBlightOpen(false);
              router.push('/encyclopedia');
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 8 },
  date: { fontSize: 15, color: C.textSub },
  hello: { fontSize: 32, lineHeight: 38, fontFamily: FONT.display, color: C.text, marginTop: 2 },
  sub: { fontSize: 15, color: C.textSub, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  avatarTxt: { fontSize: 18, fontFamily: FONT.display, color: C.primaryDark },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 6 },
  noteTxt: { flex: 1, fontSize: 14, color: C.textSub },
  panel: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  wxTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  temp: { fontSize: 44, lineHeight: 48, fontFamily: FONT.displaySemi, color: C.text },
  metric: { fontSize: 14, color: C.textSub },
  days: { flexDirection: 'row', gap: 4, marginTop: 14 },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 12 },
  dayOn: { backgroundColor: C.primaryTint },
  dayName: { fontSize: 13, color: C.textSub },
  dayT: { fontSize: 15, color: C.text, fontFamily: FONT.bodyBold },
  dayRain: { fontSize: 13, color: C.textSub },
  hours: { flexDirection: 'row', gap: 3, height: 12 },
  hour: { flex: 1, borderRadius: 3 },
  tickLbl: { fontSize: 13, color: C.textLight },
  small: { fontSize: 14, color: C.textSub, lineHeight: 19 },
  link: { color: C.primary, fontFamily: FONT.bodyBold, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 16, marginTop: 10 },
  rowTxt: { flex: 1, fontSize: 15, color: C.text, lineHeight: 20 },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.primaryDark, borderRadius: 20, padding: 20, marginHorizontal: 16, marginTop: 14 },
  scanTitle: { fontSize: 26, lineHeight: 30, fontFamily: FONT.display, color: '#F4F2EC' },
  scanSub: { fontSize: 14, color: '#C9D8CF' },
  scanIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  section: { marginHorizontal: 20, marginTop: 30 },
  field: { width: 172, backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 12 },
  addField: { alignItems: 'center', justifyContent: 'center', width: 120, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
  fieldName: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  emptyTitle: { fontSize: 22, fontFamily: FONT.display, color: C.text },
  task: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  taskTitle: { fontSize: 16, color: C.text, lineHeight: 21 },
  taskDone: { color: C.textLight, textDecorationLine: 'line-through' },
  tools: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, marginTop: 28, rowGap: 18 },
  tool: { width: '25%', alignItems: 'center', gap: 8 },
  toolIcon: { width: 58, height: 58, borderRadius: 16, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  toolTxt: { fontSize: 13, color: C.text },
  sheetHead: { fontSize: 18, fontFamily: FONT.bodyBold, color: C.text },
  sheetTxt: { fontSize: 16, color: C.textMid, lineHeight: 23 },
  pill: { backgroundColor: C.errorTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillTxt: { fontSize: 14, color: C.error, fontFamily: FONT.bodyBold },
});
