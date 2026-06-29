import type { Situation } from '../shared/types';

// The belief-latch: Miro reacts to TRANSITIONS, not to the continued PRESENCE of a state.
// A failure sitting in the terminal is read on every poll, but she should act ONCE — the
// difference between an edge-triggered and a level-triggered interrupt. These pure helpers
// hold that decision so it is testable in isolation from the DOM/render loop.

/** Does this reading even warrant a reaction at all? (normal/unknown are non-events.) */
export const isEventful = (s: Situation): boolean =>
  s.event_type !== 'normal' && s.event_type !== 'unknown';

/** A stable identity for a situation. Coarse on purpose: event_type + app + a few stable words,
 *  so reworded reads of the SAME failure hash equal, while a real change (red→green, a new
 *  command) flips the key. This is what lets repeats collapse and transitions fire. */
export function signature(s: Situation): string {
  const subject = `${s.what_changed} ${s.evidence.join(' ')}`
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(s|ms|%)?/g, ' ') // drop volatile numbers / durations / counts
    .replace(/[^a-z/_. -]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .sort() // order-independent: a reworded sentence with the same key words hashes the same
    .slice(0, 5)
    .join('-');
  return `${s.event_type}|${s.app}|${subject}`;
}

/** A short human-readable brief of a reading — fed back to Retina next time so SHE judges novelty. */
export const briefOf = (s: Situation): string => `${s.event_type} — ${s.what_changed}`.slice(0, 140);

/** The latch decision: act only on a genuinely NEW event — eventful AND a different signature
 *  from the last one she acted on. Same signature = she already acknowledged it; stay calm. */
export const isNewEvent = (s: Situation, lastSig: string | null): boolean =>
  isEventful(s) && signature(s) !== lastSig;
