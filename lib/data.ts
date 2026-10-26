// Tassel — data layer (Supabase tables with row-level security).
// Replaces the v1.0 FirebaseService stubs, which returned fake data.
// v2.1 features (outbreak alerts, planting dates, photo posts, farmer prices)
// degrade gracefully if the v2.1 database update has not been applied yet.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { toByteArray } from 'base64-js';
import { supabase } from './supabase';
import { currentUserId, ensureSession } from './session';
import { tr } from './i18n';

export type Profile = { id: string; name: string | null; phone: string | null; county: string | null; crops: string | null; created_at?: string };
export type LatLng = [number, number];
export type Farm = {
  id: string;
  name: string;
  crop: string | null;
  size_acres: number | null;
  stage: string | null;
  location: string | null;
  notes: string | null;
  polygon: LatLng[] | null;
  center_lat: number | null;
  center_lng: number | null;
  planting_date?: string | null; // YYYY-MM-DD (transplanting date for tomato)
  created_at: string;
};
export type Incident = {
  id: string;
  farm_id: string | null;
  class_label: string;
  crop: string;
  disease: string;
  confidence: number;
  uncertain: boolean;
  notes: string | null;
  created_at: string;
};
export type Post = {
  id: string;
  author: string;
  author_name: string;
  title: string;
  body: string;
  crop: string | null;
  category: 'General' | 'Pests' | 'Diseases' | 'Market';
  reply_count: number;
  created_at: string;
  photo_path?: string | null;
  scan_label?: string | null;
  scan_confidence?: number | null;
};
export type Reply = { id: string; post_id: string; author: string; author_name: string; body: string; created_at: string };
export type Price = { id: number; crop: string; unit: string; level: 'wholesale' | 'retail'; market: string; price_kes: number; observed_on: string; source: string; source_url: string | null };
export type Outbreak = { county: string; crop: string; disease: string; class_label: string; reports: number; farmers: number; last_seen: string };
export type PriceSummary = { crop: string; county: string; unit: string; median_kes: number; reports: number; reporters: number; latest: string };
export type PriceUnit = 'kg' | '90kg bag' | '50kg bag' | 'crate' | 'piece';

function fail(error: { message: string } | null, what: string): void {
  if (error) {
    const offline = /network|fetch/i.test(error.message);
    throw new Error(
      offline ? tr('Could not {what}. Check your internet connection.', { what: tr(what) }) : `${tr('Could not {what}', { what: tr(what) })}: ${error.message}`
    );
  }
}

/** True when the v2.1 database update has not been applied yet (column / function / table missing). */
function isMissingSchema(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    /column .* does not exist|could not find .* column|schema cache|function .* does not exist|could not find the function|relation .* does not exist/i.test(error.message) ||
    ['42703', '42883', '42P01', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code ?? '')
  );
}

let v21 = true; // assume the v2.1 database update is applied until the server says otherwise
export function hasV21Schema(): boolean {
  return v21;
}

// ── Profile ─────────────────────────────────────────────────────────
const profileKey = (id: string) => `profile:${id}`;
const GLOBAL_PROFILE_KEY = 'profile:latest';

export async function getLocalProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile> {
  let id = '';
  let authName: string | null = null;
  try {
    const session = await ensureSession();
    id = session.user.id;
    const meta = session.user.user_metadata as { name?: string; full_name?: string } | undefined;
    authName = meta?.name?.trim() || meta?.full_name?.trim() || null;
  } catch {}

  let cached: Profile | null = null;
  try {
    const raw = id ? await AsyncStorage.getItem(profileKey(id)) : null;
    cached = raw ? JSON.parse(raw) : await getLocalProfile();
  } catch {}

  if (!id) {
    return cached ?? { id: '', name: authName, phone: null, county: null, crops: null };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (cached) {
        if (!cached.name && authName) cached.name = authName;
        return cached;
      }
      fail(error, 'load your profile');
    }

    const resolvedName = data?.name?.trim() || authName || cached?.name?.trim() || null;
    const resolvedPhone = data?.phone?.trim() || cached?.phone?.trim() || null;
    const resolvedCounty = data?.county?.trim() || cached?.county?.trim() || null;
    const resolvedCrops = data?.crops?.trim() || cached?.crops?.trim() || null;

    const merged: Profile = {
      id,
      name: resolvedName,
      phone: resolvedPhone,
      county: resolvedCounty,
      crops: resolvedCrops,
      created_at: data?.created_at ?? cached?.created_at,
    };

    // If Supabase was missing the name, backfill it
    if ((!data || !data.name) && resolvedName) {
      Promise.resolve(
        supabase.from('profiles').upsert({
          id,
          name: resolvedName,
          phone: resolvedPhone,
          county: resolvedCounty,
          crops: resolvedCrops,
          updated_at: new Date().toISOString(),
        })
      ).catch(() => {});
    }

    // Cache locally
    AsyncStorage.setItem(profileKey(id), JSON.stringify(merged)).catch(() => {});
    AsyncStorage.setItem(GLOBAL_PROFILE_KEY, JSON.stringify(merged)).catch(() => {});

    return merged;
  } catch {
    if (cached) {
      if (!cached.name && authName) cached.name = authName;
      return cached;
    }
    return { id, name: authName, phone: null, county: null, crops: null };
  }
}

