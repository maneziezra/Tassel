# Tassel (formerly CropGuard AI) — handoff brief (19 Oct 2026)

> Renamed on 19 Oct 2026: the app is now **Tassel** (v2.4.0, versionCode 4), package `ke.tassel.app`, deep-link scheme `tassel://`. Folder and repo names still say CropGuard, and internal ids (model file `cropguard.tflite`, storage keys, SQL file names) were kept on purpose. Brand files: `docs/brand/`.

Ezra ("Archlord", Eldoret)'s KSEF 2027 Computer Science entry. It also anchors a Harvard Fall 2028 application.
The app is an offline crop-disease scanner with an AI advisor, crop calendar, fertiliser planner and Sentinel-2 crop health from space, for Kenyan smallholders, in English and Kiswahili.
This brief replaces the 16 Oct version. Work moved here from a claude.ai cloud session on 19 Oct.

## Hard rules
- Never put the Anthropic key or any Supabase secret/service key in the app. The app holds only the Supabase URL and the publishable key (.env).
- Ezra pastes secret keys himself. Never create, print or paste API keys.
- Never sell or share identifiable farmer data. Diagnosis and advice stay independent of any paid placement.
- Pesticides: active ingredients only, never doses. PCPB June 2025 rules:
  - chlorothalonil withdrawn;
  - chlorpyrifos and dimethoate termiticide-only;
  - imidacloprid and abamectin not for open fields;
  - iprodione not on food crops;
  - mancozeb under review;
  - carbofuran not recommended.
- Satellite readings say "possible / risk / inspect", never a diagnosis.
  - Never label a product finer than its coarsest band (see "Resolution rule").
- Ask before destructive or irreversible actions (DB migrations, deletes, releases).
  - Don't take over the phone while Ezra is using it: check `adb shell dumpsys window | findstr mCurrentFocus` first.
- Ezra likes short replies, maximum automation and serious, detailed work. He judges design by eye: no emojis, no divider lines, no over-rounded corners.
- Expo changed: read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code (see AGENTS.md).

## Repos (both private, pushed)
- **App:** `C:\Users\Archlord\Desktop\CropGuard-AI` → github.com/maneziezra/cropguard-ai.
  - Last commit `d4f1b53` "v2.3.1 Resolution-honest satellite layers".
  - Earlier: `83e892f` v2.3 satellite dashboard; `aa6bd84` v2.2 Shamba redesign.
- **Backend:** `C:\Users\Archlord\Desktop\cropguard-proxy` → github.com/maneziezra/cropguard-proxy. Last commit `6deae5d` "satellite-health v2".
- **Latest APK:** `C:\Users\Archlord\Desktop\Tassel-v2.4.0.apk`.
  - Release build, arm64, debug-signed, built 19 Oct 08:49.
  - Built with `scripts\build-apk.ps1`, which takes about 30 minutes on this PC and logs to `scripts\build.log`.

## Stack
- Expo SDK 57, React Native 0.86.2, expo-router, NativeWind 4 / Tailwind 3.4, TypeScript. `npx tsc --noEmit` must stay clean.
- Native modules added in v2.2: `react-native-svg` 15.15.4 (SvgXml, charts) and `expo-haptics` ~57.0.3.
- Package `ke.tassel.app`, scheme `tassel` (until v2.3.1: `ke.tassel.app`, `cropguard-ai`).
- On-device model: react-native-fast-tflite 3.0.1, `assets/model/cropguard.tflite`.
  - **MobileNetV2, 38 PlantVillage classes, 14 crops**, 224x224.
  - Preprocessing `x/127.5 - 1` (NOT /255).
  - 97.4% validation accuracy; 75% confidence threshold.
  - The EfficientNetB4 scripts v3–v5 are research history, not shipped.
- i18n: English strings are keys into `lib/sw.ts` (~975).
  - `Text` from `components/ui` auto-translates; pass `raw` for user content.
  - Validate with `node scripts/check_sw.js`: no duplicates, placeholder mismatches or missing keys; orphans are harmless.

## Design system "Shamba" (v2.2) — `lib/theme.ts`, doc in the claude.ai Project
- Colours:
  - paper `#F4F2EC` background, white panels;
  - forest `#2E6A4F` / `#1F4D39`;
  - clay `#A8472A` only for risk;
  - ochre `#7A5A14` only as text;
  - maize gold `#E8C25A` only on the scan glyph.
- No dividers, no tinted icon tiles, no emojis. Radii 10/16/20. Fonts: Archivo Narrow (titles and numbers) and Atkinson Hyperlegible (body).
- Crop art:
  - 23 flat two-tone SVG crop illustrations in `lib/cropArt.ts`, drawn with `<CropIcon crop=…>`;
  - fertiliser granule PNGs in `assets/art/fert-*.png` (generic, not brand photos).
