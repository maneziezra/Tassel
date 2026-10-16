import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text as RNText, TouchableOpacity, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT, RADIUS } from '../lib/theme';
import { locale, tr, useLang } from '../lib/i18n';
import { hasSwahiliVoice, speak, stopSpeaking } from '../lib/speech';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export const Icon = MaterialCommunityIcons;

/**
 * Mche typography from a text style: text of 20 px and up is set in Archivo
 * Narrow (numbers, titles), everything else in Atkinson Hyperlegible. Nothing
 * goes below 13 px, and no text is set in capitals.
 */
export function typeface(style: StyleProp<TextStyle>): TextStyle {
  const f = StyleSheet.flatten(style) ?? {};
  if (f.fontFamily) return {};
  const size = f.fontSize ?? 14;
  const w = f.fontWeight === 'bold' ? 700 : Number(f.fontWeight ?? 400);
  const fontFamily = size >= 20 ? (w >= 700 ? FONT.display : FONT.displaySemi) : w >= 600 ? FONT.bodyBold : FONT.body;
  const out: TextStyle = { fontFamily, fontWeight: 'normal' };
  if (size < 13) out.fontSize = 13;
  if (f.textTransform === 'uppercase') {
    out.textTransform = 'none';
    out.letterSpacing = 0;
  }
  return out;
}

/**
 * Text that follows the app language. Plain string children are looked up in
 * the Kiswahili dictionary. Pass `raw` for user content (names, posts) so it is
 * never translated.
 */
export function Text({ children, raw, style, ...rest }: TextProps & { raw?: boolean }) {
  const { t } = useLang();
  const st = [style, typeface(style)];
  if (raw) return <RNText {...rest} style={st}>{children}</RNText>;
  const map = (c: React.ReactNode): React.ReactNode => (typeof c === 'string' ? t(c) : c);
  return <RNText {...rest} style={st}>{Array.isArray(children) ? children.map(map) : map(children)}</RNText>;
}

export function Header({
  title,
  subtitle,
  back = true,
  right,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const fg = dark ? '#fff' : C.text;
  return (
    <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: dark ? C.primary : C.surface }]}>
      {back ? (
        <TouchableOpacity
          accessibilityLabel={t('Go back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[s.backBtn, dark && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
        >
          <Icon name="arrow-left" size={22} color={fg} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <RNText style={[s.headerTitle, { color: fg }]} numberOfLines={1}>
          {t(title)}
        </RNText>
        {subtitle ? (
          <RNText style={[s.headerSub, { color: dark ? 'rgba(255,255,255,0.8)' : C.textSub }]} numberOfLines={1}>
            {t(subtitle)}
          </RNText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={s.sectionLabel}>{children}</Text>
    </View>
  );
}

type BtnKind = 'primary' | 'signature' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
export function Btn({
  label,
  icon,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useLang();
  const palette: Record<BtnKind, { bg: string; fg: string; border?: string }> = {
    primary: { bg: C.primary, fg: '#fff' },
    signature: { bg: C.accent, fg: C.text },
    secondary: { bg: C.surface, fg: C.primary, border: C.primary },
    ghost: { bg: 'transparent', fg: C.textMid },
    danger: { bg: C.errorTint, fg: C.error },
    whatsapp: { bg: C.whatsapp, fg: '#fff' },
  };
  const p = palette[kind];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        s.btn,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent', borderWidth: p.border ? 1.5 : 0, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Icon name={icon} size={20} color={p.fg} /> : null}
      <RNText style={[s.btnTxt, { color: p.fg }]}>{t(label)}</RNText>
    </TouchableOpacity>
  );
}

export function Chip({ label, active, onPress, icon, raw }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; raw?: boolean }) {
  const { t } = useLang();
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]} activeOpacity={0.8}>
      {icon ? <Icon name={icon} size={14} color={active ? '#fff' : C.textSub} /> : null}
      <RNText style={[s.chipTxt, active && { color: '#fff', fontFamily: FONT.bodyBold }]}>{raw ? label : t(label)}</RNText>
    </TouchableOpacity>
  );
}

export function Badge({ label, color, tint }: { label: string; color: string; tint: string }) {
  const { t } = useLang();
  return (
    <View style={[s.badge, { backgroundColor: tint }]}>
      <RNText style={[s.badgeTxt, { color }]}>{t(label)}</RNText>
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={s.empty}>
      <Icon name={icon} size={56} color={C.border} />
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
      {action}
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator size="large" color={C.primary} />
      {text ? <Text style={{ color: C.textSub }}>{text}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.errorBox}>
      <Icon name="alert-circle-outline" size={18} color={C.error} />
      <Text style={s.errorTxt}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={s.retry}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

let voiceHintShown = false;

/** "Listen" — reads the given text aloud in the app language. */
export function ListenButton({ text, compact, light }: { text: string | (() => string); compact?: boolean; light?: boolean }) {
  const { t, lang } = useLang();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const color = light ? '#fff' : C.primary;
  const toggle = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (lang === 'sw' && !voiceHintShown && !(await hasSwahiliVoice())) {
      voiceHintShown = true;
      Alert.alert(
        t('Kiswahili voice not installed'),
        t('Your phone will read the Kiswahili text with its default voice. For a better voice, open Settings → Language → Text-to-speech and install Kiswahili.')
      );
    }
    setSpeaking(true);
    await speak(typeof text === 'function' ? text() : text, { lang, onDone: () => setSpeaking(false) });
  };
  return (
    <TouchableOpacity
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={speaking ? t('Stop reading') : t('Read aloud')}
      style={[s.listen, compact && { paddingHorizontal: 10, paddingVertical: 6 }, light && { backgroundColor: 'rgba(255,255,255,0.18)' }]}
    >
      <Icon name={speaking ? 'stop-circle-outline' : 'volume-high'} size={compact ? 16 : 18} color={color} />
      {compact ? null : <RNText style={[s.listenTxt, { color }]}>{speaking ? t('Stop') : t('Listen')}</RNText>}
    </TouchableOpacity>
  );
}

export function timeAgo(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return tr('just now');
  if (sec < 3600) return tr('{n} min ago', { n: Math.floor(sec / 60) });
  if (sec < 86400) return tr('{n} h ago', { n: Math.floor(sec / 3600) });
  if (sec < 7 * 86400) return tr('{n} d ago', { n: Math.floor(sec / 86400) });
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: FONT.display },
  headerSub: { fontSize: 13, fontFamily: FONT.body, marginTop: 1 },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: 16, marginHorizontal: 16, marginTop: 12 },
  sectionLabel: { fontSize: 18, fontFamily: FONT.displaySemi, color: C.text, marginBottom: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: RADIUS.md, paddingHorizontal: 16 },
  btnTxt: { fontSize: 16, fontFamily: FONT.bodyBold },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: C.surface, borderWidth: 1.5, borderColor: '#C9D6D0' },
  chipActive: { backgroundColor: C.text, borderColor: C.text },
  chipTxt: { fontSize: 14, fontFamily: FONT.body, color: C.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 13, fontFamily: FONT.bodyBold },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.textMid, marginTop: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.errorTint, borderRadius: RADIUS.sm, padding: 12, marginHorizontal: 16, marginTop: 12 },
  errorTxt: { flex: 1, color: C.error, fontSize: 13, fontWeight: '600' },
  retry: { color: C.primary, fontWeight: '800' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: C.primaryTint, alignSelf: 'flex-start' },
  listenTxt: { fontSize: 14, fontFamily: FONT.bodyBold },
});
