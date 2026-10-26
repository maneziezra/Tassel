# Tassel — handoff to Claude Code

Written 24 Oct 2026 for Ezra ("Archlord"), Eldoret, Kenya. Put this file in the app repo root as `HANDOFF.md` and point Claude Code at it in the first message.

**Your job:** redesign the Tassel app so a farmer remembers it and comes back. Plan it, design it, build it, test it. Ezra wants you to do the work end to end. Ask him only for decisions that are genuinely his (listed in section 9).

**Decided by Ezra, 26 Oct 2026** (these replace the older rules "active ingredients only, never doses" and "no emojis" from the 19 Oct brief):
- Brand: "how your field is doing, and what to do today". The satellite field is the Home hero; offline scan is the giant action.
- Emoji: Google Noto Animated Emoji (Lottie), with the licence credited. No system emoji.
- Named PCPB products: allowed with registration number and "Not sponsored", but **only when checked against the PCPB register**. A label rate is shown only when it is cited from the label; otherwise show "See the label".
- Model v8 retraining: after the redesign.
- Still open: the Home visual direction (pick from two Figma directions).
- Plan: `C:\Users\Archlord\.claude\plans\imperative-scribbling-walrus.md`.

---

## 1. Read this first: the rules that do not bend

1. **No invented numbers anywhere.** No field-accuracy study has been done. The "86% vs 40% farmers", "43/50", the agronomist, the 10 farms, the usability survey (4.4/5, 4.8/5), "100% of 50 AI interactions" and "5.1/6" are all fabricated. Remove them from the app, store listing, marketing and docs wherever you find them. The only measured model figure is in section 3.
2. **Pesticides follow Kenya's Pest Control Products Board (PCPB).** Only PCPB-registered products. Never a dose that is not on the product label; tell the farmer to follow the label. Products PCPB withdrew or restricted in June 2025 stay out (chlorothalonil; chlorpyrifos and dimethoate termiticide-only; imidacloprid and abamectin not for open fields; iprodione not on food crops; carbofuran). Mancozeb is flagged as under review.
3. **Never invent a diagnosis.** Below 75% confidence the app says "Not sure", gives retake tips, and offers the online check. This rule stays through the redesign.
4. **Privacy stays a differentiator.** No ads, no third-party sharing, leaf photos stay on the phone unless the farmer posts them.
5. **Every claim in the UI must be backed by code or a cited source.** Label examples "Example".
6. **Kiswahili and English for every new string**, in `lib/sw.ts`. Flag new strings for native-speaker review.

---

## 2. Where everything is

| What | Where |
|---|---|
| App (Expo, React Native, TypeScript) | `C:\Users\Archlord\Desktop\CropGuard-AI` — last noted commit `3deedfe` (v2.4.0 rename); app now at v2.6.0 |
| Server (Supabase Edge Functions) | `cropguard-proxy` — last noted commit `70dcb6c` |
| Old React Native 0.72 app (v1.0, retired) | `C:\Users\Archlord\Desktop\KSEF 2027\CropGuardApp` — do not build on this |
| Theme and components | `lib/theme.ts`, `components/ui.tsx`, `lib/cropArt.ts`, `assets/art/` |
| Kiswahili strings | `lib/sw.ts` |
| Satellite code | `lib/satelliteCore.ts`; Edge Function `satellite-health` v2 |
| AI | Edge Functions `advisor-chat` v7, `photo-check` v3 (Claude via server, rate-limited; key never in the app) |
| Model | `cropguard.tflite` + `class_labels.json` (file names kept on purpose) |
| Brand files | `docs/brand/` (official SVG mark, Play icon, feature graphic) |
| Real screenshots | `scripts/shots/real/r01–r26.jpeg` |
| APK build | `scripts/build-apk.ps1` → `Desktop\CropGuard-AI-vX.apk` (release build 15–25 min on this PC; log to `scripts\build.log`) |
| Package | `ke.tassel.app`, scheme `tassel://` |

**Verify before relying on anything above.** Run `git log`, `git status`, read `package.json` and the app router, and list the screens before you start. The notes come from docs dated 17–21 Oct.

