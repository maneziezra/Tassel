# Plan: Kenya-focused model (v9) and the next features

Written 4 Nov 2026 for Ezra. Goal: a leaf model that works on Kenyan farms on old phones, and the features that bring farmers back.

## State today
- App 2.7.2 on the phone (scan crops to the gold frame, animated scenes, fertiliser per crop with coffee).
- Model in the app: v5 (154 classes). Lab/dataset accuracy 94.04%. **Kenyan field accuracy: never measured.**
- v8a (EfficientNetV2-B2, 240 px, Tomato-Village and Marconi beans added) has not trained: Kaggle's 30 h weekly GPU quota ran out. Colab notebook is ready in `Desktop\Tassel-Colab` (Ezra must run it).

## Part A: the model
**A1. Run v8a on Colab (ready).** Same classes as v7 plus 5 tomato classes. Success bar: beats v5 on `test_phone` (phone-framed test) and says "Sure" more often (`coverage_at_threshold`), and the fp16 file is small enough for old phones (about 18 MB; time one scan on the TECNO).

**A2. v9 = v8a + crops serious for Kenya.** Candidates found 4 Nov (NOT yet verified: folder layout, licence, image counts, whether Colab can download them):

| Crop | Source | Notes |
|---|---|---|
| Sweet potato | Mendeley `jjn4ht687d` (JMuBEN 3) | From the Kenyan JMuBEN group. Check for a classification folder layout. |
| Avocado | Mendeley `6zy6wxhf2v` | 435 images, from India (Kotagiri): helpful but small. |
| Cowpea and beans | Mendeley `ykvcrjffzd` (Bangladesh smartphone photos, 4,467 images, 8 classes); Zenodo `17175464` (cowpea) | Phone photos, which suits our test. |
| Pigeon pea | Mendeley `bd553pdtny` | Check classes. |
| Chilli, guava, green gram, lemon | Kaggle (several) | Chilli is close to capsicum. Check each. |

Still missing (no open dataset found): passion fruit, kale (sukuma wiki), French beans, macadamia, pyrethrum, Kenyan tea and coffee in the field. **These need Kenyan photos** (A3).

**A3. Collect Kenyan field photos (the real fix).** The app asks "Was this right?" after a scan; with consent, the photo and the farmer's answer are saved (Supabase storage, private). Use them for: (a) an honest Kenyan accuracy figure; (b) training v10. Ezra's agronomist labels a batch blind.

**A4. Train for old phones.** Add low-quality camera augmentation (low resolution then upscaled, noise, motion blur, heavy JPEG, dim light, bad white balance). Compare model size and time on the TECNO before shipping.

**A5. Ship rule.** A new model goes in the app only if it beats v5 on `test_phone` and on Kenyan photos, with a version bump and Methodology screen update.

## Part B: features (build after the training is running or done)
1. **Useful result when not sure**: "Most likely X or Y" plus one tip (never presented as a diagnosis below 75%); blur and darkness check before scanning.
2. **Today in your shamba**: growth stage, next calendar task with its scene, spray day, notifications (rain, top-dress week).
3. **Scan history per field**: timeline on the field page.
5. **More crops in the guides**: avocado, kale, passion fruit, sweet potato, tea (advisory and calendar, with sourced numbers only).
6. **Share to WhatsApp as a picture**: result and plan as an image; link to an agro-dealer.
Order: 1, then 3 (it feeds A3), then 2, 6, 5.

## Risks
- Kenyan datasets may not exist openly for most crops: we may add classes with few photos, and the model will be weak on them. Mitigation: show those crops as "beta" and lean on the online photo check.
- Mendeley blocks Kaggle's network; Colab may or may not work.
- Old phones: a bigger model may be too slow; the TECNO timing decides.
- Free GPU: Kaggle weekly quota; Colab disconnects.
- Kiswahili for new text is still owed.
- Photo collection needs consent text and a privacy note (rule 4 in HANDOFF).

## Decisions needed from Ezra
1. OK to collect farmers' photos with consent (A3)?
2. Is an agronomist available to label a Kenyan test batch?
3. Run the Colab notebook now (v8a), or wait for Kaggle's quota to reset?

## Engineering review (4 Nov 2026)

1. **Freeze the benchmark.** Adding datasets changes the test split, so scores stop being comparable. Keep v5's test photos and the `test_phone` set fixed, and score every new model on those, plus a separate score for each new crop.
2. **Few-photo classes can hurt the old ones.** v6 lost 1.9 points when thin classes were added (other crops got predicted as them), and v7 dropped some for it. Rule: a new class ships only with enough photos and a decent held-out score (F1 of at least 0.80 on its own test photos), and the old crops must not drop. Avocado (435 photos, from India) is too thin to ship alone.
3. **Licences and credit.** Tomato-Village has no stated licence. Mendeley sets are mostly CC BY and need credit on the Methodology screen. Check each licence before shipping.
4. **Farmer photos need care.** (a) Consent screen in plain words, in English and Kiswahili. (b) Strip GPS and other metadata from the photo. (c) Upload only on Wi-Fi, queued offline. (d) A farmer's "was this right?" is a hint, not a label: only agronomist-checked photos go into the test set. (e) A private Supabase bucket with row-level security, and a delete option.
5. **Old phones.** Time scans on the TECNO and add a "scan time" check before choosing the model. Also consider shipping model updates as a download (versioned, checked) so a new model doesn't need a new 85 MB app.
6. **Order.** Feature 1 (useful result when not sure) and 3 (scan history) don't depend on training: GPU access is the blocker, not building time. Do them now, then 2, 6, 5.
7. **Feature 5 (more crops)** must use sourced numbers only (same rule as coffee).

**Verdict:** the plan is sound. The only blockers are that the Colab run hasn't been started and the new datasets' layouts and licences haven't been checked.
