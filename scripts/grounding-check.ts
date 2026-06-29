// Verify coarse visual grounding: Retina's focus_point lands in the right region.
// Run: cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/grounding-check.ts
import zlib from 'node:zlib';
import { runRetina } from '../src/brain/retina';

type RGB = [number, number, number];
function makeFrame(w: number, h: number, bg: RGB, block: { x0: number; y0: number; x1: number; y1: number; color: RGB }): string {
  const rowLen = w * 3 + 1;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const off = y * rowLen;
    for (let x = 0; x < w; x++) {
      const inBlock = x >= block.x0 && x < block.x1 && y >= block.y0 && y < block.y1;
      const [r, g, b] = inBlock ? block.color : bg;
      const p = off + 1 + x * 3; raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
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

const BG: RGB = [26, 28, 34];
const RED: RGB = [210, 60, 50];
const cases = [
  { name: 'block bottom-LEFT', frame: makeFrame(640, 400, BG, { x0: 20, y0: 280, x1: 260, y1: 380, color: RED }), expect: (p: { x: number; y: number }) => p.x < 0.5 && p.y > 0.5 },
  { name: 'block top-RIGHT', frame: makeFrame(640, 400, BG, { x0: 400, y0: 20, x1: 620, y1: 120, color: RED }), expect: (p: { x: number; y: number }) => p.x > 0.5 && p.y < 0.5 },
];

console.log(`\n🎯 Visual grounding check (coarse focus_point)\n${'='.repeat(50)}`);
let pass = 0;
for (const c of cases) {
  const { data } = await runRetina(c.frame);
  const p = data.focus_point;
  const ok = c.expect(p);
  if (ok) pass += 1;
  console.log(`${ok ? '✓' : '✗'} ${c.name} → focus_point {x:${p.x.toFixed(2)}, y:${p.y.toFixed(2)}}`);
}
console.log(`${'='.repeat(50)}\n${pass}/${cases.length} grounded to the correct region\n`);
