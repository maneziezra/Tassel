// Crop health from space — one field's Sentinel-2 dashboard.
//
// Farmer view: one plain reading (what, where, what to do), the field drawn as
// 10 m satellite squares, how it changed over time, which part to inspect, and
// a quick "what did you find?" check that becomes the ground truth that
// calibrates the thresholds. Technical view adds the numbers behind it.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Btn, Card, Chip, Dot, ErrorNote, Header, Icon, Loading, ProgressBar, SectionLabel, Segmented, Sheet, StatusShade, Text, tick } from '../../components/ui';
import { getFarm, type Farm } from '../../lib/data';
import { locale, useLang } from '../../lib/i18n';
import { openScanner } from '../../lib/navigation';
import { mix, ndviColor } from '../../lib/fieldArt';
import { C, FONT, RADIUS } from '../../lib/theme';
import {
  CLASSES, QUALITY_META, RESOLUTION, STRESS, classMeta, getGrid, interpret, listObservations, listValidations, listZones, refreshSatellite,
  saveValidation, satelliteReady, setOutcome, toCsv, toGeoJson, toUtm, zoneName,
  type Condition, type Grid, type Observation, type ProductId, type ResolutionMeta, type Validation, type ZoneStat,
} from '../../lib/satellite';

type Layer = 'mask' | 'ndvi' | 'ndwi_crop' | 'ndwi_water';

/** Which product each map layer shows, on which grid. */
const LAYER: Record<Layer, { product: ProductId; grid: 10 | 20 }> = {
  mask: { product: 'JOINT_MASK', grid: 20 },
  ndvi: { product: 'NDVI', grid: 10 },
  ndwi_crop: { product: 'NDWI_CROP', grid: 20 },
  ndwi_water: { product: 'NDWI_WATER', grid: 10 },
};
type View_ = 'farmer' | 'technical';

/** Farmer-view layer names. The resolution is always shown next to them (resolution rule). */
const PLAIN: Record<Layer, string> = { mask: 'Where to look', ndvi: 'Green cover', ndwi_crop: 'Leaf water', ndwi_water: 'Open water' };
const PLAIN_CAPTION: Record<Layer, string> = {
  mask: 'Coloured squares show where the crop looks different from its own normal. Each square is 20 × 20 m.',
  ndvi: 'Greener squares mean more growing leaves. Each square is 10 × 10 m.',
  ndwi_crop: 'Bluer squares mean more water in the leaves. Each square is 20 × 20 m.',
  ndwi_water: 'Shows standing water or flooding. Each square is 10 × 10 m.',
};

const lastAuto: Record<string, number> = {}; // farm id → time of the last automatic check this session

const TONE = {
  normal: { color: C.primary, icon: 'check-circle-outline' as const },
  watch: { color: C.warn, icon: 'eye-outline' as const },
  act: { color: C.error, icon: 'alert-circle-outline' as const },
  none: { color: C.textSub, icon: 'satellite-variant' as const },
};

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'healthy', label: 'Looks healthy' },
  { value: 'wilting_dry', label: 'Wilting or dry' },
  { value: 'yellowing', label: 'Yellow leaves' },
  { value: 'pests', label: 'Pests' },
  { value: 'disease', label: 'Disease spots' },
  { value: 'waterlogged', label: 'Waterlogged' },
  { value: 'weeds', label: 'Weeds' },
  { value: 'damaged', label: 'Animals, hail or wind' },
  { value: 'harvested', label: 'Harvested' },
  { value: 'bare', label: 'Bare soil' },
  { value: 'other', label: 'Something else' },
];

// colour ramps for the index layers (NDVI ramp shared with the Home hero: lib/fieldArt.ts)
const waterColor = (v: number) => (v < 0 ? mix('#EFE6D2', '#C9D9E2', (v + 0.6) / 0.6) : mix('#7FB0CF', '#1E4F73', v / 0.4));
const ndwiColor = (v: number) => (v < 0.1 ? mix('#EFE6D2', '#A9C3CF', (v + 0.25) / 0.35) : mix('#A9C3CF', '#24587C', (v - 0.1) / 0.3));

const CROP_CLASSES = new Set([2, 3, 4, 5, 6, 8]);
const zoneTitle = (z: string | null) => zoneName(z).replace(/^the /, '').replace(/^./, (c) => c.toUpperCase());

const fmt = (v: number | null | undefined, d = 2) => {
  if (v === null || v === undefined) return '—';
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
};
const signed = (v: number | null | undefined, d = 2) => {
  if (v === null || v === undefined) return '—';
  const r = Number(v.toFixed(d));
  return (r < 0 ? '−' : r > 0 ? '+' : '±') + Math.abs(r).toFixed(d);
};

