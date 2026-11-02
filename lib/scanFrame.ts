// What part of a camera photo the farmer actually framed.
//
// The camera preview fills the screen ("cover"), so a 3:4 photo on a tall phone
// shows only the middle of its width, and the gold guide frame (FRAME_SHARE of the
// screen width) covers less than half of the photo's short side. The model was
// trained on leaves that fill the picture, so the scan must crop to the frame,
// not to the whole photo. Measured on the shipped model (simulated phone photos,
// 28 PlantVillage leaves): whole photo 7/28 correct, cropped to the frame 28/28.

/** Width of the guide frame as a share of the screen width (scan.tsx `frame.width`). */
export const FRAME_SHARE = 0.72;
/** Keep a little more than the frame: farmers rarely fit the leaf exactly. */
export const FRAME_SLACK = 1.15;

/**
 * Side of the centred square to keep, as a fraction (0..1] of the photo's short side.
 * Orientation-safe: the photo is treated as portrait when the screen is portrait.
 */
export function frameFraction(screenW: number, screenH: number, photoW: number, photoH: number): number {
  if (!(screenW > 0 && screenH > 0 && photoW > 0 && photoH > 0)) return 1;
  const portrait = screenH >= screenW;
  const pw = portrait ? Math.min(photoW, photoH) : Math.max(photoW, photoH);
  const ph = portrait ? Math.max(photoW, photoH) : Math.min(photoW, photoH);
  const scale = Math.max(screenW / pw, screenH / ph); // preview "cover" scale, photo px → screen
  const frameSidePhotoPx = (FRAME_SHARE * Math.min(screenW, screenH)) / scale;
  const f = (frameSidePhotoPx * FRAME_SLACK) / Math.min(pw, ph);
  return Math.min(1, Math.max(0.2, f));
}
