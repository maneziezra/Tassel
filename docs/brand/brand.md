# Tassel — brand

Single source of truth for the name, voice, content rules and visual identity.
Consolidated 29 Oct 2026 from the rename decision (19 Oct), the Shamba design system
(v2.2, 17 Oct), the Instagram design system (21 Oct) and the v2.0/v2.1 revision report.

Anything that contradicts this file is out of date. Anything not in this file is not
settled — ask before inventing it.

---

## 1. The name

**Tassel** — crop health for Kenyan farms. Formerly CropGuard AI.

The tassel is the maize flower. Tasselling is the season's most stress-sensitive stage,
and every Kenyan maize farmer and extension officer knows the word.

Why not CropGuard: the name was crowded (a US CROPGUARD trademark, a Gemini competition
project "Crop Guard", an Indian "Farmer Cropguard"), and "guard" read like a pesticide
brand — against the app's commercial neutrality between products.

Known weaknesses, stated rather than hidden: "tassel" is a common English word and so is
harder to own, and it can read as maize-only. The only clash found was Tassl, an alumni
networking app.

**Still open before publishing:** KIPI trademark search, `.co.ke` / `.com` domain check.

In KSEF and other material that predates the rename, present it as
**"Tassel (formerly CropGuard AI)"** so earlier documents still match.

### Technical identity (v2.4.0)

| | |
|---|---|
| Display name | Tassel |
| Package | `ke.tassel.app` — permanent once on Play |
| URL scheme | `tassel://` |
| versionCode | 4 |
| Edge Functions | `advisor-chat` v7, `photo-check` v3 |

Repo and folder names still say CropGuard. Internal identifiers are kept on purpose —
the model file `cropguard.tflite`, storage keys and SQL file names. Do not rename them.

---

## 2. Positioning

> The crop doctor that works without data, speaks Kiswahili and follows Kenyan rules.

Five pillars, in order:

1. **Offline first** — the leaf scan runs on the phone. Competitors need a connection to diagnose.
2. **Kenya-specific** — PCPB 2025 restrictions applied, 47 counties, KAMIS/KIAMIS links, local agro-dealers.
3. **Honest** — states what the model can and cannot detect, and never invents a diagnosis or a dose.
4. **Private** — no ads, no third-party sharing, leaf photos stay on the phone.
5. **Field-level** — draw the shamba, measure acres, track each field's history and plan.

**Where competitors are ahead.** Say this plainly to judges and investors rather than
letting them find it: Plantix covers 780+ problems to Tassel's 154 classes; Tassel's
real-field accuracy in Kenya is untested; reach and language count are far behind; market
prices are monthly reference figures, not live; there are no verified experts yet.

---

## 3. Voice

Short, plain sentences. Honest about limits. Write for someone holding a phone in a field,
not for a conference audience.

- English and Kiswahili. Use the app's own Kiswahili strings from `lib/sw.ts` — do not translate fresh.
- No emoji, in the UI or in captions or in images.
- Tagline: **Kagua kwanza. Check first.**
- Say what the app does, not what the category does. No "smart farming", no "precision agtech", no "AI-powered".
- Name the limit in the same breath as the feature: "works without data" belongs next to "the scan, not the satellite check".

---

## 4. Content rules

These are non-negotiable and apply to the app, the store listing, social posts, the
write-up and investor material alike.

- **Every number comes from the app's code or the model labels. Never from memory.**
- **Active ingredients only. Never a brand name. Never a dose.** PCPB-registered products only.
- **No claim the app cannot back up.** Label example scans, example prices and rebuilt screens as "Example".
- When showing product swaps side by side, label them as swaps ("Or, instead of DAP") so they never read as "buy all of these".
- Do not claim the satellite check works offline. Only the leaf scan runs on the phone; the satellite health check calls an Edge Function and needs a connection.
- Do not publish an accuracy figure without checking which model shipped. The model in the app is **v5, 154 classes**: test-set accuracy 0.9404, macro F1 0.9266. **Field accuracy in Kenya is untested.** Older figures in earlier drafts (97.4%) refer to a superseded PlantVillage-only model and must not be reused.
- Below 75% confidence the app says "Not sure". One threshold, used by the app and the AI advisor alike. Reflect that in any material that shows a result.

---

## 5. Logo

A single line, round ends, no fill — a monoline mark.

The mark is a T-shaped tassel with drooping branches and small spikes on top, a faded gold
sun behind it, and one orbit line passing behind the tassel and ending in a gold satellite
dot. The orbit and dot are the Sentinel-2 feature.

**Use the official SVGs. Never redraw the logo and never invent a new look.**

- `docs/brand/tassel_mark_on_green.svg`
- `docs/brand/tassel_mark_on_paper.svg`

Sun opacity is about 55% on green and 45% on paper. On the dark social ground the dark
outline stroke is set to the ground colour (`#101D16`, width 22), the cream line is width
10, the sun 55% gold, the orbit line cream at 75%, and the satellite dot solid gold.

Other assets in this folder: `play_icon_512.png`, `feature_graphic_1024x500.png`.

---

## 6. Colour

Three palettes. They are related but not interchangeable — use the one that belongs to the
surface you are working on.

### Brand