### Backend facts worth knowing
- Supabase: anonymous accounts, row-level security. County outbreak counts leave the database only as totals via the SECURITY DEFINER function `county_outbreaks`.
- Satellite (method `s2-joint-v2`): NDVI and NDWI_WATER at native 10 m; NDWI_CROP, the joint stress mask and water-stress score at native 20 m (B11 never resampled). Minimum field 800 m². Quality bands: unusable < 2 clear 20 m cells, limited < 4, excellent ≥ 8. Do not change the science while redesigning; only the presentation.
- Weather: Open-Meteo. Late-blight risk: Hutton criteria. Agro-dealers: OpenStreetMap. Prices: IFPRI reference prices plus farmer reports (median per crop/county/unit over 30 days).
- Spray window: an hour is sprayable when wind < 15 km/h, 10–30 °C, no rain (≤ 0.1 mm, < 40% chance) that hour and the next 6.

### Tool gotchas
- `device_commit_files` re-commits from the same staged path can silently write old content. Use a fresh path and check with Get-FileHash.
- Windows machine. PowerShell. Java 17. Builds are slow, so run them minimised and logged.

---

## 3. What is true about the model

| | Value |
|---|---|
| Shipped model | v5, MobileNetV2 backbone, 154 classes |
| Test accuracy | 94.04% on 16,254 held-out dataset images (lab and dataset photos, not field) |
| Macro F1 | 0.9266 |
| Calibration (ECE) | 0.0096 |
| Accuracy when confident | 97.33% |
| TFLite vs Keras agreement | 100% |
| Field accuracy | **Not measured.** Say so. |

v7 (188 classes) was not shipped: −1.13 pts on v5's sources, losses on cassava, maize, beans and citrus. The v6→v7 wheat "sink class" fix (+20.7 pts on leaf rust) is real and worth showing as method.

Ezra mentioned "123 diseases on 4 crops". Check `class_labels.json` and report the true count of crops and disease (non-healthy) classes before any UI copy uses a number.

---

## 4. The problem in Ezra's words (condensed)

> The app looks generic and forgettable. Forms everywhere, too many words, too many selections, every step done by hand. It feels like opening a book, not using an app. People like the posts but can't remember the app. We haven't decided what the brand stands for. Create an experience a farmer will never forget. At every step ask: if I were a farmer, would I come back to this?

### The test for every screen
Before building any screen, write one line for each:
1. **What is the one thing the farmer came here to do?** Make that the biggest thing on screen.
2. **What can the app fill in or guess instead of asking?** (GPS, date, last crop, the field size from the map, the scan result.)
3. **How many taps and how many words?** Cut both. Target: no screen with more than ~25 words of instruction; no flow with more than one decision per step.
4. **What moves?** Every confirmation, completion and state change gets motion and a haptic.
5. **Would a farmer with primary-level reading and a Ksh 8,000 phone manage it in a field, in sun, with dirty hands?** Big targets (≥ 56 px), high contrast, read-aloud available.

---

## 5. Brand position: decide this first

Ezra asked what Tassel stands for. Recommendation (confirm with him, section 9):

**"Tassel shows you how your field is doing, and what to do today."**

The two things nobody else in Kenya combines, and that already work:
1. **Your field from space** (satellite health of the field you drew) — FarmRise and Plantix don't do this for smallholders.
2. **Scan a leaf, offline** — Plantix needs a connection.

Everything else (calendar, fertiliser, spray days, community, prices) is "what to do today", fed by those two. Weather is an input to advice, not a headline.

Positioning lines already used: "Kagua kwanza. Check first." and "The crop doctor that works without data, speaks Kiswahili and follows Kenyan rules."

---

## 6. The redesign, screen by screen (in build order)

### P0 — Bugs to fix before any redesign
1. **Profile forgets the farmer's name.** The name entered at sign-up is not shown on Profile when the farmer returns (fields are remembered). Find where the name is written (sign-up/onboarding) and read (Profile); likely written to local state only or to a different key/table from what Profile reads. Fix, and add a test.
2. **Camera only starts from the floating scan button.** Every "Scan" entry point (home, result "scan again", library, calendar task) must open the live camera directly. Find the duplicated or broken navigation paths and route them all through one `openScanner()`.
3. **Planting calendar flow.** "No crop planted yet" → adding a planting season drops the farmer straight onto one plantation. Correct flow: choose field (or add one) → choose crop → planting date → done, with "Add another planting" offered at the end, and a list of all plantings to switch between.

