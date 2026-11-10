// Tassel — over-the-air model updates on the phone. Rules: lib/modelUpdateCore.ts.
// The manifest lives in the public "models" bucket on Supabase (cropguard-proxy v29 SQL).

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { getDisease } from './diseases';
import { supabase } from './supabase';
import {
  appUpdate, BUILTIN, dueForCheck, hex, labelList, parseManifest, planModel, uncoveredLabels,
  type Active, type AppEntry,
} from './modelUpdateCore';

const ACTIVE_KEY = 'model:active:v1';
const CHECK_KEY = 'model:lastCheck:v1';
const APP_KEY = 'model:appUpdate:v1';
const BUCKET = 'models';

const url = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/** This build's versionCode (android.versionCode in app.json). */
export function appCode(): number {
  const c = Number(Constants.expoConfig?.android?.versionCode ?? 0);
  return Number.isFinite(c) ? c : 0;
}

export async function activeModel(): Promise<Active> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_KEY);
    const a = raw ? (JSON.parse(raw) as Active) : null;
    // A downloaded model whose files went missing falls back to the built-in one.
    if (a && a.version !== BUILTIN && a.tflite && a.labels && new File(a.tflite).exists && new File(a.labels).exists) return a;
  } catch {
    // fall through
  }
  return { version: BUILTIN };
}

/** The labels of the model in use, or null for the built-in one (the bundled class_labels.json). */
export async function activeLabels(a: Active): Promise<string[] | null> {
  if (a.version === BUILTIN || !a.labels) return null;
  try {
    return labelList(JSON.parse(await new File(a.labels).text()));
  } catch {
    return null;
  }
}

/** A newer APK to tell the farmer about (from the last check). */
export async function pendingAppUpdate(): Promise<AppEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_KEY);
    return appUpdate(raw ? (JSON.parse(raw) as AppEntry) : undefined, appCode());
  } catch {
    return null;
  }
}

async function sha256(file: File): Promise<string> {
  return hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes()));
}

const dirFor = (version: string) => new Directory(Paths.document, 'models', version);

function removeDir(d: Directory) {
  try {
    if (d.exists) d.delete();
  } catch {
    // nothing to remove
  }
}

export type CheckResult = 'skipped' | 'up-to-date' | 'installed' | 'rolled-back' | 'needs-app-update' | 'failed';

let running = false;

/**
 * Checks the manifest (Wi-Fi only, once a day unless forced), downloads and verifies a new model.
 * The new model is used from the next time the app opens; the scanner never swaps mid-session.
 */
export async function checkForModelUpdate(force = false): Promise<CheckResult> {
  if (running) return 'skipped';
  running = true;
  try {
    const net = await Network.getNetworkStateAsync();
    const onWifi = net.type === Network.NetworkStateType.WIFI && net.isInternetReachable !== false;
    const last = Number(await AsyncStorage.getItem(CHECK_KEY)) || null;
    if (!onWifi || (!force && !dueForCheck(last, Date.now(), onWifi))) return 'skipped';

    const res = await fetch(url('manifest.json'), { cache: 'no-store' });
    if (!res.ok) return 'failed';
    const manifest = parseManifest(await res.json());
    await AsyncStorage.setItem(CHECK_KEY, String(Date.now()));
    if (!manifest) return 'failed';
    await AsyncStorage.setItem(APP_KEY, JSON.stringify(manifest.app ?? null));

    const active = await activeModel();
    const plan = planModel(manifest.model, active, appCode());
    if (plan.kind === 'none') return 'up-to-date';
    if (plan.kind === 'needs-app-update') return 'needs-app-update';
    if (plan.kind === 'rollback') {
      await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify({ version: BUILTIN }));
      removeDir(new Directory(Paths.document, 'models'));
      return 'rolled-back';
    }

    const m = plan.model;
    const dir = dirFor(m.version);
    removeDir(dir);
    dir.create({ intermediates: true, idempotent: true });
    try {
      const tflite = await File.downloadFileAsync(url(m.file), new File(dir, 'cropguard.tflite'));
      const labelsFile = await File.downloadFileAsync(url(m.labels_file), new File(dir, 'class_labels.json'));
      if (tflite.size !== m.bytes) throw new Error('size');
      if ((await sha256(tflite)) !== m.sha256 || (await sha256(labelsFile)) !== m.labels_sha256) throw new Error('checksum');

      const labels = labelList(JSON.parse(await labelsFile.text()));
      if (!labels) throw new Error('labels');
      if (uncoveredLabels(labels, (l) => Boolean(getDisease(l))).length) {
        removeDir(dir);
        return 'needs-app-update';
      }

      // Test-run: the output must have one score per label.
      const model = await loadTensorflowModel({ url: tflite.uri }, []);
      const shape = model.inputs?.[0]?.shape ?? [1, 224, 224, 3];
      const size = shape.reduce((a, b) => a * (b > 0 ? b : 1), 1);
      const [out] = await model.run([new Float32Array(size).buffer as ArrayBuffer]);
      if (new Float32Array(out).length !== labels.length) throw new Error('output');

      const next: Active = { version: m.version, tflite: tflite.uri, labels: labelsFile.uri, installed_at: new Date().toISOString() };
      const prev = await activeModel();
      await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
      if (prev.version !== BUILTIN && prev.version !== m.version) removeDir(dirFor(prev.version));
      return 'installed';
    } catch {
      removeDir(dir);
      return 'failed';
    }
  } catch {
    return 'failed';
  } finally {
    running = false;
  }
}
