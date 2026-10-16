// CropGuard AI — reminders and alerts as local notifications (scheduled on the
// phone; no push server and no phone number needed).

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tr } from './i18n';
import type { FieldTask } from './calendar';

const CHANNEL = 'farm';
const PREF = 'notify:on';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: tr('Farm reminders and alerts'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function notificationsWanted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF)) !== 'off';
  } catch {
    return true;
  }
}

export async function setNotificationsWanted(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREF, on ? 'on' : 'off');
  } catch {
    // ignore
  }
  if (!on) await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Asks for permission only when the farmer turns a reminder on. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    await ensureChannel();
    return true;
  }
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  if (asked.granted) await ensureChannel();
  return asked.granted;
}

async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Replace a field's reminders with its upcoming tasks (07:00 on the first day of each task). */
export async function scheduleFieldReminders(farmId: string, tasks: FieldTask[]): Promise<number> {
  const prefix = `cal-${farmId}-`;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!(await notificationsWanted()) || !(await hasPermission())) return 0;
  const now = Date.now();
  let count = 0;
  for (const t of tasks) {
    if (t.ticked) continue;
    const at = new Date(t.startDate.getFullYear(), t.startDate.getMonth(), t.startDate.getDate(), 7, 0, 0);
    if (at.getTime() <= now + 60_000) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${prefix}${t.task.id}`,
      content: { title: `${t.farmName}: ${t.title}`, body: t.detail, data: { url: `/farm/${farmId}` } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
    count += 1;
  }
  return count;
}

export async function cancelFieldReminders(farmId: string): Promise<void> {
  const prefix = `cal-${farmId}-`;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function countFieldReminders(farmId: string): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((n) => n.identifier.startsWith(`cal-${farmId}-`)).length;
}

/** Shows an outbreak alert once per outbreak (key) — called when Home loads. */
export async function alertOnce(key: string, title: string, body: string, url = '/outbreaks'): Promise<void> {
  const seenKey = `alerted:${key}`;
  try {
    if (await AsyncStorage.getItem(seenKey)) return;
    if (!(await notificationsWanted()) || !(await hasPermission())) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ content: { title, body, data: { url } }, trigger: null });
    await AsyncStorage.setItem(seenKey, new Date().toISOString());
  } catch {
    // alerts are best-effort
  }
}

/** Open the screen a tapped notification points to. */
export function onNotificationTap(handler: (url: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string') handler(url);
  });
  return () => sub.remove();
}
