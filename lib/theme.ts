// Tassel — "Shamba" design tokens (v2.2 redesign).
//
// Calm by default: warm paper ground, white panels, one deep forest green for
// actions. Colour is earned — it comes from the crop artwork and photos, and
// from clay red only when a crop is genuinely at risk. No tinted tiles behind
// icons, no rainbow categories, no full-width divider lines: grouping comes
// from white panels and space. Every text colour passes 4.5:1 on its ground.
//
// The key names kept from v1/v2.1 (primary, accent, error…) point at the
// Shamba values so every screen picks up the new look.

export const C = {
  bg: '#F4F2EC', // paper: the ground behind every screen
  surface: '#FFFFFF', // panels and rows
  sunken: '#EFECE4', // wells, tracks, inactive segments
  primary: '#2E6A4F', // forest green: actions, links, healthy. White text 6.6:1
  primaryDark: '#1F4D39', // the scan action and dark panels
  primaryTint: '#E3EDE6',
  secondary: '#8FC2A5', // green on dark grounds (camera, dark panels)
  accent: '#1F4D39', // the one signature action (scan). Was maize gold in v2.1
  accentDark: '#7A5A14', // ochre text for "medium" states on light grounds
  accentTint: '#F3EEDF',
  gold: '#E8C25A', // maize gold: only the scan glyph and today's marker on dark grounds
  error: '#A8472A', // clay: disease, outbreaks, act today. White text 5.6:1
  errorTint: '#F6E7E0',
  warn: '#7A5A14', // act within 48 h (ochre text)
  warnTint: '#F3EEDF',
  info: '#3F5560', // weather and information: a quiet slate, not a second brand colour
  infoTint: '#EBEFEF',
  text: '#1E2E26', // ink
  textMid: '#34443C',
  textSub: '#5E6B64',
  textLight: '#7A867F',
  border: '#E3DFD5', // only for input outlines and focus, never for dividers
  dark: '#14231C', // night ground for the camera
  darkRaised: '#1F4D39',
  brandDark: '#1E3A2A', // Tassel forest dark: hero satellite & scan cards
  brandGround: '#101D16', // Deep ground
  brandCream: '#F4F1E6', // Tassel cream
  brandGold: '#E2B33C', // Maize gold
  whatsapp: '#25D366',
};

/** Typefaces (loaded in app/_layout.tsx). Archivo Narrow for numbers and titles, Atkinson Hyperlegible for reading. */
export const FONT = {
  display: 'ArchivoNarrow_700Bold',
  displaySemi: 'ArchivoNarrow_600SemiBold',
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
};

/** Type scale: 13 smallest, 15 supporting, 16 body, 22 section, 32 title, 44 numbers. */
export const TYPE = { caption: 13, small: 15, body: 16, section: 22, title: 32, number: 44 };

/** Spacing steps. Screens use 16 side margins and 28 between sections. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, section: 28 };

// Panels sit on paper without shadows; only floating controls are lifted.
export const SHADOW = {
  shadowColor: '#1E2E26',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
};

/** Three radii only: small controls, panels, the big actions. Pills for chips. */
export const RADIUS = { sm: 10, md: 16, lg: 16, xl: 20, full: 999 };

/** Community categories: told apart by their word, not by colour. */
export const CATEGORY_COLOR: Record<string, string> = { Pests: C.textMid, Diseases: C.error, Market: C.primary, General: C.textMid };

/** One confidence scale used everywhere in the app (and by the advisor prompt). `word` is what the farmer reads. */
export function confidenceBand(c: number): { label: string; word: string; color: string; tint: string } {
  if (c >= 0.9) return { label: 'High confidence', word: 'Sure', color: C.primaryDark, tint: C.primaryTint };
  if (c >= 0.75) return { label: 'Medium confidence', word: 'Fairly sure', color: C.accentDark, tint: C.accentTint };
  return { label: 'Low confidence', word: 'Not sure', color: C.error, tint: C.errorTint };
}

export const URGENCY_META: Record<string, { label: string; color: string; tint: string }> = {
  low: { label: 'Low urgency', color: C.primaryDark, tint: C.primaryTint },
  medium: { label: 'Act this week', color: C.accentDark, tint: C.accentTint },
  high: { label: 'Act within 48 h', color: C.error, tint: C.errorTint },
  critical: { label: 'Act today', color: C.error, tint: C.errorTint },
};

/** Kinds of problem: one neutral style, the icon and word tell them apart. */
const NEUTRAL = { color: C.textMid, tint: C.sunken };
export const KIND_META: Record<string, { color: string; tint: string; icon: string }> = {
  Fungal: { ...NEUTRAL, icon: 'mushroom-outline' },
  Oomycete: { ...NEUTRAL, icon: 'water-outline' },
  Bacterial: { ...NEUTRAL, icon: 'bacteria-outline' },
  Viral: { ...NEUTRAL, icon: 'virus-outline' },
  Pest: { ...NEUTRAL, icon: 'bug-outline' },
  Algal: { ...NEUTRAL, icon: 'leaf-circle-outline' },
  Disorder: { ...NEUTRAL, icon: 'flask-outline' },
  Healthy: { color: C.primary, tint: C.primaryTint, icon: 'check-circle-outline' },
};
