// AI farm advisor chat — auto-context from a scan, quick questions, typing
// indicator, connected to Claude via the Supabase Edge Function (the API key
// never touches the phone). v2.1: answers in Kiswahili when the app is in
// Kiswahili, and every answer can be read aloud.

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, Icon, ListenButton, Text } from '../components/ui';
import { askAdvisor, detectionPrompt, type ChatTurn, type ScanContext } from '../lib/advisor';
import { ALL_DISEASES, cropName, localizeDisease } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { C, SHADOW } from '../lib/theme';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; display?: string; error?: boolean; local?: boolean };

const SCAN_QUESTIONS = [
  'How does this disease spread?',
  'What organic treatments can I use?',
  'Roughly what will treatment cost?',
  'How do I prevent this next season?',
  'Can it spread to my other crops?',
];
const GENERAL_QUESTIONS = [
  'When should I top-dress my maize?',
  'How do I control fall armyworm?',
  'Which crops should I rotate with beans?',
  'How do I prevent tomato blight?',
];
const SW_HINT = '\n\n(Tafadhali jibu kwa Kiswahili rahisi.)';

let counter = 0;
const newId = () => `${Date.now()}-${counter++}`;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const params = useLocalSearchParams<{ crop?: string; disease?: string; confidence?: string }>();
  const scan: ScanContext | undefined = params.crop
    ? { crop: params.crop, disease: params.disease, confidence: params.confidence ? Number(params.confidence) : undefined }
    : undefined;

  const listRef = useRef<FlatList<Msg>>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (text: string, display?: string, base: Msg[] = messages) => {
    const typed = text.trim();
    if (!typed || sending) return;
    const content = lang === 'sw' ? typed + SW_HINT : typed;
    const userMsg: Msg = { id: newId(), role: 'user', content, display: display ?? typed };
    const next = [...base, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const history: ChatTurn[] = next.filter((m) => !m.error && !m.local).map((m) => ({ role: m.role, content: m.content }));
      const reply = await askAdvisor(history, scan);
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        { ...userMsg, error: true },
        { id: newId(), role: 'assistant', content: e instanceof Error ? e.message : t('Something went wrong.'), error: true, local: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (scan?.crop && scan.disease) {
      const conf = scan.confidence;
      const prompt = detectionPrompt(scan.crop, scan.disease, conf);
      const shownCrop = cropName(scan.crop, lang);
      const match = ALL_DISEASES.find((d) => d.crop === scan.crop && d.disease === scan.disease);
      const shownDisease = match ? localizeDisease(match, lang).disease : t(scan.disease);
      const display =
        conf === undefined
          ? t('Treatment plan: {crop} — {disease}. Talk me through it.', { crop: shownCrop, disease: shownDisease })
          : t('Scan result: {crop} — {disease} ({pct}%). What should I do?', { crop: shownCrop, disease: shownDisease, pct: Math.round(conf * 100) });
      send(prompt, display, []);
    } else {
      setMessages([
        {
          id: newId(),
          role: 'assistant',
          local: true,
          content: t('Habari! I am the CropGuard farm advisor. Ask me about crop diseases, pests, fertiliser or planting — in English or Kiswahili.'),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.crop, params.disease, params.confidence]);

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const base = messages.filter((m) => !m.error);
    send(lastUser.content.replace(SW_HINT, ''), lastUser.display, base);
  };

  const questions = scan ? SCAN_QUESTIONS : GENERAL_QUESTIONS;
  const showQuick = !sending && messages.filter((m) => m.role === 'user' && !m.error).length <= 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title="AI farm advisor"
        subtitle={scan ? `${cropName(scan.crop ?? '', lang)}, ${(() => { const m = ALL_DISEASES.find((d) => d.crop === scan.crop && d.disease === scan.disease); return m ? localizeDisease(m, lang).disease : t(scan.disease ?? ''); })()}` : 'Powered by Claude, answers may be imperfect'}
        right={<View style={st.online} />}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          return (
            <View style={[st.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              {!mine ? (
                <View style={[st.avatar, item.error && { backgroundColor: C.error }]}>
                  <Icon name={item.error ? 'alert' : 'robot'} size={14} color="#fff" />
                </View>
              ) : null}
              <View style={[st.bubble, mine ? st.mine : st.theirs, item.error && !mine && st.errBubble, item.error && mine && { opacity: 0.6 }]}>
                <Text raw style={[st.text, mine && { color: '#fff' }, item.error && !mine && { color: C.error }]}>
                  {item.display ?? item.content}
                </Text>
                {!mine && !item.error && !item.local ? (
                  <View style={{ marginTop: 8 }}>
                    <ListenButton compact text={item.content} />
                  </View>
                ) : null}
                {item.error && !mine ? (
                  <TouchableOpacity onPress={retryLast} style={{ marginTop: 6 }}>
                    <Text style={{ color: C.primary, fontWeight: '800' }}>Try again</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          sending ? (
            <View style={[st.row, { marginTop: 12 }]}>
              <View style={st.avatar}>
                <Icon name="robot" size={14} color="#fff" />
              </View>
              <View style={[st.bubble, st.theirs, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator size="small" color={C.textSub} />
                <Text style={{ color: C.textSub }}>Thinking…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {showQuick ? (
        <View style={{ paddingBottom: 6 }}>
          <Text style={st.quickLabel}>Quick questions</Text>
          <FlatList
            horizontal
            data={questions}
            keyExtractor={(q) => q}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={st.quick} onPress={() => send(t(item))}>
                <Text style={st.quickTxt}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <View style={[st.inputBar, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={st.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('Ask about your crop… (English or Kiswahili)')}
          placeholderTextColor={C.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={[st.send, (!input.trim() || sending) && { backgroundColor: C.textLight }]} onPress={() => send(input)} disabled={!input.trim() || sending} accessibilityLabel={t('Send')}>
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  online: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.secondary },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12 },
  mine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: C.surface, borderBottomLeftRadius: 4, ...SHADOW },
  errBubble: { backgroundColor: C.errorTint },
  text: { fontSize: 15, lineHeight: 22, color: C.text },
  quickLabel: { fontSize: 11, color: C.textSub, paddingHorizontal: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  quick: { backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.primaryTint },
  quickTxt: { fontSize: 13, color: C.primary, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
});
