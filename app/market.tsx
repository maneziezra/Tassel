// Market — interactive prices, not a table.
// Defaults automatically to the farmer's crops and county.
// Each crop card features an SVG trend line sparkline and plain-language summary ("Up 8% this month").
// One-tap quick report button and placeholder for direct market connection (P3 hook).

import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Btn, Card, Chip, CropIcon, ErrorNote, Header, Icon, Loading, SectionLabel, Text, timeAgo } from '../components/ui';
import { getProfile, listFarms, listPrices, priceReportSummary, type Price, type PriceSummary } from '../lib/data';
import { findAgrovets, getPosition, mapsUrl, type Agrovet } from '../lib/geo';
import { cropName } from '../lib/diseases';
import { locale, useLang } from '../lib/i18n';
import { C, FONT } from '../lib/theme';

const LINKS = [
  { name: 'KAMIS — official market prices', sub: 'Ministry of Agriculture market information system', url: 'https://kamis.kilimo.go.ke', icon: 'chart-box-outline' as const },
  { name: 'NCPB', sub: 'National Cereals and Produce Board', url: 'https://www.ncpb.co.ke', icon: 'warehouse' as const },
  { name: 'Mkulima Young', sub: 'Farmer-to-buyer marketplace', url: 'https://www.mkulimayoung.com', icon: 'handshake-outline' as const },
];

type Series = { key: string; crop: string; market: string; level: string; unit: string; points: Price[] };

