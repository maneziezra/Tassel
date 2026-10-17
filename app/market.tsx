// Market — sourced reference prices (with date and source), prices reported by
// farmers (median of the last 30 days, like FarmRise's price feedback), real
// agro-dealers from OpenStreetMap, and official links.

import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Btn, Card, Chip, ErrorNote, Header, Icon, Loading, SectionLabel, Text, timeAgo } from '../components/ui';
import { getProfile, listPrices, priceReportSummary, type Price, type PriceSummary } from '../lib/data';
import { findAgrovets, getPosition, mapsUrl, type Agrovet } from '../lib/geo';
import { cropName } from '../lib/diseases';
import { locale, useLang } from '../lib/i18n';
import { C } from '../lib/theme';

const LINKS = [
  { name: 'KAMIS — official market prices', sub: 'Ministry of Agriculture market information system', url: 'https://kamis.kilimo.go.ke', icon: 'chart-box-outline' as const },
  { name: 'NCPB', sub: 'National Cereals and Produce Board', url: 'https://www.ncpb.co.ke', icon: 'warehouse' as const },
  { name: 'Mkulima Young', sub: 'Farmer-to-buyer marketplace', url: 'https://www.mkulimayoung.com', icon: 'handshake-outline' as const },
];

type Series = { key: string; crop: string; market: string; level: string; unit: string; points: Price[] };

export default function MarketScreen() {
  const { t, lang } = useLang();
  const [prices, setPrices] = useState<Price[] | null>(null);
  const [reports, setReports] = useState<PriceSummary[] | null | undefined>(undefined);
  const [county, setCounty] = useState<string | null>(null);
  const [reportScope, setReportScope] = useState<'county' | 'kenya'>('kenya');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<'wholesale' | 'retail'>('wholesale');
  const [selected, setSelected] = useState<string | null>(null);
  const [agrovets, setAgrovets] = useState<Agrovet[] | null>(null);
  const [agroStatus, setAgroStatus] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setPrices(await listPrices());
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load prices.'));
    }
    try {
      const [r, p] = await Promise.all([priceReportSummary(30), getProfile().catch(() => null)]);
      setReports(r);
      if (p?.county) {
        setCounty(p.county);
        setReportScope('county');
      }
    } catch {
      setReports([]);
    }
  }, [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const series = useMemo(() => {
    const map = new Map<string, Series>();
    (prices ?? []).filter((p) => p.level === level).forEach((p) => {
      const key = `${p.crop}|${p.market}`;
      const s = map.get(key) ?? { key, crop: p.crop, market: p.market, level: p.level, unit: p.unit, points: [] };
      s.points.push(p);
      map.set(key, s);
    });
    return Array.from(map.values());
  }, [prices, level]);

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
      <Header title="Market" subtitle="Reference prices, farmer prices and agro-dealers" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          <Chip label="Wholesale" active={level === 'wholesale'} onPress={() => { setLevel('wholesale'); setSelected(null); }} />
          <Chip label="Retail" active={level === 'retail'} onPress={() => { setLevel('retail'); setSelected(null); }} />
        </View>
        {error ? <ErrorNote message={error} onRetry={load} /> : null}
        {prices === null && !error ? <Loading /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
          {series.map((s) => {
            const last = s.points[s.points.length - 1];
            const prev = s.points.length > 1 ? s.points[s.points.length - 2] : null;
            const change = prev ? ((last.price_kes - prev.price_kes) / prev.price_kes) * 100 : null;
            const active = current?.key === s.key;
            const up = (change ?? 0) > 0;
            const tColor = change === null || change === 0 ? C.textSub : up ? C.primary : C.error;
            return (
              <TouchableOpacity key={s.key} style={[st.priceCard, active && st.priceOn]} onPress={() => setSelected(s.key)} activeOpacity={0.85}>
                <Text style={st.crop} numberOfLines={1}>
                  {s.crop}
                </Text>
                <Text style={st.market}>{s.market}</Text>
                <Text raw style={st.amount}>
                  KES {last.price_kes.toLocaleString()}
                  <Text raw style={st.unit}>
                    /{t(s.unit)}
                  </Text>
                </Text>
                {change !== null ? (
                  <View style={st.changeRow}>
                    <Icon name={change === 0 ? 'minus' : up ? 'trending-up' : 'trending-down'} size={13} color={tColor} />
                    <Text raw style={[st.change, { color: tColor }]}>
                      {t('{pct}% vs previous', { pct: `${change > 0 ? '+' : ''}${change.toFixed(1)}` })}
                    </Text>
                  </View>
                ) : (
                  <Text style={[st.change, { color: C.textSub, marginTop: 6 }]}>1 observation</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {current ? (
          <Card style={{ marginTop: 0 }}>
            <SectionLabel>{`${t('Price history')}, ${t(current.crop)}, ${t(current.market)}`}</SectionLabel>
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
            <Text style={st.disclaimer}>Monthly reference prices, not today's price at your market. Check KAMIS or your nearest market before selling.</Text>
          </Card>
        ) : null}

        {/* Prices reported by farmers */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="account-cash-outline" size={20} color={C.primary} />
            <Text style={[st.cardTitle, { flex: 1 }]}>Prices from farmers</Text>
            <Text style={st.agroSub}>last 30 days</Text>
          </View>
          {reports === null ? (
            <Text style={[st.agroSub, { marginTop: 8 }]}>Farmer price reports are not switched on yet (the database update is pending).</Text>
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
              <Text style={st.osm}>Shown as the middle value (median) once 3 or more farmers report, so one wrong report cannot move the price much and no single farmer's price can be worked out. Reports are anonymous.</Text>
            </>
          )}
        </Card>

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
          <Text style={st.osm}>Data © OpenStreetMap contributors. Shops not on the map won't appear.</Text>
        </Card>

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
  priceCard: { width: 170, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  priceOn: { borderColor: C.primary },
  crop: { fontSize: 15, fontWeight: '700', color: C.text },
  market: { fontSize: 13, color: C.textSub, marginBottom: 6 },
  amount: { fontSize: 24, fontWeight: '700', color: C.text },
  unit: { fontSize: 13, color: C.textSub },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  change: { fontSize: 13, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 130, paddingTop: 10 },
  bar: { width: '70%', borderRadius: 6 },
  barVal: { fontSize: 13, fontWeight: '700', color: C.text },
  barLbl: { fontSize: 13, color: C.textSub },
  source: { fontSize: 13, color: C.textMid, fontWeight: '700', marginTop: 12 },
  disclaimer: { fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 19 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  report: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginTop: 6 },
  reportPrice: { fontSize: 17, fontWeight: '900', color: C.text },
  agro: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  agroIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  agroName: { fontSize: 15, fontWeight: '700', color: C.text },
  agroSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  osm: { fontSize: 13, color: C.textSub, marginTop: 10, lineHeight: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14 },
  linkIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
});
