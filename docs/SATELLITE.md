# Crop health from space: method, assumptions and limits

CropGuard v2.3 · method `s2-joint-v1` · October 2026

## What it does
For every mapped field, CropGuard reads free ESA Copernicus Sentinel-2 Level-2A images from the last 90 days. A new image arrives every 2–3 days (Sentinel-2A, 2B and 2C). For each image it:
- masks out cloud, cloud shadow and haze;
- works out three indices for every 10 m square in the field;
- compares the field with its own recent normal;
- labels each square with one of nine joint crop-health and water-stress classes.

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

## Indices
- NDVI = (B8 − B4) / (B8 + B4): green cover / vigour, 10 m.
- NDWI_crop = (B8 − B11) / (B8 + B11) (Gao 1996): leaf and canopy water. B11 is resampled bilinearly to each 10 m pixel centre. **Its effective resolution is 20 m**, and the app says so.
- NDWI_water = (B3 − B8) / (B3 + B8) (McFeeters 1996): open water and flooding only. It is named separately everywhere.

## Masking
1. SCL classes 4–7 (vegetation, bare soil, water, unclassified) are kept.
2. Classes 3, 8, 9 and 10 (shadow, medium cloud, high cloud, cirrus) are masked, plus a one-pixel (20 m) buffer around them.
3. Classes 0, 1, 2 and 11 are masked without a buffer.
4. **Haze:** blue (B2) above 0.10 is masked, except where SCL says water. On 7 and 12 Oct 2026, SCL called the Eldoret test field clear, but blue was 0.11–0.15 against 0.04–0.05 on clear days. Unmasked, NDVI would have dropped from 0.47 to 0.21–0.29 and then "recovered" two days later.
5. **Haze dip:** a date that sits more than 0.12 NDVI below both its baseline and the next clear date (within 12 days) is marked suspect after the next image arrives. It is downgraded to "limited" and left out of baselines.
6. The cloud-probability layer (s2cloudless / CLD) is not in the free COG archive. It can be added through the provider interface if Copernicus Data Space or Earth Engine is connected later.

## Data quality
| Grade | Rule | Effect |
|---|---|---|
| Unusable | < 50 % of the field clear, or < 4 clear squares | No conclusions. Drawn grey, never as healthy |
| Limited | 50–79 % clear, or < 9 clear squares, or suspected haze | Shown as a hint only, no strong alert |
| Good | ≥ 80 % clear | Alerts allowed |
| Excellent | ≥ 95 % clear, ≥ 25 squares, baseline of ≥ 3 dates | Alerts allowed |

An alert also needs the last clear image to be no more than 20 days old.

## Baseline
The field's own normal is the **median** of up to 6 good or excellent dates from the 45 days before the image. The spread is the MAD × 1.4826. At least 3 dates are needed. Only dates when the crop was visible count, so bare soil before emergence is not a baseline. The robust anomaly is (value − median) / max(spread, 0.03).

## Joint classification (per 10 m square)
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
Each field is split into parts a farmer can walk to:
- under 16 squares: the whole field;
- under 150 squares: four compass quarters;
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
Live run on the Eldoret test field (maize, 0.73 acres, 28 squares), 18 Jul – 14 Oct 2026:
- 27 dates were found: 10 cloudy, 3 unusable, 1 haze-suspect and 13 good or excellent.
- The haze screen removed the two false declines on 7 and 12 Oct.
- 25 Aug – 2 Sep was flagged as possible water stress: ΔNDWI ≈ −0.10 to −0.12, ΔNDVI −0.06 to −0.16. **This has not been confirmed on the ground.**

The unit tests (`supabase/functions/satellite-health/test/science_test.ts`, 12 tests) cover:
- the indices;
- UTM against proj4;
- polygon checks;
- SCL buffering;
- bilinear resampling;
- every class rule;
- the baseline;
- the score;
- the quality grades;
- the haze dip;
- the zones;
- a synthetic end-to-end scene.

## Limits
- 10 m squares are coarse for small plots. A 0.25-acre plot is about 10 squares, and edge squares mix crop with paths, hedges and neighbouring fields.
- Clouds in the long rains can hide a field for 2–3 weeks.
- Intercropping (maize with beans), weeds and trees are counted as "green cover".
- The method cannot tell pests from disease from nutrient problems. That is what the farmer's eyes and the leaf scanner are for.
- Thresholds are not yet calibrated for Kenyan smallholder fields.

## Privacy
- Boundaries and results can be read only by the field's owner (RLS).
- Only the Edge Function, with the secret key, can write results.
- Field checks are used to tune thresholds and are never shared with names.
