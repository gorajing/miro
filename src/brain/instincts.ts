import { chatJSON } from './cerebras';
import { MOOD_SCHEMA, NUDGE_SCHEMA, VERIFIER_SCHEMA, FETCH_SCHEMA, GUARD_SCHEMA, STORY_SCHEMA } from './schema';
import type { Situation, Tier, InstinctKey, SwarmResults, SwarmOutput } from '../shared/types';

// Which instincts fire at each tier. Retina is the separate vision call; these
// all reason over Retina's TEXT output, so they run concurrently and cheaply.
const TIERS: Record<Tier, InstinctKey[]> = {
  none: [],
  sniff: ['mood', 'nudge', 'story'],
  alert: ['mood', 'nudge', 'verifier', 'fetch', 'story'],
  full_pack: ['mood', 'nudge', 'verifier', 'fetch', 'guard', 'story'],
};

interface Def { system: string; schema: object; maxTokens: number; }

const DEFS: Record<InstinctKey, Def> = {
  mood: {
    system:
      "You are Miro's Mood instinct. Given a situation, pick the pet's pose and small meter deltas. " +
      'pose ∈ asleep,idle,sniff,curious,worried,guard,fetch,proud,unsure,buffering. ' +
      'deltas are -1..1. A real failure → worried; a fix → proud; risky command → guard; stale/ambiguous → unsure; nothing → idle/asleep.',
    schema: MOOD_SCHEMA,
    maxTokens: 80,
  },
  nudge: {
    system:
      "You are Miro's Nudge instinct. Decide if the pet should speak now (speak=true) or stay quiet. " +
      'Only speak for genuinely useful, strong signals — interrupting on noise erodes trust.',
    schema: NUDGE_SCHEMA,
    maxTokens: 20,
  },
  verifier: {
    system:
      "You are Miro's Verifier instinct. Decide if the evidence is a REAL current problem (is_real=true) " +
      'or stale/noisy/cached (is_real=false). Give a one-line reason. Prevent false panic.',
    schema: VERIFIER_SCHEMA,
    maxTokens: 60,
  },
  fetch: {
    system:
      "You are Miro's Fetch instinct. Name the single most relevant thing to look at next " +
      '(a file, error, or location). Point only — never act. Keep target under 12 words.',
    schema: FETCH_SCHEMA,
    maxTokens: 40,
  },
  guard: {
    system:
      "You are Miro's Guard instinct. If a risky/destructive/irreversible action is present set risk=true with a short note; " +
      'otherwise risk=false. Bark at the door, do not open it.',
    schema: GUARD_SCHEMA,
    maxTokens: 50,
  },
  story: {
    system:
      "You are Miro's voice — a warm, clever little dog. Write ONE speech-bubble line, MAX 12 words, " +
      'in-character (a touch playful, never robotic). No quotes, no emoji spam.',
    schema: STORY_SCHEMA,
    maxTokens: 40,
  },
};

function situationText(s: Situation): string {
  return [
    `event_type=${s.event_type}`,
    `app=${s.app}`,
    `what_changed=${s.what_changed}`,
    `signal_strength=${s.signal_strength}`,
    `evidence=${s.evidence.join(' | ')}`,
    `uncertainties=${s.uncertainties.join(' | ')}`,
  ].join('\n');
}

interface OneResult { key: InstinctKey; data: unknown; totalTime: number; tps: number; }

async function runOne(key: InstinctKey, text: string): Promise<OneResult | null> {
  const def = DEFS[key];
  try {
    const { data, metrics } = await chatJSON<unknown>({
      system: def.system,
      user: text,
      schema: def.schema,
      schemaName: key,
      maxTokens: def.maxTokens,
      cacheKey: `miro-${key}-v1`,
    });
    return { key, data, totalTime: metrics.totalTime, tps: metrics.tps };
  } catch (err) {
    // One instinct failing must not kill the whole reaction — degrade gracefully, but be loud in the console.
    console.warn(`[miro] instinct "${key}" failed:`, err);
    return null;
  }
}

export async function runSwarm(situation: Situation, tier: Tier): Promise<SwarmOutput> {
  const keys = TIERS[tier];
  const text = situationText(situation);
  const settled = await Promise.all(keys.map((k) => runOne(k, text)));

  const results: SwarmResults = {};
  let calls = 0;
  let maxTotalTime = 0;
  let tps = 0;
  for (const r of settled) {
    if (!r) continue;
    calls += 1;
    maxTotalTime = Math.max(maxTotalTime, r.totalTime);
    tps = Math.max(tps, r.tps);
    (results as Record<string, unknown>)[r.key] = r.data;
  }
  return { results, metrics: { calls, maxTotalTime, tps } };
}
