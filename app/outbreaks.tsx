// Outbreak alerts — diseases that several farmers' scans confirmed in a county
// recently. Like Plantix's district alerts, but built only from anonymous
// counts: a disease is listed only when at least 2 different farmers saved a
// confident scan of it, and no names, fields or locations are ever shown.

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Btn, Card, Chip, Empty, ErrorNote, Header, Icon, Loading, SectionLabel, Text, timeAgo } from '../components/ui';
import { getProfile, listOutbreaks, type Outbreak } from '../lib/data';
import { cropName, getDiseaseL } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C, URGENCY_META } from '../lib/theme';

export default function OutbreaksScreen() {
  const { t } = useLang();
  const [county, setCounty] = useState<string | null>(null);
  const [scope, setScope] = useState<'county' | 'kenya'>('county');
  const [days, setDays] = useState(14);
  const [list, setList] = useState<Outbreak[] | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Outbreak alerts" subtitle={scope === 'county' && county ? t('{county} County', { county }) : t('All of Kenya')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}>
        <View style={st.filters}>
          <Chip label="My county" active={scope === 'county'} onPress={() => setScope('county')} icon="map-marker" />
          <Chip label="All of Kenya" active={scope === 'kenya'} onPress={() => setScope('kenya')} icon="earth" />
          <Chip label="14 days" active={days === 14} onPress={() => setDays(14)} />
          <Chip label="30 days" active={days === 30} onPress={() => setDays(30)} />
        </View>

        <Card style={{ backgroundColor: C.infoTint }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="shield-account-outline" size={20} color={C.info} />
            <Text style={st.note}>
              Built from confident scans that farmers saved in CropGuard. A disease appears only when at least 2 different farmers found it, and no names or farm locations are shared.
            </Text>
          </View>
        </Card>

        {error ? <ErrorNote message={error} onRetry={load} /> : null}
        {list === null ? <Loading /> : null}

        {disabled ? (
          <Empty icon="database-clock-outline" title="Outbreak alerts are not switched on yet" text="The database update for this feature is pending. Scans you save now will count once it is on." />
        ) : scope === 'county' && !county && list !== null ? (
          <Empty
            icon="map-marker-question-outline"
            title="Set your county"
            text="Choose your county in Profile to see outbreaks near you."
            action={<Btn label="Open Profile" icon="account-edit-outline" onPress={() => router.navigate('/profile')} style={{ marginTop: 12, alignSelf: 'stretch' }} />}
          />
        ) : list && list.length === 0 && !error ? (
          <Empty icon="shield-check-outline" title="No outbreaks reported" text="No disease has been confirmed by 2 or more farmers here recently. Keep scanning and saving your results — it helps your neighbours." />
        ) : null}

        {list && list.length ? <SectionLabel style={{ marginHorizontal: 16, marginTop: 18 }}>Reported recently</SectionLabel> : null}
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
                <TouchableOpacity style={st.action} onPress={() => router.push({ pathname: '/treatment-plan', params: { label: o.class_label } })}>
                  <Icon name="clipboard-list-outline" size={16} color={C.primary} />
                  <Text style={st.actionTxt}>Treatment plan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.action} onPress={() => router.navigate('/scan')}>
                  <Icon name="line-scan" size={16} color={C.primary} />
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  note: { flex: 1, fontSize: 13, color: C.info, lineHeight: 19 },
  count: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  countNum: { fontSize: 24, fontWeight: '900' },
  countLbl: { fontSize: 10, fontWeight: '800' },
  crop: { fontSize: 11, fontWeight: '800', color: C.textSub, letterSpacing: 0.5 },
  disease: { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 2 },
  meta: { fontSize: 12, color: C.textSub, marginTop: 4 },
  notify: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.errorTint, padding: 10, borderRadius: 10, marginTop: 12 },
  notifyTxt: { flex: 1, color: C.error, fontSize: 12, fontWeight: '700' },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.primaryTint },
  actionTxt: { color: C.primary, fontWeight: '800', fontSize: 13 },
});
