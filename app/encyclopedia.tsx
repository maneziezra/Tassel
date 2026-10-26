// Disease & pest library — search, filter pills, expandable cards, honest
// labels ("Scanner can detect" vs "Reference only"), English or Kiswahili,
// read-aloud for each entry.

import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Chip, CropIcon, Dot, Header, Icon, ListenButton, Text } from '../components/ui';
import { getLibrary, LIBRARY_CROPS, LIBRARY_FILTERS } from '../lib/encyclopedia';
import { cropName } from '../lib/diseases';
import { openScanner } from '../lib/navigation';
import { useLang } from '../lib/i18n';
import { C, FONT } from '../lib/theme';

const SEV_COLOR: Record<string, string> = { Critical: C.error, High: C.error, Medium: C.accentDark, Low: C.textSub };

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
    else if (LIBRARY_CROPS.includes(filter)) l = l.filter((d) => d.crops.includes(filter));
    else if (filter !== 'All') l = l.filter((d) => d.kind === filter);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((d) => [d.name, d.sci, d.kind, t(d.kind), ...d.crops, ...d.crops.map(crop)].some((x) => x.toLowerCase().includes(s)));
    return l;
  }, [q, filter, library]); // eslint-disable-line react-hooks/exhaustive-deps

  const scannable = library.filter((d) => d.scanLabel).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Disease & pest library" subtitle={t('{n} entries, scanner detects {s} diseases', { n: library.length, s: scannable })} />
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
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
          {LIBRARY_FILTERS.map((f) => (
            <Chip key={f} label={f} crop={LIBRARY_CROPS.includes(f) ? f : undefined} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, paddingBottom: 60 }}
        ListHeaderComponent={<Text style={st.count}>{t('{n} results', { n: list.length })}</Text>}
        renderItem={({ item: d }) => {
          const isOpen = open === d.id;
          const sev = SEV_COLOR[d.severity];
          return (
            <TouchableOpacity style={st.card} onPress={() => setOpen(isOpen ? null : d.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <View style={st.top}>
                <CropIcon crop={d.crops[0]} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text raw style={st.name}>
                    {d.name}
                  </Text>
                  <Text raw style={st.sci} numberOfLines={1}>
                    {[d.crops.map(crop).join(', '), t(d.kind)].join(' · ')}
                  </Text>
                  <View style={st.tags}>
                    <Dot color={sev} size={7} />
                    <Text style={[st.tagTxt, { color: sev }]}>{d.severity}</Text>
                    {d.scanLabel ? (
                      <>
                        <Text raw style={st.tagTxt}>·</Text>
                        <Icon name="line-scan" size={14} color={C.primary} />
                        <Text style={[st.tagTxt, { color: C.primary }]}>Scanner can detect</Text>
                      </>
                    ) : null}
                    {d.notifiable ? (
                      <>
                        <Text raw style={st.tagTxt}>·</Text>
                        <Text style={[st.tagTxt, { color: C.error }]}>Report it</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={C.textLight} />
              </View>
              {isOpen ? (
                <View style={st.body}>
                  {d.sci ? (
                    <Text raw style={[st.sci, { fontStyle: 'italic', marginBottom: 10 }]}>
                      {d.sci}
                    </Text>
                  ) : null}
                  {d.desc ? (
                    <Text raw style={st.desc}>
                      {d.desc}
                    </Text>
                  ) : null}
                  <Text style={st.label}>Symptoms</Text>
                  {d.symptoms.map((s) => (
                    <View key={s} style={st.symRow}>
                      <View style={{ paddingTop: 8 }}>
                        <Dot color={C.textLight} size={5} />
                      </View>
                      <Text raw style={st.symTxt}>
                        {s}
                      </Text>
                    </View>
                  ))}
                  <Text style={[st.label, { marginTop: 14 }]}>Management</Text>
                  <Text raw style={st.desc}>
                    {d.management}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
                    <ListenButton text={() => [d.name, d.desc, d.symptoms.join('. '), d.management].filter(Boolean).join('. ')} />
                    {d.scanLabel ? (
                      <Btn label="Treatment plan" icon="clipboard-list-outline" kind="secondary" style={{ flex: 1, minHeight: 44 }} onPress={() => router.push({ pathname: '/treatment-plan', params: { label: d.scanLabel! } })} />
                    ) : (
                      <Btn label="Ask the AI advisor" icon="chat-processing-outline" kind="secondary" style={{ flex: 1, minHeight: 44 }} onPress={() => router.push({ pathname: '/chat' })} />
                    )}
                  </View>
                  {d.scanLabel ? <Btn label="Scan a leaf" icon="line-scan" kind="signature" style={{ marginTop: 10 }} onPress={openScanner} /> : null}
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
  searchWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontSize: 16, color: C.text, padding: 0, fontFamily: FONT.body },
  count: { fontSize: 14, color: C.textSub, marginBottom: 4 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  sci: { fontSize: 14, color: C.textSub },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  tagTxt: { fontSize: 14, color: C.textSub, fontFamily: FONT.bodyBold },
  body: { marginTop: 14 },
  desc: { fontSize: 15, color: C.textMid, lineHeight: 22, marginBottom: 6 },
  label: { fontSize: 16, fontFamily: FONT.bodyBold, color: C.text, marginBottom: 6 },
  symRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  symTxt: { flex: 1, fontSize: 15, color: C.textMid, lineHeight: 22 },
});
