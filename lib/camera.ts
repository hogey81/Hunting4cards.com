// Helpers for the live scanner camera: pick a back camera that can focus, keep it
// focusing and zoom in.
// Most of these camera settings only exist in Chrome on Android; elsewhere they
// are skipped and the camera works as before.

type Caps = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  pointsOfInterest?: unknown;
};

const caps = (track: MediaStreamTrack): Caps => (track.getCapabilities?.() ?? {}) as Caps;
const canFocus = (track: MediaStreamTrack) => caps(track).focusMode?.includes("continuous") ?? false;

// A sharp, large picture (small print needs pixels), and focusing from the start.
const VIDEO = {
  width: { ideal: 2560 },
  height: { ideal: 1440 },
  advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
};

// Some phones (Samsung among them) hand out the wide-angle lens first, which has
// no autofocus: then every close-up of a card is blurry. Look for a back camera
// that can focus.
export async function openBackCamera(): Promise<MediaStream> {
  const first = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, ...VIDEO }, audio: false });
  const track = first.getVideoTracks()[0];
  if (!track?.getCapabilities || canFocus(track)) return first;
  const current = track.getSettings().deviceId;
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const backs = devices.filter((d) => d.kind === "videoinput" && d.deviceId !== current && /back|rear|achter|environment/i.test(d.label));
  for (const d of backs) {
    let other: MediaStream | null = null;
    try {
      first.getTracks().forEach((t) => t.stop()); // most phones open one camera at a time
      other = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId }, ...VIDEO }, audio: false });
      if (canFocus(other.getVideoTracks()[0])) return other;
    } catch {}
    other?.getTracks().forEach((t) => t.stop());
  }
  // None better: open the first one again.
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, ...VIDEO }, audio: false });
}

async function apply(track: MediaStreamTrack, c: Record<string, unknown>) {
  try {
    await track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

// Keeps focusing by itself. Returns whether the camera can zoom by itself.
export async function tuneCamera(track: MediaStreamTrack) {
  if (canFocus(track)) await apply(track, { focusMode: "continuous" });
  return !!caps(track).zoom;
}

// Zoom with the camera itself. Returns false when it can't; the scanner then
// enlarges the picture on screen instead.
export async function setCameraZoom(track: MediaStreamTrack, zoom: number) {
  const z = caps(track).zoom;
  if (!z) return false;
  return apply(track, { zoom: Math.min(z.max, Math.max(z.min, zoom)) });
}

// Tap to focus: focus once on the tapped spot (x, y from 0 to 1), then keep focusing.
export async function focusAt(track: MediaStreamTrack, x: number, y: number) {
  const c = caps(track);
  if (!c.focusMode) return;
  if (c.pointsOfInterest) await apply(track, { pointsOfInterest: [{ x, y }] });
  if (c.focusMode.includes("single-shot")) await apply(track, { focusMode: "single-shot" });
  setTimeout(() => apply(track, { focusMode: "continuous" }), 1500);
}

// A short line about the camera in use, shown small under the picture, so a
// blurry camera can be diagnosed from a screenshot.
export function describeCamera(track: MediaStreamTrack, hardwareZoom: boolean) {
  const { width, height } = track.getSettings();
  const focus = caps(track).focusMode;
  const af = !focus ? "autofocus onbekend" : focus.includes("continuous") ? "autofocus aan" : "geen autofocus";
  return `${width ?? "?"}×${height ?? "?"} · ${af} · ${hardwareZoom ? "zoom camera" : "zoom scherm"}`;
}

// Ways to clean up a strip before reading it; each frame is read with the next of
// these. Grey with strong contrast turns the glitter of holo cards white and keeps
// the black print black: on a phone video of a holo card only these read the code
// (plain grey or a local threshold read the glitter as letters). "inverted" is for
// white print on dark art.
export const CLEANUPS = ["contrast", "strong", "inverted"] as const;
export type Cleanup = (typeof CLEANUPS)[number];

export function cleanUp(canvas: HTMLCanvasElement, how: Cleanup | "threshold" | "grey") {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grey[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
  let out = grey;
  // (g - middle) × factor + middle, plus a little brightness: as ffmpeg's eq filter,
  // with which these values were tried on frames of a phone video.
  const stretch = (factor: number, lift: number) => grey.map((g) => Math.max(0, Math.min(255, (g - 127.5) * factor + 127.5 + lift * 255)));
  if (how === "contrast") out = stretch(2, 0.1);
  if (how === "strong") out = stretch(3, 0);
  if (how === "inverted") out = stretch(2, 0).map((g) => 255 - g);
  if (how === "threshold") {
    // Black where a pixel is clearly darker than its surroundings (a running
    // mean over a square), white elsewhere: works on any background colour.
    const sums = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += grey[y * w + x];
        sums[(y + 1) * (w + 1) + x + 1] = sums[y * (w + 1) + x + 1] + row;
      }
    }
    const r = Math.max(8, Math.round(w / 16));
    out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r);
        const sum = sums[y1 * (w + 1) + x1] - sums[y0 * (w + 1) + x1] - sums[y1 * (w + 1) + x0] + sums[y0 * (w + 1) + x0];
        out[y * w + x] = grey[y * w + x] < sum / ((x1 - x0) * (y1 - y0)) - 12 ? 0 : 255;
      }
    }
  }
  for (let i = 0; i < w * h; i++) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = out[i];
  ctx.putImageData(img, 0, 0);
  return canvas;
}