- `components/ui.tsx`: Icon, tick (haptics), Text, Press, CropIcon, Header, StatusShade, Card, SectionLabel, Btn, Chip, Segmented, Stepper, ProgressBar, Sheet, Badge, Dot, Empty, Loading, ErrorNote, ListenButton, timeAgo.
- Design canvas (claude.ai): https://claude.ai/artifact/NjWfNABQgE1xPuDbFTHPFL. Directions A/B/C, icon sheet, as-built phone frames.

## Backend — Supabase project `dfobapaknivhgzwffmyc` (eu-west-1, free tier; pauses after about a week idle)
- Anonymous auth is on. Tables with RLS:
  - profiles, farms (`polygon` jsonb `[[lat,lng],…]`, center_lat/lng, planting_date), incidents;
  - forum_posts / replies / post_flags, market_prices, price_reports, chat_usage;
  - satellite tables (below).
- **Edge Functions** (verify_jwt=false; each calls auth.getUser itself). Source is in `cropguard-proxy/supabase/functions/`.
  - `advisor-chat` v6 and `photo-check` v2 (Claude).
    - Testing budget: 6 requests per user per hour and 40 per day globally (`increment_chat_usage`); chat MAX_TOKENS 600.
    - Env overrides: RATE_LIMIT_PER_HOUR, GLOBAL_LIMIT_PER_DAY. Secret: `ANTHROPIC_API_KEY`.
  - `satellite-health` v2. See below.
- **SQL applied:**
  - `cropguard_v21_features.sql` (16 Oct);
  - `cropguard_v23_satellite.sql` (17 Oct, SQL editor);
  - `cropguard_v231_resolution.sql` (19 Oct, Supabase MCP `apply_migration` — it works now; earlier it returned "cancelled").
- Deploying a function: no Supabase CLI is installed on the PC.
  - Either use the Supabase MCP `deploy_edge_function` (pass every file of the function), or install the CLI and have Ezra log in himself (`npx supabase login`; he pastes the token).
- External data:
  - Open-Meteo: weather, spray hours, Hutton blight risk, satellite rain/ET0;
  - OSM Overpass/Nominatim: agro-dealers;
  - Leaflet in a WebView: field map, with Esri imagery (maxNativeZoom 18, map maxZoom 21).