export default function SatelliteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const [farm, setFarm] = useState<Farm | null | undefined>(undefined);
  const [obs, setObs] = useState<Observation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<Observation | null>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [zones, setZones] = useState<ZoneStat[]>([]);
  const [latestZones, setLatestZones] = useState<ZoneStat[]>([]);
  const [checks, setChecks] = useState<Validation[]>([]);
  const [layer, setLayer] = useState<Layer>('mask');
  const [view, setView] = useState<View_>('farmer');
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [inspect, setInspect] = useState<{ zone: string | null; cls: number | null } | null>(null);
  const [cell, setCell] = useState<number | null>(null);

  const usable = useMemo(() => obs.filter((o) => o.quality !== 'unusable'), [obs]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [f, o, v] = await Promise.all([getFarm(id), listObservations(id), listValidations(id)]);
      setFarm(f);
      setObs(o);
      setChecks(v);
      const latest = [...o].reverse().find((x) => x.quality !== 'unusable' && !x.suspect) ?? null;
      setSel((cur) => (cur && o.some((x) => x.id === cur.id) ? o.find((x) => x.id === cur.id)! : latest));
      setLatestZones(latest ? await listZones(latest.id) : []);
      return o;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load satellite results.'));
      return null;
    } finally {
      setLoaded(true);
    }
  }, [id, t]);

  const check = useCallback(async (auto = false) => {
    if (busy) return;
    setBusy({ done: 0, total: 0 });
    setError(null);
    try {
      const r = await refreshSatellite(id, setBusy);
      setWarning(r.warning ? t(r.warning) : null);
      lastAuto[id] = Date.now();
      await load();
      if (!auto) tick('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('The satellite check is not available right now. Try again later.'));
    } finally {
      setBusy(null);
    }
  }, [busy, id, load, t]);

  useFocusEffect(
    useCallback(() => {
      load().then((o) => {
        if (!o || !satelliteReady()) return;
        const last = o.length ? Date.parse(o[o.length - 1].observed_at) : 0;
        const recent = lastAuto[id] && Date.now() - lastAuto[id] < 30 * 60000;
        const outdated = o.some((x) => x.method_version !== RESOLUTION.method_version);
        if (!recent && (outdated || Date.now() - last > 2 * 86400000)) check(true);
      });
    }, [load]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // load the map layer and zones for the chosen date
  useEffect(() => {
    let alive = true;
    setCell(null);
    if (!sel) {
      setGrid(null);
      setZones([]);
      return;
    }
    Promise.all([getGrid(sel.id), listZones(sel.id)]).then(([g, z]) => {
      if (!alive) return;
      setGrid(g);
      setZones(z);
    });
    return () => {
      alive = false;
    };
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reading = useMemo(() => interpret(obs, latestZones, farm?.crop ?? null, farm?.planting_date), [obs, latestZones, farm]);
  const due = checks.filter((c) => c.follow_up_due && !c.outcome && c.follow_up_due <= new Date().toISOString().slice(0, 10));
  const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });
  const ago = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86400000));

  const share = async (kind: 'csv' | 'geojson') => {
    if (!farm) return;
    try {
      if (kind === 'csv') {
        await Share.share({ title: `${farm.name} — Sentinel-2`, message: toCsv(obs, farm.name) });
      } else if (grid && sel) {
        await Share.share({ title: `${farm.name} — ${sel.observed_at.slice(0, 10)}`, message: toGeoJson(grid, sel, farm.name) });
      }
    } catch {
      // cancelled
    }
  };

  if (farm === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Crop health from space" />
        <ErrorNote message={t('Field not found.')} />
      </View>
    );
  }

  const tone = TONE[reading.tone];
  // Honest gaps: newer passes than the last clear one were all clouded.
  const lastClear = reading.latest?.observed_at ?? null;
  const cloudGap = lastClear && obs.some((o) => o.observed_at > lastClear && o.quality === 'unusable') ? lastClear : null;
  const noBoundary = farm && (!farm.polygon || farm.polygon.length < 3);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header dark title="Crop health from space" subtitle={farm?.name ?? ''} />
      {!loaded || farm === undefined ? (
        <Loading />
      ) : !satelliteReady() ? (
        <Card>
          <Text style={st.h}>Satellite checks are not switched on yet</Text>
          <Text style={st.p}>The database update for satellite results (v2.3) has not been applied. Ask the Tassel admin to run it.</Text>
        </Card>
      ) : noBoundary ? (
        <Card>
          <Text style={st.h}>Map this field first</Text>
          <Text style={st.p}>The satellite needs the field's boundary to know which squares to read.</Text>
          <Btn label="Map this field" icon="vector-polygon" style={{ marginTop: 14 }} onPress={() => router.push({ pathname: '/farm-map', params: { farmId: farm!.id } })} />
        </Card>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          {error ? <ErrorNote message={error} onRetry={() => check()} /> : null}
          {warning ? <Text raw style={[st.note, { marginHorizontal: 20, marginTop: 8 }]}>{warning}</Text> : null}

          {/* 1. The reading (Editorial Dark Hero) */}
          <View style={{ backgroundColor: C.brandDark, borderRadius: 20, marginHorizontal: 16, marginTop: 14, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Icon name={tone.icon} size={28} color={reading.tone === 'normal' ? C.secondary : tone.color} />
                <Text raw style={[st.headline, { color: C.brandCream, flex: 1 }]}>{reading.headline}</Text>
              </View>
              {reading.latest ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Dot color={QUALITY_META[reading.latest.quality].color} size={8} />
                  <Text raw style={{ fontSize: 12, color: C.brandCream, fontFamily: FONT.bodyBold }}>
                    {t(QUALITY_META[reading.latest.quality].label)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text raw style={[st.body, { color: '#C9D8CF' }]}>
              {busy && !reading.lastImage ? t('Reading up to 90 days of Sentinel-2 images of this field. The first check takes about a minute.') : reading.body}
            </Text>

            {reading.action ? (
              <View style={[st.action, { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(226,179,60,0.3)', borderWidth: 1 }]}>
                <Text style={[st.actionLabel, { color: C.brandGold }]}>What to do</Text>
                <Text raw style={[st.actionTxt, { color: C.brandCream }]}>{reading.action}</Text>
              </View>
            ) : null}

            {cloudGap ? (
              <View style={[st.qualityRow, { marginTop: 2 }]}>
                <Icon name="weather-cloudy" size={14} color={C.brandGold} />
                <Text raw style={[st.qualityTxt, { color: C.brandCream }]}>{t('No clear picture since {date} — clouds', { date: dateLabel(cloudGap) })}</Text>
              </View>
            ) : null}
            {reading.latest ? (
              <View style={[st.qualityRow, { marginTop: 2 }]}>
                <Icon name="satellite-variant" size={14} color={C.brandGold} />
                <Text raw style={[st.qualityTxt, { color: '#8FC2A5' }]}>
                  Sentinel-2 · {dateLabel(reading.latest.observed_at)} · {ago(reading.latest.observed_at) === 0 ? t('today') : t('{n} days ago', { n: ago(reading.latest.observed_at) })}
                </Text>
              </View>
            ) : null}

            {busy ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text raw style={[st.note, { color: C.brandCream }]}>
                  {busy.total ? t('Reading satellite images: {a} of {b}', { a: busy.done, b: busy.total }) : t('Looking for new satellite images…')}
                </Text>
                <ProgressBar value={busy.total ? busy.done / busy.total : 0.05} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Check now" icon="satellite-variant" kind="secondary" style={{ flex: 1, minHeight: 46 }} onPress={() => check()} />
                {reading.zone || reading.tone === 'act' || reading.tone === 'watch' ? (
                  <Btn label="Scan a leaf in this zone" icon="line-scan" style={{ flex: 1, minHeight: 46 }} onPress={openScanner} />
                ) : null}
              </View>
            )}
          </View>

          {/* 2. The field, square by square */}
          {sel && grid && farm ? (
            <Card>
              <SectionLabel action={t('On the map')} onAction={() => router.push({ pathname: '/farm-map', params: { focus: farm.id, sat: String(sel.id) } })}>
                Your field
              </SectionLabel>
              <LayerPicker plain={view === 'farmer'} layer={layer} meta={grid.resolution} onChange={(l) => { setLayer(l); setCell(null); }} />
              <LayerCaption plain={view === 'farmer'} layer={layer} meta={grid.resolution} />
              <Animated.View key={`${sel.id}:${layer}`} entering={FadeIn.duration(320)}>
                <FieldMask grid={grid} farm={farm} layer={layer} selected={cell} onCell={setCell} />
              </Animated.View>
              <CellInfo grid={grid} layer={layer} cell={cell} />
              <Legend grid={grid} layer={layer} />
              <DateStrip obs={obs} sel={sel} onSel={(o) => { tick('select'); setSel(o); }} label={dateLabel} />
              {sel.quality === 'unusable' ? <Text style={st.note}>Clouds covered the field on this date. Grey squares are not readings.</Text> : null}
              {sel.suspect ? <Text style={st.note}>This date was probably hazy: it disagrees with the clear images either side of it.</Text> : null}
              {latestZones.length <= 1 ? <Text style={[st.note, { marginTop: 10 }]}>Small field: Tassel reads it as one zone.</Text> : null}
              {view === 'technical' ? <Text style={[st.note, { marginTop: 10 }]}>{t('Square size on screen follows each product: 10 m pixels for NDVI and open water, 20 m cells for crop water and the stress mask. B11 is never sharpened to 10 m.')}</Text> : null}
            </Card>
          ) : usable.length === 0 && !busy ? null : sel ? <Loading /> : null}

          <Segmented<View_> value={view} onChange={setView} style={{ marginHorizontal: 16, marginTop: 16 }}
            options={[{ value: 'farmer', label: 'Farmer view' }, { value: 'technical', label: 'Technical' }]} />

          {/* follow-ups that are due */}
          {due.map((c) => (
            <Card key={c.id}>
              <Text raw style={st.h}>{t('How is {zone} now?', { zone: zoneName(c.zone) })}</Text>
              <Text raw style={st.p}>{t('On {d} you found: {what}.', { d: dateLabel(c.observed_on), what: t(CONDITIONS.find((x) => x.value === c.observed_condition)?.label ?? 'Something else').toLowerCase() })}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {(['better', 'same', 'worse'] as const).map((o) => (
                  <Btn key={o} label={o === 'better' ? 'Better' : o === 'same' ? 'Same' : 'Worse'} kind="secondary" style={{ flex: 1, minHeight: 44 }}
                    onPress={() => setOutcome(c.id, o).then(load).catch((e) => Alert.alert(t('Could not save'), e.message))} />
                ))}
              </View>
            </Card>
          ))}


          {/* 3. Over time */}
          {usable.length >= 2 ? (
            <Card>
              <SectionLabel>Over time</SectionLabel>
              <Trend obs={obs} sel={sel} onSel={setSel} label={dateLabel} />
              <View style={st.keyRow}>
                <Key color={C.primary} label="NDVI · 20 m analysis" />
                <Key color="#2F6F99" label="Crop-water NDWI · 20 m" />
                <Key color={C.textLight} dashed label="This field's normal (20 m)" />
              </View>
            </Card>
          ) : null}

          {/* 4. Where to look */}
          {zones.length > 1 && sel && sel.quality !== 'unusable' ? (
            <Card>
              <SectionLabel>Where to look</SectionLabel>
              {[...zones].sort((a, b) => (b.water_stress_score ?? -1) - (a.water_stress_score ?? -1) || (b.stressed_fraction ?? 0) - (a.stressed_fraction ?? 0)).map((z) => {
                const m = classMeta(z.class_code);
                const flagged = STRESS.has(z.class_code);
                return (
                  <TouchableOpacity key={z.zone} style={st.zone} onPress={() => setInspect({ zone: z.zone, cls: z.class_code })} accessibilityRole="button">
                    <Dot color={m.color} size={12} />
                    <View style={{ flex: 1 }}>
                      <Text raw style={st.zoneName}>{zoneTitle(z.zone)}</Text>
                      <Text raw style={st.zoneSub}>{t(m.short)}{view === 'technical' ? ` · NDVI 20 m ${fmt(z.ndvi)} (${signed(z.ndvi_delta)}) · NDWI_CROP 20 m ${fmt(z.ndwi_crop)} (${signed(z.ndwi_delta)})` : ''}</Text>
                    </View>
                    {z.water_stress_score !== null && CROP_CLASSES.has(z.class_code) ? (
                      <View style={{ width: 64, gap: 4 }}>
                        <ProgressBar value={z.water_stress_score} color={z.water_stress_score >= 0.5 ? C.error : z.water_stress_score >= 0.25 ? '#D9A93A' : C.primary} />
                        <Text raw style={st.score}>{t('stress {n}', { n: Math.round(z.water_stress_score * 100) })}</Text>
                      </View>
                    ) : null}
                    <Icon name={flagged ? 'shoe-print' : 'chevron-right'} size={18} color={flagged ? C.error : C.textLight} />
                  </TouchableOpacity>
                );
              })}
              <Text style={st.note}>Tap a part of the field after you walk it, to say what you found.</Text>
            </Card>
          ) : null}

          {/* 5. Technical numbers */}
          {view === 'technical' && sel ? <Technical o={sel} /> : null}

          {/* 6. Field checks */}
          {checks.length ? (
            <Card>
              <SectionLabel>Your field checks</SectionLabel>
              {checks.slice(0, 6).map((c) => (
                <View key={c.id} style={st.checkRow}>
                  <Dot color={c.observed_condition === 'healthy' ? C.primary : C.warn} />
                  <Text raw style={st.checkTxt}>
                    {dateLabel(c.observed_on)} · {zoneName(c.zone)} · {t(CONDITIONS.find((x) => x.value === c.observed_condition)?.label ?? 'Something else')}
                    {c.outcome ? ` → ${t(c.outcome === 'better' ? 'Better' : c.outcome === 'same' ? 'Same' : 'Worse')}` : ''}
                  </Text>
                </View>
              ))}
              <Text style={st.note}>Your checks show how often the satellite was right. They are used to tune the thresholds and are never shared with your name.</Text>
            </Card>
          ) : null}

          {/* 7. Export and limits */}
          {obs.length ? (
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 }}>
              <Btn label="Share data (CSV)" icon="table-arrow-right" kind="ghost" style={{ flex: 1 }} onPress={() => share('csv')} />
              <Btn label="Share map (GeoJSON)" icon="map-marker-path" kind="ghost" style={{ flex: 1 }} onPress={() => share('geojson')} disabled={!grid} />
            </View>
          ) : null}
          <Text style={[st.note, { marginHorizontal: 20, marginTop: 16 }]}>
            Satellite readings show where to look. They do not diagnose a problem. Always confirm in the field, and ask your extension officer before acting on a large area.
          </Text>
          <Text style={[st.note, { marginHorizontal: 20, marginTop: 6, color: C.textLight }]}>Contains modified Copernicus Sentinel-2 data, processed by Tassel.</Text>
        </ScrollView>
      )}
      <InspectSheet
        target={inspect}
        onClose={() => setInspect(null)}
        onSave={async (v) => {
          if (!farm || !inspect) return;
          await saveValidation({ farm_id: farm.id, observation_id: sel?.id ?? reading.latest?.id ?? null, zone: inspect.zone, predicted_class: inspect.cls, ...v });
          setInspect(null);
          tick('success');
          await load();
          if (v.observed_condition === 'disease' || v.observed_condition === 'yellowing' || v.observed_condition === 'pests') {
            Alert.alert(t('Saved'), t('Scan a leaf now to find out what it is?'), [
              { text: t('Later'), style: 'cancel' },
              { text: t('Scan'), onPress: openScanner },
            ]);
          }
        }}
      />
      <StatusShade />
    </View>
  );
}

// ------------------------------------------------------------------ field mask

function LayerPicker({ layer, meta, onChange, plain }: { layer: Layer; meta: ResolutionMeta; onChange: (l: Layer) => void; plain: boolean }) {
  const { t } = useLang();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {(Object.keys(LAYER) as Layer[]).map((l) => {
        const p = meta.products[LAYER[l].product] ?? RESOLUTION.products[LAYER[l].product];
        return <Chip key={l} raw label={`${t(plain ? PLAIN[l] : p.label)} · ${p.effective_resolution_m} m`} active={layer === l} onPress={() => { tick('select'); onChange(l); }} />;
      })}
    </ScrollView>
  );
}

const CAPTION: Record<Layer, string> = {
  mask: 'Crop health × water stress from B4, B8, B11 and SCL. 20 m effective resolution, drawn as 20 m squares.',
  ndvi: 'Green cover from B4 and B8. Native 10 m pixels.',
  ndwi_crop: 'Leaf and canopy water from B8 and B11. B11 is natively 20 m, so this is a 20 m product, drawn as 20 m squares.',
  ndwi_water: 'Green–NIR index from B3 and B8 for open water and flooding only. Native 10 m pixels.',
};

function LayerCaption({ layer, meta, plain }: { layer: Layer; meta: ResolutionMeta; plain: boolean }) {
  const { t } = useLang();
  const p = meta.products[LAYER[layer].product] ?? RESOLUTION.products[LAYER[layer].product];
  if (plain) {
    return (
      <View style={st.caption}>
        <Text raw style={st.captionTxt}>{t(PLAIN_CAPTION[layer])}</Text>
      </View>
    );
  }
  return (
    <View style={st.caption}>
      <Text raw style={st.captionTitle}>{t(p.label)} · {t('{n} m effective resolution', { n: p.effective_resolution_m })}</Text>
      <Text raw style={st.captionTxt}>{t(CAPTION[layer])}</Text>
    </View>
  );
}

/** One layer, drawn on its own grid: 10 m pixels or 20 m cells, never resampled. */
function FieldMask({ grid, farm, layer, selected, onCell }: { grid: Grid; farm: Farm; layer: Layer; selected: number | null; onCell: (i: number | null) => void }) {
  const { width } = useWindowDimensions();
  const { t } = useLang();
  const is20 = LAYER[layer].grid === 20;
  const g = is20 ? grid.grid20 : grid.grid10;
  // frame: the field's extent plus 15 m, in UTM metres
  const ring = (farm.polygon ?? []).map(([la, lo]) => toUtm(la, lo, grid.epsg));
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const fx0 = Math.min(...xs) - 15, fx1 = Math.max(...xs) + 15, fy0 = Math.max(...ys) + 15, fy1 = Math.min(...ys) - 15;
  const k = Math.max(0.3, Math.min((width - 92) / (fx1 - fx0), 260 / (fy0 - fy1), 4)); // screen px per metre
  const W = (fx1 - fx0) * k, H = (fy0 - fy1) * k;
  const px = (x: number) => (x - fx0) * k, py = (y: number) => (fy0 - y) * k;
  const outline = ring.map(([x, y]) => `${px(x)},${py(y)}`).join(' ');
  const inField = (i: number) => (is20 ? grid.grid20.cls[i] !== 255 : grid.grid10.inside[i] === 1);
  const color = (i: number) => {
    if (layer === 'mask') return classMeta(grid.grid20.cls[i]).color;
    const v = layer === 'ndvi' ? grid.grid10.ndvi[i] : layer === 'ndwi_water' ? grid.grid10.ndwi_water[i] : grid.grid20.ndwi_crop[i];
    if (v === null) return CLASSES[0].color;
    return layer === 'ndvi' ? ndviColor(v / 1000) : layer === 'ndwi_water' ? waterColor(v / 1000) : ndwiColor(v / 1000);
  };
  const noData = (i: number) => (layer === 'mask' ? grid.grid20.cls[i] === 0
    : (layer === 'ndvi' ? grid.grid10.ndvi[i] : layer === 'ndwi_water' ? grid.grid10.ndwi_water[i] : grid.grid20.ndwi_crop[i]) === null);
  const rects = [];
  for (let r = 0; r < g.h; r++) {
    for (let c = 0; c < g.w; c++) {
      const i = r * g.w + c;
      if (!inField(i)) continue;
      const x = px(g.x0 + c * g.res), y = py(g.y0 - r * g.res), s = g.res * k;
      rects.push(
        <Rect key={i} x={x + 0.5} y={y + 0.5} width={s - 1} height={s - 1} rx={1.5}
          fill={color(i)} opacity={noData(i) ? 0.45 : 1} stroke={selected === i ? C.text : 'none'} strokeWidth={selected === i ? 2.5 : 0} />,
      );
    }
  }
  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <Pressable
        style={{ width: W + 28, height: H + 8 }}
        accessibilityLabel={t('Tap a square to see its reading.')}
        onPress={(e) => {
          const x = fx0 + (e.nativeEvent.locationX - 4) / k, y = fy0 - (e.nativeEvent.locationY - 4) / k;
          const col = Math.floor((x - g.x0) / g.res), row = Math.floor((g.y0 - y) / g.res);
          if (col < 0 || row < 0 || col >= g.w || row >= g.h) return;
          const i = row * g.w + col;
          if (!inField(i)) return;
          tick('select');
          onCell(selected === i ? null : i);
        }}
      >
        <View pointerEvents="none" style={{ width: W + 28, height: H + 8 }}>
          <Svg width={W + 28} height={H + 8} viewBox={`-4 -4 ${W + 28} ${H + 8}`}>
            <Rect x={-4} y={-4} width={W + 28} height={H + 8} fill={C.sunken} rx={10} />
            <G>{rects}</G>
            {outline ? <Polygon points={outline} fill="none" stroke={C.text} strokeWidth={1.5} strokeDasharray="4,3" /> : null}
            <G x={W + 12} y={6}>
              <Path d="M0,-2 L5,10 L0,7 L-5,10 Z" fill={C.text} />
              <SvgText x={0} y={22} fontSize={10} fill={C.text} textAnchor="middle" fontFamily={FONT.bodyBold}>N</SvgText>
            </G>
            {/* scale bar: one square of this layer */}
            <G x={0} y={H - 2}>
              <Rect x={0} y={-4} width={g.res * k} height={3} fill={C.text} />
              <SvgText x={g.res * k + 4} y={0} fontSize={10} fill={C.text} fontFamily={FONT.bodyBold}>{`${g.res} m`}</SvgText>
            </G>
          </Svg>
        </View>
      </Pressable>
    </View>
  );
}

