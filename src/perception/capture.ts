// Screen perception via the browser's getDisplayMedia (user shares a screen/window
// once). We sample frames on demand, downscale, and JPEG-encode to a base64 data URI.
// A cheap luminance fingerprint gates whether anything changed ("Curl Up").

let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let lastFingerprint: number[] | null = null;
let frameBuffer: string[] = [];
let bufferTimer: number | null = null;

export function isCapturing(): boolean {
  return stream !== null;
}

export async function startCapture(): Promise<void> {
  stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 4 },
    audio: false,
  });
  video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  // If the user stops sharing from the browser chrome, reset.
  stream.getVideoTracks()[0]?.addEventListener('ended', stopCapture);
}

export function stopCapture(): void {
  stopBuffering();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video = null;
  lastFingerprint = null;
}

function drawToCanvas(maxW: number): HTMLCanvasElement {
  if (!video) throw new Error('Not capturing — share your screen first.');
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 800;
  const scale = Math.min(1, maxW / vw);
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

/** Grab the current frame as a base64 JPEG data URI (Cerebras downscales to ~280 tokens anyway). */
export function grabFrame(maxW = 1024): string {
  return drawToCanvas(maxW).toDataURL('image/jpeg', 0.7);
}

/** Keep a rolling buffer of recent frames so Retina can reason over a SEQUENCE (temporal / "video"). */
export function startBuffering(intervalMs = 1200, maxW = 768): void {
  stopBuffering();
  bufferTimer = window.setInterval(() => {
    if (!video) return;
    try {
      frameBuffer.push(grabFrame(maxW));
      if (frameBuffer.length > 4) frameBuffer.shift();
    } catch { /* video not ready yet */ }
  }, intervalMs);
}

export function stopBuffering(): void {
  if (bufferTimer !== null) { clearInterval(bufferTimer); bufferTimer = null; }
  frameBuffer = [];
}

/** Last k frames (oldest→newest) ending with a fresh grab — the temporal window for Retina. */
export function grabSequence(k = 3, maxW = 768): string[] {
  const fresh = grabFrame(maxW);
  const recent = frameBuffer.slice(-(Math.max(1, k) - 1));
  return [...recent, fresh];
}

/** Cheap 8x8 luminance fingerprint; returns true if the screen meaningfully changed. */
export function hasChanged(threshold = 14): boolean {
  if (!video) return false;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  if (!ctx) return true;
  ctx.drawImage(video, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const fp: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    fp.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  if (!lastFingerprint) {
    lastFingerprint = fp;
    return true;
  }
  let diff = 0;
  for (let i = 0; i < fp.length; i += 1) diff += Math.abs(fp[i] - lastFingerprint[i]);
  const avg = diff / fp.length;
  if (avg >= threshold) {
    lastFingerprint = fp;
    return true;
  }
  return false;
}