## Satellite crop health (v2.3 / v2.3.1) — full method in `docs/SATELLITE.md`
- **Provider:** Element84 Earth Search `sentinel-2-l2a` COGs, keyless, read with geotiff.js range requests. Reflectance = DN × 0.0001 when `earthsearch:boa_offset_applied` (verified).
- **Resolution rule (Ezra's requirement):**
  - NDVI (B4/B8) and NDWI_WATER (B3/B8) use native 10 m pixels.
  - NDWI_CROP (B8/B11), the joint stress mask and the water-stress score use the native **20 m** grid. B2/B3/B4/B8 are 2×2 block-averaged and B11 is never resampled.
  - Labels: "NDVI · 10 m", "Crop-water NDWI · 20 m", "Joint stress mask · 20 m", "Open-water NDWI · 10 m".
  - `RESOLUTION_METADATA` is in every API response, every observation row (`resolution` column), the CSV (`#` lines and `_10m`/`_20m` columns) and every GeoJSON feature.
- **Masking:**
  - SCL 4–7 kept; SCL 3/8/9/10 masked with a 20 m buffer;
  - haze screen B2 > 0.10;
  - a one-date dip that the next clear image contradicts is marked `suspect` and downgraded to "limited".
- **Quality**, counted in 20 m cells: unusable < 2 clear cells or < 50 %; limited < 4 or < 80 %; excellent ≥ 95 %, ≥ 8 cells and a baseline. Minimum field 800 m².
- **Baseline:** median and MAD of 3–6 good dates in the previous 45 days (20 m NDVI `ndvi20_median` and NDWI_CROP).
- **Classes 0–8** follow Perplexity's methodology. Thresholds are per crop in `CROP_CONFIG`: −0.08 / −0.10 / −0.15.
- **Score:** 0.55·NDWI drop + 0.30·NDVI drop + 0.15·rain deficit.
- **Zones:** whole field under 12 cells, quarters under 60, otherwise a 3×3 grid.
- **Function flow:**
  - `POST {action:"refresh", farm_id}` searches every 6 h, queues scenes in `satellite_scenes` and processes about 2.5 work units per call (CPU limit). The app loops until `remaining` = 0.
  - `{action:"reset"}` clears a field.
  - Rows from method v1 are recomputed automatically.
- **Tables:** satellite_scenes, satellite_observations (with a `grid` jsonb holding `grid10` and `grid20` layers), satellite_zone_stats, satellite_farm_state, field_validations (the "inspect" ground truth plus a 10-day outcome), sat_usage and RPC `increment_sat_usage` (60 calls per hour).
- **Tests:**
  - `cd cropguard-proxy/supabase/functions/satellite-health && deno test test/science_test.ts` (16 tests). Deno is not installed on the PC yet: `npm i -g deno` or winget.
  - `test/live_run.ts` runs a live check on the Eldoret field.
  - App: `node --experimental-strip-types scripts/test-satellite-export.mjs` (4 tests).
- **App code:**
  - `lib/satelliteCore.ts` (pure: types, labels, UTM, CSV/GeoJSON);
  - `lib/satellite.ts` (loading, refresh loop, `interpret()` rules, field checks);
  - `app/satellite/[id].tsx` (dashboard);
  - the farm-map overlay (`/farm-map?sat=<obsId>`);
  - the entry row on `app/farm/[id].tsx`;
  - a satellite line on the home field cards.
- **Eldoret test field:** farm `86a0fc73-33a9-4499-8cd6-2188f4221d27`, maize, 0.73 acres = 7 cells at 20 m. It is "good" at best, one zone. On 27 Sep it showed class 5, recovered by 14 Oct; not confirmed on the ground.
- **Bad test data:** test farm `7046af7f-…` (Tomato, "12 acres") has a polygon about 20 km across. The function rejects it, as it should. Two empty anonymous e2e test users remain in auth and can be deleted.

## Other v2.2 features (as built and phone-tested)
- **Home:** greeting, county, weather card (text-only humidity and wind, tappable 5 days, 12-hour spray bar), blight row with a Sheet, dark scan card, field cards, tickable "This week" tasks, 8 tools, recent scans.
- **Calendar** (`app/calendar.tsx`): week strip, season panel, missed / coming up.
- **Fertiliser planner** (`app/fertiliser.tsx`, `lib/fertiliser.ts`): DAP/NPK/TSP/CAN/Urea/MOP with equivalent-rate swaps, bags, prices and Share.
- **Advisory** timeline; **profile** customisation (`lib/prefs.ts`: avatar crop and tone, farm name, units).
- **Satellite dashboard** checked on the TECNO. The v2.3.1 layer chips have not yet been seen on the phone.

## Phone testing (TECNO CAMON 15, serial `050162503I019840`, arm64-v8a, Android 10, 720×1600)
- adb is at `C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- Dev build: start Metro (`npx expo start --dev-client --port 8081 --clear`), then `adb reverse tcp:8081 tcp:8081`, then open `tassel://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.
  - Fast refresh sometimes misses edits: `adb shell am force-stop ke.tassel.app` and reopen.
- `scripts\tour.ps1 -steps "name|deeplink,scroll,tap:x:y,text:Label,sleep:N"` drives the phone and saves `screenrecord` mp4s to `scripts\shots` (screencap returns blank on this phone; take the last frame with ffmpeg).
- Deep links: `tassel://satellite/<farmId>`, `tassel://farm/<id>`, `tassel://farm-map?sat=<obsId>`.
- Native builds:
  - Arch-specific: `gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.
  - Release: `scripts\build-apk.ps1`.
  - `expo run:android` fails on adb `emu avd name`, so use gradlew directly.
  - If CMake breaks, delete `android/app/.cxx`. NDK r27b; ninja 1.12.1.

## Open work (in order)
1. Install `Desktop\Tassel-v2.4.0.apk` on the phone. Open the Eldoret field: it recomputes with v2, about 1 minute.
   - Check the four layer chips, captions and scale bar, the "On the map" overlay (20 m squares, zoom), the Technical panel and the CSV/GeoJSON share.
2. Test saving a field check (the "What did you find?" sheet) on the phone and the 10-day follow-up card.
3. Signed release: create an upload keystore, back it up off-machine, set versionName 2.4.0 and versionCode up, make a QR code for the judges.
4. Model card and validation report for the 38-class MobileNetV2. Confirm whether the field-test claim (86% vs 40%, 50 samples) used the shipped model.
5. Kenyan field validation: 100+ agronomist-labelled photos. Use the satellite field checks to calibrate `CROP_CONFIG`.
6. Write-up v3 (the claude.ai Project holds v1/v2 .docx, the competitor teardown, the revision report and the design-system doc). Native-speaker review of about 200 new Kiswahili strings.
7. Optional:
   - delete the legacy Vercel `cropguard-proxy/api/chat.js` (ask first);
   - clean orphan sw keys;
   - enable leaked-password protection in Supabase Auth;
   - add the Copernicus Data Space / Earth Engine provider behind `earthsearch.ts` (keys pasted by Ezra).
