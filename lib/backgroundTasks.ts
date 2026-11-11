// Tassel — background work. Imported first by index.ts, because a background task must be
// defined in the global scope before Android wakes the app without any screen.
//
// One task: about twice a day, when the phone has a connection and Android allows it, look for new
// satellite images of the farmer's fields (lib/satelliteAlerts.ts). Phones that kill background
// work (many do, to save battery) still get the same check when the app is opened.

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loadLang } from './i18n';
import { checkFieldsForChanges } from './satelliteAlerts';

export const FIELD_TASK = 'tassel-field-check';

try {
  TaskManager.defineTask(FIELD_TASK, async () => {
    try {
      await loadLang(); // the alert is written in the farmer's language
      await checkFieldsForChanges();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
} catch (e) {
  console.warn('Background field check is not available', e);
}

/** Ask Android to run the field check now and then (default: at most every 12 hours). Safe to call on every start. */
export async function registerFieldTask(): Promise<void> {
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(FIELD_TASK))) await BackgroundTask.registerTaskAsync(FIELD_TASK);
  } catch {
    // not supported on this phone: the check still runs when the app is opened
  }
}
