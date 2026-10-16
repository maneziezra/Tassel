// CropGuard AI — "Mche" design tokens (v2.1 redesign).
// Cool morning greens, maize gold for the one thing to tap, chilli red only
// when a crop is in danger. Every text colour passes 4.5:1 on its ground.
// The names kept from v1.0 (primary, accent…) now point at the Mche values so
// every screen picks up the new look.

export const C = {
  bg: '#EEF3F0', // Ukungu (mist): the ground behind every screen
  surface: '#FFFFFF', // Karatasi (paper): panels and rows
  primary: '#137A5A', // Chai (tea-estate green): actions, links, healthy. White text 5.3:1
  primaryDark: '#0E5C43',
  primaryTint: '#DCEFE7',
  secondary: '#3DBB8C', // Chai on dark grounds (camera)
  accent: '#F2B630', // Mahindi (maize gold): the scan action and "today". Ink text only
  accentDark: '#7A5300', // maize text on light grounds
  accentTint: '#FCF0CF',
  error: '#C62F2F', // Pilipili (chilli red): disease, outbreaks, act today. White text 5.5:1
  errorTint: '#F8DEDB',
  warn: '#A15C07', // act within 48 h
  warnTint: '#FBE8D3',
  info: '#24609B', // Anga (sky): weather and information
  infoTint: '#DCE8F4',
  text: '#0F2A24', // Usiku (ink)
  textMid: '#2C4A41',
  textSub: '#4E625B',
  textLight: '#6A7D76',
  border: '#D5DED9', // Mstari (line)
  dark: '#0B1E1A', // night ground for the camera
  darkRaised: '#183B33',
  whatsapp: '#25D366',
};

/** Typefaces (loaded in app/_layout.tsx). Archivo Narrow for numbers and titles, Atkinson Hyperlegible for reading. */
export const FONT = {
  display: 'ArchivoNarrow_700Bold',
  displaySemi: 'ArchivoNarrow_600SemiBold',
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
};

/** Type scale: 13 smallest, 14 supporting, 16 body, 20 section, 28 title, 48 numbers. */
export const TYPE = { caption: 13, small: 14, body: 16, section: 20, title: 28, number: 48 };

// Separation comes from paper on mist and 1 px lines, not shadows; only floating controls are lifted.
export const SHADOW = {
  shadowColor: '#0F2A24',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
};

export const RADIUS = { sm: 8, md: 14, lg: 20, xl: 24, full: 999 };

export const CATEGORY_COLOR: Record<string, string> = { Pests: '#A33A1F', Diseases: '#C62F2F', Market: '#137A5A', General: '#24609B' };

/** One confidence scale used everywhere in the app (and by the advisor prompt). */
export function confidenceBand(c: number): { label: string; color: string; tint: string } {
  if (c >= 0.9) return { label: 'High confidence', color: C.primaryDark, tint: C.primaryTint };
  if (c >= 0.75) return { label: 'Medium confidence', color: C.accentDark, tint: C.accentTint };
  return { label: 'Low confidence', color: '#9E1F1F', tint: C.errorTint };
}

export const URGENCY_META: Record<string, { label: string; color: string; tint: string }> = {
  low: { label: 'Low urgency', color: C.primaryDark, tint: C.primaryTint },
  medium: { label: 'Act this week', color: C.accentDark, tint: C.accentTint },
  high: { label: 'Act within 48 h', color: C.warn, tint: C.warnTint },
  critical: { label: 'Act today', color: '#9E1F1F', tint: C.errorTint },
};

export const KIND_META: Record<string, { color: string; tint: string; icon: string }> = {
  Fungal: { color: '#A33A1F', tint: '#F6E1D9', icon: 'mushroom-outline' },
  Oomycete: { color: '#5B4BA0', tint: '#E7E3F4', icon: 'water-outline' },
  Bacterial: { color: '#A15C07', tint: '#FBE8D3', icon: 'bacteria-outline' },
  Viral: { color: '#7A5300', tint: '#FCF0CF', icon: 'virus-outline' },
  Pest: { color: '#24609B', tint: '#DCE8F4', icon: 'bug-outline' },
  Disorder: { color: '#4E625B', tint: '#E4EAE7', icon: 'flask-outline' },
  Healthy: { color: '#137A5A', tint: '#DCEFE7', icon: 'check-circle-outline' },
};
