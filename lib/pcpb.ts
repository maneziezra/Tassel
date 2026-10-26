// Tassel — Kenya PCPB registered products, as used by the screens.
//
// The catalogue is the official PCPB register (pcpb.go.ke/crops/), filtered and
// joined with label rates by scripts/pcpb/build_catalogue.py. Logic lives in
// lib/pcpbCore.ts. To refresh: re-export the register, re-read changed labels,
// run `python -I scripts/pcpb/build_catalogue.py`, then
// `node --experimental-strip-types scripts/test-pcpb.mjs`.

import data from './pcpbData.generated.json';
import { cropKey, problemKey, productsFor, type Catalogue, type PcpbProduct } from './pcpbCore';

export * from './pcpbCore';

export const PCPB = data as unknown as Catalogue;

export const PCPB_DISCLAIMER = 'Not sponsored. Follow the label.';

/** Shown under a product whose active includes mancozeb (under PCPB review in 2025). */
export const MANCOZEB_REVIEW = 'Mancozeb was under PCPB review in 2025 — confirm the product is still registered.';

export function isMancozeb(p: PcpbProduct): boolean {
  return /mancozeb/i.test(p.a);
}

/**
 * Up to `limit` registered examples for a crop and a problem (a disease name,
 * model label or pest). Empty when either is unknown — no guessing across crops.
 */
export function getRegisteredProducts(cropText: string | null | undefined, problemText: string | null | undefined, limit = 3): PcpbProduct[] {
  const crop = cropKey(cropText);
  const problem = problemKey(problemText);
  if (!crop || !problem) return [];
  return productsFor(PCPB, { crop, problem, limit });
}
