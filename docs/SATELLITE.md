# Crop health from space: method, assumptions and limits

CropGuard v2.3.1 · method `s2-joint-v2` · 19 October 2026

## What it does
For every mapped field, CropGuard reads free ESA Copernicus Sentinel-2 Level-2A images from the last 90 days. A new image arrives every 2–3 days (Sentinel-2A, 2B and 2C). For each image it:
- masks out cloud, cloud shadow and haze;
- works out NDVI and open-water NDWI for every 10 m pixel, and crop-water NDWI for every 20 m cell, in the field;
- compares the field with its own recent normal;
- labels each 20 m cell with one of nine joint crop-health and water-stress classes.

The farmer sees one plain reading (what, where, what to do), the field drawn square by square, the trend over time, and the parts of the field ranked by stress. A short "what did you find?" check records the ground truth.

**Principle:** NDVI and NDWI are evidence in a decision. They are never a diagnosis. Every message says "possible", "risk" or "inspect".

## Data
| Item | Source | Resolution | Use |
|---|---|---|---|
| B2 blue | Sentinel-2 L2A COG, Element84 Earth Search (AWS Open Data) | 10 m | Haze screen |
| B3 green | " | 10 m | Open-water NDWI |
| B4 red | " | 10 m | NDVI |
| B8 near-infrared | " | 10 m | NDVI, both NDWIs |
| B11 SWIR-1 | " | 20 m | Crop NDWI |
| SCL scene classification | " | 20 m | Cloud and shadow mask |
| Rain, FAO-56 ET₀ | Open-Meteo daily | ~9–11 km | Rain deficit, 21 days |

No API key is needed. Only the window around the field is downloaded (HTTP range requests).

**Reflectance.** Earth Search items with `earthsearch:boa_offset_applied = true` already have the processing-baseline-04.00 offset removed, so reflectance = DN × 0.0001. This was checked on 14 Oct 2026, tile 36NYF:
- dense vegetation red, 1st percentile: 280 DN;
- open-water NIR: ≈ 460 DN.

Both values are impossible if the −1000 DN offset were still present. Items without the flag and with baseline ≥ 04.00 get −0.1 applied.

## Resolution: display size is not effective resolution
| Product | Bands | Effective resolution | Computed and stored on | Dashboard label |
|---|---|---|---|---|
| NDVI | B4, B8 | 10 m | native 10 m pixels | NDVI · 10 m |
| Open-water NDWI (`NDWI_WATER`) | B3, B8 | 10 m | native 10 m pixels | Open-water NDWI · 10 m |
| Crop-water NDWI (`NDWI_CROP`) | B8, B11 | **20 m** | 20 m analysis cells | Crop-water NDWI · 20 m |
| Joint stress mask | B2, B4, B8, B11, SCL | **20 m** | 20 m analysis cells | Joint stress mask · 20 m |
| Water-stress score | B4, B8, B11 (+ rain) | **20 m** | 20 m analysis cells | Water-stress score · 20 m |

- B11 (SWIR-1) and SCL are natively 20 m, so everything that uses them is computed on the **native 20 m grid**. B11 is never resampled to 10 m.
- To compute 20 m products, B2/B3/B4/B8 reflectance is averaged over the four 10 m pixels inside each 20 m cell. This is an exact 2 × 2 block average: the 10 m and 20 m grids of a Sentinel-2 tile share an origin.
- A 20 m cell belongs to the field when at least half of it is inside the boundary (from a 4 × 4 sample grid). A 10 m pixel belongs when its centre is inside.
- The dashboard draws 20 m products as 20 m squares and 10 m products as 10 m squares, with a scale bar. On the satellite map, the joint mask is drawn as 20 m squares over a 10 m-capable base map. The caption states the effective resolution.
- Every API response, every observation row (`resolution` column), the CSV header (`#` lines plus `_10m`/`_20m` column names) and every GeoJSON feature carry the resolution metadata.
- Tests:
  - `supabase/functions/satellite-health/test/science_test.ts`: 16 tests, including "nothing that depends on B11 or SCL claims 10 m", "changing B11 in one 20 m cell changes exactly one crop-NDWI value" and "20 m NDVI is the exact block average".
  - `scripts/test-satellite-export.mjs`: dashboard labels, CSV and GeoJSON.

