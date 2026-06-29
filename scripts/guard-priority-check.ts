// Regression: when a destructive command and a red test are BOTH on screen, Miro must bark at the
// DANGER, not the louder test failure. (She once kept reporting red_test ×N and never flagged `rm -rf`.)
// Fixture mirrors that exact ambiguous scene. Run:
//   node --env-file=.env --import tsx scripts/guard-priority-check.ts
// Regenerate the fixture image (macOS): qlmanage -t -s 1200 -o scripts/fixtures scripts/fixtures/risky_scene.html
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runRetina } from '../src/brain/retina';
import { runSwarm } from '../src/brain/instincts';
import { reduce, initialState } from '../src/state/reducer';

const png = fileURLToPath(new URL('./fixtures/risky_scene.png', import.meta.url));
const dataUri = `data:image/png;base64,${readFileSync(png).toString('base64')}`;

const { data: s } = await runRetina(dataUri, undefined, 'cerebras');
const swarm = await runSwarm(s, s.recommended_swarm_tier, 'cerebras', null);
const st = reduce(initialState(), s, swarm);

console.log(`retina:  event=${s.event_type} tier=${s.recommended_swarm_tier}`);
console.log(`guard:   risk=${swarm.results.guard?.risk} note="${swarm.results.guard?.note ?? ''}"`);
console.log(`reducer: pose=${st.pose} danger="${st.receipt?.danger ?? ''}"`);
console.log(`bubble:  "${st.bubble}"`);

const ok = s.event_type === 'risky_command' && st.pose === 'guard' && !!st.receipt?.danger;
console.log(`\n${ok ? 'PASS — danger outranks the red test; she guards the rm -rf' : 'FAIL — she missed the destructive command'}`);
process.exit(ok ? 0 : 1);
