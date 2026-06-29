// Verifies sleep-when-calm transitions (pure, no API). She naps after calm, stays awake when busy,
// and a rouse (pet / hover / ⌘⇧L / event) resets the clock. Run:
//   node --import tsx scripts/drowsiness-check.ts
import { awake, settle, SLEEP_AFTER_MS } from '../src/state/drowsiness';

const T = SLEEP_AFTER_MS;
const checks: Array<[string, boolean]> = [];
const expect = (name: string, got: boolean) => checks.push([name, got]);

// Drifts to sleep only once the quiet has lasted long enough.
expect('awake before threshold', settle(awake(0), T - 1, true).asleep === false);
expect('asleep at threshold', settle(awake(0), T, true).asleep === true);

// Busy (moving / reacting / dragging) keeps her awake no matter how long.
expect('busy never sleeps', settle(awake(0), T * 5, false).asleep === false);

// Once asleep she stays asleep while calm continues.
expect('stays asleep', settle(settle(awake(0), T, true), T + 9999, true).asleep === true);

// A rouse resets the clock: the countdown restarts from the rouse moment.
let d = settle(awake(0), T, true);        // asleep at T
d = awake(T + 5000);                        // petted/woken at T+5000
expect('rouse wakes', d.asleep === false);
expect('no early re-sleep', settle(d, T + 5000 + (T - 1), true).asleep === false);
expect('re-sleeps after fresh calm', settle(d, T + 5000 + T, true).asleep === true);

// Becoming busy mid-doze wakes her and refreshes the clock.
expect('busy rouses a sleeper', settle(settle(awake(0), T, true), T + 1, false).asleep === false);

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`\n${failed.length === 0 ? `PASS — ${checks.length}/${checks.length} sleep/wake transitions correct` : `FAIL — ${failed.length} broken`}`);
process.exit(failed.length === 0 ? 0 : 1);
