// Tassel — facts for the advisory story diagrams, read from the advisory text
// itself (lib/advisory.ts, English source). Pure: no React Native imports, so
// it is tested with `node --experimental-strip-types`.
//
// Rule 1: a diagram only draws a number that is written in the step it
// illustrates. Ranges stay ranges ("45–50 cm"), never averaged in a label.

/** [min, max] in cm; min === max for a single value. */
export type Range = [number, number];

export type DiagramFact =
  | { kind: 'spacing'; row: Range; plant: Range }
  | { kind: 'depth'; cm: Range }
  | { kind: 'rotation'; seasons: number }
  | { kind: 'certified' };

const num = '(\\d+(?:\\.\\d+)?)';
const range = `${num}(?:\\s*[–-]\\s*${num})?`;
const toRange = (a: string, b?: string): Range => [Number(a), Number(b ?? a)];

/** Every fact the step states, in the order the card should show them (at most two). */
export function diagramFacts(text: string): DiagramFact[] {
  const out: DiagramFact[] = [];

  // "Spacing 75 × 30 cm", "45–50 × 10–15 cm" (the first pair when the step lists alternatives)
  const sp = new RegExp(`${range}\\s*[×x]\\s*${range}\\s*cm`).exec(text);
  // "rows 75 cm apart, 30 cm within the row"
  const rows = new RegExp(`rows\\s+${range}\\s*cm\\s+apart,?\\s+${range}\\s*cm\\s+within the row`, 'i').exec(text);
  if (sp) out.push({ kind: 'spacing', row: toRange(sp[1], sp[2]), plant: toRange(sp[3], sp[4]) });
  else if (rows) out.push({ kind: 'spacing', row: toRange(rows[1], rows[2]), plant: toRange(rows[3], rows[4]) });

  // "5 cm deep", "2–5 cm deep"
  const dp = new RegExp(`${range}\\s*cm\\s+deep`, 'i').exec(text);
  if (dp) out.push({ kind: 'depth', cm: toRange(dp[1], dp[2]) });

  // "Rotate: … for 3 seasons"
  const rot = /rotat/i.test(text) ? /for\s+(\d+)\s+seasons/i.exec(text) : null;
  if (rot) out.push({ kind: 'rotation', seasons: Number(rot[1]) });

  if (!out.length && /\bcertified\b/i.test(text) && /\bseed/i.test(text)) out.push({ kind: 'certified' });

  return out.slice(0, 2);
}

/** "75 cm", "45–50 cm" — the label text, never an average. */
export const rangeLabel = ([a, b]: Range) => (a === b ? `${a}` : `${a}–${b}`);

/** Midpoint, for geometry only (where a square or a seed sits), never for a label. */
export const mid = ([a, b]: Range) => (a + b) / 2;
