// Tassel — navigation helpers
// Guarantees reliable transitions between stack screens and tabs,
// especially launching the camera scanner from any screen in the app.

import { router } from 'expo-router';

/**
 * Universally opens the live camera scanner from ANY screen:
 * - Dismisses open stack screens/modals (e.g. /result, /farm/[id], /calendar)
 * - Directly activates and focuses the live camera tab (/(tabs)/scan)
 */
export function openScanner(): void {
  try {
    if (typeof router.canDismiss === 'function' && router.canDismiss()) {
      router.dismissAll();
    }
  } catch {
    // ignore dismiss error if at root
  }

  try {
    router.navigate('/(tabs)/scan');
  } catch {
    try {
      router.replace('/(tabs)/scan');
    } catch {
      router.push('/(tabs)/scan');
    }
  }
}
