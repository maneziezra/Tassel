import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT, RADIUS } from '../lib/theme';
import { CROP_ART } from '../lib/cropArt';
import { locale, tr, useLang } from '../lib/i18n';
import { hasSwahiliVoice, speak, stopSpeaking } from '../lib/speech';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export const Icon = MaterialCommunityIcons;

/** A light tick under the thumb, for steppers, toggles and ticking off tasks. */
export function tick(kind: 'light' | 'select' | 'success' = 'light') {
  try {
    if (kind === 'select') Haptics.selectionAsync();
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no haptics on this phone
  }
}

/**
 * Typography from a text style: text of 20 px and up is set in Archivo
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A pressable that sinks slightly under the finger — the app's one touch feedback. */
export function Press({ style, children, haptic, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children?: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic) tick('select');
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------- crop artwork

const CROP_MATCH: [RegExp, string][] = [
  [/maize|corn|mahindi/, 'Maize'],
  [/tomato|nyanya/, 'Tomato'],
  [/potato|viazi|kiazi/, 'Potato'],
  [/soy/, 'Soybean'],
  [/bean|maharag/, 'Beans'],
  [/wheat|ngano/, 'Wheat'],
  [/apple|tufaha/, 'Apple'],
  [/blueberr/, 'Blueberry'],
  [/cherr/, 'Cherry'],
  [/grape|zabibu/, 'Grape'],
  [/orange|chungwa/, 'Orange'],
  [/peach|pichi/, 'Peach'],
  [/pepper|capsicum|pilipili/, 'Pepper, bell'],
  [/raspberr/, 'Raspberry'],
  [/squash|boga|malenge/, 'Squash'],
  [/strawberr|stroberi/, 'Strawberry'],
  [/kale|sukuma/, 'Kale'],
  [/cabbage|kabichi/, 'Cabbage'],
  [/onion|kitunguu/, 'Onion'],
  [/cassava|muhogo/, 'Cassava'],
  [/banana|ndizi/, 'Banana'],
  [/avocado|parachichi/, 'Avocado'],
];

export function cropArtKey(crop: string | null | undefined): string {
  const c = (crop ?? '').toLowerCase();
  return CROP_MATCH.find(([re]) => re.test(c))?.[1] ?? 'Crop';
}

/** The crop's own illustration on a soft paper disc (Plantix-style, in CropGuard's palette). */
export function CropIcon({ crop, size = 44, disc = true, discColor = '#F1EEE6' }: { crop: string | null | undefined; size?: number; disc?: boolean; discColor?: string }) {
  const art = CROP_ART[cropArtKey(crop)];
  const inner = disc ? Math.round(size * 0.7) : size;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: disc ? discColor : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${art}</svg>`} width={inner} height={inner} />
    </View>
  );
}

// ---------------------------------------------------------------- structure

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
    <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: dark ? C.primaryDark : C.bg }]}>
      {back ? (
        <TouchableOpacity
          accessibilityLabel={t('Go back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[s.backBtn, dark && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
          hitSlop={8}
        >
          <Icon name="chevron-left" size={28} color={fg} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1, paddingLeft: back ? 0 : 8 }}>
        <RNText style={[s.headerTitle, { color: fg }]} numberOfLines={1}>
          {t(title)}
        </RNText>
        {subtitle ? (
          <RNText style={[s.headerSub, { color: dark ? 'rgba(255,255,255,0.78)' : C.textSub }]} numberOfLines={1}>
            {t(subtitle)}
          </RNText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Paper band behind the status bar so scrolled content never runs under the clock. */
export function StatusShade({ color = C.bg }: { color?: string }) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: color, zIndex: 10 }} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children, style, action, onAction }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; action?: string; onAction?: () => void }) {
  return (
    <View style={[s.sectionRow, style]}>
      <Text style={s.sectionLabel}>{children}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={s.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- controls

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
  const palette: Record<BtnKind, { bg: string; fg: string; iconFg?: string }> = {
    primary: { bg: C.primary, fg: '#fff' },
    signature: { bg: C.primaryDark, fg: '#fff', iconFg: C.gold },
    secondary: { bg: C.primaryTint, fg: C.primaryDark },
    ghost: { bg: 'transparent', fg: C.primary },
    danger: { bg: C.errorTint, fg: C.error },
    whatsapp: { bg: C.whatsapp, fg: '#fff' },
  };
  const p = palette[kind];
  return (
    <Press
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.btn, { backgroundColor: p.bg, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Icon name={icon} size={20} color={p.iconFg ?? p.fg} /> : null}
      <RNText style={[s.btnTxt, { color: p.fg }]}>{t(label)}</RNText>
    </Press>
  );
}

export function Chip({ label, active, onPress, icon, raw, crop }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; raw?: boolean; crop?: string }) {
  const { t } = useLang();
  return (
    <TouchableOpacity
      onPress={() => {
        tick('select');
        onPress?.();
      }}
      style={[s.chip, crop ? { paddingLeft: 5 } : null, active && s.chipActive]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      {crop ? <CropIcon crop={crop} size={28} discColor={active ? 'rgba(255,255,255,0.92)' : '#F1EEE6'} /> : null}
      {icon ? <Icon name={icon} size={16} color={active ? '#fff' : C.textSub} /> : null}
      <RNText style={[s.chipTxt, active && { color: '#fff', fontFamily: FONT.bodyBold }]}>{raw ? label : t(label)}</RNText>
    </TouchableOpacity>
  );
}

/** Two to four mutually exclusive choices (iOS-style segmented control). */
export function Segmented<T extends string>({ value, options, onChange, style }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useLang();
  return (
    <View style={[s.seg, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[s.segItem, on && s.segOn]}
            onPress={() => {
              if (!on) tick('select');
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <RNText style={[s.segTxt, on && { color: C.text, fontFamily: FONT.bodyBold }]} numberOfLines={1}>
              {t(o.label)}
            </RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A big number with − and + (hold to run) — the calculator's dial. */
export function Stepper({
  value,
  onChange,
  step = 0.25,
  min = 0,
  max = 1000,
  unit,
  decimals = 2,
  big = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  big?: boolean;
}) {
  const { t } = useLang();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const valRef = useRef(value);
  valRef.current = value;
  const bump = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, Math.round((valRef.current + dir * step) / step) * step));
    if (next !== valRef.current) {
      tick('select');
      valRef.current = Number(next.toFixed(4));
      onChange(valRef.current);
    }
  };
  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const hold = (dir: 1 | -1) => {
    bump(dir);
    release();
    timer.current = setInterval(() => bump(dir), 120);
  };
  useEffect(() => release, []);
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
  return (
    <View style={s.stepper}>
      <Pressable onPressIn={() => hold(-1)} onPressOut={release} style={[s.stepBtn, big && s.stepBtnBig]} accessibilityLabel={t('Less')} accessibilityRole="button">
        <Icon name="minus" size={big ? 28 : 22} color={C.text} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <RNText style={[s.stepVal, big && { fontSize: 56, lineHeight: 62 }]} accessibilityLiveRegion="polite">
          {shown}
        </RNText>
        {unit ? <RNText style={s.stepUnit}>{t(unit)}</RNText> : null}
      </View>
      <Pressable onPressIn={() => hold(1)} onPressOut={release} style={[s.stepBtn, big && s.stepBtnBig]} accessibilityLabel={t('More')} accessibilityRole="button">
        <Icon name="plus" size={big ? 28 : 22} color={C.text} />
      </Pressable>
    </View>
  );
}

export function ProgressBar({ value, color = C.primary, track = C.sunken, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** A sheet that slides up from the bottom for detail that would otherwise crowd a screen. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel={t('Close')}>
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.grabber} />
          {title ? <Text style={s.sheetTitle}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
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

/** A small status dot — how the app shows risk without painting whole panels. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Empty({ icon, title, text, action, crop }: { icon: IconName; title: string; text?: string; action?: React.ReactNode; crop?: string }) {
  return (
    <View style={s.empty}>
      {crop ? <CropIcon crop={crop} size={72} /> : <Icon name={icon} size={44} color={C.textLight} />}
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
      <Dot color={C.error} />
      <Text style={s.errorTxt}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} hitSlop={8}>
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
      style={[s.listen, compact && { paddingHorizontal: 10, paddingVertical: 8 }, light && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
    >
      <Icon name={speaking ? 'stop-circle-outline' : 'volume-high'} size={18} color={color} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontFamily: FONT.display, color: C.text },
  headerSub: { fontSize: 14, fontFamily: FONT.body, marginTop: 1 },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 16, marginHorizontal: 16, marginTop: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 21, fontFamily: FONT.display, color: C.text, flexShrink: 1 },
  sectionAction: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: RADIUS.md, paddingHorizontal: 18 },
  btnTxt: { fontSize: 16, fontFamily: FONT.bodyBold },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 38, borderRadius: RADIUS.full, backgroundColor: C.surface },
  chipActive: { backgroundColor: C.primaryDark },
  chipTxt: { fontSize: 15, fontFamily: FONT.body, color: C.text },
  seg: { flexDirection: 'row', backgroundColor: C.sunken, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 10, paddingHorizontal: 8 },
  segOn: { backgroundColor: C.surface },
  segTxt: { fontSize: 15, fontFamily: FONT.body, color: C.textSub },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.sunken, alignItems: 'center', justifyContent: 'center' },
  stepBtnBig: { width: 60, height: 60, borderRadius: 30 },
  stepVal: { fontSize: 36, lineHeight: 42, fontFamily: FONT.displaySemi, color: C.text },
  stepUnit: { fontSize: 14, fontFamily: FONT.body, color: C.textSub },
  overlay: { flex: 1, backgroundColor: 'rgba(20,35,28,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.border, marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontFamily: FONT.display, color: C.text, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 13, fontFamily: FONT.bodyBold },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 4, textAlign: 'center' },
  emptyText: { fontSize: 15, color: C.textSub, textAlign: 'center', lineHeight: 22 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: RADIUS.sm, padding: 14, marginHorizontal: 16, marginTop: 12 },
  errorTxt: { flex: 1, color: C.text, fontSize: 14 },
  retry: { color: C.primary, fontWeight: '700' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: C.primaryTint, alignSelf: 'flex-start' },
  listenTxt: { fontSize: 14, fontFamily: FONT.bodyBold },
});
