# Tassel redesign — what changed and why (26 Oct 2026)

Brief: `docs/HANDOFF.md`. Plan: `~/.claude/plans/imperative-scribbling-walrus.md`.
Figma (two Home directions, Add field, Field Health, Scan): https://www.figma.com/design/333QZMS8LwCpNzHdatOxJ6

Ezra's decisions (26 Oct): brand = how your field is doing and what to do today; Noto Animated Emoji;
named PCPB products only when checked against the register; model v8 after the redesign; Home Direction A
(dark field hero), "make it feel not just professional but unique".

## Branches (stacked, in order; nothing pushed)

| Branch | What |
|---|---|
| `redesign/baseline-v2.6` | The earlier session's uncommitted v2.5/2.6 work, saved as-is |
| `redesign/pcpb-catalogue` | PCPB catalogue rebuilt from the official register; label-quoted rates only |
| `redesign/p0-verify` | P0 tests and missing scan entry points |
| `redesign/p1-home` | Home (Direction A), Add field, Field Health, Scan, Noto emoji, motion stack |

## The signature: the farmer's own field, animated

`components/FieldHero.tsx` draws the field from its real Sentinel-2 grid (10 m NDVI squares;
20 m for very large fields). A gold satellite line sweeps across and reveals the squares, the
boundary draws itself, and 20 m cells the joint mask flags as possible stress pulse in clay.
The same art plays at the end of Add field while the first satellite check runs, so a farmer
sees their field "arrive". Reduce-motion shows the final picture.

## Screen by screen

- **Home**: dark hero = greeting, field switcher, the field from space, one plain verdict from
  `interpret()` with the real picture date. One gold action overlaps the hero edge: "Scan a leaf"
  (or "Draw my field" on first run). Today: at most 3 generated cards with Noto animated emoji.
  The hard-coded "154 plant conditions" is gone.
- **Add field**: animated slides with a moving progress line; a crop or date choice moves on by
  itself; the size slide is skipped when the drawing measured it and uses the Profile units.
- **Field Health**: the field directly under the reading; farmer view in words with the
  resolution kept ("Green cover · 10 m"); band names live in Technical view; the map cross-fades
  between dates; honest notes for cloud gaps and single-zone fields. Science unchanged.
- **Scan result**: "Sure / Fairly sure / Not sure"; below 75 % the title says "Not sure" and the
  guess is small; three next steps under the verdict. The camera guide frame breathes.
- **Spray calculator** (P2): crop → problem → registered products → mix → safety → today's spray
  window. Doses only from PCPB labels; ranges never averaged; no invented tank counts.

## Problems found and fixed (all in the commit messages)

- `lib/pcpb.ts` had 18 hand-typed products: every registration number was wrong; Sencor, Kocide
  2000 and Milraz are not registered; Actara is "not for use in open field"; Roundup Turbo is
  registered for non-crop areas, tea and coffee only (the app offered it for maize). Rebuilt from
  the register (1,118 open-field products for the app's crops) with rates from 13 labels.
- Methodology stated AI limits of 20/hour and 500/day; the server default is 6 and 40.
- "Track crop health every 2–3 days" (not guaranteed by Sentinel-2, and clouds) removed.
- Hutton late-blight risk was shown on every crop's advisory; now potato and tomato only.
- Imidacloprid was listed as a TYLCV option; now "restricted" like the other June 2025 actives.
- Profile name: merge logic made pure and tested; photo-check "scan again" used a raw route.

## Checked on the TECNO (26 Oct, debug build over Metro, installed with `adb install -r`)

- Before/after Home: `docs/redesign/shots/before-home.jpg`, `after-home.jpg`.
- The field hero draws the real boundary of "Kera Coffee" under the satellite sweep; the field
  switcher shows both fields; the gold Scan action and verdict render as designed.
- P0.1 root cause: the phone's account is anonymous (created 21 Oct) and never went through
  sign-up, so no name existed in the profile row, the auth metadata or the cache. Home now asks
  "What should we call you?" under the greeting (one field, saved through `saveProfile`).
- Found and fixed on the phone: Noto emoji ended on a blank frame (now loop), invisible avatar
  initials, a paper-coloured status-bar strip over the dark hero, a 3-line "checking" verdict,
  deprecated Skia path calls.

## Second phone pass (26 Oct, evening)

- Name: "Good evening, Ezra" shows on Home after restart (P0.1 confirmed on the phone).
- Location: Android's "Location Accuracy" dialog came up on every Home refresh; automatic loads no longer ask.
- Home hero: the field sits on a paper plate with a Bare–Dense–Cloud key; cloud squares are empty;
  stress squares pulse only when the verdict says watch/act.
- Scan: a tap on "Scan a leaf" could carry onto the camera and press the shutter or gallery; the
  camera buttons now wait 600 ms after opening. All Scan buttons use `openScanner()`.
- Result: "Not sure" shows the guess small, then Retake / Check online / Ask the community; no
  treatment, plan or urgency for a guess.
- Advisory: animated diagrams for spacing, depth, rotation and certified seed, drawn only from the
  numbers in each step (`lib/diagramFacts.ts`, `scripts/test-diagrams.mjs`).

## Not done / needs Ezra

- **Phone checks still to do**: the planting-calendar flow; before/after shots of the other screens.
- **Auto-capture** on the scan camera needs frame processing (react-native-vision-camera).
- **Mobbin** references: the Mobbin MCP needs a paid plan.
- **Supabase** `pesticide_products` table: written (`cropguard-proxy`, branch
  `tassel-v27-pesticide-products`), not applied — Ezra said "not yet".
- **Kiswahili**: every new string is in `lib/sw.ts` under "flagged for native-speaker review".
- **KSEF report** (`docs/KSEF_2026_TASSEL_PROJECT_REPORT.md`) still needs the fabricated results removed.
- **Farmer check** with 3–5 Eldoret farmers (P1 definition of done).

## How to verify

`npm test` runs the typecheck, the Kiswahili check and the behaviour tests (PCPB catalogue,
profile merge, field art, satellite export, rule guards). Refresh the PCPB catalogue with
`python -I scripts/pcpb/build_catalogue.py` after re-exporting the register.
