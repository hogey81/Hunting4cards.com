// Helpers for the live scanner camera: pick a back camera that can focus, keep it
// focusing, zoom in, and choose the sharpest of a few frames.
// Most of these camera settings only exist in Chrome on Android; elsewhere they
// are skipped and the camera works as before.

type Caps = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  pointsOfInterest?: unknown;
};

const caps = (track: MediaStreamTrack): Caps => (track.getCapabilities?.() ?? {}) as Caps;
const canFocus = (track: MediaStreamTrack) => caps(track).focusMode?.includes("continuous") ?? false;

const VIDEO = { width: { ideal: 1920 }, height: { ideal: 1080 } };

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

// How sharp a picture is: the spread of the edge strength (variance of the
// Laplacian) on a small grey copy. Blurry pictures have weak edges.
export function sharpness(source: HTMLCanvasElement) {
  const w = 240;
  const h = Math.max(1, Math.round((source.height / source.width) * w));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grey[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = grey[i - 1] + grey[i + 1] + grey[i - w] + grey[i + w] - 4 * grey[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  return n ? sumSq / n - (sum / n) ** 2 : 0;
}
