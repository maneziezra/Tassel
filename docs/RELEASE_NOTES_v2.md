# CropGuard AI v2.0 — release notes and methodology revision (vs v1.0 APK)

v1.0 = `CropGuard-release.apk` (package `com.cropguardapp`, React Native 0.72, source in `agrinova/KSEF 2027/CropGuardApp`).
v2.0 = this Expo app (`com.anonymous.CropGuardAI`, Expo SDK 57).

Everything the farmer could do in v1.0 is in v2.0, on the same navigation:
**Home | Advisory | Scan (green button) | Community | Profile**, plus sign-in/register.

## 1. Methodology fixes

| Area | v1.0 (first release) | Problem | v2.0 |
|---|---|---|---|
| Image preprocessing | Java module scaled pixels to 0…1 (`/255`) and stretched the photo to 224×224 | Model (MobileNetV2) was trained on −1…1. Our 40-image check: 77.5% with v1.0 scaling vs 95.0% with correct scaling. Stretching also distorts leaves | Centre-crop → resize 224×224 → `x/127.5 − 1` (`lib/classifier.ts`, verified by `scripts/check_preprocessing.py`) |
| Claimed scope | "44 diseases · 97.4% accuracy · 100% offline"; encyclopedia showed a "detection %" per disease | Model has 38 classes (26 diseases + 12 healthy) on 14 crops. Most "44" (fall armyworm, MLN, MSV, bean and cassava diseases) were never in the model. Per-disease % were invented | "38 leaf conditions · 14 crops". Library labels each entry "Scanner can detect" or "Reference only". 97.4% described as PlantVillage validation (lab photos) with field-accuracy caveat |
| Processing screen | 4 fixed steps on a 3.8 s timer, unrelated to the model | Misleading | Real steps (prepare, run model, match guide) with measured milliseconds |
| Low confidence | Below 60%, if maize/tomato in top-3, showed "Fall Armyworm (Suspected)" / "Aphid Infestation (Suspected)" | A diagnosis the model cannot make | Below 75%: "Not sure" + retake tips + "the scanner cannot detect insects — check for…" signs. One threshold everywhere (app + AI advisor) |
| Confidence colours | 85% / 70% cut-offs, different from the 60% pest rule and the 70% Claude prompt | Inconsistent | ≥90% high, ≥75% medium, <75% uncertain |
| Treatment text | Free text per class, then split by keywords into "chemical / biological / preventive"; the biological pillar defaulted to "neem oil or Trichoderma" for every disease (incl. viruses and bacteria) | Wrong advice for many classes | Structured cultural / biological / chemical lists written per class (`lib/diseases.ts`) |
| Pesticides | Doses such as emamectin 100 g/20 L; chlorothalonil, chlorpyrifos, dimethoate, imidacloprid, abamectin, iprodione, carbofuran recommended | Several doses far above labels; these actives were withdrawn/restricted by PCPB in June 2025 | Active ingredient only + "follow the label"; restricted products removed or flagged; mancozeb flagged "under review" |
| Treatment plans | 3 hand-written plans; every other disease showed the fall armyworm plan; ticks not saved; "Share plan" did nothing | | Plan generated for every disease; ticks saved on the phone; share works |
| Agronomy (Advisory) | CAN as basal fertiliser; maize 75×30 cm = "53,000 plants/acre"; wheat seed 100 kg/acre; "Fahari F1" wheat; potato seed 1,500 kg/acre; foliar feed "boosts grain set" | Factual errors | CAN as top-dress; ≈17,800 plants/acre; ≈50 kg/acre; no "F1" for wheat; 16–20 × 50 kg bags/acre; unsupported claims removed |
| Fertiliser calculator | Fixed rates for all crops | | Editable rate (soil-test value), result in kg and 50 kg bags |
| Weather & alerts | Hard-coded weather card, "LIVE" NDVI grid, sparkline, recent activity | Fake data | Open-Meteo forecast + Hutton-criteria late-blight risk; real scan history |
| Satellite screen (Expo v1) | Fixed NDVI 0.82, yield +18%, "Live Sentinel-2" stock photo | Fake data | Removed; real satellite basemap used for field mapping instead |
| Field mapping | react-native-maps (needs Google key); new fields saved as 1.2 acres, 100% health | Fake size | Leaflet + Esri/OSM tiles; area computed from the drawn polygon |
| Market | Made-up prices, "LIVE", fake weather advice, 3 invented Eldoret agrovets | Fake data | Sourced monthly prices (IFPRI Food Security Portal, Sep & Nov 2025) with date and link; agro-dealers from OpenStreetMap; KAMIS/NCPB links |
| Helpline | "Kilimo hotline 0800 720 710" | Could not be verified | Removed; links to kilimo.go.ke and pcpb.go.ke |
| Backend | Firebase functions were stubs returning fake data; Claude key blank in the app | Nothing was saved; a key in the app would be extractable | Supabase: anonymous accounts, RLS-protected tables; Claude via Edge Function with rate limits |

## 2. Feature map (v1.0 → v2.0)

