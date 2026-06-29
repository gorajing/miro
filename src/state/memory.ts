// Miro's Bond memory — the Tamagotchi soul. PURE core (no I/O, so it's
// bundler-safe and headless-testable); persistence happens at the edges
// (localStorage in the browser, a JSON file in Node for evals).
import { chatJSON, type Provider } from '../brain/cerebras';
import { GREETING_SCHEMA } from '../brain/schema';
import type { EventType } from '../shared/types';

export interface MiroMemory {
  sessions: number;
  bond: number; // 0..1, grows slowly across shared moments
  lastSeenISO: string | null;
  openConcern: string | null; // survives reloads — the worry Miro is carrying
  eventCounts: Partial<Record<EventType, number>>;
  habits: string[]; // short learned notes, most-recent first, capped
}

export function emptyMemory(): MiroMemory {
  return { sessions: 0, bond: 0.2, lastSeenISO: null, openConcern: null, eventCounts: {}, habits: [] };
}

/** Merge persisted JSON over defaults (tolerates old/partial shapes). */
export function hydrate(raw: string | null): MiroMemory {
  if (!raw) return emptyMemory();
  try { return { ...emptyMemory(), ...(JSON.parse(raw) as Partial<MiroMemory>) }; }
  catch { return emptyMemory(); }
}

/** Fold one reaction into memory: grow Bond on shared/ resolved moments, learn habits. */
export function recordReaction(
  mem: MiroMemory,
  event: EventType,
  opts: { resolvedConcern: boolean; concern: string | null },
): MiroMemory {
  const eventCounts = { ...mem.eventCounts, [event]: (mem.eventCounts[event] ?? 0) + 1 };
  let bond = mem.bond;
  if (event === 'red_test' || event === 'risky_command') bond += 0.01; // weathered a tense moment together
  if (opts.resolvedConcern) bond += 0.05; // celebrated a fix together
  bond = Math.min(1, bond);

  const habits = [...mem.habits];
  if (opts.resolvedConcern && mem.openConcern) habits.unshift(`fixed: ${mem.openConcern.slice(0, 60)}`);

  return { ...mem, eventCounts, bond, openConcern: opts.concern, habits: habits.slice(0, 8) };
}

const GREETING_SYS =
  "You are Miro greeting your returning human. Given your shared history, write ONE warm greeting, MAX 14 words, " +
  'that references it NATURALLY (never list stats). Dog voice — happy to see them. No quotes, no emoji.';

/** A Gemma-composed welcome-back line grounded in real history (templated fallback if it fails). */
export async function composeGreeting(mem: MiroMemory, provider: Provider = 'cerebras'): Promise<string> {
  if (mem.sessions <= 1 && mem.habits.length === 0) return "Oh — hello! I'm Miro. I'll keep an eye on things.";
  const summary = [
    `sessions_together=${mem.sessions}`,
    `bond=${mem.bond.toFixed(2)}`,
    `red_tests_seen=${mem.eventCounts.red_test ?? 0}`,
    `fixes_celebrated=${mem.habits.filter((h) => h.startsWith('fixed:')).length}`,
    `recent=${mem.habits.slice(0, 3).join(' ; ') || 'none'}`,
    `carrying_worry=${mem.openConcern ?? 'none'}`,
  ].join('\n');
  try {
    const { data } = await chatJSON<{ line: string }>({
      system: GREETING_SYS, user: summary, schema: GREETING_SCHEMA, schemaName: 'greeting', maxTokens: 40, provider,
    });
    return data.line;
  } catch {
    return mem.openConcern ? `Welcome back! Still thinking about ${mem.openConcern.slice(0, 30)}…` : 'Welcome back! Ready when you are.';
  }
}

export function bondLabel(bond: number): string {
  if (bond >= 0.8) return 'inseparable';
  if (bond >= 0.6) return 'close';
  if (bond >= 0.4) return 'warming up';
  if (bond >= 0.25) return 'getting acquainted';
  return 'new friend';
}
