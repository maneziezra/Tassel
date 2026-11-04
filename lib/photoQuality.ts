// Tassel — is the photo good enough to read? (too dark, blurry)
//
// Measured on the 224 px square the model sees: mean brightness and the variance of
// a Laplacian (edge strength). Calibrated 4 Nov 2026 on 23 real leaf photos:
//   sharp: variance 349+ (10th percentile), brightness 89-140
//   blurred (sigma 2 px at 224): variance <= 8;  dim (x0.45): brightness 39-62
// so "blurry" below 40 and "dark" below 60 leave a wide margin from good photos.
// Used only to give a specific tip when a scan is not sure; it never changes the diagnosis.

export type PhotoQuality = { brightness: number; sharpness: number; dark: boolean; blurry: boolean };

export const DARK_BELOW = 60;
export const BLURRY_BELOW = 40;

/** rgba: row-major RGBA bytes of a size x size image. */
export function assessQuality(rgba: ArrayLike<number>, size: number): PhotoQuality {
  const n = size * size;
  const g = new Float32Array(n);
  let sum = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const v = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    g[i] = v;
    sum += v;
  }
  const brightness = sum / n;
  let s = 0;
  let s2 = 0;
  let m = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const l = -4 * g[i] + g[i - 1] + g[i + 1] + g[i - size] + g[i + size];
      s += l;
      s2 += l * l;
      m++;
    }
  }
  const mean = s / m;
  const sharpness = s2 / m - mean * mean;
  return { brightness, sharpness, dark: brightness < DARK_BELOW, blurry: sharpness < BLURRY_BELOW };
}