| Token | Hex |
|---|---|
| field green | `#1E3A2A` |
| cream | `#F4F1E6` |
| maize gold | `#E2B33C` |
| ink | `#1E2A1D` |

### App — `lib/theme.ts`

| Token | Hex | Use |
|---|---|---|
| bg (paper) | `#F4F2EC` | screen ground |
| surface | `#FFFFFF` | panels |
| sunken | `#EFECE4` | tracks, wells, inactive segments |
| primary (forest) | `#2E6A4F` | actions, links, healthy |
| primaryDark | `#1F4D39` | scan card, tab FAB, selected chips |
| primaryTint | `#E3EDE6` | secondary buttons, selected day |
| gold (maize) | `#E8C25A` | only the scan glyph on dark green |
| error (clay) | `#A8472A` | disease, outbreaks, high risk |
| warn (ochre) | `#7A5A14` | medium states, as text only |
| text | `#1E2E26` | ink |
| textSub | `#5E6B64` | supporting text |

### Social — `tassel.css`, `x.css`

| Token | Hex | Use |
|---|---|---|
| ground | `#101D16` | every slide background |
| grid | `#1B2821` | 2 px lines every 96 px, from x/y 94 |
| cream | `#F4F1E6` | headlines, wordmark, logo line |
| gold | `#E2B33C` | the one emphasised phrase per slide |
| body | `#BAC7BE` | supporting paragraphs |
| quiet | `#8E9C93` | counter, captions |
| rule | `#26352C` | dividers |

> Note: the app gold (`#E8C25A`) and the brand/social gold (`#E2B33C`) are different
> values on purpose — the app gold sits on dark green, the brand gold on near-black.
> Do not "correct" one to the other.

---

## 7. Type

**Archivo Narrow** — headings, numbers, the wordmark, cover capitals, the closing lockup.
**Atkinson Hyperlegible** — everything that is read.

- App: minimum 13 px. No capitals.
- Social slides: minimum 24 px. Headline 58 px, body 38 px, cover caps 118 px.

---

## 8. Design principles (app)

From the Shamba direction, chosen over two alternatives on the "CropGuard colour
directions" canvas.

- **Calm by default.** Colour is earned: it comes from crop artwork and photos, and from clay only when a crop is genuinely at risk.
- **No emojis anywhere. No rainbow-tinted icon tiles.** Icons are monochrome ink.
- **No full-width divider lines.** Grouping comes from white panels on paper, and from space.
- **Few radii:** 10 for controls, 16 for panels, 20 for the scan card, pills for chips.
- **Information on demand.** One quiet line on the main screen, detail in a bottom sheet.
- **Interactive over instructive.** Steppers, week strips, tickable tasks, haptic ticks under the thumb.

### Artwork

23 crop illustrations at 48×48, flat two-tone, sharing leaf green `#6E9B5A` / `#557F45`
with muted harmonised fills. Use `<CropIcon crop="…" />`. Fertiliser granule heaps are
drawn, not brand photographs, so the app stays neutral between brands.

---

## 9. Accessibility

- All text at least 4.5:1 contrast. Gold on ground is 8.9:1, body 9.9:1, quiet 6.1:1.
- Status is shown with words as well as colour, never colour alone.
- Alt text on every image, on every platform.
- **Known defect:** completed tasks use `#7A867F` on white — 3.79:1, below the bar. Slides use `#66716A` instead. Fix in the app.

---

## 10. Where things live

| What | Where |
|---|---|
| Official logo SVGs, Play icon, feature graphic | `docs/brand/` (this folder) |
| App tokens and components | `lib/theme.ts`, `components/ui.tsx`, `lib/cropArt.ts`, `assets/art/` |
| Kiswahili strings | `lib/sw.ts` |
| Real app screenshots | `scripts/shots/real/r01–r26.jpeg` — check for stale numbers before use |
| Instagram slides and sources | `Pictures\playstore\INSTA\`, sources in `INSTA\_source\` |
| Facebook and X slides | `Pictures\playstore\INSTA2\` |
| Captions and alt text | `INSTA\CAPTIONS_AND_ALT_TEXT.txt` |
| Design canvas | Claude artifact "Tassel Feature Carousels" |

### Making a new social carousel

1. Copy a slide from `INSTA\_source` (or `INSTA2\_source` for Facebook and X) with the layout you need.
2. Keep `tassel.css`, `x.css` and the logo SVG exactly as they are. Change only the copy and content.
3. Check every fact against the app code.
4. Render at the platform size and check nothing enters the footer zone.
5. Save as `<topic>_01.jpg …` in INSTA, `fb_<topic>_01.jpg` and `x_<topic>_1.jpg` in INSTA2.

Formats: Instagram 1080×1440 (3:4), Facebook 1080×1350 (4:5), X 1600×900 (16:9, max 4
images per post, each tweet under 280 characters).

No X or Facebook connector is linked, so posts are made by hand.

---

## 11. Open items

- KIPI trademark search for "Tassel".
- `.co.ke` and `.com` domain check.
- Native-speaker review of the Kiswahili strings, including roughly 200 new satellite strings.
- Fix the 3.79:1 contrast on completed tasks.
- Collect labelled field photos in Kenya and report real accuracy, precision and recall per class — until then, field accuracy stays "untested" in every piece of material.
