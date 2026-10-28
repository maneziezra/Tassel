# Resume here (updated 28 Oct 2026)

## 28 Oct session (all on `redesign/p1-home`, checked on the TECNO, nothing pushed)
- Tasks 1–4 below are done; see README "Third phone pass". Task 5 is still open (release builds only).
- `npm test` now shows: 16 PCPB, 6 profile, 7 field-art, 4 export, 8 diagram, 3 fertiliser tests, 7 rule guards.
- The calendar test wrote to Kera Coffee and Evamos (Ezra's choice); both were put back to
  Coffee, 2025-10-21 and 2025-11-29.
- Next: the farmer check APK (needs versionCode 7 first); native-speaker review of the new
  "flagged" strings in `lib/sw.ts`; Noto emoji were not added to the P2 screens (none earned one).

---
(26 Oct notes follow)

## Where things are
- App repo: `Desktop\CropGuard-AI`, branch **`redesign/p1-home`**, last commit at save time below. Nothing pushed.
  Stacked branches: `redesign/baseline-v2.6` → `redesign/pcpb-catalogue` → `redesign/p0-verify` → `redesign/p1-home`.
- Backend: `Desktop\cropguard-proxy`, branch `tassel-v27-pesticide-products` (commit 12b164a).
  `pesticide_products` SQL is **not applied**. Ezra said "not yet". Ask before applying.
- Notes: `docs/redesign/README.md` (what changed, phone checks). Brief: `docs/HANDOFF.md`.
  Plan: `~/.claude/plans/imperative-scribbling-walrus.md`.
- Screenshots from the phone: `docs/redesign/shots/after-*.jpg`.

## Start-up checklist
1. `git status` should be clean on `redesign/p1-home`; then `npm test`. It should show: 15 PCPB, 6 profile,
   7 field-art, 4 export, 8 diagram tests and 6 rule guards, all passing.
2. Phone (TECNO, serial 050162503I019840): `adb devices`, then
   `adb shell dumpsys window | findstr mCurrentFocus`. Don't take over the phone if Ezra is using it.
3. Metro: `adb reverse tcp:8081 tcp:8081`, then `npx expo start --dev-client --port 8081`.
   If port 8081 is busy, a Metro may already be running; check `curl localhost:8081/status`.
4. Launch: `adb shell am start -a android.intent.action.VIEW -d "tassel://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" ke.tassel.app`.
   A cold start takes about a minute. After a live reload the camera can go black and Home can look stuck:
   force-stop and relaunch before judging.
5. Screenshots: `screencap` is blank on this phone. Use `screenrecord`, then take the last frame with ffmpeg.
   uiautomator can't read the camera screen (it is animated), so use coordinates there.

## Next tasks, in order
1. **Planting-calendar flow on the phone (P0.3)**: field → crop → date → done → "Add another" → switch
   between plantings.
2. Check the "certified seed" diagram on a bean card (Beans → planting) and one tomato spacing card.
3. Before/after shots of the remaining P2 screens: fertiliser, spray calculator, community post,
   outbreaks, prices, profile.
4. Polish the P2 screens (plan, Phase 5); Noto emoji only where they add meaning, not everywhere.
5. Before any release build, update `android/app/build.gradle` to versionCode 7 / 2.7.0. The file is
   generated and gitignored, and still says 6 / 2.6.0.

## Waiting on Ezra
- Apply the Supabase `pesticide_products` table (yes/no).
- A native-speaker check of the Kiswahili strings marked "flagged for native-speaker review" in `lib/sw.ts`.
- The farmer check with 3–5 Eldoret farmers once a test APK is built.
- Push the branches to GitHub (not done; ask first).
