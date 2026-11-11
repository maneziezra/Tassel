// Tassel — navigation helpers
// Guarantees reliable transitions between stack screens and tabs,
// especially launching the camera scanner from any screen in the app.

import { router } from 'expo-router';

/** The field the farmer pressed Scan on. The scan screen picks it up once when it opens. */
export type ScanField = { id: string; name: string; crop?: string | null };
let pendingField: ScanField | null = null;

export function takeScanField(): ScanField | null {
  const f = pendingField;
  pendingField = null;
  return f;
}

/** Scan from a field's own page: the result saves to that field without asking which one. */
export function scanForField(field: ScanField): void {
  pendingField = field;
  openScanner();
}

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
