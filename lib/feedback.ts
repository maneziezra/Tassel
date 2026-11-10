// Tassel — "Was this right?": the farmer's answer and photo, shared only with consent.
// Rules in lib/feedbackCore.ts. Nothing here runs unless the farmer said yes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';
import { currentUserId } from './session';
import { addToQueue, BUCKET, canUpload, FEEDBACK_MODEL, feedbackRow, shrinkTo, storagePath, uuid4, type Answer, type Consent, type QueueItem } from './feedbackCore';

const CONSENT_KEY = 'trainingConsent:v1';
const QUEUE_KEY = 'trainingQueue:v1';

export async function getTrainingConsent(): Promise<Consent> {
  try {
    const v = await AsyncStorage.getItem(CONSENT_KEY);
    return v === 'yes' || v === 'no' ? v : null;
  } catch {
    return null;
  }
}

export async function setTrainingConsent(v: 'yes' | 'no'): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, v);
  if (v === 'no') await clearQueue();
  else flushFeedback().catch(() => {});
}

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

const writeQueue = (q: QueueItem[]) => AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));

function removeFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

async function clearQueue() {
  for (const item of await readQueue()) removeFile(item.file);
  await AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
}

export async function queuedCount(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Keeps the answer and a clean copy of the photo on the phone until there is Wi-Fi.
 * Re-encoding to JPEG writes a new file without the camera's metadata (GPS, time, phone model).
 */
export async function shareFeedback(input: { uri: string; class_label: string; confidence: number; uncertain: boolean; crop: string | null; answer: Answer }): Promise<void> {
  if ((await getTrainingConsent()) !== 'yes') return;
  const probe = await ImageManipulator.manipulate(input.uri).renderAsync();
  const size = shrinkTo(probe.width, probe.height);
  let img = probe;
  if (size) {
    const ctx = ImageManipulator.manipulate(input.uri);
    ctx.resize(size);
    img = await ctx.renderAsync();
  }
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  const dir = new Directory(Paths.document, 'feedback-queue');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const id = uuid4();
  const dest = new File(dir, `${id}.jpg`);
  await new File(saved.uri).move(dest);

  const item: QueueItem = {
    id,
    file: dest.uri,
    class_label: input.class_label,
    confidence: input.confidence,
    uncertain: input.uncertain,
    crop: input.crop,
    answer: input.answer,
    model: FEEDBACK_MODEL,
    app_version: Constants.expoConfig?.version ?? null,
    scanned_at: new Date().toISOString(),
  };
  const { queue, dropped } = addToQueue(await readQueue(), item);
  dropped.forEach((d) => removeFile(d.file));
  await writeQueue(queue);
  flushFeedback().catch(() => {});
}

let flushing = false;

/** Sends what is queued, one photo at a time, only on Wi-Fi. Safe to call often. */
export async function flushFeedback(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const consent = await getTrainingConsent();
    if (consent !== 'yes') return 0;
    if (!canUpload(await Network.getNetworkStateAsync(), consent)) return 0;
    const uid = await currentUserId();
    for (const item of await readQueue()) {
      const file = new File(item.file);
      if (file.exists) {
        const path = storagePath(uid, item.id);
        const up = await supabase.storage.from(BUCKET).upload(path, await file.bytes(), { contentType: 'image/jpeg', upsert: true });
        if (up.error) break; // try again on the next Wi-Fi
        // Insert, not upsert: answers cannot be edited. A row already there (a resend) counts as sent.
        const { error } = await supabase.from('scan_feedback').insert(feedbackRow(item, path));
        if (error && error.code !== '23505') break;
        removeFile(item.file);
        sent++;
      }
      await writeQueue((await readQueue()).filter((q) => q.id !== item.id));
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Withdraws: stops sharing, empties the phone's queue, and deletes every photo and answer already sent. */
export async function deleteSharedFeedback(): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, 'no');
  await clearQueue();
  const uid = await currentUserId();
  const { data, error: listErr } = await supabase.storage.from(BUCKET).list(uid, { limit: 1000 });
  if (listErr) throw listErr;
  if (data?.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(data.map((o) => `${uid}/${o.name}`));
    if (error) throw error;
  }
  const { error } = await supabase.from('scan_feedback').delete().eq('user_id', uid);
  if (error) throw error;
}