export async function saveProfile(p: Omit<Profile, 'id' | 'created_at'>): Promise<void> {
  const id = await currentUserId();
  const clean: Profile = {
    id,
    name: p.name?.trim().slice(0, 80) || null,
    phone: p.phone?.trim().slice(0, 20) || null,
    county: p.county?.trim().slice(0, 40) || null,
    crops: p.crops?.trim().slice(0, 200) || null,
  };

  // 1. Immediately cache locally so the name is never forgotten, even offline
  try {
    await AsyncStorage.setItem(profileKey(id), JSON.stringify(clean));
    await AsyncStorage.setItem(GLOBAL_PROFILE_KEY, JSON.stringify(clean));
  } catch {}

  // 2. Also keep auth user metadata in sync if name is set
  if (clean.name) {
    supabase.auth.updateUser({ data: { name: clean.name } }).catch(() => {});
  }

  // 3. Upsert to Supabase profiles table
  const payload = {
    ...clean,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').upsert(payload);
  if (error) {
    const offline = /network|fetch/i.test(error.message);
    if (!offline) {
      fail(error, 'save your profile');
    }
  }
}

export async function displayName(): Promise<string> {
  try {
    const p = await getProfile();
    return p.name?.trim() || tr('Farmer');
  } catch {
    return tr('Farmer');
  }
}

// ── Farms ───────────────────────────────────────────────────────────
// Planting dates are also kept on the phone so the crop calendar works even
// before the v2.1 database update is applied.
const plantKey = (id: string) => `planting:${id}`;
async function withLocalPlanting(f: Farm): Promise<Farm> {
  if (f.planting_date) return f;
  try {
    const local = await AsyncStorage.getItem(plantKey(f.id));
    return local ? { ...f, planting_date: local } : f;
  } catch {
    return f;
  }
}
async function rememberPlanting(id: string, date: string | null | undefined) {
  try {
    if (date) await AsyncStorage.setItem(plantKey(id), date);
    else if (date === null) await AsyncStorage.removeItem(plantKey(id));
  } catch {
    // ignore
  }
}

export async function listFarms(): Promise<Farm[]> {
  await currentUserId();
  const { data, error } = await supabase.from('farms').select('*').order('created_at', { ascending: true });
  fail(error, 'load your fields');
  return Promise.all(((data ?? []) as Farm[]).map(withLocalPlanting));
}

export async function getFarm(id: string): Promise<Farm | null> {
  const { data, error } = await supabase.from('farms').select('*').eq('id', id).maybeSingle();
  fail(error, 'load this field');
  return data ? withLocalPlanting(data as Farm) : null;
}

export type NewFarm = Partial<Omit<Farm, 'id' | 'created_at'>> & { name: string };
export async function addFarm(f: NewFarm): Promise<Farm> {
  await currentUserId();
  let { data, error } = await supabase.from('farms').insert(f).select('*').single();
  if (isMissingSchema(error) && 'planting_date' in f) {
    v21 = false;
    const { planting_date: _p, ...rest } = f;
    ({ data, error } = await supabase.from('farms').insert(rest).select('*').single());
  }
  fail(error, 'save the field');
  const farm = data as Farm;
  await rememberPlanting(farm.id, f.planting_date);
  return withLocalPlanting(farm);
}

export async function updateFarm(id: string, f: Partial<NewFarm>): Promise<void> {
  let { error } = await supabase.from('farms').update(f).eq('id', id);
  if (isMissingSchema(error) && 'planting_date' in f) {
    v21 = false;
    const { planting_date: _p, ...rest } = f;
    error = Object.keys(rest).length ? (await supabase.from('farms').update(rest).eq('id', id)).error : null;
  }
  fail(error, 'update the field');
  if ('planting_date' in f) await rememberPlanting(id, f.planting_date ?? null);
}

export async function deleteFarm(id: string): Promise<void> {
  const { error } = await supabase.from('farms').delete().eq('id', id);
  fail(error, 'delete the field');
  await rememberPlanting(id, null);
}

// ── Incidents (saved scans) ─────────────────────────────────────────
export async function saveIncident(i: Omit<Incident, 'id' | 'created_at'>): Promise<Incident> {
  await currentUserId();
  const { data, error } = await supabase.from('incidents').insert(i).select('*').single();
  fail(error, 'save the scan');
  return data as Incident;
}

export async function listIncidents(opts: { farmId?: string; limit?: number } = {}): Promise<Incident[]> {
  await currentUserId();
  let q = supabase.from('incidents').select('*').order('created_at', { ascending: false });
  if (opts.farmId) q = q.eq('farm_id', opts.farmId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  fail(error, 'load scan history');
  return (data ?? []) as Incident[];
}

export async function countIncidents(): Promise<number> {
  await currentUserId();
  const { count, error } = await supabase.from('incidents').select('id', { count: 'exact', head: true });
  fail(error, 'count scans');
  return count ?? 0;
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase.from('incidents').delete().eq('id', id);
  fail(error, 'delete the record');
}

// ── Forum ───────────────────────────────────────────────────────────
const POST_COLS = 'id, author, author_name, title, body, crop, category, reply_count, created_at';
const POST_COLS_V21 = `${POST_COLS}, photo_path, scan_label, scan_confidence`;
const PHOTO_BUCKET = 'forum-photos';

export async function listPosts(category?: string): Promise<Post[]> {
  await currentUserId();
  const run = (cols: string) => {
    let q = supabase.from('forum_posts').select(cols).order('created_at', { ascending: false }).limit(100);
    if (category && category !== 'All') q = q.eq('category', category);
    return q;
  };
  let { data, error } = await run(v21 ? POST_COLS_V21 : POST_COLS);
  if (isMissingSchema(error)) {
    v21 = false;
    ({ data, error } = await run(POST_COLS));
  }
  fail(error, 'load posts');
  return (data ?? []) as unknown as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  await currentUserId();
  const run = (cols: string) => supabase.from('forum_posts').select(cols).eq('id', id).maybeSingle();
  let { data, error } = await run(v21 ? POST_COLS_V21 : POST_COLS);
  if (isMissingSchema(error)) {
    v21 = false;
    ({ data, error } = await run(POST_COLS));
  }
  fail(error, 'load the post');
  return data as unknown as Post | null;
}

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Shrinks a photo (max 1080 px wide, JPEG) and uploads it to the forum bucket. Returns its path. */
export async function uploadForumPhoto(uri: string): Promise<string> {
  const uid = await currentUserId();
  // Shrink large photos only (never upscale a small one).
  let img = await ImageManipulator.manipulate(uri).renderAsync();
  if (img.width > 1080) {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: 1080 });
    img = await ctx.renderAsync();
  }
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error(tr('Could not read the photo.'));
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, toByteArray(saved.base64), { contentType: 'image/jpeg', upsert: false });
  if (error && /bucket not found/i.test(error.message)) {
    v21 = false;
    throw new Error(tr('Photo sharing is not switched on yet (the database update is pending).'));
  }
  fail(error, 'upload the photo');
  return path;
}

