// Outbreak alerts — open directly on a map of Kenya with the farmer's county highlighted.
// Single headline: "Late blight reported by 4 farmers near you this month."
// Filters tucked behind one button. Anonymity rules: >= 2 distinct farmers, totals only.

import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Btn, Card, Chip, Empty, ErrorNote, Header, Icon, Loading, SectionLabel, Text, timeAgo } from '../components/ui';
import { getProfile, listOutbreaks, type Outbreak } from '../lib/data';
import { cropName, getDiseaseL } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { openScanner } from '../lib/navigation';
import { C, FONT, URGENCY_META } from '../lib/theme';
import { KenyaOutbreakMap } from '../components/KenyaOutbreakMap';

export default function OutbreaksScreen() {
  const { t } = useLang();
  const [county, setCounty] = useState<string | null>(null);
  const [scope, setScope] = useState<'county' | 'kenya'>('county');
  const [days, setDays] = useState(30); // Default 30 days per P2 spec
  const [list, setList] = useState<Outbreak[] | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await getProfile();
      setCounty(p.county);
      const useCounty = scope === 'county' ? p.county : null;
      if (scope === 'county' && !p.county) {
        setList([]);
        return;
      }
      const res = await listOutbreaks(useCounty, days);
      if (res === null) {
        setDisabled(true);
        setList([]);
      } else {
        setDisabled(false);
        setList(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load outbreak alerts.'));
      setList([]);
    }
  }, [scope, days, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Top single line summary
  const summaryHeadline = useMemo(() => {
    if (!list || list.length === 0) {
      return county
        ? t('No disease outbreaks reported in {county} County this month.', { county })
        : t('No disease outbreaks reported near you this month.');
    }
    const top = list[0];
    const diseaseName = getDiseaseL(top.class_label)?.disease ?? top.disease;
    const totalFarmers = list.reduce((sum, o) => sum + o.farmers, 0);

    return t('{disease} reported by {n} farmers near you this month.', {
      disease: diseaseName,
      n: totalFarmers,
    });
  }, [list, county, t]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="Outbreak alerts"
        subtitle={scope === 'county' && county ? t('{county} County', { county }) : t('All of Kenya')}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Kenya Outbreak Vector Map */}
        <KenyaOutbreakMap farmerCounty={county} outbreaks={list ?? []} />

        {/* Hero One-Line Headline Card */}
        <View style={st.headlineCard}>
          <View style={st.headlineIconBox}>
            <Icon name={list && list.length > 0 ? 'alert-decagram' : 'shield-check'} size={24} color={list && list.length > 0 ? C.error : C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text raw style={st.headlineTxt}>
              {summaryHeadline}
            </Text>
            <Text style={st.headlineSub}>
              {t('Built anonymously from confident scans by >= 2 farmers.')}
            </Text>
          </View>
        </View>

        {/* Hidden Filters Toggle Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 10 }}>
          <TouchableOpacity style={st.filterToggle} onPress={() => setShowFilters(!showFilters)}>
            <Icon name="tune-variant" size={16} color={C.primary} />
            <Text style={st.filterToggleTxt}>
              {showFilters ? t('Hide filters') : t('Filter timeframe & scope')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Filter Sheet */}
        {showFilters ? (
          <View style={st.filterPanel}>
            <Text style={st.filterTitle}>Scope & Timeframe</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Chip label="My county" active={scope === 'county'} onPress={() => setScope('county')} icon="map-marker" />
              <Chip label="All of Kenya" active={scope === 'kenya'} onPress={() => setScope('kenya')} icon="earth" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Chip label="14 days" active={days === 14} onPress={() => setDays(14)} />
              <Chip label="30 days" active={days === 30} onPress={() => setDays(30)} />
            </View>
          </View>
        ) : null}

        {error ? <ErrorNote message={error} onRetry={load} /> : null}
        {list === null ? <Loading /> : null}

        {disabled ? (
          <Empty
            icon="database-clock-outline"
            title="Outbreak alerts are not switched on yet"
            text="The database update for this feature is pending. Scans you save now will count once it is on."
          />
        ) : scope === 'county' && !county && list !== null ? (
          <Empty
            icon="map-marker-question-outline"
            title="Set your county"
            text="Choose your county in Profile to see outbreaks near you."
            action={
              <Btn
                label="Open Profile"
                icon="account-edit-outline"
                onPress={() => router.navigate('/profile')}
                style={{ marginTop: 12, alignSelf: 'stretch' }}
              />
            }
          />
        ) : list && list.length === 0 && !error ? (
          <Empty
            icon="shield-check-outline"
            title="All clear in your county"
            text="No disease outbreaks confirmed by 2 or more farmers here recently. Keep scanning and saving results — it protects your neighbors."
          />
        ) : null}

        {list && list.length ? (
          <SectionLabel style={{ marginHorizontal: 16, marginTop: 16 }}>Confirmed Outbreaks</SectionLabel>
        ) : null}

        {(list ?? []).map((o) => {
          const d = getDiseaseL(o.class_label);
          const urgency = URGENCY_META[d?.urgency ?? 'medium'];
          return (
            <Card key={`${o.county}-${o.class_label}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[st.count, { backgroundColor: urgency.tint }]}>
                  <Text raw style={[st.countNum, { color: urgency.color }]}>
                    {o.farmers}
                  </Text>
                  <Text style={[st.countLbl, { color: urgency.color }]}>farmers</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text raw style={st.crop}>
                    {cropName(o.crop).toUpperCase()}
                  </Text>
                  <Text raw style={st.disease}>
                    {d?.disease ?? o.disease}
                  </Text>
                  <Text raw style={st.meta}>
                    {t('{county} County', { county: o.county })}, {t('{n} scans', { n: o.reports })}, {t('last {when}', { when: timeAgo(o.last_seen) })}
                  </Text>
                </View>
              </View>

              {d?.notifiable ? (
                <View style={st.notify}>
                  <Icon name="bullhorn-outline" size={16} color={C.error} />
                  <Text style={st.notifyTxt}>Report suspected cases to your county agricultural officer.</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={st.action}
                  onPress={() => router.push({ pathname: '/treatment-plan', params: { label: o.class_label } })}
                >
                  <Icon name="clipboard-list-outline" size={16} color={C.primary} />
                  <Text style={st.actionTxt}>Treatment plan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.action} onPress={openScanner}>
                  <Icon name="camera" size={16} color={C.primary} />
                  <Text style={st.actionTxt}>Check my crop</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  headlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  headlineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headlineTxt: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, lineHeight: 22 },
  headlineSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterToggleTxt: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.primary },
  filterPanel: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterTitle: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.textSub },
  count: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  countNum: { fontSize: 24, fontFamily: FONT.display },
  countLbl: { fontSize: 10, fontFamily: FONT.bodyBold },
  crop: { fontSize: 11, fontFamily: FONT.bodyBold, color: C.textSub, letterSpacing: 0.5 },
  disease: { fontSize: 18, fontFamily: FONT.bodyBold, color: C.text, marginTop: 2 },
  meta: { fontSize: 12, color: C.textSub, marginTop: 4 },
  notify: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.errorTint, padding: 10, borderRadius: 10, marginTop: 12 },
  notifyTxt: { flex: 1, color: C.error, fontSize: 12, fontFamily: FONT.bodyBold },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.primaryTint },
  actionTxt: { color: C.primary, fontFamily: FONT.bodyBold, fontSize: 13 },
});
