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
import { Btn, Card, Chip, Dot, ErrorNote, Header, Icon, Loading, ProgressBar, SectionLabel, Segmented, Sheet, StatusShade, Text, tick } from '../../components/ui';
import { getFarm, type Farm } from '../../lib/data';
import { locale, useLang } from '../../lib/i18n';
import { C, FONT, RADIUS } from '../../lib/theme';
import {
  CLASSES, QUALITY_META, STRESS, classMeta, getGrid, interpret, listObservations, listValidations, listZones, refreshSatellite,
  saveValidation, satelliteReady, setOutcome, toCsv, toGeoJson, toUtm, zoneName,
  type Condition, type Grid, type Observation, type Validation, type ZoneStat,
} from '../../lib/satellite';

type Layer = 'health' | 'ndvi' | 'ndwi';
type View_ = 'farmer' | 'technical';

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

// colour ramps for the index layers
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))).toString(16).padStart(2, '0')).join('');
}
const ndviColor = (v: number) => (v < 0.45 ? mix('#E9DFC9', '#9DB77C', (v - 0.05) / 0.4) : mix('#9DB77C', '#1F4D39', (v - 0.45) / 0.4));
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
  const [layer, setLayer] = useState<Layer>('health');
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
        if (!recent && Date.now() - last > 2 * 86400000) check(true);
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
  const noBoundary = farm && (!farm.polygon || farm.polygon.length < 3);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Crop health from space" subtitle={farm?.name ?? ''} />
      {!loaded || farm === undefined ? (
        <Loading />
      ) : !satelliteReady() ? (
        <Card>
          <Text style={st.h}>Satellite checks are not switched on yet</Text>
          <Text style={st.p}>The database update for satellite results (v2.3) has not been applied. Ask the CropGuard admin to run it.</Text>
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

          {/* 1. The reading */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={tone.icon} size={26} color={tone.color} />
              <Text raw style={[st.headline, { color: reading.tone === 'none' ? C.text : tone.color }]}>{reading.headline}</Text>
            </View>
            <Text raw style={st.body}>{busy && !reading.lastImage ? t('Reading up to 90 days of Sentinel-2 images of this field. The first check takes about a minute.') : reading.body}</Text>
            {reading.action ? (
              <View style={st.action}>
                <Text style={st.actionLabel}>What to do</Text>
                <Text raw style={st.actionTxt}>{reading.action}</Text>
              </View>
            ) : null}
            {reading.latest ? (
              <View style={st.qualityRow}>
                <Dot color={QUALITY_META[reading.latest.quality].color} />
                <Text raw style={st.qualityTxt}>
                  {t('{q} image', { q: t(QUALITY_META[reading.latest.quality].label) })} · {dateLabel(reading.latest.observed_at)} · {ago(reading.latest.observed_at) === 0 ? t('today') : t('{n} days ago', { n: ago(reading.latest.observed_at) })}
                </Text>
              </View>
            ) : null}
            {busy ? (
              <View style={{ marginTop: 14, gap: 6 }}>
                <Text raw style={st.note}>{busy.total ? t('Reading satellite images: {a} of {b}', { a: busy.done, b: busy.total }) : t('Looking for new satellite images…')}</Text>
                <ProgressBar value={busy.total ? busy.done / busy.total : 0.05} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Btn label="Check now" icon="satellite-variant" kind="secondary" style={{ flex: 1, minHeight: 46 }} onPress={() => check()} />
                {reading.zone || reading.tone === 'act' || reading.tone === 'watch' ? (
                  <Btn label="I inspected it" icon="shoe-print" style={{ flex: 1, minHeight: 46 }} onPress={() => setInspect({ zone: reading.zone, cls: reading.latest?.dominant_class ?? null })} />
                ) : null}
              </View>
            )}
          </Card>

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

          <Segmented<View_> value={view} onChange={setView} style={{ marginHorizontal: 16, marginTop: 16 }}
            options={[{ value: 'farmer', label: 'Farmer view' }, { value: 'technical', label: 'Technical' }]} />

          {/* 2. The field, square by square */}
          {sel && grid && farm ? (
            <Card>
              <SectionLabel action={t('On the map')} onAction={() => router.push({ pathname: '/farm-map', params: { focus: farm.id, sat: String(sel.id) } })}>
                Your field
              </SectionLabel>
              <Segmented<Layer> value={layer} onChange={setLayer}
                options={[{ value: 'health', label: 'Health' }, { value: 'ndvi', label: 'Green' }, { value: 'ndwi', label: 'Leaf water' }]} />
              <FieldMask grid={grid} farm={farm} layer={layer} selected={cell} onCell={setCell} />
              <CellInfo grid={grid} cell={cell} />
              <Legend grid={grid} layer={layer} />
              <DateStrip obs={obs} sel={sel} onSel={(o) => { tick('select'); setSel(o); }} label={dateLabel} />
              {sel.quality === 'unusable' ? <Text style={st.note}>Clouds covered the field on this date. Grey squares are not readings.</Text> : null}
              {sel.suspect ? <Text style={st.note}>This date was probably hazy: it disagrees with the clear images either side of it.</Text> : null}
              <Text style={[st.note, { marginTop: 10 }]}>Each square is 10 × 10 m. Leaf water comes from a 20 m band, so it is less sharp.</Text>
            </Card>
          ) : usable.length === 0 && !busy ? null : sel ? <Loading /> : null}

          {/* 3. Over time */}
          {usable.length >= 2 ? (
            <Card>
              <SectionLabel>Over time</SectionLabel>
              <Trend obs={obs} sel={sel} onSel={setSel} label={dateLabel} />
              <View style={st.keyRow}>
                <Key color={C.primary} label="Green cover (NDVI)" />
                <Key color="#2F6F99" label="Leaf water (NDWI)" />
                <Key color={C.textLight} dashed label="This field's normal" />
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
                      <Text raw style={st.zoneSub}>{t(m.short)}{view === 'technical' ? ` · NDVI ${fmt(z.ndvi)} (${signed(z.ndvi_delta)}) · NDWI ${fmt(z.ndwi_crop)} (${signed(z.ndwi_delta)})` : ''}</Text>
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
          <Text style={[st.note, { marginHorizontal: 20, marginTop: 6, color: C.textLight }]}>Contains modified Copernicus Sentinel-2 data, processed by CropGuard AI.</Text>
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
              { text: t('Scan'), onPress: () => router.navigate('/scan') },
            ]);
          }
        }}
      />
      <StatusShade />
    </View>
  );
}

