// Home — the v1.0 "My Farm" dashboard rebuilt on real data:
// weather from Open-Meteo, a weather-based blight risk (Hutton criteria),
// spray days, outbreak alerts from other farmers' scans in the same county,
// this week's crop-calendar tasks, fields and scan history from Supabase.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Icon, SectionLabel, Text, timeAgo, type IconName } from '../../components/ui';
import { getProfile, listFarms, listIncidents, listOutbreaks, type Farm, type Incident, type Outbreak, type Profile } from '../../lib/data';
import { DETECTABLE_CROPS, cropName, getDiseaseL } from '../../lib/diseases';
import { getPosition } from '../../lib/geo';
import { describeCode, getWeather, type Weather } from '../../lib/weather';
import { loadCached, saveCached } from '../../lib/store';
import { currentStage, fieldTasks, loadTicks, type FieldTask } from '../../lib/calendar';
import { alertOnce } from '../../lib/notify';
import { locale, setLang, useLang } from '../../lib/i18n';
import { C, SHADOW } from '../../lib/theme';

const NAIROBI = { lat: -1.2864, lng: 36.8172 };
const FALLBACK_PLACE = 'Nairobi (location off)';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const ACTIONS: { label: string; icon: IconName; href: string; color: string; bg: string }[] = [
  { label: 'Farm map', icon: 'map-outline', href: '/farm-map', color: C.primary, bg: C.primaryTint },
  { label: 'Crop calendar', icon: 'calendar-check-outline', href: '/calendar', color: C.accentDark, bg: C.accentTint },
  { label: 'Market', icon: 'chart-line', href: '/market', color: C.info, bg: C.infoTint },
  { label: 'Outbreaks', icon: 'alert-decagram-outline', href: '/outbreaks', color: C.error, bg: C.errorTint },
  { label: 'Library', icon: 'bookshelf', href: '/encyclopedia', color: '#5B4BA0', bg: '#E7E3F4' },
  { label: 'AI advisor', icon: 'robot-outline', href: '/chat', color: C.text, bg: '#E4EAE7' },
];