### P1 — Home ("hero")
Today: generic, weather-first, doesn't invite return.
Build:
- **Top half is the farmer's field**, drawn from the satellite, coloured by health (NDVI), with one plain sentence: "Your maize field looks healthy" / "Part of your field is drying — go and check the north side". Tap opens Field Health.
- **One giant Scan action**, thumb-reachable, that opens the camera immediately.
- **"Today" strip**: at most 3 cards, generated (calendar task due, spray window good/bad, outbreak nearby). No card if nothing matters.
- Weather lives inside the advice ("Good spraying until 10 am"), not as its own block.
- First run with no field: the hero becomes "Draw your field from space" with an animated satellite pass over a map.
- Greet by name (once P0.1 is fixed).

### P1 — Add a field: slides, not a form
Today: one long form, much typed by hand.
Build a full-screen, one-question-per-slide flow with animated transitions and a progress line:
1. **Draw it from space first.** Satellite basemap centred on GPS. Farmer taps corners or walks the boundary (GPS track mode). Area is measured live and animates as the shape closes. Skip allowed.
2. **Name** — pre-filled ("Shamba 1", or the nearest place name); one tap to accept.
3. **Crop** — big crop illustrations in a grid (use existing `CropIcon` art), no typing.
4. **Planting date** — "Today / Last week / Pick a date", with a week strip, not a date picker first.
5. **Size** — already filled from the drawing; a stepper if they skipped drawing (acres/hectares from Profile units).
6. **Done** — celebration animation, the field appears on Home, and the first satellite check starts ("Checking your field from space… about a minute").
Everything optional (soil, irrigation, notes) moves to the field's own page later.

### P1 — Crop health from space: make it dominant
Today: shrunk until it barely feels part of the app.
Build:
- A dedicated Field Health screen reached from the Home hero.
- Full-bleed map with **NDVI and NDWI heat maps** as layers (the existing layer chips: NDVI 10 m, crop-water NDWI 20 m, joint stress 20 m, open-water NDWI 10 m), with a legend in words ("greener = healthier").
- A **timeline scrubber** of past clear passes with the image animating between dates.
- A one-line verdict, then "What to do" (walk to the flagged zone, scan a leaf there, log what you found — the existing "What did you find?" sheet).
- Be honest on screen about resolution (small fields are one zone) and cloud gaps ("No clear picture since 12 Oct — clouds").
- This screen is the marketing centrepiece: make it beautiful enough for store screenshots and Instagram.

### P1 — Scan
- Live camera opens instantly from everywhere (P0.2).
- Guide frame with gentle animation; auto-capture when the leaf is sharp and centred.
- Result: big plain-language name, a confidence word ("Sure" / "Fairly sure" / "Not sure"), the crop art, and three buttons: **What to do**, **Ask the community**, **Check online (AI)**.
- **Hybrid diagnosis.** Offline TFLite first. If "Not sure", unsupported crop, or a pest/deficiency, offer the online Claude photo check (`photo-check` Edge Function), clearly labelled "AI suggestion — online". This widens coverage without retraining. Retraining (v8: v7 class set with more backbone capacity) is a later track; gate it on beating 0.9404 on v5's sources.

