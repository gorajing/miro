// Cerebras Gemma 4 31B probe — the H0 "does it work + how fast + how cheap" check.
// Run:  npm run probe        (which is: node --env-file=.env scripts/probe.mjs)
//
// Answers the four numbers the whole Miro loop is budgeted against:
//   1. Access + text round-trip: tokens/sec, time-to-reaction (from time_info)
//   2. Image input: real per-screenshot token cost (usage.prompt_tokens_details.image_tokens)
//   3. Strict structured JSON ON the image path (the risky combo)
//   4. Concurrency ceiling: how wide a burst before 429s (sizes the instinct-swarm semaphore)

import zlib from 'node:zlib';

const KEY = process.env.CEREBRAS_API_KEY;
const URL = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'gemma-4-31b';

if (!KEY) {
  console.error('✗ Missing CEREBRAS_API_KEY. Run:  npm run probe  (loads .env)');
  process.exit(1);
}

async function call(body) {
  const t0 = performance.now();
  let res, json = null, errText = null;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, ...body }),
    });
    try { json = await res.json(); } catch { errText = await res.text().catch(() => ''); }
  } catch (e) {
    return { status: 0, wallMs: performance.now() - t0, json: null, errText: String(e) };
  }
  return { status: res.status, wallMs: performance.now() - t0, json, errText };
}

function toks(r) {
  const ti = r.json?.time_info, u = r.json?.usage;
  const tps = ti?.completion_time && u?.completion_tokens
    ? (u.completion_tokens / ti.completion_time).toFixed(0) : '?';
  return { tps, total_time: ti?.total_time, prompt: u?.prompt_tokens, completion: u?.completion_tokens,
           image_tokens: u?.prompt_tokens_details?.image_tokens };
}

// Minimal dependency-free solid-color PNG so we measure a realistic image_tokens
// without sending your actual screen anywhere.
function makePng(w, h, [r, g, b]) {
  const rowLen = w * 3 + 1;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const off = y * rowLen; raw[off] = 0;
    for (let x = 0; x < w; x++) { const p = off + 1 + x * 3; raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; }
  }
  const crc32 = (buf) => { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`\n🐶 Miro probe → ${MODEL} @ Cerebras\n${'='.repeat(48)}`);

  // 1. Text round-trip ------------------------------------------------------
  console.log('\n[1] Text round-trip (access + speed)');
  const t = await call({ messages: [{ role: 'user', content: 'Reply with the single word: OK' }], max_completion_tokens: 5 });
  if (t.status !== 200) {
    console.error(`  ✗ HTTP ${t.status}: ${t.json?.message || t.errText || 'unknown'}`);
    console.error('  → If 401/403/404: key or model access problem. Stop here and fix access.');
    process.exit(1);
  }
  const tt = toks(t);
  console.log(`  ✓ "${t.json.choices?.[0]?.message?.content?.trim()}"  |  ${tt.tps} tok/s  |  total_time ${tt.total_time}s  |  wall ${t.wallMs.toFixed(0)}ms`);

  // 2. Image input — real per-screenshot token cost ------------------------
  console.log('\n[2] Image input (per-screenshot token cost)');
  const png = makePng(1280, 800, [40, 44, 52]);
  const dataUri = `data:image/png;base64,${png.toString('base64')}`;
  console.log(`  (synthetic 1280x800 PNG, ${(png.length / 1024).toFixed(0)} KB payload)`);
  const img = await call({
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'What is the dominant color? One word.' },
      { type: 'image_url', image_url: { url: dataUri } },
    ] }],
    max_completion_tokens: 10,
  });
  if (img.status !== 200) {
    console.error(`  ✗ HTTP ${img.status}: ${img.json?.message || img.errText}`);
  } else {
    const it = toks(img);
    console.log(`  ✓ image_tokens=${it.image_tokens ?? '?'}  |  prompt_tokens=${it.prompt}  |  ${it.tps} tok/s  |  total_time ${it.total_time}s`);
  }

  // 3. Strict JSON on the image path ---------------------------------------
  console.log('\n[3] Strict structured JSON + image (the risky combo)');
  const strict = await call({
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'Classify the dominant color of this image.' },
      { type: 'image_url', image_url: { url: dataUri } },
    ] }],
    max_completion_tokens: 40,
    response_format: { type: 'json_schema', json_schema: { name: 'color', strict: true,
      schema: { type: 'object', additionalProperties: false,
        properties: { dominant_color: { type: 'string' }, confidence: { type: 'number' } },
        required: ['dominant_color', 'confidence'] } } },
  });
  if (strict.status !== 200) {
    console.error(`  ✗ HTTP ${strict.status}: ${strict.json?.message || strict.errText}`);
  } else {
    const raw = strict.json.choices?.[0]?.message?.content ?? '';
    try { const o = JSON.parse(raw); console.log(`  ✓ valid strict JSON on image path: ${JSON.stringify(o)}`); }
    catch { console.error(`  ✗ returned non-JSON: ${raw}`); }
  }

  // 4. Concurrency ceiling --------------------------------------------------
  console.log('\n[4] Concurrency ceiling (sizes the swarm semaphore)');
  let best = 0;
  for (const n of [1, 3, 6, 10]) {
    const rs = await Promise.all(Array.from({ length: n }, () =>
      call({ messages: [{ role: 'user', content: 'hi' }], max_completion_tokens: 1 })));
    const ok = rs.filter((r) => r.status === 200).length;
    const r429 = rs.filter((r) => r.status === 429).length;
    const other = n - ok - r429;
    console.log(`  burst ${String(n).padStart(2)}: ${ok} ok, ${r429} rate-limited${other ? `, ${other} other` : ''}`);
    if (r429 === 0 && other === 0) best = n;
    await sleep(1500);
  }
  console.log(`  → safe concurrent burst with zero 429s: ${best || '<1 (throttled — use card/PAYG or serialize)'}`);

  console.log(`\n${'='.repeat(48)}\nDone. Plug these into PLAN.md §6 (budget) and the swarm semaphore.\n`);
})();
