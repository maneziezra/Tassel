// Forum thread — real replies, authors can delete, anyone can report (3 reports
// hide a post). v2.1: photo and attached scan result.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorNote, Header, Icon, Loading, Text, timeAgo } from '../../components/ui';
import { addReply, deletePost, flagPost, getPost, listReplies, photoUrl, type Post, type Reply } from '../../lib/data';
import { cropName, getDiseaseL } from '../../lib/diseases';
import { useSession } from '../../lib/session';
import { useLang } from '../../lib/i18n';
import { C, CATEGORY_COLOR } from '../../lib/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { session } = useSession();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, r] = await Promise.all([getPost(id), listReplies(id)]);
      setPost(p);
      setReplies(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load the post.'));
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await addReply(id, text);
      setReplies((prev) => [...prev, r]);
      setText('');
    } catch (e) {
      Alert.alert(t('Reply not sent'), e instanceof Error ? e.message : '');
    } finally {
      setSending(false);
    }
  };

  const share = () => {
    if (!post) return;
    Share.share({ message: `${t('CropGuard Community')}\n\n${post.title}\n\n${post.body}\n\n${t('Posted by {name} on CropGuard AI', { name: post.author_name })}` });
  };

  const report = () =>
    Alert.alert(t('Report this post?'), t('Report posts that are spam, abusive, or give dangerous advice. Posts reported by 3 people are hidden.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Report'),
        style: 'destructive',
        onPress: async () => {
          try {
            await flagPost(id, 'reported in app');
            Alert.alert(t('Thank you'), t('The post has been reported.'));
          } catch (e) {
            Alert.alert(t('Could not report'), e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  const remove = () =>
    Alert.alert(t('Delete your post?'), t('This also deletes its replies.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id);
            router.back();
          } catch (e) {
            Alert.alert(t('Could not delete'), e instanceof Error ? e.message : '');
          }
        },
      },
    ]);

  const mine = post && session?.user.id === post.author;
  const color = post ? CATEGORY_COLOR[post.category] ?? C.primary : C.primary;
  const img = post ? photoUrl(post.photo_path) : null;
  const scan = post?.scan_label ? getDiseaseL(post.scan_label) : undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title="Post"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={share} style={st.iconBtn} accessibilityLabel={t('Share')}>
              <Icon name="share-variant-outline" size={20} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={mine ? remove : report} style={st.iconBtn} accessibilityLabel={mine ? t('Delete post') : t('Report post')}>
              <Icon name={mine ? 'delete-outline' : 'flag-outline'} size={20} color={mine ? C.error : C.textSub} />
            </TouchableOpacity>
          </View>
        }
      />
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {post === undefined && !error ? (
        <Loading />
      ) : post === null ? (
        <Text style={{ padding: 24, color: C.textSub }}>This post was deleted or hidden.</Text>
      ) : post ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
          <View style={st.authorRow}>
            <View style={[st.avatar, { backgroundColor: color }]}>
              <Text raw style={st.avatarTxt}>
                {post.author_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text raw style={st.author}>
                {post.author_name}
                {mine ? ` (${t('you')})` : ''}
              </Text>
              <Text raw style={st.date}>
                {timeAgo(post.created_at)}
              </Text>
            </View>
            <View style={[st.cat, { backgroundColor: color + '1A' }]}>
              <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{post.category}</Text>
            </View>
          </View>
          {post.crop ? (
            <View style={st.cropTag}>
              <Icon name="leaf" size={12} color={C.primary} />
              <Text raw style={st.cropTxt}>
                {cropName(post.crop)}
              </Text>
            </View>
          ) : null}
          <Text raw style={st.title}>
            {post.title}
          </Text>
          {img ? <Image source={{ uri: img }} style={st.photo} resizeMode="cover" /> : null}
          {post.scan_label ? (
            <TouchableOpacity style={st.scan} onPress={() => router.push({ pathname: '/result', params: { label: post.scan_label!, confidence: String(post.scan_confidence ?? 0) } })}>
              <Icon name="line-scan" size={18} color={C.primary} />
              <Text raw style={st.scanTxt}>
                {t('Scanner result')}: {scan?.disease ?? post.scan_label}
                {post.scan_confidence != null ? `, ${Math.round(post.scan_confidence * 100)}%` : ''}
              </Text>
              <Icon name="chevron-right" size={18} color={C.primary} />
            </TouchableOpacity>
          ) : null}
          <Text raw style={st.body}>
            {post.body}
          </Text>

          <Text style={st.repliesTitle}>{t('Replies ({n})', { n: replies.length })}</Text>
          {replies.length ? (
            replies.map((r) => (
              <View key={r.id} style={st.reply}>
                <Text raw style={st.replyAuthor}>
                  {r.author_name}
                  {r.author === session?.user.id ? ` (${t('you')})` : ''}, <Text raw style={st.date}>{timeAgo(r.created_at)}</Text>
                </Text>
                <Text raw style={st.replyBody}>
                  {r.body}
                </Text>
              </View>
            ))
          ) : (
            <View style={st.noReplies}>
              <Icon name="comment-outline" size={36} color={C.border} />
              <Text style={{ color: C.textSub, marginTop: 8 }}>No replies yet. Be the first to help!</Text>
            </View>
          )}
          <Text style={st.disclaimer}>Advice from other farmers is not checked. Confirm pesticide advice with an agro-dealer or extension officer.</Text>
        </ScrollView>
      ) : null}

      {post ? (
        <View style={[st.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput style={st.input} value={text} onChangeText={setText} placeholder={t('Write a reply…')} placeholderTextColor={C.textLight} multiline maxLength={2000} />
          <TouchableOpacity style={[st.send, (!text.trim() || sending) && { backgroundColor: C.textLight }]} onPress={send} disabled={!text.trim() || sending} accessibilityLabel={t('Send')}>
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  author: { fontSize: 15, fontWeight: '800', color: C.text },
  date: { fontSize: 12, color: C.textSub, fontWeight: '400' },
  cat: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cropTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', marginBottom: 12 },
  cropTxt: { fontSize: 12, color: C.primary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: C.text, lineHeight: 28, marginBottom: 12 },
  photo: { width: '100%', height: 240, borderRadius: 14, marginBottom: 12, backgroundColor: C.border },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primaryTint, padding: 12, borderRadius: 12, marginBottom: 12 },
  scanTxt: { flex: 1, color: C.primaryDark, fontWeight: '800', fontSize: 13 },
  body: { fontSize: 16, color: C.textMid, lineHeight: 24 },
  repliesTitle: { fontSize: 12, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 28, marginBottom: 12 },
  reply: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  replyAuthor: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 4 },
  replyBody: { fontSize: 15, color: C.textMid, lineHeight: 22 },
  noReplies: { alignItems: 'center', paddingVertical: 28, backgroundColor: C.surface, borderRadius: 14 },
  disclaimer: { fontSize: 11, color: C.textLight, marginTop: 16, textAlign: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
});
