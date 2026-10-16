// Community forum — v1.0 design (category tabs, rich cards, new-post button),
// backed by real Supabase tables. v2.1: photo thumbnails and scan badges.

import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, Empty, ErrorNote, Icon, Loading, Text, timeAgo } from '../../components/ui';
import { listPosts, photoUrl, type Post } from '../../lib/data';
import { cropName, getDiseaseL } from '../../lib/diseases';
import { useLang } from '../../lib/i18n';
import { C, CATEGORY_COLOR, SHADOW } from '../../lib/theme';

const CATEGORIES = ['All', 'Pests', 'Diseases', 'Market', 'General'];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const [tab, setTab] = useState('All');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (category: string) => {
    try {
      setError(null);
      setPosts(await listPosts(category));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load posts.'));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [load, tab])
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Community</Text>
          <Text style={st.sub}>Ask, share and learn with Kenyan farmers</Text>
        </View>
        <TouchableOpacity style={st.newBtn} onPress={() => router.push('/new-post')} accessibilityLabel={t('New post')}>
          <Icon name="pencil-plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={st.tabBar}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Chip
              label={item}
              active={tab === item}
              onPress={() => {
                setTab(item);
                setPosts(null);
              }}
            />
          )}
        />
      </View>
      {error ? <ErrorNote message={error} onRetry={() => load(tab)} /> : null}
      {posts === null && !error ? (
        <Loading />
      ) : (
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              colors={[C.primary]}
              onRefresh={async () => {
                setRefreshing(true);
                await load(tab);
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            error ? null : (
              <Empty
                icon="forum-outline"
                title={tab === 'All' ? 'No posts yet' : t('No posts in {cat} yet', { cat: t(tab) })}
                text="Be the first to ask a question!"
                action={<Btn label="Post a question" icon="pencil-plus" onPress={() => router.push('/new-post')} style={{ marginTop: 12, paddingHorizontal: 24 }} />}
              />
            )
          }
          renderItem={({ item }) => {
            const color = CATEGORY_COLOR[item.category] ?? C.primary;
            const img = photoUrl(item.photo_path);
            const scan = item.scan_label ? getDiseaseL(item.scan_label) : undefined;
            return (
              <TouchableOpacity style={st.card} onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })} activeOpacity={0.85}>
                <View style={st.authorRow}>
                  <View style={[st.avatar, { backgroundColor: color + '22' }]}>
                    <Text raw style={[st.initial, { color }]}>
                      {item.author_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.author}>
                      {item.author_name}
                    </Text>
                    <Text raw style={st.time}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  <View style={[st.cat, { backgroundColor: color + '1A' }]}>
                    <Text style={[st.catTxt, { color }]}>{item.category}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    {item.crop ? (
                      <View style={st.cropTag}>
                        <Icon name="leaf" size={11} color={C.primary} />
                        <Text raw style={st.cropTxt}>
                          {cropName(item.crop)}
                        </Text>
                      </View>
                    ) : null}
                    <Text raw style={st.postTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text raw style={st.body} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                  {img ? <Image source={{ uri: img }} style={st.thumb} /> : null}
                </View>
                <View style={st.footer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="comment-outline" size={14} color={C.textSub} />
                    <Text raw style={st.footerTxt}>
                      {item.reply_count === 1 ? t('1 reply') : t('{n} replies', { n: item.reply_count })}
                    </Text>
                  </View>
                  {scan ? (
                    <View style={st.scanTag}>
                      <Icon name="line-scan" size={12} color={C.primary} />
                      <Text raw style={st.scanTxt} numberOfLines={1}>
                        {scan.disease}
                      </Text>
                    </View>
                  ) : null}
                  <Icon name="chevron-right" size={16} color={C.textSub} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.surface },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: C.textSub, marginTop: 2, fontWeight: '500' },
  newBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', ...SHADOW },
  tabBar: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, ...SHADOW },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 16, fontWeight: '800' },
  author: { fontSize: 14, fontWeight: '700', color: C.text },
  time: { fontSize: 12, color: C.textLight, marginTop: 1 },
  cat: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  catTxt: { fontSize: 11, fontWeight: '800' },
  cropTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cropTxt: { fontSize: 12, color: C.primary, fontWeight: '700' },
  postTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6, lineHeight: 22 },
  body: { fontSize: 13, color: C.textMid, lineHeight: 20 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: C.border },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  footerTxt: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  scanTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  scanTxt: { fontSize: 11, color: C.primary, fontWeight: '700', flexShrink: 1 },
});
