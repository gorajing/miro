// Vision-path smoke test: capture the REAL screen, run Retina, print what she saw.
// Run: cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/vision-smoke.ts
// (Tests the pure-vision path on a real screen — the thing only ever exercised synthetically.)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runRetina } from '../src/brain/retina';

const FILE = '/tmp/miro-vision-smoke.jpg';
try {
  execFileSync('screencapture', ['-x', '-t', 'jpg', FILE], { stdio: 'ignore' });
  try { execFileSync('sips', ['-Z', '1024', FILE], { stdio: 'ignore' }); } catch { /* resize is optional */ }
} catch (err) {
  console.error('screencapture failed — grant Screen Recording to your terminal in System Settings.', err);
  process.exit(1);
}

const uri = `data:image/jpeg;base64,${readFileSync(FILE).toString('base64')}`;
const { data: s, metrics } = await runRetina([uri]);

console.log(`\n👁  Vision smoke — what Retina saw on your real screen (${(metrics.totalTime * 1000).toFixed(0)}ms, ~${metrics.promptTokens} prompt tok):`);
console.log(`  event_type  : ${s.event_type}`);
console.log(`  app         : ${s.app}`);
console.log(`  what_changed: ${s.what_changed}`);
console.log(`  signal      : ${s.signal_strength}   tier: ${s.recommended_swarm_tier}`);
console.log(`  focus_point : {x:${s.focus_point.x.toFixed(2)}, y:${s.focus_point.y.toFixed(2)}}   rest_point: {x:${s.rest_point.x.toFixed(2)}, y:${s.rest_point.y.toFixed(2)}}`);
console.log(`  evidence    : ${s.evidence.join(' | ') || '(none)'}\n`);