function CellInfo({ grid, layer, cell }: { grid: Grid; layer: Layer; cell: number | null }) {
  const { t } = useLang();
  if (cell === null) return <Text style={[st.note, { textAlign: 'center' }]}>Tap a square to see its reading.</Text>;
  const v = (x: number | null) => (x === null ? '—' : (x / 1000).toFixed(2));
  if (LAYER[layer].grid === 20) {
    const m = classMeta(grid.grid20.cls[cell]);
    return (
      <View style={st.cellInfo}>
        <Dot color={m.color} size={10} />
        <Text raw style={st.cellTxt}>
          {t('20 m cell')} · {t(m.short)} · {t('crop-water NDWI')} {v(grid.grid20.ndwi_crop[cell])} · NDVI (20 m) {v(grid.grid20.ndvi[cell])}
        </Text>
      </View>
    );
  }
  return (
    <View style={st.cellInfo}>
      <Text raw style={st.cellTxt}>
        {t('10 m pixel')} · NDVI {v(grid.grid10.ndvi[cell])} · {t('open-water NDWI')} {v(grid.grid10.ndwi_water[cell])}
      </Text>
    </View>
  );
}

function Legend({ grid, layer }: { grid: Grid; layer: Layer }) {
  if (layer !== 'mask') {
    const stops = layer === 'ndvi'
      ? [0.1, 0.3, 0.5, 0.7, 0.85].map((v) => ndviColor(v))
      : layer === 'ndwi_crop'
      ? [-0.2, -0.05, 0.1, 0.25, 0.4].map((v) => ndwiColor(v))
      : [-0.6, -0.4, -0.2, 0, 0.3].map((v) => waterColor(v));
    const ends: Record<Exclude<Layer, 'mask'>, [string, string]> = {
      ndvi: ['Bare', 'Dense green'], ndwi_crop: ['Less leaf water', 'More leaf water'], ndwi_water: ['Dry land', 'Open water'],
    };
    return (
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
          {stops.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={st.legendTxt}>{ends[layer][0]}</Text>
          <Text style={st.legendTxt}>{ends[layer][1]}</Text>
        </View>
      </View>
    );
  }
  const present = new Set(grid.grid20.cls.filter((c) => c !== 255));
  return (
    <View style={st.legend}>
      {CLASSES.filter((c) => present.has(c.code)).map((c) => <Key key={c.code} color={c.color} label={c.short} />)}
    </View>
  );
}

function Key({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dashed ? <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: color }} /> : <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />}
      <Text style={st.legendTxt}>{label}</Text>
    </View>
  );
}

