// Tassel — "your field changed": looks for new satellite images of the farmer's fields about
// once a day and sends one notification per image when the reading is strong enough to act on.
// Rules (tested): lib/satelliteCompare.ts fieldAlert(). The wording comes from interpret(), so an
// alert says the same thing as the field's own screen: "possible", "inspect"; never a diagnosis.
//
// Runs when the app is opened and, when Android allows it, in the background (lib/backgroundTasks.ts).
// Each check is a few small requests: the server reads the satellite images, not the phone.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { listFarms } from './data';
import { alertOnce } from './notify';
import { ensureSession } from './session';
import { interpret, listObservations, listZones, refreshSatellite } from './satellite';
import { MAX_FIELDS_PER_CHECK, dueFieldCheck, fieldAlert } from './satelliteCompare';

const LAST_KEY = 'sat:lastFieldCheck';
let running = false;

export async function checkFieldsForChanges(force = false): Promise<void> {
  if (running) return;
  running = true;
  try {
    const last = Number(await AsyncStorage.getItem(LAST_KEY)) || null;
    if (!force && !dueFieldCheck(last, Date.now())) return;
    await ensureSession(); // offline: stop here and try again the next time
    const farms = (await listFarms()).filter((f) => (f.polygon?.length ?? 0) >= 3).slice(0, MAX_FIELDS_PER_CHECK);
    for (const farm of farms) {
      try {
        await refreshSatellite(farm.id);
      } catch {
        // rate-limited or the server is busy: judge what is already stored
      }
      try {
        const obs = await listObservations(farm.id);
        const latest = [...obs].reverse().find((o) => o.quality !== 'unusable' && !o.suspect);
        const zones = latest ? await listZones(latest.id) : [];
        const r = interpret(obs, zones, farm.crop, farm.planting_date);
        const a = fieldAlert(farm.id, farm.name, { tone: r.tone, canAlert: r.canAlert, headline: r.headline, action: r.action, latestId: r.latest?.id ?? null });
        // alertOnce respects the Notifications switch and never repeats a key
        if (a) await alertOnce(a.key, a.title, a.body, `/satellite/${farm.id}`);
      } catch {
        // one field failing must not stop the others
      }
    }
    await AsyncStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    // best-effort
  } finally {
    running = false;
  }
}