## Indices
- NDVI = (B8 − B4) / (B8 + B4): green cover / vigour, at 10 m. A 20 m version, from block-averaged B4/B8, is used inside the joint mask and its baseline so both inputs share one grid.
- NDWI_CROP = (B8 − B11) / (B8 + B11) (Gao 1996): leaf and canopy water, at 20 m.
- NDWI_WATER = (B3 − B8) / (B3 + B8) (McFeeters 1996): open water and flooding only, at 10 m. It is named separately everywhere.

## Masking
1. SCL classes 4–7 (vegetation, bare soil, water, unclassified) are kept.
2. Classes 3, 8, 9 and 10 (shadow, medium cloud, high cloud, cirrus) are masked, plus a one-pixel (20 m) buffer around them.
3. Classes 0, 1, 2 and 11 are masked without a buffer.
4. **Haze:** blue (B2) above 0.10 is masked, except where SCL says water. On 7 and 12 Oct 2026, SCL called the Eldoret test field clear, but blue was 0.11–0.15 against 0.04–0.05 on clear days. Unmasked, NDVI would have dropped from 0.47 to 0.21–0.29 and then "recovered" two days later.
5. **Haze dip:** a date that sits more than 0.12 NDVI below both its baseline and the next clear date (within 12 days) is marked suspect after the next image arrives. It is downgraded to "limited" and left out of baselines.
6. The cloud-probability layer (s2cloudless / CLD) is not in the free COG archive. It can be added through the provider interface if Copernicus Data Space or Earth Engine is connected later.

## Data quality (judged on 20 m analysis cells)
| Grade | Rule | Effect |
|---|---|---|
| Unusable | < 50 % of the field's 20 m cells clear, or < 2 clear cells | No conclusions. Drawn grey, never as healthy |
| Limited | 50–79 % clear, or < 4 clear cells (1600 m²), or suspected haze | Shown as a hint only, no strong alert |
| Good | ≥ 80 % clear | Alerts allowed |
| Excellent | ≥ 95 % clear, ≥ 8 cells, baseline of ≥ 3 dates | Alerts allowed |

An alert also needs the last clear image to be no more than 20 days old.

## Baseline
The field's own normal is the **median** of up to 6 good or excellent dates from the 45 days before the image. The spread is the MAD × 1.4826. At least 3 dates are needed. Only dates when the crop was visible count, so bare soil before emergence is not a baseline. The robust anomaly is (value − median) / max(spread, 0.03).

## Joint classification (per 20 m cell)
| Code | Meaning | Rule (Δ = value − baseline) |
|---|---|---|
| 0 | No data | masked, or the image is unusable |
| 7 | Open water / flooding | SCL water, or NDWI_water > 0 with NDVI < 0.2 |
| 1 | Bare soil / not crop | NDVI below the crop minimum (maize 0.25, beans 0.22) |
| 8 | Recovering | stress in the last 45 days, and ΔNDVI ≥ +0.05 and ΔNDWI ≥ 0 |
| 2 | Normal | ΔNDVI ≥ −0.08 and ΔNDWI ≥ −0.08 |
| 3 | Possible mild water stress | ΔNDVI ≥ −0.15 and ΔNDWI < −0.10 |
| 4 | Possible severe water stress | ΔNDVI < −0.15 and ΔNDWI < −0.10 |
| 5 | Strong decline, water normal | ΔNDVI < −0.15 and ΔNDWI ≥ −0.10 |
| 6 | Some decline (pest, disease, nutrient or damage possible) | everything else |

