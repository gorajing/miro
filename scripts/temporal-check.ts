// Verify temporal/"video" perception: Gemma 4 reasoning over a SEQUENCE of frames.
// Run: cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/temporal-check.ts
// (Abstract color frames prove the mechanism — multi-image + change-over-time reasoning.
//  The real "running → failed" value is verified in-browser with live frames.)
import zlib from 'node:zlib';
import { runRetina } from '../src/brain/retina';

function makePng(w: number, h: number, [r, g, b]: [number, number, number]): string {
  const rowLen = w * 3 + 1;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const off = y * rowLen;
    for (let x = 0; x < w; x++) { const p = off + 1 + x * 3; raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; }
  }
  const crc32 = (buf: Buffer): number => {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

const gray = makePng(640, 400, [28, 30, 36]);
const red = makePng(640, 400, [200, 60, 50]);
const green = makePng(640, 400, [60, 175, 90]);

console.log(`\n🎞️  Temporal perception check (multi-frame)\n${'='.repeat(52)}`);

const seq1 = await runRetina([gray, gray, red]);
console.log(`seq [gray → gray → RED] (${seq1.metrics.promptTokens} prompt tok, ${(seq1.metrics.totalTime * 1000).toFixed(0)}ms)`);
console.log(`   what_changed: "${seq1.data.what_changed}"`);

const seq2 = await runRetina([red, green]);
console.log(`seq [RED → GREEN]`);
console.log(`   what_changed: "${seq2.data.what_changed}"`);

const single = await runRetina(gray);
console.log(`single [gray] (baseline, no sequence)`);
console.log(`   what_changed: "${single.data.what_changed}"`);

console.log(`${'='.repeat(52)}\nMulti-image accepted ✓  — does what_changed describe the transition?\n`);