### P2 — Advisory: show, don't tell
Today: potato "land preparation and planting" reads like a book (rotate, certified seed, hole depth…).
Build each stage as a **swipeable card story**:
- One action per card, shown with an **animated illustration or a 3–6 s looping clip** (Lottie preferred; MP4 if filmed), a 5–10 word caption, and read-aloud.
- Example, potato planting: rotation (a field changing crops over seasons) → certified seed (seed tuber with a check badge) → spacing (animated tubers dropping at 75 × 30 cm) → depth (cutaway of soil with a ruler).
- Each stage opens with **"Watch out for"**: diseases likely at this stage (e.g. late blight, with today's blight risk from the Hutton rule), then weeding and hilling-up as animated cards.
- **Emoji question.** Ezra asked for emojis. The current design system bans system emoji because they render differently on Tecno/Samsung/Infinix and look cheap. Recommended: use **Google Noto Animated Emoji** (Lottie files, free licence — check and credit the exact licence on fonts.google.com/noto/specimen/Noto+Emoji / googlefonts.github.io/noto-emoji-animation) so every phone shows the same animated set, plus the existing crop art for crops. Confirm with Ezra (section 9).
- **Product examples.** Where advice says e.g. "protectant fungicide", show 2–3 real PCPB-registered products as examples: product name, PCPB registration number, active ingredient, and "Not sponsored. Follow the label." Research which are registered and currently available in Kenya and pick by registration status and availability, not by brand. Never a dose beyond the label.

### P2 — Fertiliser calculator → shopping list
- Fields and sizes come in automatically; the farmer taps which fields to plan for (all selected by default).
- The recommendation produces a **live shopping list** (bags per product per field and total) that updates instantly as the farmer changes crop, field or swaps a product ("Or, instead of DAP…").
- Share the list (WhatsApp, image) and, next phase, "Find the nearest agro-dealer" (OSM data already exists).

### P2 — Pesticide and herbicide calculator (new)
Ezra wants "every herbicide on the internet". Scope it to what is legal and safe:
- Build a catalogue from the **PCPB register of products** (the official list; find the current one on pcpb.go.ke). For each: product name, registration number, active ingredient, crops and target pests/weeds it is registered for, formulation, and the label rate exactly as the label states it. Store in Supabase (`pesticide_products`) with source and date; never hand-type rates from memory.
- Exclude the June 2025 withdrawn/restricted list (section 1).
- Flow: crop → problem (from the scan, or pick) → registered options → tank-mix calculator using the label rate × the farmer's field size and sprayer size → safety (PPE, re-entry interval, pre-harvest interval from the label) → spray window from the forecast.
- If a label rate cannot be verified, show "See the label" instead of a number.

### P2 — Community post: as easy as a story
Today: a big form (title, details, category).
Build: camera-first, like posting a story.
- Tap → take or pick a photo → optional voice note or one line of text → post. Title, crop and category are filled automatically (from the scan result and the photo check). Edit only if wrong.
- Posting straight from a scan result attaches the result.

### P2 — Outbreaks: no selections by default
Today: many dropdowns.
Build: open on a **map of Kenya with the farmer's county highlighted** and pulsing markers for active outbreaks nearby, based on GPS and the farmer's crops. One line: "Late blight reported by 4 farmers near you this month." Filters exist but are hidden behind one button. Keep the anonymity rules (≥ 2 distinct farmers, totals only).

### P2 — Prices: interactive, not a table
- Default to the farmer's crops and county; no selecting.
- Each crop shows a small trend line and "Up 8% this month" style plain language.
- One tap to report the price you got (existing rules: median shown, never the reporter, 20 reports/phone/day, plausibility range).
- **Market connection feature is out of scope now** — Ezra will design it next. Leave a placeholder entry point only.

### P2 — Profile
- Fix the name (P0.1). Show the farmer's name, farm name, fields as small map tiles, crops, units, language.
- Regroup the long list into a few clear sections; remove what a farmer never touches.

### P3 — Next features (do not build yet, leave hooks)
- Nearest agro-dealers recommended from the fertiliser and pesticide shopping lists.
- Market connection (farmers to buyers).
- Model v8 retraining.

---

## 7. Visual direction

The app today uses "Shamba" (v2.2): paper #F4F2EC, forest #2E6A4F / #1F4D39, clay #A8472A for disease, ochre #7A5A14, Archivo Narrow + Atkinson Hyperlegible. The marketing uses the darker brand: ground #101D16, cream #F4F1E6, maize gold #E2B33C, the official tassel mark.

Ezra's taste: premium, minimal, editorial, technology-first, trustworthy; references Linear, Stripe, Apple; avoids government-portal looks and cartoonish visuals.

Direction to propose (show options before committing):
- Bring the app closer to the brand: the dark green and maize gold for hero moments (Home field hero, Field Health, Scan), paper and white panels for working screens.
- Motion is the signature: field outline drawing itself, satellite pass sweeping the map, crops "growing" on completion, haptics on every confirm.
- Keep Atkinson Hyperlegible for anything read (it was chosen for low-vision legibility). Minimum 13 px; prefer 16+ for body on farmer screens.
- Keep the official logo; never redraw it.

---

## 8. Tools and process

### Libraries (React Native / Expo — note shadcn/ui and Aceternity are web-only; use them as visual references, not code)
- Motion: `react-native-reanimated` + `moti`; `react-native-gesture-handler`; `lottie-react-native`; `@shopify/react-native-skia` for the field outline drawing and heat-map effects.
- Haptics: `expo-haptics`. Camera: check what the app uses now before changing.
- Component patterns: `react-native-reusables` (shadcn-style for RN) if it fits the existing `components/ui.tsx`.
- Use Context7 (`claude mcp add --transport http context7 https://mcp.context7.com/mcp`) for current docs of these libraries before writing code against them.

### MCPs and connectors Ezra has linked
- **Mobbin** — primary reference source. Search flows for: multi-step onboarding/wizards, map boundary drawing, camera capture, story-style posting, shopping lists, health dashboards. Save references to a "Tassel redesign" collection and cite which screen inspired what.
- **Figma** — build the redesigned screens as frames (one page per area above), with a component set from the tokens. Ezra reviews there.
- **Canva** — marketing assets only (store screenshots, posts) once screens are final; follow the Tassel Instagram design system in `claude/Tassel_Instagram_Design_System.md` (project doc).
- **Supabase** — the pesticide catalogue table and any schema changes (migrations, RLS).
- Competitor references: Plantix, Bayer FarmRise (teardown in `claude/Competitor_Teardown_Plantix_FarmRise.md`). Do not copy text, images or branding.

### Order of work
1. **Audit (half a day).** Verify repo state; list every screen; screenshot the current app; log every place with fabricated numbers; count the model's crops and classes; reproduce the three P0 bugs.
2. **Fix P0 bugs** and ship a test APK.
3. **Research.** Mobbin references for each P1/P2 screen; write a short "steal this pattern" note per screen.
4. **Design in Figma.** Home, Add field, Field Health, Scan first. Two directions for Home. Stop for Ezra's pick.
5. **Build P1**, then P2, one area per branch/commit, each with before/after screenshots.
6. **Farmer check.** After P1, Ezra puts the APK in front of 3–5 real farmers in Eldoret and watches them add a field and scan a leaf without help. Note where they stall. (This is real usability testing; record only what actually happens.)
7. **Kiswahili review** of all new strings by a native speaker before any public release.

### Definition of done for each screen
- Passes the five questions in section 4.
- Works offline where the feature can (scan, calendar, saved fields, read-aloud).
- English and Kiswahili.
- Contrast ≥ 4.5:1, targets ≥ 48 px (56 px for primary actions).
- No unbacked number or claim on screen.
- Before/after screenshot committed to `docs/redesign/`.

---

## 9. Decisions only Ezra can make (ask, don't guess)

1. Brand position: is "how your field is doing, and what to do today" (field-from-space + offline scan) the core? Or is it scanning first?
2. Emoji: Noto Animated Emoji (consistent, free) vs phone system emoji vs custom illustration only.
3. Visual direction: pick between the two Home directions you design.
4. Showing named PCPB-registered products (with "Not sponsored") — this changes the earlier "active ingredients only" rule. Confirm before shipping.
5. Whether to start v8 model retraining now or after the redesign.

---

## 10. Also still open (not part of the redesign, don't lose them)

- **KSEF write-up**: remove every fabricated result (section 1); report only dataset results, the preprocessing-bug fix and the v6→v7 diagnosis; move the field study to "planned"; present as "Tassel (formerly CropGuard AI)"; it still describes the old React Native/Firebase app and old numbers (94.7%, 97.4%).
- **Real field pilot**: 100+ leaves from Eldoret-area farms, agronomist labels each leaf blind to the app, current build, log every result; report accuracy with a confidence interval and per-class precision/recall.
- Satellite: install v2.3.1+ APK, test the "What did you find?" sheet, walk the Eldoret field and log checks.
- KIPI trademark search and .co.ke/.com domain check for "Tassel".
- Investor: funding breakdown and profit/shares outlook (not started).