export async function createPost(p: {
  title: string;
  body: string;
  crop?: string;
  category: Post['category'];
  photoUri?: string | null;
  scanLabel?: string | null;
  scanConfidence?: number | null;
}): Promise<Post> {
  const author = await currentUserId();
  const author_name = (await displayName()).slice(0, 60);
  const base = { author, author_name, title: p.title.trim(), body: p.body.trim(), crop: p.crop?.trim() || null, category: p.category };
  const extra: Record<string, unknown> = {};
  if (p.photoUri) extra.photo_path = await uploadForumPhoto(p.photoUri);
  if (p.scanLabel) {
    extra.scan_label = p.scanLabel.slice(0, 80);
    extra.scan_confidence = p.scanConfidence ?? null;
  }
  const hasExtra = Object.keys(extra).length > 0;
  let { data, error } = await supabase
    .from('forum_posts')
    .insert({ ...base, ...extra })
    .select(hasExtra ? POST_COLS_V21 : POST_COLS)
    .single();
  if (isMissingSchema(error) && hasExtra) {
    v21 = false;
    ({ data, error } = await supabase.from('forum_posts').insert(base).select(POST_COLS).single());
  }
  // The photo is uploaded first; if it ended up on no post, remove it again.
  const photo = extra.photo_path as string | undefined;
  if (photo && (error || !(data as unknown as Post | null)?.photo_path)) {
    await supabase.storage.from(PHOTO_BUCKET).remove([photo]).catch(() => undefined);
  }
  fail(error, 'publish the post');
  return data as unknown as Post;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('forum_posts').delete().eq('id', id);
  fail(error, 'delete the post');
}