// ------------------------------------------------------------------ field mask

function FieldMask({ grid, farm, layer, selected, onCell }: { grid: Grid; farm: Farm; layer: Layer; selected: number | null; onCell: (i: number | null) => void }) {
  const { width } = useWindowDimensions();
  const { t } = useLang();
  const maxW = width - 64;
  const size = Math.max(6, Math.min(maxW / grid.w, 260 / grid.h, 40));
  const W = grid.w * size, H = grid.h * size;
  const outline = (farm.polygon ?? []).map(([la, lo]) => {
    const [x, y] = toUtm(la, lo, grid.epsg);
    return `${((x - grid.x0) / grid.res) * size},${((grid.y0 - y) / grid.res) * size}`;
  }).join(' ');
  const color = (i: number) => {
    const c = grid.cls[i];
    if (layer === 'health') return classMeta(c).color;
    const v = layer === 'ndvi' ? grid.ndvi[i] : grid.ndwi[i];
    if (v === null || c === 0) return CLASSES[0].color;
    return layer === 'ndvi' ? ndviColor(v / 1000) : ndwiColor(v / 1000);
  };
  const rects = [];
  for (let r = 0; r < grid.h; r++) {
    for (let c = 0; c < grid.w; c++) {
      const i = r * grid.w + c;
      if (grid.cls[i] === 255) continue;
      const nodata = grid.cls[i] === 0;
      rects.push(
        <Rect key={i} x={c * size + 0.5} y={r * size + 0.5} width={size - 1} height={size - 1} rx={1.5}
          fill={color(i)} opacity={nodata ? 0.45 : 1} stroke={selected === i ? C.text : 'none'} strokeWidth={selected === i ? 2.5 : 0} />,
      );
    }
  }
  return (
    <View style={{ alignItems: 'center', marginTop: 14 }}>
      <Pressable
        style={{ width: W + 28, height: H + 8 }}
        accessibilityLabel={t('Tap a square to see its reading.')}
        onPress={(e) => {
          const col = Math.floor((e.nativeEvent.locationX - 4) / size);
          const row = Math.floor((e.nativeEvent.locationY - 4) / size);
          if (col < 0 || row < 0 || col >= grid.w || row >= grid.h) return;
          const i = row * grid.w + col;
          if (grid.cls[i] === 255) return;
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
      </Svg>
      </View>
      </Pressable>
    </View>
  );
}

function CellInfo({ grid, cell }: { grid: Grid; cell: number | null }) {
  const { t } = useLang();
  if (cell === null) return <Text style={[st.note, { textAlign: 'center' }]}>Tap a square to see its reading.</Text>;
  const m = classMeta(grid.cls[cell]);
  const v = grid.ndvi[cell], w = grid.ndwi[cell];
  return (
    <View style={st.cellInfo}>
      <Dot color={m.color} size={10} />
      <Text raw style={st.cellTxt}>
        {t(m.short)}{v !== null ? ` · ${t('green cover')} ${(v / 1000).toFixed(2)}` : ''}{w !== null ? ` · ${t('leaf water')} ${(w / 1000).toFixed(2)}` : ''}
      </Text>
    </View>
  );
}

function Legend({ grid, layer }: { grid: Grid; layer: Layer }) {
  if (layer !== 'health') {
    const stops = layer === 'ndvi'
      ? [0.1, 0.3, 0.5, 0.7, 0.85].map((v) => ndviColor(v))
      : [-0.2, -0.05, 0.1, 0.25, 0.4].map((v) => ndwiColor(v));
    return (
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
          {stops.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={st.legendTxt}>{layer === 'ndvi' ? 'Bare' : 'Less water'}</Text>
          <Text style={st.legendTxt}>{layer === 'ndvi' ? 'Dense green' : 'More water'}</Text>
        </View>
      </View>
    );
  }
  const present = new Set(grid.cls.filter((c) => c !== 255));
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
  const path = (k: 'ndvi_median' | 'ndwi_crop_median') =>
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
      <Path d={path('ndvi_median')} stroke={C.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      <Path d={path('ndwi_crop_median')} stroke="#2F6F99" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      {obs.map((o) => {
        const x = X(o.observed_at);
        if (o.quality === 'unusable' || o.suspect || o.ndvi_median === null) {
          return <Rect key={o.id} x={x - 1.5} y={H - padB - 6} width={3} height={6} fill={C.textLight} onPress={() => onSel(o)} />;
        }
        const hot = STRESS.has(o.dominant_class);
        return (
          <G key={o.id} onPress={() => onSel(o)}>
            <Rect x={x - 8} y={padT} width={16} height={H - padT - padB} fill="transparent" />
            <Circle cx={x} cy={Y(o.ndvi_median)} r={hot ? 5 : 3.5} fill={hot ? classMeta(o.dominant_class).color : C.primary} stroke="#fff" strokeWidth={1.5} />
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
  const rows: [string, string][] = [
    ['Image date', new Date(o.observed_at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })],
    ['Quality', `${t(QUALITY_META[o.quality].label)}${o.suspect ? ` (${t('probable haze')})` : ''}`],
    ['Clear squares', `${o.valid_px} / ${o.total_px} (${Math.round(o.valid_pct)}%)${o.haze_px ? ` · ${t('{n} hazy', { n: o.haze_px })}` : ''}`],
    ['Scene cloud', o.scene_cloud_pct === null ? '—' : `${Math.round(o.scene_cloud_pct)}%`],
    ['NDVI median (p10–p90)', `${fmt(o.ndvi_median)} (${fmt(o.ndvi_p10)} – ${fmt(o.ndvi_p90)})`],
    ['Crop NDWI, B8/B11', `${fmt(o.ndwi_crop_median)} (${fmt(o.ndwi_crop_p10)} – ${fmt(o.ndwi_crop_p90)})`],
    ['Open-water NDWI, B3/B8', fmt(o.ndwi_water_median)],
    ['Normal (baseline)', o.baseline_n ? `NDVI ${fmt(o.ndvi_baseline)} ± ${fmt(o.ndvi_spread)} · NDWI ${fmt(o.ndwi_baseline)} ± ${fmt(o.ndwi_spread)} · ${t('{n} dates', { n: o.baseline_n })}` : t('Not enough clear dates yet')],
    ['Change from normal', `NDVI ${signed(o.ndvi_delta)} · NDWI ${signed(o.ndwi_delta)}`],
    ['Anomaly (robust z)', `NDVI ${fmt(o.ndvi_anomaly, 1)} · NDWI ${fmt(o.ndwi_anomaly, 1)}`],
    ['Rain / ET₀, 21 days', o.rain_mm_21d === null ? '—' : `${Math.round(o.rain_mm_21d)} mm / ${Math.round(o.et0_mm_21d ?? 0)} mm`],
    ['Water-stress score', o.water_stress_score === null ? '—' : `${o.water_stress_score.toFixed(2)}`],
    ['Crop cover', o.crop_fraction === null ? '—' : `${Math.round(o.crop_fraction * 100)}%`],
    ['Method', `${o.method_version} · Sentinel-2 L2A · SCL + haze mask · B11 bilinear to 10 m`],
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
  techVal: { fontSize: 15, color: C.text, marginTop: 1, fontFamily: FONT.bodyBold },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkTxt: { fontSize: 14, color: C.textMid, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  formLabel: { fontSize: 14, color: C.textMid, fontFamily: FONT.bodyBold, marginTop: 16, marginBottom: 8 },
  input: { marginTop: 14, minHeight: 70, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, padding: 12, fontSize: 16, color: C.text, fontFamily: FONT.body, textAlignVertical: 'top' },
});
