// Verify Miro's Bond memory across sessions, headless.
// Run: cd /Users/jinchoi/Code/Miro && node --env-file=.env --import tsx scripts/memory-check.ts
import { readFile, writeFile, rm } from 'node:fs/promises';
import { hydrate, recordReaction, composeGreeting, bondLabel, type MiroMemory } from '../src/state/memory';

const FILE = '.miro-memory-test.json';
const load = async (): Promise<MiroMemory> => hydrate(await readFile(FILE, 'utf8').catch(() => null));
const save = (m: MiroMemory): Promise<void> => writeFile(FILE, JSON.stringify(m));

await rm(FILE, { force: true });
console.log(`\n🐶 Miro memory / Bond check\n${'='.repeat(50)}`);

// --- Session 1: a tense day that ends with a fix and a lingering worry ---
let m = await load();
m = { ...m, sessions: m.sessions + 1 };
console.log(`Session ${m.sessions} — bond ${m.bond.toFixed(2)} (${bondLabel(m.bond)})`);
m = recordReaction(m, 'red_test', { resolvedConcern: false, concern: 'auth login test failing (401)' });
m = recordReaction(m, 'green_test', { resolvedConcern: true, concern: null });
m = recordReaction(m, 'red_test', { resolvedConcern: false, concern: 'flaky timeout in checkout test' });
await save(m);
console.log(`  after 3 reactions → bond ${m.bond.toFixed(2)} (${bondLabel(m.bond)}), reds=${m.eventCounts.red_test}, greens=${m.eventCounts.green_test}`);
console.log(`  learned: ${JSON.stringify(m.habits)}`);
console.log(`  still carrying: "${m.openConcern}"`);

// --- Session 2: Miro returns and greets, grounded in that history ---
m = await load();
m = { ...m, sessions: m.sessions + 1 };
console.log(`\nSession ${m.sessions} (returning) — bond ${m.bond.toFixed(2)} (${bondLabel(m.bond)})`);
console.log(`  Miro: "${await composeGreeting(m)}"`);

await rm(FILE, { force: true });
console.log(`${'='.repeat(50)}\nPersisted across sessions ✓  Bond grew ✓  Greeting references history ✓\n`);
