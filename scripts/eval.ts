// H5 gate — does Miro's BRAIN react correctly? Runs the real Retina → instinct
// swarm → reducer over representative scenarios against live Cerebras, headless.
// Run:  cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/eval.ts
//
// Tests the text-first perception path (terminal text + a neutral image). The
// pure-vision path (real screenshots) is confirmed separately in the browser.
import zlib from 'node:zlib';
import { runRetina } from '../src/brain/retina';
import { runSwarm } from '../src/brain/instincts';
import { reduce, initialState } from '../src/state/reducer';
import type { EventType, RuntimeState, Tier } from '../src/shared/types';

// Minimal neutral PNG so Retina has an image to consume without leaking a real screen.
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

interface Scenario { name: string; terminalText: string; expect: EventType[]; }
const SCENARIOS: Scenario[] = [
  { name: 'pytest red', expect: ['red_test'],
    terminalText: 'tests/test_auth.py::test_login FAILED\nE   assert 401 == 200\n=== 1 failed, 11 passed in 1.92s ===' },
  { name: 'jest green', expect: ['green_test', 'normal'],
    terminalText: 'PASS  src/auth.test.ts\nTests: 24 passed, 24 total\nDone in 2.1s.' },
  { name: 'risky rm -rf', expect: ['risky_command'],
    terminalText: '$ rm -rf / --no-preserve-root' },
  { name: 'stale cached error', expect: ['stale_error', 'normal', 'green_test'],
    terminalText: '[cached] ERROR from a previous run (2h ago).\nCurrent run: 30 passed, 0 failed.' },
  { name: 'normal editing', expect: ['normal'],
    terminalText: '$ git status\nOn branch main\nnothing to commit, working tree clean' },
];

let prev: RuntimeState = initialState();
let pass = 0;

console.log(`\n🐶 Miro brain eval (text-first H5 gate) — ${SCENARIOS.length} scenarios\n${'='.repeat(60)}`);
for (const sc of SCENARIOS) {
  try {
    const retina = await runRetina(NEUTRAL, { terminalText: sc.terminalText });
    const s = retina.data;
    const tier: Tier = s.recommended_swarm_tier === 'none' ? 'sniff' : s.recommended_swarm_tier;
    const swarm = await runSwarm(s, tier, 'cerebras', prev.openConcern);
    const next = reduce(prev, s, swarm);
    prev = next;

    const ok = sc.expect.includes(s.event_type);
    if (ok) pass += 1;
    const ttr = ((retina.metrics.totalTime + swarm.metrics.maxTotalTime) * 1000).toFixed(0);
    console.log(`${ok ? '✓' : '✗'} ${sc.name}`);
    console.log(`    event=${s.event_type} (expected ${sc.expect.join('/')}) · pose=${next.pose} · tier=${tier} · ${swarm.metrics.calls + 1} calls · ${ttr}ms`);
    console.log(`    bubble: "${next.bubble}"`);
    if (swarm.results.verifier) console.log(`    verifier: is_real=${swarm.results.verifier.is_real} (${swarm.results.verifier.reason})`);
    if (swarm.results.fetch) console.log(`    fetch: ${swarm.results.fetch.target}`);
    if (swarm.trace) console.log(`    pack: ${swarm.trace.map((t) => t.agent + (t.ok ? '' : '✗')).join(' → ')}`);
  } catch (err) {
    console.log(`✗ ${sc.name}: ERROR ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`${'='.repeat(60)}\n${pass}/${SCENARIOS.length} event classifications correct (H5 gate: ≥4/5)\n`);
