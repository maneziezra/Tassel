// Tassel — a field's saved scans as a timeline: grouped by month, with one plain line on top.
// Rule 3: only scans at 75% or more can name a disease in the summary. Unclear scans stay in
// the list, labelled as a best guess, and never count as a finding.

export type HistoryScan = { id: string; class_label: string; disease: string; confidence: number; uncertain: boolean; created_at: string };

export type HistorySummary =
  | { kind: 'empty' }
  | { kind: 'unclear' }
  | { kind: 'healthy'; at: string }
  | { kind: 'finding'; label: string; disease: string; at: string }
  | { kind: 'repeat'; label: string; disease: string; count: number; at: string };

export type ScanMonth<T> = { key: string; year: number; month: number; scans: T[] };

export const REPEAT_WINDOW_DAYS = 60;
const DAY = 86400000;

const sure = (s: HistoryScan) => !s.uncertain && s.confidence >= 0.75;
const newest = <T extends HistoryScan>(scans: T[]) => [...scans].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

/** Newest month first, newest scan first. Months follow the phone's own calendar. */
export function groupByMonth<T extends HistoryScan>(scans: T[]): ScanMonth<T>[] {
  const months: ScanMonth<T>[] = [];
  for (const s of newest(scans)) {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, year: d.getFullYear(), month: d.getMonth(), scans: [] };
      months.push(m);
    }
    m.scans.push(s);
  }
  return months;
}

/** The latest sure scan decides the line. A disease seen again since the last healthy scan is called out. */
export function summarise(scans: HistoryScan[], now: number = Date.now()): HistorySummary {
  if (!scans.length) return { kind: 'empty' };
  const ordered = newest(scans).filter(sure);
  const last = ordered[0];
  if (!last) return { kind: 'unclear' };
  if (last.disease === 'Healthy') return { kind: 'healthy', at: last.created_at };
  let count = 0;
  for (const s of ordered) {
    if (s.disease === 'Healthy' || now - Date.parse(s.created_at) > REPEAT_WINDOW_DAYS * DAY) break;
    if (s.class_label === last.class_label) count++;
  }
  return count >= 2
    ? { kind: 'repeat', label: last.class_label, disease: last.disease, count, at: last.created_at }
    : { kind: 'finding', label: last.class_label, disease: last.disease, at: last.created_at };
}