| v1.0 screen | v2.0 |
|---|---|
| Login / Register (mock, "skip for now") | `login.tsx`, `register.tsx` — Supabase Auth; guest by default; registering keeps guest data |
| Farm (home dashboard) | `(tabs)/index.tsx` — real weather, blight risk, fields, scans |
| Farm map (draw field, satellite/street, GPS) | `farm-map.tsx` |
| Add farm | `add-farm.tsx` (+ stage, GPS pin, measured area) |
| Incident history | `farm/[id].tsx` (+ edit boundary, delete) |
| Advisory (5 crops, stages, products, calculator) | `(tabs)/advisory.tsx` |
| Scan + Processing | `(tabs)/scan.tsx` (dark camera, tips, torch, gallery, real timed steps) |
| Result (status, treatment, agrovets, Ask AI, save, WhatsApp) | `result.tsx` (+ alternatives, uncertain card, notifiable badge) |
| Chat (auto context, quick questions) | `chat.tsx` (real Claude, Kiswahili, retry) |
| Treatment plan | `treatment-plan.tsx` |
| Encyclopedia (44) | `encyclopedia.tsx` (26 scannable + 31 reference, honest labels) |
| Market | `market.tsx` |
| Forum / Post / New post (mock) | `(tabs)/community.tsx`, `post/[id].tsx`, `new-post.tsx` (real replies, report, delete) |
| Profile (2 versions) | `(tabs)/profile.tsx` (editable, 47 counties, real stats) |
| — | `methodology.tsx` "How CropGuard works" for judges |

## 3. Backend (Supabase project `dfobapaknivhgzwffmyc`)

Tables (all RLS): `profiles`, `farms`, `incidents`, `forum_posts`, `forum_replies`, `post_flags`, `market_prices`, `chat_usage`.
Reply counts and report counts are maintained by triggers; 3 reports hide a post. Migration: `cropguard-proxy/supabase/cropguard_v2_schema.sql`.
Edge Function `advisor-chat` v5: adds PCPB 2025 restrictions and "no doses" rule to the system prompt.

## 4. Known limits / next steps

- Field accuracy is untested: collect and label Kenyan field photos and report accuracy, precision and recall per class.
- Prices are monthly references; updating them is a dashboard edit (`market_prices` table).
- Email confirmation is on by default in Supabase; registering sends a confirmation link.
- Consider turning on leaked-password protection in Supabase Auth.


---

# CropGuard AI v2.1 — competitor features (Plantix, Bayer FarmRise)

v2.1 = version 2.1.0, versionCode 3. Features that the two biggest crop apps (10M+ downloads each)
proved farmers use, rebuilt for Kenya. No competitor text, images or branding were copied.
Full comparison for judges: the "CropGuard AI vs Plantix vs FarmRise" doc in the KSEF 2027 project.

| Feature | Seen in | CropGuard v2.1 | Files |
|---|---|---|---|
| Outbreak alerts by county | Plantix disease alerts | Aggregated from saved confident scans; shown only when 2+ different farmers in a county report the same disease in 14/30 days; no names, fields or GPS leave the DB; one local notification per outbreak | `app/outbreaks.tsx`, Home banner, `county_outbreaks()` RPC |
| Crop calendar | FarmRise stage-wise advice | Planting date per field → dated tasks (maize, beans, potato, tomato, wheat); tick boxes saved on the phone; reminders scheduled on the phone at 07:00 (work offline) | `lib/calendar.ts`, `lib/notify.ts`, `app/calendar.tsx`, `components/TaskRow.tsx`, `components/DateField.tsx` |
| Spray days | Plantix spraying weather | Hour sprayable when 06–18 h, wind < 15 km/h, 10–30 °C, no rain (≤ 0.1 mm and < 40 %) that hour + next 6; day Good ≥ 3 h, Fair 1–2 h, Poor 0 | `lib/weather.ts` `sprayDays()` |
| Kiswahili + read aloud | FarmRise audio, Plantix 19 languages | Whole UI (650+ strings), 38 disease guides, 31 library entries, 5 season guides, methodology in Kiswahili; follows phone language on first run; Listen button uses the phone's text-to-speech (offline); advisor answers in Kiswahili | `lib/i18n.ts`, `lib/sw.ts`, `lib/diseases.sw.ts`, `lib/advisory.sw.ts`, `lib/speech.ts` |
| Ask the community with photo | Plantix community | Post with a photo (resized to 1080 px JPEG) and the scan result attached, straight from the result screen | `app/new-post.tsx`, `app/post/[id].tsx`, `forum-photos` bucket |
| Farmer price reports | FarmRise mandi prices / price feedback | Farmers report the price they got; median per crop/county/unit over 30 days, reporter never exposed; 20 reports/day limit; plausibility check per unit | `app/report-price.tsx`, `app/market.tsx`, `price_report_summary()` RPC |
| Plot-size fertiliser calc | Plantix fertilizer calculator | Field-size chips from your saved fields | `app/(tabs)/advisory.tsx` |

Other fixes in v2.1:
- Classifier runs are serialised (a double tap could run the TFLite interpreter twice at once and crash it).
- Methodology screen rewritten (10 sections, both languages) to cover outbreaks, spray days, calendar, prices, community and voice.
- Database: `supabase/cropguard_v21_features.sql` (additive). Until it is applied, the app hides the outbreak, photo and price
  features with a "not switched on yet" note and stores planting dates on the phone.
- Checks: `scripts/check_sw.js` (no missing/orphan Kiswahili keys, placeholders match), `npx tsc --noEmit` clean.