Without a baseline, a crop pixel is class 2. The app then says "crop visible, learning this field", not "healthy". Thresholds are per crop in `science.ts` (`CROP_CONFIG`) and are **starting values**.

## Water-stress score (0–1)
0.55 · clamp(−ΔNDWI / 0.20) + 0.30 · clamp(−ΔNDVI / 0.25) + 0.15 · rain deficit

The rain deficit = clamp((ET₀ − rain) / ET₀) over the 21 days before the image. When rain is unknown, the other weights are rescaled.

Bands: < 0.25 low · < 0.50 moderate · < 0.75 high · otherwise severe.

## Zones
Each field is split into parts a farmer can walk to, counted in 20 m cells:
- under 12 cells (about 1.2 acres): the whole field;
- under 60 cells: four compass quarters;
- larger fields: a 3 × 3 grid.

Every zone stores its own medians, changes, dominant class and score. The farmer is told the zone with the highest score.

## Advice rules
- Both indices down: possible water stress. Inspect soil moisture and wilting within 24–48 h.
- NDWI down, NDVI steady: early sign of water stress.
- NDVI down, NDWI steady: possible pest, disease or nutrient problem. Walk the zone and scan leaves.
- Both up after stress: recovering.
- Late in the season (> 80 % of the crop's days): falling NDVI is described as natural drying.
- Poor imagery: no conclusion, and the app says why.

## Field validation
`field_validations` stores each check: what was found, soil moisture, irrigation, notes, the predicted class and zone, and an outcome after 10 days (better, same or worse). These measure:
- precision of stress alerts;
- recall of observed stress;
- the false-alert rate;
- lead time.

The thresholds should be re-fitted once there are about 50 checks per crop.

## Validation so far
Live run on the Eldoret test field (maize, 0.73 acres: 28 pixels at 10 m, 7 cells at 20 m), method v2, 21 Jul – 17 Oct 2026:
- The field is 7 analysis cells, so its quality is "good" at best, never "excellent", and it is treated as one zone. That is the honest limit of Sentinel-2 for a field this size.
- With the 20 m analysis, late August no longer shows water stress. The v1 method (B11 interpolated to 10 m) flagged it, so the v1 signal was partly an artefact of claiming more detail than B11 has.
- 27 Sep: a strong NDVI decline with normal leaf water (class 5, "possible pest, disease or nutrient problem"). It recovered by 14 Oct. Not confirmed on the ground.

Earlier run with method v1, kept for the record:
- 27 dates were found: 10 cloudy, 3 unusable, 1 haze-suspect and 13 good or excellent.
- The haze screen removed the two false declines on 7 and 12 Oct.
- 25 Aug – 2 Sep was flagged as possible water stress: ΔNDWI ≈ −0.10 to −0.12, ΔNDVI −0.06 to −0.16. **This has not been confirmed on the ground.**

The unit tests (`supabase/functions/satellite-health/test/science_test.ts`, 12 tests) cover:
- the indices;
- UTM against proj4;
- polygon checks;
- SCL buffering;
- bilinear resampling (method v1 only; v2 does not resample B11);
- every class rule;
- the baseline;
- the score;
- the quality grades;
- the haze dip;
- the zones;
- a synthetic end-to-end scene.

## Limits
- The joint mask works on 20 m cells (400 m²). A 0.25-acre plot is only 2–3 cells, the minimum field size is 800 m², and edge cells mix crop with paths, hedges and neighbouring fields.
- Clouds in the long rains can hide a field for 2–3 weeks.
- Intercropping (maize with beans), weeds and trees are counted as "green cover".
- The method cannot tell pests from disease from nutrient problems. That is what the farmer's eyes and the leaf scanner are for.
- Thresholds are not yet calibrated for Kenyan smallholder fields.

## Privacy
- Boundaries and results can be read only by the field's owner (RLS).
- Only the Edge Function, with the secret key, can write results.
- Field checks are used to tune thresholds and are never shared with names.