function DateStrip({ obs, sel, onSel, label }: { obs: Observation[]; sel: Observation; onSel: (o: Observation) => void; label: (iso: string) => string }) {
  const ref = React.useRef<ScrollView>(null);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 6 }}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}>
      {obs.map((o) => {
        const on = o.id === sel.id;
        const bad = o.quality === 'unusable';
        return (
          <TouchableOpacity key={o.id} onPress={() => onSel(o)} style={[st.date, on && st.dateOn, bad && !on && { opacity: 0.5 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text raw style={[st.dateTxt, on && { color: '#fff' }]}>{label(o.observed_at)}</Text>
            {bad ? <Icon name="weather-cloudy" size={12} color={on ? '#fff' : C.textSub} /> : <Dot color={on ? '#fff' : classMeta(o.dominant_class).color} size={6} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ trend chart

function Trend({ obs, sel, onSel, label }: { obs: Observation[]; sel: Observation | null; onSel: (o: Observation) => void; label: (iso: string) => string }) {
  const { width } = useWindowDimensions();
  const W = width - 64, H = 170, padL = 30, padB = 22, padT = 8;
  const t0 = Date.parse(obs[0].observed_at), t1 = Math.max(t0 + 86400000, Date.parse(obs[obs.length - 1].observed_at));
  const yMin = -0.2, yMax = 0.9;
  const X = (iso: string) => padL + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - padL - 6);
  const Y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const good = obs.filter((o) => o.quality !== 'unusable' && !o.suspect);
  // the chart shows the 20 m analysis scale, the same scale as the normal and the alerts
  const nd = (o: Observation) => o.ndvi20_median ?? null;
  const path = (k: 'ndvi20_median' | 'ndwi_crop_median') =>
    good.filter((o) => o[k] !== null).map((o, i) => `${i ? 'L' : 'M'}${X(o.observed_at).toFixed(1)},${Y(o[k]!).toFixed(1)}`).join(' ');
  const base = good.filter((o) => o.ndvi_baseline !== null).map((o, i) => `${i ? 'L' : 'M'}${X(o.observed_at).toFixed(1)},${Y(o.ndvi_baseline!).toFixed(1)}`).join(' ');
  const baseW = good.filter((o) => o.ndwi_baseline !== null).map((o, i) => `${i ? 'L' : 'M'}${X(o.observed_at).toFixed(1)},${Y(o.ndwi_baseline!).toFixed(1)}`).join(' ');
  const ticks = [0, 0.4, 0.8];
  const months: { x: number; t: string }[] = [];
  const d = new Date(t0);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() < t1) {
    months.push({ x: X(d.toISOString()), t: label(d.toISOString()) });
    d.setMonth(d.getMonth() + 1);
  }
  return (
    <Svg width={W} height={H}>
      {ticks.map((v) => (
        <G key={v}>
          <Line x1={padL} x2={W} y1={Y(v)} y2={Y(v)} stroke={C.sunken} strokeWidth={1} />
          <SvgText x={padL - 6} y={Y(v) + 4} fontSize={10} fill={C.textSub} textAnchor="end" fontFamily={FONT.body}>{v.toFixed(1)}</SvgText>
        </G>
      ))}
      {months.map((m) => <SvgText key={m.x} x={m.x} y={H - 6} fontSize={10} fill={C.textSub} textAnchor="middle" fontFamily={FONT.body}>{m.t}</SvgText>)}
      {sel ? <Line x1={X(sel.observed_at)} x2={X(sel.observed_at)} y1={padT} y2={H - padB} stroke={C.text} strokeWidth={1} strokeDasharray="3,3" /> : null}
      {base ? <Path d={base} stroke={C.textLight} strokeWidth={1.5} strokeDasharray="5,4" fill="none" /> : null}
      {baseW ? <Path d={baseW} stroke={C.textLight} strokeWidth={1.5} strokeDasharray="5,4" fill="none" /> : null}
      <Path d={path('ndvi20_median')} stroke={C.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      <Path d={path('ndwi_crop_median')} stroke="#2F6F99" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      {obs.map((o) => {
        const x = X(o.observed_at);
        const n = nd(o);
        if (o.quality === 'unusable' || o.suspect || n === null) {
          return <Rect key={o.id} x={x - 1.5} y={H - padB - 6} width={3} height={6} fill={C.textLight} onPress={() => onSel(o)} />;
        }
        const hot = STRESS.has(o.dominant_class);
        return (
          <G key={o.id} onPress={() => onSel(o)}>
            <Rect x={x - 8} y={padT} width={16} height={H - padT - padB} fill="transparent" />
            <Circle cx={x} cy={Y(n)} r={hot ? 5 : 3.5} fill={hot ? classMeta(o.dominant_class).color : C.primary} stroke="#fff" strokeWidth={1.5} />
            {o.ndwi_crop_median !== null ? <Circle cx={x} cy={Y(o.ndwi_crop_median)} r={3} fill="#2F6F99" stroke="#fff" strokeWidth={1} /> : null}
          </G>
        );
      })}
    </Svg>
  );
}

// ------------------------------------------------------------------ technical panel

function Technical({ o }: { o: Observation }) {
  const { t } = useLang();
  const meta = o.resolution ?? RESOLUTION;
  const r = (id: ProductId) => (meta.products[id] ?? RESOLUTION.products[id]).effective_resolution_m;
  const rows: [string, string][] = [
    ['Image date', new Date(o.observed_at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })],
    ['Quality', `${t(QUALITY_META[o.quality].label)}${o.suspect ? ` (${t('probable haze')})` : ''}`],
    ['Clear 20 m cells', `${o.valid_px} / ${o.total_px} (${Math.round(o.valid_pct)}%)${o.haze_px ? ` · ${t('{n} hazy', { n: o.haze_px })}` : ''}`],
    ['Clear 10 m pixels', o.total_px10 ? `${o.valid_px10} / ${o.total_px10}` : '—'],
    ['Scene cloud', o.scene_cloud_pct === null ? '—' : `${Math.round(o.scene_cloud_pct)}%`],
    [`NDVI · ${r('NDVI')} m (B4/B8)`, `${fmt(o.ndvi_median)} (p10–p90 ${fmt(o.ndvi_p10)} – ${fmt(o.ndvi_p90)})`],
    ['NDVI · 20 m analysis scale', fmt(o.ndvi20_median)],
    [`Crop-water NDWI · ${r('NDWI_CROP')} m (B8/B11)`, `${fmt(o.ndwi_crop_median)} (p10–p90 ${fmt(o.ndwi_crop_p10)} – ${fmt(o.ndwi_crop_p90)})`],
    [`Open-water NDWI · ${r('NDWI_WATER')} m (B3/B8)`, fmt(o.ndwi_water_median)],
    ['Normal (baseline, 20 m)', o.baseline_n ? `NDVI ${fmt(o.ndvi_baseline)} ± ${fmt(o.ndvi_spread)} · NDWI_CROP ${fmt(o.ndwi_baseline)} ± ${fmt(o.ndwi_spread)} · ${t('{n} dates', { n: o.baseline_n })}` : t('Not enough clear dates yet')],
    ['Change from normal (20 m)', `NDVI ${signed(o.ndvi_delta)} · NDWI_CROP ${signed(o.ndwi_delta)}`],
    ['Anomaly (robust z)', `NDVI ${fmt(o.ndvi_anomaly, 1)} · NDWI_CROP ${fmt(o.ndwi_anomaly, 1)}`],
    ['Rain / ET₀, 21 days', o.rain_mm_21d === null ? '—' : `${Math.round(o.rain_mm_21d)} mm / ${Math.round(o.et0_mm_21d ?? 0)} mm`],
    [`Water-stress score · ${r('WATER_STRESS_SCORE')} m`, o.water_stress_score === null ? '—' : `${o.water_stress_score.toFixed(2)}`],
    [`Joint stress mask · ${r('JOINT_MASK')} m`, t(classMeta(o.dominant_class).short)],
    ['Crop cover', o.crop_fraction === null ? '—' : `${Math.round(o.crop_fraction * 100)}%`],
    ['Method', `${o.method_version} · Sentinel-2 L2A · SCL + haze mask · 20 m analysis grid, B11 not resampled`],
    ['Resolution', t(meta.statement)],
  ];

  return (
    <Card>
      <SectionLabel>The numbers</SectionLabel>
      {rows.map(([k, v]) => (
        <View key={k} style={st.techRow}>
          <Text style={st.techKey}>{k}</Text>
          <Text raw style={st.techVal}>{v}</Text>
        </View>
      ))}
      <Text style={st.note}>Score = 0.55 × leaf-water drop + 0.30 × green-cover drop + 0.15 × rain deficit (0 to 1). Thresholds are starting values that your field checks will calibrate.</Text>
    </Card>
  );
}

// ------------------------------------------------------------------ inspect sheet

function InspectSheet({ target, onClose, onSave }: {
  target: { zone: string | null; cls: number | null } | null;
  onClose: () => void;
  onSave: (v: { observed_condition: Condition; soil_moisture: 'dry' | 'moist' | 'wet' | null; irrigated: boolean | null; farmer_notes: string | null }) => Promise<void>;
}) {
  const { t } = useLang();
  const [cond, setCond] = useState<Condition | null>(null);
  const [soil, setSoil] = useState<'dry' | 'moist' | 'wet' | 'unknown'>('unknown');
  const [irr, setIrr] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (target) {
      setCond(null);
      setSoil('unknown');
      setIrr('unknown');
      setNotes('');
    }
  }, [target]);
  return (
    <Sheet visible={!!target} onClose={onClose} title="What did you find?">
      <Text raw style={[st.p, { marginTop: 0 }]}>{t('In {zone}', { zone: zoneName(target?.zone) })}</Text>
      <View style={st.chips}>
        {CONDITIONS.map((c) => <Chip key={c.value} label={c.label} active={cond === c.value} onPress={() => setCond(c.value)} />)}
      </View>
      <Text style={st.formLabel}>Soil at root depth</Text>
      <Segmented value={soil} onChange={setSoil} options={[{ value: 'dry', label: 'Dry' }, { value: 'moist', label: 'Moist' }, { value: 'wet', label: 'Wet' }, { value: 'unknown', label: 'Not checked' }]} />
      <Text style={st.formLabel}>Watered or irrigated this week?</Text>
      <Segmented value={irr} onChange={setIrr} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not sure' }]} />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('Notes (optional)')}
        placeholderTextColor={C.textLight}
        maxLength={500}
        multiline
        style={st.input}
      />
      <Btn
        label="Save field check"
        icon="check"
        disabled={!cond}
        loading={saving}
        style={{ marginTop: 14 }}
        onPress={async () => {
          if (!cond) return;
          setSaving(true);
          try {
            await onSave({ observed_condition: cond, soil_moisture: soil === 'unknown' ? null : soil, irrigated: irr === 'unknown' ? null : irr === 'yes', farmer_notes: notes || null });
          } catch (e) {
            Alert.alert(t('Could not save'), e instanceof Error ? e.message : '');
          } finally {
            setSaving(false);
          }
        }}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  p: { fontSize: 15, color: C.textMid, marginTop: 6, lineHeight: 21 },
  headline: { fontSize: 24, fontFamily: FONT.display, flex: 1, lineHeight: 28 },
  body: { fontSize: 16, color: C.textMid, marginTop: 8, lineHeight: 22 },
  action: { marginTop: 14, backgroundColor: C.bg, borderRadius: RADIUS.sm, padding: 12 },
  actionLabel: { fontSize: 13, color: C.textSub, fontFamily: FONT.bodyBold },
  actionTxt: { fontSize: 16, color: C.text, marginTop: 3, lineHeight: 22 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  qualityTxt: { fontSize: 14, color: C.textSub, flex: 1 },
  note: { fontSize: 13, color: C.textSub, marginTop: 8, lineHeight: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendTxt: { fontSize: 13, color: C.textMid },
  keyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.sm, backgroundColor: C.bg },
  dateOn: { backgroundColor: C.primaryDark },
  dateTxt: { fontSize: 13, color: C.textMid, fontFamily: FONT.bodyBold },
  cellInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 },
  cellTxt: { fontSize: 14, color: C.text },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  zoneName: { fontSize: 16, color: C.text, fontFamily: FONT.bodyBold },
  zoneSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  score: { fontSize: 11, color: C.textSub, textAlign: 'right' },
  techRow: { paddingVertical: 7 },
  techKey: { fontSize: 13, color: C.textSub },
  caption: { marginTop: 12, backgroundColor: C.bg, borderRadius: RADIUS.sm, padding: 10 },
  captionTitle: { fontSize: 14, color: C.text, fontFamily: FONT.bodyBold },
  captionTxt: { fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 18 },
  techVal: { fontSize: 15, color: C.text, marginTop: 1, fontFamily: FONT.bodyBold },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkTxt: { fontSize: 14, color: C.textMid, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  formLabel: { fontSize: 14, color: C.textMid, fontFamily: FONT.bodyBold, marginTop: 16, marginBottom: 8 },
  input: { marginTop: 14, minHeight: 70, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, padding: 12, fontSize: 16, color: C.text, fontFamily: FONT.body, textAlignVertical: 'top' },
});
