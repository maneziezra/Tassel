// Tassel — on-device leaf disease classifier
//
// Model: assets/model/cropguard.tflite — Tassel v5 (MobileNetV2, 154 classes, 34 crops;
// PlantVillage + 30 field datasets, see results/model_v5/ATTRIBUTION.md). Input
// 1×224×224×3 float32 RGB, softmax output with temperature calibration built in.
// Float16 weights (4.9 MB). The 38-class v2.4 model is in model_backup/.
// Runs fully offline on the phone via react-native-fast-tflite.
//
// Pipeline (must match training): centre-crop to a square → resize to
// 224×224 → decode JPEG to RGB → scale pixels (see PIXEL_SCALING) → run.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { toByteArray } from 'base64-js';
import * as jpeg from 'jpeg-js';
import type { TfliteModel } from 'react-native-fast-tflite';
import rawLabels from '../assets/model/class_labels.json';

export const INPUT_SIZE = 224;

// Pixel scaling the model was trained with (MobileNetV2 preprocess_input: x/127.5 - 1).
// Verified with scripts/check_preprocessing.py on 40 labelled PlantVillage images:
// [-1,1] → 95.0%, [0,1] → 77.5%. Do not change without re-running that script.
const PIXEL_SCALING: 'zero_one' | 'minus_one_one' = 'minus_one_one';

// Below this confidence the app tells the farmer the result is uncertain.
export const CONFIDENCE_THRESHOLD = 0.75;

const LABELS: string[] = Object.keys(rawLabels as Record<string, string>)
  .sort((a, b) => Number(a) - Number(b))
  .map((k) => (rawLabels as Record<string, string>)[k]);

export type Prediction = {
  label: string; // raw class name, e.g. "Tomato___Late_blight"
  crop: string; // "Tomato"
  disease: string; // "Late blight" or "Healthy"
  healthy: boolean;
  confidence: number; // 0..1
};

export type ScanResult = {
  top: Prediction;
  alternatives: Prediction[]; // next two most likely classes
  uncertain: boolean;
  timings: { prepareMs: number; inferMs: number }; // measured, shown to the farmer
};

export type ScanStep = 'prepare' | 'infer' | 'done';

/** "Corn_(maize)___Common_rust_" → { crop: "Maize", disease: "Common rust" } */
export function describeLabel(label: string): Omit<Prediction, 'confidence'> {
  const [rawCrop = label, rawDisease = ''] = label.split('___');
  const crop = rawCrop
    .replace('Corn_(maize)', 'Maize')
    .replace('Pepper,_bell', 'Pepper (capsicum)')
    .replace('Cherry_(including_sour)', 'Cherry')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^Bean$/, 'Beans');
  const healthy = rawDisease.toLowerCase() === 'healthy';
  let disease = rawDisease
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Tidy a few PlantVillage names
  disease = disease
    .replace('Cercospora leaf spot Gray leaf spot', 'Grey leaf spot (Cercospora)')
    .replace('Spider mites Two-spotted spider mite', 'Spider mites')
    .replace('Haunglongbing (Citrus greening)', 'Citrus greening (HLB)');
  if (healthy) disease = 'Healthy';
  else disease = disease.charAt(0).toUpperCase() + disease.slice(1).toLowerCase();
  return { label, crop, disease, healthy };
}

/** Centre-crop and resize a photo, returning the RGB pixels as model input. */
function cropAndResize(uri: string, width: number, height: number) {
  const side = Math.min(width, height);
  const ctx = ImageManipulator.manipulate(uri);
  ctx
    .crop({
      originX: Math.floor((width - side) / 2),
      originY: Math.floor((height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: INPUT_SIZE, height: INPUT_SIZE });
  return ctx.renderAsync();
}

async function photoToInput(uri: string, width: number, height: number): Promise<Float32Array> {
  let image;
  try {
    if (!width || !height) throw new Error('size unknown');
    image = await cropAndResize(uri, width, height);
  } catch {
    // Some gallery photos report their size before EXIF rotation; measure the real size and retry.
    const probe = await ImageManipulator.manipulate(uri).renderAsync();
    image = await cropAndResize(uri, probe.width, probe.height);
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo.');

  const decoded = jpeg.decode(toByteArray(saved.base64), { useTArray: true, formatAsRGBA: true });
  const { data, width: w, height: h } = decoded;
  if (w !== INPUT_SIZE || h !== INPUT_SIZE) {
    throw new Error(`Unexpected image size ${w}×${h}`);
  }

  const input = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let src = 0, dst = 0; src < data.length; src += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[src + c];
      input[dst++] = PIXEL_SCALING === 'zero_one' ? v / 255 : v / 127.5 - 1;
    }
  }
  return input;
}

// One TFLite interpreter must never run twice at the same time (a double tap on
// the shutter crashed the native interpreter in testing). Every run waits for
// the previous one to finish.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

/** Run the model on a photo and return the top prediction plus alternatives. */
export async function classifyPhoto(
  model: TfliteModel,
  photo: { uri: string; width: number; height: number },
  onStep?: (step: ScanStep, elapsedMs: number) => void
): Promise<ScanResult> {
  const t0 = Date.now();
  onStep?.('prepare', 0);
  const input = await photoToInput(photo.uri, photo.width, photo.height);
  const prepareMs = Date.now() - t0;
  onStep?.('infer', prepareMs);
  const t1 = Date.now();
  const [output] = await serial(() => model.run([input.buffer as ArrayBuffer]));
  const inferMs = Date.now() - t1;
  onStep?.('done', inferMs);
  const probs = new Float32Array(output);

  const ranked = Array.from(probs)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .map(({ p, i }) => ({ ...describeLabel(LABELS[i] ?? `class_${i}`), confidence: p }));

  const top = ranked[0];
  return { top, alternatives: ranked.slice(1), uncertain: top.confidence < CONFIDENCE_THRESHOLD, timings: { prepareMs, inferMs } };
}