export async function listReplies(postId: string): Promise<Reply[]> {
  const { data, error } = await supabase.from('forum_replies').select('*').eq('post_id', postId).order('created_at');
  fail(error, 'load replies');
  return (data ?? []) as Reply[];
}

export async function addReply(postId: string, body: string): Promise<Reply> {
  const author = await currentUserId();
  const author_name = (await displayName()).slice(0, 60);
  const { data, error } = await supabase.from('forum_replies').insert({ post_id: postId, author, author_name, body: body.trim() }).select('*').single();
  fail(error, 'send the reply');
  return data as Reply;
}

export async function flagPost(postId: string, reason: string): Promise<void> {
  const user_id = await currentUserId();
  const { error } = await supabase.from('post_flags').insert({ post_id: postId, user_id, reason: reason.slice(0, 200) });
  if (error && /duplicate/i.test(error.message)) return; // already reported
  fail(error, 'report the post');
}

// ── Market prices ───────────────────────────────────────────────────
export async function listPrices(): Promise<Price[]> {
  const { data, error } = await supabase.from('market_prices').select('*').order('observed_on', { ascending: true });
  fail(error, 'load prices');
  return (data ?? []).map((p) => ({ ...p, price_kes: Number(p.price_kes) })) as Price[];
}

/** Prices reported by farmers in the last N days: median per crop, county and unit. Null = feature not switched on yet. */
export async function priceReportSummary(days = 30): Promise<PriceSummary[] | null> {
  const { data, error } = await supabase.rpc('price_report_summary', { p_days: days });
  if (isMissingSchema(error)) {
    v21 = false;
    return null;
  }
  fail(error, 'load farmer prices');
  return ((data ?? []) as PriceSummary[]).map((r) => ({ ...r, median_kes: Number(r.median_kes), reports: Number(r.reports), reporters: Number(r.reporters) }));
}

export async function addPriceReport(r: { crop: string; county: string; market?: string; unit: PriceUnit; price_kes: number }): Promise<void> {
  const reporter = await currentUserId();
  const { error } = await supabase.from('price_reports').insert({
    reporter,
    crop: r.crop.trim().slice(0, 40),
    county: r.county.trim().slice(0, 40),
    market: r.market?.trim().slice(0, 60) || null,
    unit: r.unit,
    price_kes: Math.round(r.price_kes),
  });
  if (isMissingSchema(error)) {
    v21 = false;
    throw new Error(tr('Price reporting is not switched on yet (the database update is pending).'));
  }
  if (error && /Daily limit/i.test(error.message)) throw new Error(tr('Daily limit reached: you can report up to 20 prices a day.'));
  fail(error, 'send your price');
}

// ── Outbreak alerts ─────────────────────────────────────────────────
/** Diseases confirmed by at least 2 different farmers' scans (anonymous counts). Null = feature not switched on yet. */
export async function listOutbreaks(county: string | null, days = 14): Promise<Outbreak[] | null> {
  const { data, error } = await supabase.rpc('county_outbreaks', { p_county: county, p_days: days });
  if (isMissingSchema(error)) {
    v21 = false;
    return null;
  }
  fail(error, 'load outbreak alerts');
  return ((data ?? []) as Outbreak[]).map((o) => ({ ...o, reports: Number(o.reports), farmers: Number(o.farmers) }));
}
