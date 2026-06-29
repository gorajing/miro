// Verify the side-by-side baseline: run the SAME Retina call on both providers
// and print classification + latency. Confirms Gemini works and measures the gap.
// Run: cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/race-check.ts
import zlib from 'node:zlib';
import { runRetina } from '../src/brain/retina';
import { providerLabel, providerModel, type Provider } from '../src/brain/cerebras';

function makePng(w: number, h: number, [r, g, b]: [number, number, number]): Buffer {
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
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const NEUTRAL = `data:image/png;base64,${makePng(640, 400, [24, 24, 28]).toString('base64')}`;
const terminalText = 'tests/test_auth.py::test_login FAILED\nE   assert 401 == 200\n=== 1 failed, 11 passed in 1.9s ===';

console.log(`\n🏁 Side-by-side check — same Retina call, both providers\n${'='.repeat(56)}`);
const times: Partial<Record<Provider, number>> = {};
for (const provider of ['cerebras', 'gemini'] as Provider[]) {
  try {
    const { data, metrics } = await runRetina(NEUTRAL, { terminalText }, provider);
    times[provider] = metrics.totalTime;
    console.log(`${providerLabel(provider)}  [${providerModel(provider)}]`);
    console.log(`   event=${data.event_type} · ${(metrics.totalTime * 1000).toFixed(0)}ms · ${metrics.tps ? metrics.tps.toFixed(0) + ' tok/s' : '(no tok/s)'}`);
  } catch (err) {
    console.log(`${provider}: ERROR ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (times.cerebras && times.gemini) {
  console.log(`${'='.repeat(56)}\nCerebras is ${(times.gemini / times.cerebras).toFixed(1)}× faster on this call.\n`);
}
