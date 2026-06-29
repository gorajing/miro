// Render the actual procedural Miro sprite to checked-in PNG assets.
// No browser needed: drawMiro only calls Graphics.rect().fill(), so this script
// gives it a tiny raster Graphics shim and writes PNGs directly.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import zlib from 'node:zlib';
import { createDefaultMiroState, drawMiro } from '../src/miroArt';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

class RecordingGraphics {
  rects: Rect[] = [];
  private pending: Omit<Rect, 'color'> | null = null;

  clear(): void {
    this.rects = [];
  }

  rect(x: number, y: number, w: number, h: number): this {
    this.pending = { x, y, w, h };
    return this;
  }

  fill({ color }: { color: number }): this {
    if (!this.pending) throw new Error('fill called before rect');
    this.rects.push({ ...this.pending, color });
    this.pending = null;
    return this;
  }
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function putRect(
  img: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 255,
): void {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const i = (yy * width + xx) * 4;
      img[i] = r;
      img[i + 1] = g;
      img[i + 2] = b;
      img[i + 3] = alpha;
    }
  }
}

function rasterize(rects: Rect[], width: number, height: number, offsetX: number, offsetY: number, bg?: number): Uint8Array {
  const img = new Uint8Array(width * height * 4);
  if (bg !== undefined) putRect(img, width, height, 0, 0, width, height, bg, 255);
  for (const r of rects) putRect(img, width, height, r.x + offsetX, r.y + offsetY, r.w, r.h, r.color);
  return img;
}

function bounds(rects: Rect[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return rects.reduce(
    (b, r) => ({
      minX: Math.min(b.minX, r.x),
      minY: Math.min(b.minY, r.y),
      maxX: Math.max(b.maxX, r.x + r.w),
      maxY: Math.max(b.maxY, r.y + r.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function writePng(file: string, width: number, height: number, rgba: Uint8Array): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(width, height, rgba));
  console.log(`wrote ${file}`);
}

const outDir = resolve('demo/assets');
const graphics = new RecordingGraphics();
drawMiro(graphics as never, { ...createDefaultMiroState('idle'), frame: 0 }, { pixel: 8 });
const b = bounds(graphics.rects);
const pad = 48;
const spriteW = Math.ceil(b.maxX - b.minX + pad * 2);
const spriteH = Math.ceil(b.maxY - b.minY + pad * 2);
const sprite = rasterize(graphics.rects, spriteW, spriteH, pad - b.minX, pad - b.minY);
writePng(resolve(outDir, 'miro-sprite.png'), spriteW, spriteH, sprite);

const heroW = 1200;
const heroH = 900;
const heroBg = 0xfff8e8;
const heroOffsetX = Math.round((heroW - (b.maxX - b.minX)) / 2 - b.minX);
const heroOffsetY = Math.round((heroH - (b.maxY - b.minY)) / 2 - b.minY + 10);
const hero = rasterize(graphics.rects, heroW, heroH, heroOffsetX, heroOffsetY, heroBg);
writePng(resolve(outDir, 'miro-clean.png'), heroW, heroH, hero);
