// Sleep-when-calm: a pet whose world is your screen should nap when the screen has been quiet, and
// perk up when something happens. This is the pure timing state machine — the overlay maps `asleep`
// onto her pose. Kept separate from the render loop so the transitions are testable in isolation.

export const SLEEP_AFTER_MS = 20000; // resting + no new events this long → she curls up

export interface Drowse {
  asleep: boolean;
  lastActiveAt: number; // last moment she was roused: woke, acted on a NEW event, or you reached for her
}

/** A wide-awake state stamped at `now`. Also the "rouse her" result (pet / hover / ⌘⇧L / new event). */
export const awake = (now: number): Drowse => ({ asleep: false, lastActiveAt: now });

/** Advance drowsiness one tick.
 *  - Not calm (moving, reacting, being dragged) → she is active: stay awake, keep the clock fresh.
 *  - Calm → drift to sleep once the quiet has lasted SLEEP_AFTER_MS. Already asleep stays asleep. */
export function settle(d: Drowse, now: number, calm: boolean): Drowse {
  if (!calm) return { asleep: false, lastActiveAt: now };
  if (d.asleep) return d;
  return now - d.lastActiveAt >= SLEEP_AFTER_MS ? { asleep: true, lastActiveAt: d.lastActiveAt } : d;
}
