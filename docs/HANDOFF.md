# CropGuard AI — handoff brief (16 Oct 2026)

Ezra ("Archlord")'s KSEF 2027 Computer Science entry; also anchors a Harvard Fall 2028 application.
Offline crop-disease scanner + AI advisor for Kenyan smallholders, English/Kiswahili.

## Hard rules
- Never put the Anthropic key or any Supabase secret/service key in the app. App holds only the Supabase URL + publishable key (.env).
- Ezra pastes secret keys himself. Never create, print or paste API keys.
- Never sell or share identifiable farmer data. Diagnosis/advice stays independent of any paid placement.
- Pesticides: active ingredients only, never doses. PCPB June 2025 rules: chlorothalonil withdrawn; chlorpyrifos & dimethoate termiticide-only; imidacloprid & abamectin not for open fields; iprodione not on food crops; mancozeb under review; carbofuran not recommended.
- Ask before destructive or irreversible actions (DB migrations, deletes, releases). Ezra likes short replies and maximum automation.
- Expo changed: read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code (see AGENTS.md).

## Stack
- Expo SDK 57, React Native 0.86.2, expo-router, NativeWind 4 / Tailwind 3.4, TypeScript (`npx tsc --noEmit` must stay clean).
- Package `com.anonymous.CropGuardAI`, scheme `cropguard-ai`, app.json v2.1.0 / versionCode 3.
- On-device model: react-native-fast-tflite 3.0.1, `assets/model/cropguard.tflite` = **MobileNetV2, 38 PlantVillage classes, 14 crops**, 224x224, preprocessing `x/127.5 - 1` (NOT /255 — that gave 77.5%), 97.4% val acc (training_results.json), 75% confidence threshold. The EfficientNetB4 27-class model from old scripts v3–v5 is research history, NOT shipped. Keep all docs consistent with this.
- i18n: English strings are keys into `lib/sw.ts` (~660). `Text` from `components/ui` auto-translates; pass `raw` for user content. Validate with `node scripts/check_sw.js`.
- Design system "Mche" in `lib/theme.ts`: C tokens; Archivo Narrow + Atkinson Hyperlegible; maize gold `C.accent` only for the single primary action; no all-caps; min 13px.

## Backend — Supabase project `dfobapaknivhgzwffmyc` ("CropGuardAI", eu-west-1, free tier; pauses after ~1 week idle — restore from dashboard)
- Anonymous auth on. Tables with RLS: profiles, farms, incidents, forum_posts, forum_replies, post_flags, market_prices (IFPRI Sep/Nov 2025 seed), chat_usage.
- Edge Functions (verify_jwt=false; each calls auth.getUser itself), source in `../cropguard-proxy/supabase/functions/`:
  - `advisor-chat` v5 — Claude chat.
  - `photo-check` v1 — Claude vision, forced tool `report_photo_check`. Tested: EN 16s, SW 22.7s, correct early blight.
  - Shared limits via `increment_chat_usage`: 20/user/hour, 500 global/day. Model `claude-sonnet-4-6`. Secret `ANTHROPIC_API_KEY`.
- `../cropguard-proxy/supabase/cropguard_v21_features.sql` APPLIED 16 Oct 2026 via SQL editor (MCP apply_migration keeps returning "cancelled"; use the SQL editor for DDL). Adds: incidents.county + trigger, `county_outbreaks` RPC (>=2 farmers), farms.planting_date, forum_posts photo_path/scan_label/scan_confidence, `forum-photos` bucket + policies (insert requires `photo_path like auth.uid()||'/%'`), price_reports + daily limit trigger, `price_report_summary` (>=3 distinct reporters). App degrades gracefully without it (`isMissingSchema`/`hasV21Schema` in lib/data.ts).
- `../cropguard-proxy/api/chat.js` is the old unused Vercel proxy (can be deleted with Ezra's OK).
- External data: Open-Meteo (Hutton late-blight risk; spray days = wind<15km/h, no rain 6h, 10–30°C), OSM Overpass/Nominatim agro-dealers, Leaflet-in-WebView field mapping (Esri/OSM tiles).

## Code map
- `lib/`: classifier.ts (centre-crop→224→decode→normalise→run; top+2 alts), diseases.ts/.sw.ts (38-class KB, buildPlan, pestHints, chemicalRules), data.ts (Supabase layer), photoCheck.ts (runPhotoCheck: 1024px JPEG q0.75 base64 → photo-check; consent key `photoCheckConsent:v1`), weather.ts, geo.ts, session.ts, advisor.ts, i18n.ts, sw.ts, speech.ts, notify.ts, calendar.ts, advisory.ts, encyclopedia.ts, store.ts, counties.ts, theme.ts.
- `app/`: (tabs) Home | Advisory | Scan FAB | Community | Profile; result, chat, treatment-plan, encyclopedia, market, farm-map, add-farm, farm/[id], post/[id], new-post, report-price, outbreaks, calendar, login, register, methodology, photo-check.
- Photo check entry points: scan.tsx pill "Pest or other crop? AI photo check"; result.tsx signature button when uncertain, secondary when confident.
- `components/`: ui.tsx (Text, Header, Card, Btn primary/signature/secondary/ghost/danger/whatsapp, Chip, Badge, ListenButton), AuthField, DateField, TaskRow.
- `legacy/app_tabs_v1/` old screens. First release source: `C:\Users\Archlord\Desktop\agrinova\KSEF 2027\CropGuardApp` (RN 0.72).
- `scripts/`: inspect_model.py, check_preprocessing.py, fetch_samples.py (samples/), test_advisor.ps1, test_photo_check.ps1, ui.ps1/act.ps1/shot.ps1 (emulator driving), install_debug.ps1, check_sw.js.
- Docs: docs/RELEASE_NOTES_v2.md. claude.ai Project "KSEF 2027" holds the competitor teardown (Plantix/FarmRise), v2 revision report, and Ezra's write-ups (.docx).

## Build / run (Windows)
- Emulator Pixel_8; adb `C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- Start Metro first, then `adb reverse tcp:8081 tcp:8081`, then `npx expo run:android`.
- Build fixes already done: android/local.properties sdk.dir; NDK r27b at `ndk\27.1.12297006`; CMake ninja replaced with 1.12.1 (old kept as ninja-1.10.2.exe). If CMake breaks, delete `android/app/.cxx`.
- Known: one SIGSEGV on first gallery scan (unconfirmed, retry worked).

## Open work (in order)
1. Confirm no other agent session is editing this folder (one did a Mche restyle on 16 Oct ~11:26–11:35). Then `git init`, commit, push to a **private** GitHub repo (check .gitignore covers .env, android/app/.cxx, keystores).
2. DONE: v2.1 schema applied; advisors clean apart from intended warnings (anon sign-in, aggregate RPCs, server-only chat_usage). Optional: enable leaked-password protection in Auth settings.
3. Emulator walkthrough: scan pill → gallery → /photo-check; result → photo check; v2.1 features (outbreaks, farmer prices, photo posts, planting date). Fix bugs.
4. Code review pass (requested), tsc, check_sw.js.
5. Signed release APK; back up keystore off-machine; QR code for judges.
6. Model card + validation report (38-class MobileNetV2). Confirm whether the field-test claim (86% vs 40%, 50 samples) used the shipped model.
7. Kenyan field validation: 100+ agronomist-labelled photos, per-class metrics, statistical test.
8. Write-up v3; native-speaker review of Kiswahili.
9. Post-KSEF (Ezra hasn't decided): monetization roadmap — verified dealer directory, org/extension dashboard, aggregated anonymised insights; all with DPA/ODPC consent and neutrality rules above.
