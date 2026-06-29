// Verifies the belief-latch: Miro reacts to TRANSITIONS, not to the continued PRESENCE of a state.
//   A) latch property (pure)      — over a poll sequence she acts EXACTLY on the edges, not every poll
//   B) terminal truth (vision)    — green at the prompt supersedes an old FAILED still in scrollback
//   C) repeat suppression (vision)— looking at the same scene twice is not two reactions
// Run: node --env-file=.env --import tsx scripts/belief-check.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Situation } from '../src/shared/types';
import { signature, briefOf, isNewEvent, isEventful } from '../src/state/belief';
import { runRetina } from '../src/brain/retina';

const uri = (name: string) =>
  `data:image/png;base64,${readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))).toString('base64')}`;

const base: Situation = {
  event_type: 'normal', app: 'terminal', what_changed: '', signal_strength: 0.5,
  evidence: [], uncertainties: [], recommended_swarm_tier: 'none',
  focus_point: { x: 0.5, y: 0.5 }, rest_point: { x: 0.9, y: 0.1 },
};
const sit = (o: Partial<Situation>): Situation => ({ ...base, ...o });

// ---- A) Latch property: a level-triggered signal (same red present across polls), then a fix. ----
const RED = { event_type: 'red_test' as const, what_changed: 'test_login FAILED', evidence: ['tests/test_auth.py::test_login FAILED'], recommended_swarm_tier: 'alert' as const };
const GREEN = { event_type: 'green_test' as const, what_changed: 'test_login PASSED', evidence: ['tests/test_auth.py::test_login PASSED'], recommended_swarm_tier: 'alert' as const };
const polls = [sit(RED), sit(RED), sit(RED), sit(GREEN), sit(GREEN), sit({ what_changed: 'idle terminal' })];

let lastSig: string | null = null;
const acted = polls.map((r) => {
  const act = isNewEvent(r, lastSig);
  if (act) lastSig = signature(r);
  return act;
});
const expected = [true, false, false, true, false, false]; // worry once, celebrate once, calm otherwise
const aPass = JSON.stringify(acted) === JSON.stringify(expected);
console.log(`A latch:   acted=${JSON.stringify(acted)} expected=${JSON.stringify(expected)} → ${aPass ? 'PASS' : 'FAIL'}`);

// ---- B) Terminal truth: green_after_red frame must NOT read as the old failure. ----
const greenUri = uri('green_after_red.png');
const bReads: string[] = [];
for (let i = 0; i < 3; i += 1) bReads.push((await runRetina(greenUri, undefined, 'cerebras')).data.event_type);
const bPass = bReads.every((e) => e !== 'red_test');
console.log(`B truth:   reads=${JSON.stringify(bReads)} (none may be red_test) → ${bPass ? 'PASS' : 'FAIL'}`);

// ---- C) Repeat suppression: look at the SAME scene twice; the 2nd is not a fresh reaction. ----
const r1 = (await runRetina(greenUri, undefined, 'cerebras')).data;
const r2 = (await runRetina(greenUri, { lastSeen: briefOf(r1) }, 'cerebras')).data;
const sig1 = isEventful(r1) ? signature(r1) : null;
const cPass = !isNewEvent(r2, sig1);
console.log(`C repeat:  r1=${r1.event_type} r2=${r2.event_type} → 2nd ${cPass ? 'SUPPRESSED (PASS)' : 'RE-FIRED (FAIL)'}`);

const ok = aPass && bPass && cPass;
console.log(`\n${ok ? 'PASS — she is edge-triggered: acts on changes, calm on repeats' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
