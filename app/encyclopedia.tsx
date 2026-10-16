// Disease & pest library — search, filter pills, expandable cards, honest
// labels ("Scanner can detect" vs "Reference only"), English or Kiswahili,
// read-aloud for each entry.

import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Chip, Header, Icon, ListenButton, Text, type IconName } from '../components/ui';
import { getLibrary, LIBRARY_FILTERS } from '../lib/encyclopedia';
import { cropName } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C, KIND_META, SHADOW } from '../lib/theme';

const SEV_COLOR: Record<string, string> = { Critical: C.error, High: C.warn, Medium: C.accent, Low: C.textSub };

export default function EncyclopediaScreen() {
  const { t, lang } = useLang();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState<string | null>(null);
  const library = useMemo(() => getLibrary(lang), [lang]);
  const crop = (c: string) => t(cropName(c, lang));

  const list = useMemo(() => {
    let l = library;
    if (filter === 'Scanner can detect') l = l.filter((d) => d.scanLabel);
    else if (['Maize', 'Tomato', 'Potato', 'Beans', 'Wheat'].includes(filter)) l = l.filter((d) => d.crops.includes(filter));
    else if (filter !== 'All') l = l.filter((d) => d.kind === filter);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((d) => [d.name, d.sci, d.kind, t(d.kind), ...d.crops, ...d.crops.map(crop)].some((x) => x.toLowerCase().includes(s)));
    return l;
  }, [q, filter, library]); // eslint-disable-line react-hooks/exhaustive-deps

  const scannable = library.filter((d) => d.scanLabel).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Disease & pest library" subtitle={t('{n} entries, scanner detects {s} diseases', { n: library.length, s: scannable })} dark />
      <View style={st.searchWrap}>
        <View style={st.search}>
          <Icon name="magnify" size={20} color={C.textSub} />
          <TextInput style={st.searchInput} value={q} onChangeText={setQ} placeholder={t('Search disease, pest or crop…')} placeholderTextColor={C.textLight} />
          {q ? (
            <TouchableOpacity onPress={() => setQ('')}>
              <Icon name="close-circle" size={18} color={C.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {LIBRARY_FILTERS.map((f) => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 60 }}
        ListHeaderComponent={<Text style={st.count}>{t('{n} results', { n: list.length })}</Text>}
        renderItem={({ item: d }) => {
          const km = KIND_META[d.kind] ?? KIND_META.Disorder;
          const isOpen = open === d.id;
          const sev = SEV_COLOR[d.severity];
          return (
            <TouchableOpacity style={[st.card, { borderLeftColor: km.color }]} onPress={() => setOpen(isOpen ? null : d.id)} activeOpacity={0.85}>
              <View style={st.top}>
                <View style={[st.kindIcon, { backgroundColor: km.tint }]}>
                  <Icon name={km.icon as IconName} size={20} color={km.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={st.nameRow}>
                    <Text raw style={st.name}>
                      {d.name}
                    </Text>
                    <Badge label={d.severity} color={sev} tint={sev + '1A'} />
                  </View>
                  <Text raw style={st.sci} numberOfLines={1}>
                    {d.sci ? `${d.sci}, ${t(d.kind)}` : t(d.kind)}
                  </Text>
                  <View style={st.tags}>
                    <View style={st.tag}>
                      <Icon name="leaf" size={11} color={C.primary} />
                      <Text raw style={st.tagTxt}>
                        {d.crops.map(crop).join(', ')}
                      </Text>
                    </View>
                    {d.scanLabel ? (
                      <View style={[st.tag, { backgroundColor: C.primary }]}>
                        <Icon name="line-scan" size={11} color="#fff" />
                        <Text style={[st.tagTxt, { color: '#fff' }]}>Scanner can detect</Text>
                      </View>
                    ) : (
                      <View style={[st.tag, { backgroundColor: C.bg }]}>
                        <Text style={[st.tagTxt, { color: C.textSub }]}>Reference only</Text>
                      </View>
                    )}
                    {d.notifiable ? (
                      <View style={[st.tag, { backgroundColor: C.errorTint }]}>
                        <Text style={[st.tagTxt, { color: C.error }]}>Report it</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textSub} />
              </View>
              {isOpen ? (
                <View style={st.body}>
                  <View style={{ marginBottom: 10 }}>
                    <ListenButton text={() => [d.name, d.desc, d.symptoms.join('. '), d.management].filter(Boolean).join('. ')} />
                  </View>
                  {d.desc ? (
                    <Text raw style={st.desc}>
                      {d.desc}
                    </Text>
                  ) : null}
                  <Text style={st.label}>Symptoms</Text>
                  {d.symptoms.map((s) => (
                    <View key={s} style={st.symRow}>
                      <View style={st.dot} />
                      <Text raw style={st.symTxt}>
                        {s}
                      </Text>
                    </View>
                  ))}
                  <View style={st.manage}>
                    <Text style={[st.label, { color: C.primary }]}>Management</Text>
                    <Text raw style={st.manageTxt}>
                      {d.management}
                    </Text>
                    {d.scanLabel ? (
                      <TouchableOpacity style={st.planBtn} onPress={() => router.push({ pathname: '/treatment-plan', params: { label: d.scanLabel! } })}>
                        <Icon name="clipboard-list-outline" size={16} color="#fff" />
                        <Text style={st.planTxt}>View full treatment plan</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={st.planBtn} onPress={() => router.push({ pathname: '/chat' })}>
                        <Icon name="robot-outline" size={16} color="#fff" />
                        <Text style={st.planTxt}>Ask the AI advisor about it</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  searchWrap: { backgroundColor: C.primary, paddingHorizontal: 16, paddingBottom: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },
  count: { fontSize: 12, color: C.textSub, fontWeight: '600', marginBottom: 4 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, borderLeftWidth: 4, ...SHADOW },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kindIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  sci: { fontSize: 12, color: C.textSub, fontStyle: 'italic', marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagTxt: { fontSize: 11, color: C.primary, fontWeight: '700' },
  body: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  desc: { fontSize: 13, color: C.textMid, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '800', color: C.textSub, letterSpacing: 0.8, marginBottom: 8 },
  symRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 7 },
  symTxt: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  manage: { backgroundColor: C.primaryTint, borderRadius: 10, padding: 12, marginTop: 10 },
  manageTxt: { fontSize: 13, color: C.primaryDark, lineHeight: 20, marginBottom: 12 },
  planBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 11 },
  planTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