/** Render smooth SVG sparkline for price series */
function PriceSparkline({ points, color }: { points: Price[]; color: string }) {
  if (points.length < 2) return null;

  const width = 100;
  const height = 30;
  const padding = 4;

  const prices = points.map((p) => p.price_kes);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.price_kes - min) / range) * (height - 2 * padding);
    return { x, y };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

  return (
    <View style={{ width, height, marginTop: 6 }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Path d={areaD} fill={`url(#sparkGrad-${color})`} />
        <Path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export default function MarketScreen() {
  const { t, lang } = useLang();
  const [prices, setPrices] = useState<Price[] | null>(null);
  const [reports, setReports] = useState<PriceSummary[] | null | undefined>(undefined);
  const [county, setCounty] = useState<string | null>(null);
  const [farmerCrops, setFarmerCrops] = useState<string[]>([]);
  const [reportScope, setReportScope] = useState<'county' | 'kenya'>('county');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<'wholesale' | 'retail'>('wholesale');
  const [selected, setSelected] = useState<string | null>(null);
  const [agrovets, setAgrovets] = useState<Agrovet[] | null>(null);
  const [agroStatus, setAgroStatus] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [allPrices, allReports, prof, farms] = await Promise.all([
        listPrices(),
        priceReportSummary(30).catch(() => []),
        getProfile().catch(() => null),
        listFarms().catch(() => []),
      ]);

      setPrices(allPrices);
      setReports(allReports);

      const cropsList = Array.from(new Set(farms.map((f) => f.crop).filter(Boolean) as string[]));
      setFarmerCrops(cropsList);

      if (prof?.county) {
        setCounty(prof.county);
        setReportScope('county'); // Default to farmer county per P2
      } else {
        setReportScope('kenya');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load prices.'));
      setPrices([]);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Prioritize farmer crops and farmer county
  const series = useMemo(() => {
    const map = new Map<string, Series>();
    (prices ?? []).filter((p) => p.level === level).forEach((p) => {
      const key = `${p.crop}|${p.market}`;
      const s = map.get(key) ?? { key, crop: p.crop, market: p.market, level: p.level, unit: p.unit, points: [] };
      s.points.push(p);
      map.set(key, s);
    });

    const list = Array.from(map.values());

    // Sort: farmer's crops first!
    if (farmerCrops.length > 0) {
      list.sort((a, b) => {
        const aMatches = farmerCrops.some((c) => a.crop.toLowerCase().includes(c.toLowerCase()));
        const bMatches = farmerCrops.some((c) => b.crop.toLowerCase().includes(c.toLowerCase()));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    return list;
  }, [prices, level, farmerCrops]);

  const current = series.find((s) => s.key === selected) ?? series[0];
  const shownReports = (reports ?? []).filter((r) => reportScope === 'kenya' || r.county === county);

  const nearMe = async () => {
    setAgroStatus(t('Getting your location…'));
    const pos = await getPosition();
    if (!pos) return setAgroStatus(t('Allow location to find agro-dealers near you.'));
    setAgroStatus(t('Searching OpenStreetMap…'));
    try {
      const l = await findAgrovets(pos, 20);
      setAgrovets(l);
      setAgroStatus(l.length ? '' : t('No agro-dealers are mapped within 20 km yet.'));
    } catch {
      setAgroStatus(t('Could not search right now. Check your internet connection.'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="Market"
        subtitle={county ? t('Market prices for {county}', { county }) : t('Kenyan reference and farmer prices')}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        {/* Fast Report Floating / Header Action */}
        <View style={st.quickReportBar}>
          <View style={{ flex: 1 }}>
            <Text style={st.quickReportTitle}>Got a harvest price?</Text>
            <Text style={st.quickReportSub}>Report anonymously to help your community get fair rates.</Text>
          </View>
          <TouchableOpacity style={st.reportBtn} onPress={() => router.push('/report-price')}>
            <Icon name="cash-plus" size={18} color="#FFFFFF" />
            <Text style={st.reportBtnTxt}>Report price</Text>
          </TouchableOpacity>
        </View>

        {/* Level Toggles */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          <Chip label="Wholesale" active={level === 'wholesale'} onPress={() => { setLevel('wholesale'); setSelected(null); }} />
          <Chip label="Retail" active={level === 'retail'} onPress={() => { setLevel('retail'); setSelected(null); }} />
        </View>

        {error ? <ErrorNote message={error} onRetry={load} /> : null}
        {prices === null && !error ? <Loading /> : null}

        {/* Horizontal Interactive Price Cards with SVG Trend Sparklines */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          {series.map((s) => {
            const last = s.points[s.points.length - 1];
            const prev = s.points.length > 1 ? s.points[s.points.length - 2] : null;
            const change = prev ? ((last.price_kes - prev.price_kes) / prev.price_kes) * 100 : null;
            const active = current?.key === s.key;
            const up = (change ?? 0) > 0;
            const tColor = change === null || change === 0 ? C.textSub : up ? C.primary : C.error;

            let changeWord = t('Reference price');
            if (change !== null) {
              if (change > 0) changeWord = t('Up {pct}% this month', { pct: change.toFixed(1) });
              else if (change < 0) changeWord = t('Down {pct}% this month', { pct: Math.abs(change).toFixed(1) });
              else changeWord = t('Steady this month');
            }

            return (
              <TouchableOpacity
                key={s.key}
                style={[st.priceCard, active && st.priceOn]}
                onPress={() => setSelected(s.key)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={st.crop} numberOfLines={1}>
                    {cropName(s.crop)}
                  </Text>
                  <CropIcon crop={s.crop} size={22} disc={false} />
                </View>
                <Text style={st.market}>{s.market}</Text>

                <Text raw style={st.amount}>
                  KES {last.price_kes.toLocaleString()}
                  <Text raw style={st.unit}>
                    /{t(s.unit)}
                  </Text>
                </Text>

                {/* SVG Trend Sparkline */}
                <PriceSparkline points={s.points} color={tColor} />

                {/* Plain-Language Change Word */}
                <View style={st.changeRow}>
                  <Icon name={change === null || change === 0 ? 'minus' : up ? 'trending-up' : 'trending-down'} size={14} color={tColor} />
                  <Text raw style={[st.change, { color: tColor }]}>
                    {changeWord}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Price History Detail */}
        {current ? (
          <Card style={{ marginTop: 0 }}>
            <SectionLabel>{`${t('Price history')}: ${cropName(current.crop)} (${current.market})`}</SectionLabel>
            <View style={st.bars}>
              {current.points.map((p, i) => {
                const max = Math.max(...current.points.map((x) => x.price_kes));
                const h = 20 + (p.price_kes / max) * 70;
                return (
                  <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text raw style={st.barVal}>
                      {p.price_kes}
                    </Text>
                    <View style={[st.bar, { height: h, backgroundColor: i === current.points.length - 1 ? C.primary : '#B9CDBF' }]} />
                    <Text raw style={st.barLbl}>
                      {new Date(p.observed_on).toLocaleDateString(locale(lang), { month: 'short', year: '2-digit' })}
                    </Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => current.points[current.points.length - 1].source_url && Linking.openURL(current.points[current.points.length - 1].source_url!)}>
              <Text raw style={st.source}>
                {t('Source')}: {current.points[current.points.length - 1].source} ↗
              </Text>
            </TouchableOpacity>
            <Text style={st.disclaimer}>Monthly reference prices from verified institutions. Always confirm today's prices before selling.</Text>
          </Card>
        ) : null}

        {/* Prices reported by local farmers */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="account-cash-outline" size={20} color={C.primary} />
            <Text style={[st.cardTitle, { flex: 1 }]}>Prices from farmers</Text>
            <Text style={st.agroSub}>last 30 days</Text>
          </View>
          {reports === null ? (
            <Text style={[st.agroSub, { marginTop: 8 }]}>Farmer price reports are not switched on yet (database update pending).</Text>
          ) : (
            <>
              {county ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Chip label={t('{county} County', { county })} raw active={reportScope === 'county'} onPress={() => setReportScope('county')} />
                  <Chip label="All of Kenya" active={reportScope === 'kenya'} onPress={() => setReportScope('kenya')} />
                </View>
              ) : null}
              {reports === undefined ? <Loading /> : null}
              {shownReports.length ? (
                shownReports.map((r) => (
                  <View key={`${r.crop}-${r.county}-${r.unit}`} style={st.report}>
                    <View style={{ flex: 1 }}>
                      <Text raw style={st.agroName}>
                        {cropName(r.crop)}
                      </Text>
                      <Text raw style={st.agroSub}>
                        {r.county}, {t('{n} reports', { n: r.reports })}, {timeAgo(r.latest)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text raw style={st.reportPrice}>
                        KES {Number(r.median_kes).toLocaleString()}
                      </Text>
                      <Text raw style={st.agroSub}>
                        {t('median per {unit}', { unit: t(r.unit) })}
                      </Text>
                    </View>
                  </View>
                ))
              ) : reports !== undefined ? (
                <Text style={[st.agroSub, { marginTop: 10 }]}>No farmer reports here yet. Be the first — it helps others get a fair price.</Text>
              ) : null}
              <Btn label="Report a price I got" icon="cash-plus" kind="secondary" onPress={() => router.push('/report-price')} style={{ marginTop: 12 }} />
              <Text style={st.osm}>Shown as the median once 3 or more farmers report. Anonymous and verified against plausibility bounds.</Text>
            </>
          )}
        </Card>

        {/* P3 Placeholder Hook: Direct Market Connection */}
        <Card style={{ backgroundColor: C.primaryTint, borderColor: C.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="handshake" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>Direct Market Connection</Text>
              <Text style={st.osm}>Connect directly with verified local produce buyers, aggregators and millers.</Text>
            </View>
          </View>
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <View style={st.comingSoonPill}>
              <Text style={st.comingSoonTxt}>Coming in next release (P3)</Text>
            </View>
          </View>
        </Card>

        {/* Agro-dealers near me */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="store-outline" size={20} color={C.primary} />
            <Text style={st.cardTitle}>Agro-dealers near me</Text>
          </View>
          {agrovets?.length ? (
            agrovets.map((a) => (
              <View key={a.id} style={st.agro}>
                <View style={st.agroIcon}>
                  <Icon name="store-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text raw style={st.agroName}>
                    {a.name}
                  </Text>
                  <Text raw style={st.agroSub}>
                    {a.distanceKm.toFixed(1)} km{a.address ? `, ${a.address}` : ''}
                  </Text>
                </View>
                {a.phone ? (
                  <TouchableOpacity style={st.circle} onPress={() => Linking.openURL(`tel:${a.phone}`)}>
                    <Icon name="phone" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[st.circle, { backgroundColor: C.primaryTint }]} onPress={() => Linking.openURL(mapsUrl(a.lat, a.lng, a.name))}>
                  <Icon name="directions" size={18} color={C.primary} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <>
              {agroStatus ? (
                <Text raw style={st.agroSub}>
                  {agroStatus}
                </Text>
              ) : null}
              <Btn label="Find agro-dealers" icon="map-marker-radius" kind="secondary" onPress={nearMe} style={{ marginTop: 10 }} />
            </>
          )}
          <Text style={st.osm}>Data © OpenStreetMap contributors.</Text>
        </Card>

        {/* Official Resources */}
        <Text style={st.sectionTitle}>Official sources & buyers</Text>
        {LINKS.map((l) => (
          <TouchableOpacity key={l.url} style={st.link} onPress={() => Linking.openURL(l.url)} activeOpacity={0.85}>
            <View style={st.linkIcon}>
              <Icon name={l.icon} size={24} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.agroName}>{l.name}</Text>
              <Text style={st.agroSub}>{l.sub}</Text>
            </View>
            <Icon name="open-in-new" size={18} color={C.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  quickReportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickReportTitle: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  quickReportSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reportBtnTxt: { color: '#FFFFFF', fontSize: 13, fontFamily: FONT.bodyBold },
  priceCard: {
    width: 180,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priceOn: { borderColor: C.primary },
  crop: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  market: { fontSize: 13, color: C.textSub, marginBottom: 4 },
  amount: { fontSize: 24, fontFamily: FONT.display, color: C.text },
  unit: { fontSize: 13, color: C.textSub, fontFamily: FONT.body },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  change: { fontSize: 12, fontFamily: FONT.bodyBold },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 130, paddingTop: 10 },
  bar: { width: '70%', borderRadius: 6 },
  barVal: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.text },
  barLbl: { fontSize: 13, color: C.textSub },
  source: { fontSize: 13, color: C.textMid, fontFamily: FONT.bodyBold, marginTop: 12 },
  disclaimer: { fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 19 },
  cardTitle: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text },
  report: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginTop: 6 },
  reportPrice: { fontSize: 17, fontFamily: FONT.display, color: C.text },
  agro: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  agroIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  agroName: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  agroSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  osm: { fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 17 },
  comingSoonPill: {
    backgroundColor: C.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
  },
  comingSoonTxt: { fontSize: 11, fontFamily: FONT.bodyBold, color: C.primary },
  sectionTitle: { fontSize: 18, fontFamily: FONT.bodyBold, color: C.text, marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14 },
  linkIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
});
