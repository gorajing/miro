// Session memory — Miro accrues the notable moments she sees instead of overwriting
// each tick. Powers recurrence ("this again?") and an end-of-session recap of your day.
// Pure-ish core; the one network call (composeRecap) reuses the strict-JSON client.
import { chatJSON, type Provider } from '../brain/cerebras';
import { RECAP_SCHEMA } from '../brain/schema';
import type { EventType, Receipt } from '../shared/types';

export interface Moment {
  event: EventType;
  cause: string;
  target: string;
  evidence: string;
  isReal: boolean | null;
  at: number; // ms timestamp from the caller
  recurrence: number; // 1 = first time this session
}

const scroll: Moment[] = [];
const MAX = 40;
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'into', 'test', 'tests', 'error']);

function keywords(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));
}

/** Append a notable receipt as a moment; returns how many SIMILAR moments occurred this session (1 = first). */
export function recordMoment(r: Receipt, atMs: number): number {
  const kw = new Set(keywords(r.cause));
  const recurrence = scroll.filter(
    (m) => m.event === r.event && keywords(m.cause).filter((w) => kw.has(w)).length >= 2,
  ).length + 1;
  scroll.push({ event: r.event, cause: r.cause, target: r.target, evidence: r.evidence[0] ?? '', isReal: r.isReal, at: atMs, recurrence });
  if (scroll.length > MAX) scroll.shift();
  return recurrence;
}

export function momentCount(): number {
  return scroll.length;
}

const RECAP_SYS =
  "You are Miro, a warm girl dog (she/her), recapping your human's work session from what you watched over their shoulder. " +
  'Given the moments (one per line, oldest first), write 2-4 short warm bullet lines telling the ARC of their session — ' +
  'what they fought, what they fixed, what they kept hitting. Affectionate and concise; not a stats dump. No quotes, no emoji.';

/** Compose an end-of-session recap from the scroll (Gemma; templated fallback). */
export async function composeRecap(provider: Provider = 'cerebras'): Promise<string[]> {
  if (scroll.length === 0) return ['Quiet session — nothing tripped me. Nice focus today.'];
  const lines = scroll.slice(-20).map((m) => `${m.event}: ${m.cause}${m.target ? ` (${m.target})` : ''}`).join('\n');
  try {
    const { data } = await chatJSON<{ recap: string[] }>({
      system: RECAP_SYS, user: lines, schema: RECAP_SCHEMA, schemaName: 'recap', maxTokens: 180, provider,
    });
    return data.recap.length ? data.recap : ['We had a full one today.'];
  } catch {
    return [`I watched ${scroll.length} moments with you today.`];
  }
}