const SPRAY_COLOR = { Good: C.primary, Fair: C.accent, Poor: C.error } as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [weather, setWeather] = useState<(Weather & { place: string }) | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const usingFallback = weather?.place === FALLBACK_PLACE;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      { iterations: 4 } // a few pulses to draw the eye, then stop (saves battery)
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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

  const loadOutbreaks = useCallback(async (county: string | null) => {
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
  }, [t]);

  const loadTasks = useCallback(async (fieldList: Farm[]) => {
    const all: FieldTask[] = [];
    for (const f of fieldList) {
      if (!f.planting_date) continue;
      all.push(...fieldTasks(f, await loadTicks(f.id)));
    }
    setTasks(all.filter((x) => x.status === 'now' || x.status === 'soon').sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
  }, []);

  const load = useCallback(async () => {
    try {
      const [p, f, i] = await Promise.all([getProfile(), listFarms(), listIncidents({ limit: 30 })]);
      setProfile(p);
      setFarms(f);
      setIncidents(i);
      setOffline(false);
      loadWeather(f);
      loadTasks(f);
      loadOutbreaks(p.county);
    } catch {
      setOffline(true);
      loadWeather([]);
    }
  }, [loadWeather, loadTasks, loadOutbreaks]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Recompute task titles when the language changes
  useEffect(() => {
    loadTasks(farms);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const diseaseName = (i: Incident) => getDiseaseL(i.class_label)?.disease ?? i.disease;
  const latestByFarm = new Map<string, Incident>();
  incidents.forEach((i) => {
    if (i.farm_id && !latestByFarm.has(i.farm_id)) latestByFarm.set(i.farm_id, i);
  });
  const fieldStatus = (f: Farm) => {
    const last = latestByFarm.get(f.id);
    if (!last) return { text: t('Not scanned yet'), color: C.textSub, icon: 'help-circle-outline' as IconName };
    if (last.uncertain) return { text: `${t('Unclear scan')}, ${timeAgo(last.created_at)}`, color: C.accent, icon: 'alert-outline' as IconName };
    if (last.disease === 'Healthy') return { text: `${t('Healthy')}, ${timeAgo(last.created_at)}`, color: C.primary, icon: 'check-circle-outline' as IconName };
    return { text: `${diseaseName(last)}, ${timeAgo(last.created_at)}`, color: C.error, icon: 'alert-circle-outline' as IconName };
  };
  const scanned = farms.filter((f) => latestByFarm.has(f.id));
  const healthyCount = scanned.filter((f) => latestByFarm.get(f.id)!.disease === 'Healthy' && !latestByFarm.get(f.id)!.uncertain).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const recentDisease = incidents.filter((i) => !i.uncertain && i.disease !== 'Healthy' && new Date(i.created_at).getTime() > weekAgo);

  const name = profile?.name?.split(' ')[0] || t('Farmer');
  const initials = (profile?.name || 'F').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const blight = weather?.blight;
  const cond = weather ? describeCode(weather.code) : null;
  const spray = weather?.spray ?? [];
  const fieldsWithoutDate = farms.filter((f) => !f.planting_date);
  const dayName = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(locale(lang), { weekday: 'short' });
  const top = outbreaks[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.greet}>{`${t(greeting())},`}</Text>
          <Text style={st.name} raw>
            {name} 👋
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Icon name="map-marker" size={14} color={C.primary} />
            <Text style={st.county}>{profile?.county ? t('{county} County', { county: profile.county }) : t('Set your county in Profile')}</Text>
          </View>
        </View>
        <TouchableOpacity style={st.langPill} onPress={() => setLang(lang === 'en' ? 'sw' : 'en')} accessibilityLabel={t('Change language')}>
          <Text raw style={[st.langTxt, lang === 'en' && st.langOn]}>EN</Text>
          <Text raw style={[st.langTxt, lang === 'sw' && st.langOn]}>SW</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.avatar} onPress={() => router.navigate('/profile')}>
          <Text raw style={st.avatarTxt}>
            {initials}
          </Text>
        </TouchableOpacity>
      </View>

      {offline ? (
        <View style={[st.banner, { backgroundColor: C.accentTint }]}>
          <Icon name="wifi-off" size={18} color={C.warn} />
          <Text style={[st.bannerTxt, { color: C.warn }]}>Offline — scanning still works. Fields and history will load when you reconnect.</Text>
        </View>
      ) : null}

      {/* Outbreak alert from other farmers' scans */}
      {top ? (
        <TouchableOpacity style={[st.banner, { backgroundColor: C.errorTint }]} onPress={() => router.push('/outbreaks')}>
          <Icon name="alert-decagram" size={22} color={C.error} />
          <View style={{ flex: 1 }}>
            <Text style={[st.bannerTitle, { color: C.error }]}>{t('Outbreak alert: {county}', { county: top.county })}</Text>
            <Text style={st.bannerTxt}>
              {t('{disease} on {crop} reported by {n} farmers in the last 14 days.', {
                disease: getDiseaseL(top.class_label)?.disease ?? top.disease,
                crop: cropName(top.crop),
                n: top.farmers,
              })}
              {outbreaks.length > 1 ? ` ${t('+{n} more', { n: outbreaks.length - 1 })}` : ''}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={C.error} />
        </TouchableOpacity>
      ) : null}

      {/* Weather-based alert */}
      {blight && blight.level !== 'Low' ? (
        <TouchableOpacity style={[st.banner, { backgroundColor: blight.level === 'High' ? C.errorTint : C.warnTint }]} onPress={() => router.push('/encyclopedia')}>
          <Icon name="weather-pouring" size={20} color={blight.level === 'High' ? C.error : C.warn} />
          <View style={{ flex: 1 }}>
            <Text style={[st.bannerTitle, { color: blight.level === 'High' ? C.error : C.warn }]}>{t(`${blight.level} late blight risk`)}</Text>
            <Text style={st.bannerTxt}>{blight.reason}</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      {recentDisease.length ? (
        <View style={[st.banner, { backgroundColor: C.errorTint }]}>
          <Icon name="alert-circle-outline" size={20} color={C.error} />
          <Text style={[st.bannerTxt, { color: C.error }]}>
            {t('{n} disease detections in the last 7 days — latest: {what}.', {
              n: recentDisease.length,
              what: `${cropName(recentDisease[0].crop)} — ${diseaseName(recentDisease[0])}`,
            })}
          </Text>
        </View>
      ) : null}

      {/* Scan CTA */}
      <TouchableOpacity style={st.cta} activeOpacity={0.9} onPress={() => router.navigate('/scan')}>
        <View style={{ flex: 1 }}>
          <Text style={st.ctaTitle}>Check a sick leaf in seconds</Text>
          <View style={st.ctaChips}>
            {[t('38 conditions'), t('{n} crops', { n: DETECTABLE_CROPS.length }), t('Works offline')].map((x) => (
              <View key={x} style={st.ctaChip}>
                <Text raw style={st.ctaChipTxt}>
                  {x}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Animated.View style={[st.ctaIcon, { transform: [{ scale: pulse }] }]}>
          <Icon name="line-scan" size={34} color={C.accent} />
        </Animated.View>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={st.grid}>
        {ACTIONS.map((a) => (
          <TouchableOpacity key={a.label} style={st.action} onPress={() => router.push(a.href as never)}>
            <View style={[st.actionIcon, { backgroundColor: a.bg }]}>
              <Icon name={a.icon} size={24} color={a.color} />
            </View>
            <Text style={st.actionTxt}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* This week on the farm (crop calendar) */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel>This week on your farm</SectionLabel>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={st.link}>Calendar</Text>
          </TouchableOpacity>
        </View>
        {tasks.length ? (
          tasks.slice(0, 4).map((x) => (
            <TouchableOpacity key={x.key} style={st.task} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: x.farmId } })}>
              <View style={[st.taskIcon, { backgroundColor: x.status === 'now' ? C.primaryTint : C.accentTint }]}>
                <Icon name={x.task.icon} size={18} color={x.status === 'now' ? C.primary : C.warn} />
              </View>
              <View style={{ flex: 1 }}>
                <Text raw style={st.fieldName}>
                  {x.title}
                </Text>
                <Text raw style={st.small}>
                  {x.farmName}: {x.status === 'now' ? t('Do it now') : t('Starts {date}', { date: x.startDate.toLocaleDateString(locale(lang), { weekday: 'short', day: 'numeric', month: 'short' }) })}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : farms.length && fieldsWithoutDate.length ? (
          <TouchableOpacity style={st.addField} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: fieldsWithoutDate[0].id } })}>
            <Icon name="calendar-plus" size={22} color={C.primary} />
            <Text style={[st.link, { flex: 1 }]}>Add a planting date to a field to get its crop calendar and reminders</Text>
          </TouchableOpacity>
        ) : (
          <Text style={st.small}>{farms.length ? 'Nothing due this week.' : 'Add a field with its crop and planting date to get a week-by-week plan.'}</Text>
        )}
      </Card>

      {/* Weather */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel style={{ flex: 1, marginRight: 8 }}>{`${t('Weather')}: ${weather ? t(weather.place) : t('loading…')}`}</SectionLabel>
          {weather ? <Text style={st.small}>{t('Updated {when}', { when: timeAgo(weather.fetchedAt) })}</Text> : null}
        </View>
        {weather && cond ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Icon name={cond.icon as IconName} size={46} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text raw style={st.temp}>
                  {Math.round(weather.temp)}°C
                </Text>
                <Text style={st.cond}>{cond.label}</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={st.metric}>{`💧 ${t('{n}% humidity', { n: Math.round(weather.humidity) })}`}</Text>
                <Text style={st.metric}>{`🌬 ${t('{n} km/h wind', { n: Math.round(weather.wind) })}`}</Text>
              </View>
            </View>
            <View style={st.days}>
              {weather.days.map((d) => {
                const dc = describeCode(d.code);
                return (
                  <View key={d.date} style={st.day}>
                    <Text raw style={st.dayName}>
                      {dayName(d.date)}
                    </Text>
                    <Icon name={dc.icon as IconName} size={22} color={C.textMid} />
                    <Text raw style={st.dayT}>
                      {Math.round(d.tMax)}°/{Math.round(d.tMin)}°
                    </Text>
                    <Text raw style={st.dayRain}>
                      {d.rainChance != null ? `${d.rainChance}%` : `${d.rainMm.toFixed(0)}mm`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Spray days */}
            {spray.length ? (
              <View style={st.sprayBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="spray" size={16} color={C.textMid} />
                  <Text style={st.sprayTitle}>Good days to spray</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {spray.map((s) => (
                    <View key={s.date} style={[st.sprayDay, { borderColor: SPRAY_COLOR[s.level] }]}>
                      <Text raw style={st.dayName}>
                        {dayName(s.date)}
                      </Text>
                      <Text style={[st.sprayLevel, { color: SPRAY_COLOR[s.level] }]}>{s.level}</Text>
                      <Text raw style={st.sprayWin}>
                        {s.window ?? '—'}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={st.sprayNote}>{spray[0].level === 'Poor' ? spray[0].reason : 'Wind under 15 km/h, no rain for 6 hours, 10–30 °C. Always follow the product label.'}</Text>
              </View>
            ) : null}

            {blight ? (
              <View style={[st.riskRow, { backgroundColor: blight.level === 'Low' ? C.primaryTint : blight.level === 'Medium' ? C.warnTint : C.errorTint }]}>
                <Icon name="shield-alert-outline" size={16} color={blight.level === 'Low' ? C.primary : blight.level === 'Medium' ? C.warn : C.error} />
                <Text style={st.riskTxt}>{t('Late blight risk: {level} (Hutton criteria, forecast-based)', { level: t(blight.level) })}</Text>
              </View>
            ) : null}
            <Text style={st.source}>Forecast: Open-Meteo</Text>
            {usingFallback ? (
              <TouchableOpacity onPress={() => loadWeather(farms, true)} style={{ marginTop: 8 }}>
                <Text style={st.link}>Use my location for the forecast</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <TouchableOpacity onPress={() => loadWeather(farms, true)}>
            <Text style={st.link}>Allow location to see the forecast for your farm</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Field health from real scans */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel>My fields</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => router.push('/farm-map')}>
              <Text style={st.link}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/add-farm')}>
              <Text style={st.link}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {farms.length ? (
          <>
            <Text style={st.healthLine}>
              {scanned.length
                ? t('{healthy} of {n} scanned fields healthy at last scan', { healthy: healthyCount, n: scanned.length })
                : t('Scan a leaf and save it to a field to track its health.')}
            </Text>
            {farms.map((f) => {
              const s = fieldStatus(f);
              const stage = currentStage(f, lang);
              return (
                <TouchableOpacity key={f.id} style={st.field} onPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })}>
                  <View style={st.fieldIcon}>
                    <Icon name="sprout" size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.fieldName}>
                      {f.name}
                    </Text>
                    <Text raw style={st.small}>
                      {[f.crop ? cropName(f.crop) : null, f.size_acres ? t('{n} acres', { n: Number(f.size_acres).toFixed(2) }) : null, stage ? t('Week {n}', { n: stage.week }) : f.stage]
                        .filter(Boolean)
                        .join(', ') || t('Field')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Icon name={s.icon} size={13} color={s.color} />
                      <Text raw style={[st.small, { color: s.color, fontWeight: '700' }]}>
                        {s.text}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color={C.textLight} />
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <TouchableOpacity style={st.addField} onPress={() => router.push('/add-farm')}>
            <Icon name="plus-circle-outline" size={22} color={C.primary} />
            <Text style={st.link}>Add your first field (draw it on the map or type its size)</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Recent activity */}
      <Card>
        <SectionLabel>Recent scans</SectionLabel>
        {incidents.length ? (
          incidents.slice(0, 5).map((i) => (
            <TouchableOpacity
              key={i.id}
              style={st.activity}
              onPress={() => router.push({ pathname: '/result', params: { label: i.class_label, confidence: String(i.confidence), incidentId: i.id } })}
            >
              <Icon name={i.disease === 'Healthy' ? 'leaf' : 'leaf-off'} size={20} color={i.uncertain ? C.accent : i.disease === 'Healthy' ? C.primary : C.error} />
              <View style={{ flex: 1 }}>
                <Text raw style={st.fieldName}>
                  {cropName(i.crop)} — {diseaseName(i)}
                </Text>
                <Text raw style={st.small}>
                  {Math.round(i.confidence * 100)}%, {timeAgo(i.created_at)}
                  {i.farm_id ? `, ${farms.find((f) => f.id === i.farm_id)?.name ?? ''}` : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={C.textLight} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={st.small}>No saved scans yet. After scanning, tap "Save to my farm".</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.bg },
  greet: { fontSize: 14, color: C.textSub, fontWeight: '600' },
  name: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  county: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  langPill: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, borderWidth: 1, borderColor: C.border, padding: 3 },
  langTxt: { fontSize: 12, fontWeight: '800', color: C.textSub, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  langOn: { backgroundColor: C.primary, color: '#fff' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryTint, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: C.primary },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 14 },
  bannerTitle: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  bannerTxt: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, marginHorizontal: 16, marginTop: 12, borderRadius: 24, padding: 20 },
  ctaKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  ctaTitle: { color: C.text, fontSize: 26, fontWeight: '700', lineHeight: 28, marginRight: 8 },
  ctaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  ctaChip: { backgroundColor: 'rgba(15,42,36,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  ctaChipTxt: { color: C.text, fontSize: 13, fontWeight: '700' },
  ctaIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: C.text, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 10, marginTop: 8 },
  action: { width: '33.33%', alignItems: 'center', paddingVertical: 10, gap: 6 },
  actionIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionTxt: { fontSize: 12, fontWeight: '700', color: C.textMid, textAlign: 'center' },
  small: { fontSize: 12, color: C.textSub },
  temp: { fontSize: 34, fontWeight: '900', color: C.text },
  cond: { fontSize: 14, color: C.textMid, fontWeight: '600' },
  metric: { fontSize: 12, color: C.textMid, fontWeight: '600' },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  day: { alignItems: 'center', gap: 3, flex: 1 },
  dayName: { fontSize: 12, fontWeight: '800', color: C.textSub },
  dayT: { fontSize: 12, fontWeight: '700', color: C.text },
  dayRain: { fontSize: 11, color: C.info, fontWeight: '700' },
  sprayBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  sprayTitle: { fontSize: 13, fontWeight: '800', color: C.textMid },
  sprayDay: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, gap: 2 },
  sprayLevel: { fontSize: 12, fontWeight: '900' },
  sprayWin: { fontSize: 9, color: C.textSub, fontWeight: '700' },
  sprayNote: { fontSize: 11, color: C.textSub, marginTop: 8, lineHeight: 16 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 10 },
  riskTxt: { flex: 1, fontSize: 12, fontWeight: '700', color: C.textMid },
  source: { fontSize: 10, color: C.textLight, marginTop: 8 },
  link: { color: C.primary, fontWeight: '800', fontSize: 14 },
  healthLine: { fontSize: 13, color: C.textMid, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  fieldIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryTint, justifyContent: 'center', alignItems: 'center' },
  fieldName: { fontSize: 15, fontWeight: '800', color: C.text },
  addField: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border },
  taskIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
