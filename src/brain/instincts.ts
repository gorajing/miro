import { chatJSON, type Provider } from './cerebras';
import { MOOD_SCHEMA, NUDGE_SCHEMA, VERIFIER_SCHEMA, FETCH_SCHEMA, GUARD_SCHEMA, STORY_SCHEMA } from './schema';
import type {
  Situation, Tier, EventType, InstinctKey, SwarmResults, SwarmOutput, TraceEntry,
  MoodResult, NudgeResult, VerifierResult, FetchResult, GuardResult, StoryResult,
} from '../shared/types';

// Miro's instincts run as a COORDINATED PACK, not blind parallel calls:
//   Retina → Verifier (gates, with best-of-N vote when ambiguous)
//          → [Mood, Fetch, Guard]  (read the Verifier's verdict)
//          → Nudge  (reads Mood + Guard + Verifier)
//          → Story  (synthesizes the whole pack into one line)
// Downstream agents see upstream outputs — that's the coordination Track 1 rewards,
// and the speed surplus is spent on voting, not idle waiting.

const SYS: Record<InstinctKey, string> = {
  verifier:
    "You are Miro's Verifier. Decide whether the evidence is a REAL, CURRENT problem (is_real=true) " +
    'or stale / cached / noisy / already-resolved (is_real=false). Give a one-line reason. Your job is to PREVENT false panic.',
  mood:
    "You are Miro's Mood. Given the situation AND `verifier_says_real`, choose the pet's pose and meter deltas " +
    '(pose ∈ asleep,idle,sniff,curious,worried,guard,fetch,proud,unsure,buffering; deltas -1..1). ' +
    'CRITICAL: if verifier_says_real=false, prefer "unsure" over "worried" — do not panic on stale evidence. A fix → proud; risky → guard.',
  fetch:
    "You are Miro's Fetch. Name the single most relevant thing to look at next (a file, error, or location). " +
    'Point only — never act. Keep target under 12 words.',
  guard:
    "You are Miro's Guard. If a risky / destructive / irreversible action is present set risk=true with a short note; " +
    'otherwise risk=false. Bark at the door, do not open it.',
  nudge:
    "You are Miro's Nudge. Given the pack's mood, guard_risk, and the verifier verdict, decide if Miro should speak now " +
    '(speak=true) or stay quiet. Only speak for genuinely strong, REAL signals — interrupting on noise erodes trust.',
  story:
    "You are Miro's voice — a warm, clever little GIRL dog (she/her). Given the pack's conclusion (pose, whether it's real, the fetch " +
    'target, the risk) and any resolved_worry, write ONE speech-bubble line, MAX 12 words, in-character (playful, never robotic). ' +
    "If resolved_worry is set, reference THAT specific worry with relief — you had been carrying it. You're a good GIRL, never a 'good boy'. No quotes.",
};

const MAXTOK: Record<InstinctKey, number> = { verifier: 60, mood: 80, fetch: 40, guard: 50, nudge: 20, story: 40 };
const SCHEMA: Record<InstinctKey, object> = {
  verifier: VERIFIER_SCHEMA, mood: MOOD_SCHEMA, fetch: FETCH_SCHEMA, guard: GUARD_SCHEMA, nudge: NUDGE_SCHEMA, story: STORY_SCHEMA,
};

function situationText(s: Situation): string {
  return [
    `event_type=${s.event_type}`, `app=${s.app}`, `what_changed=${s.what_changed}`,
    `signal_strength=${s.signal_strength}`, `evidence=${s.evidence.join(' | ')}`, `uncertainties=${s.uncertainties.join(' | ')}`,
  ].join('\n');
}

interface CallResult<T> { data: T | null; tps: number; entry: TraceEntry }

async function callAgent<T>(agent: string, key: InstinctKey, system: string, user: string, provider: Provider): Promise<CallResult<T>> {
  const t0 = performance.now();
  try {
    const { data, metrics } = await chatJSON<T>({
      system, user, schema: SCHEMA[key], schemaName: key, maxTokens: MAXTOK[key], cacheKey: `miro-${key}-v1`, provider,
    });
    return { data, tps: metrics.tps, entry: { agent, ms: performance.now() - t0, ok: true, detail: '' } };
  } catch (err) {
    console.warn(`[miro] agent "${agent}" failed:`, err);
    return { data: null, tps: 0, entry: { agent, ms: performance.now() - t0, ok: false, detail: err instanceof Error ? err.message.slice(0, 60) : 'error' } };
  }
}

/** Verifier gate with best-of-N: spend the speed surplus on a 3-way vote only when the call is ambiguous. */
async function verify(situation: Situation, text: string, provider: Provider): Promise<{ result: VerifierResult | null; trace: TraceEntry[]; tps: number }> {
  const ambiguous = situation.uncertainties.length > 0 || (situation.signal_strength >= 0.3 && situation.signal_strength <= 0.7);
  const n = ambiguous ? 3 : 1;
  const runs = await Promise.all(
    Array.from({ length: n }, (_, i) => callAgent<VerifierResult>(n > 1 ? `verifier#${i + 1}` : 'verifier', 'verifier', SYS.verifier, text, provider)),
  );
  const trace = runs.map((r) => r.entry);
  const tps = Math.max(0, ...runs.map((r) => r.tps));
  const votes = runs.map((r) => r.data).filter((d): d is VerifierResult => d !== null);
  if (!votes.length) return { result: null, trace, tps };
  const yes = votes.filter((v) => v.is_real).length;
  const isReal = yes * 2 >= votes.length; // majority (ties → real, lean cautious)
  const reason = (votes.find((v) => v.is_real === isReal) ?? votes[0]).reason;
  return { result: { is_real: isReal, reason }, trace, tps };
}

const TIER_RANK: Record<Tier, number> = { none: 0, sniff: 1, alert: 2, full_pack: 3 };

// Events where the Verifier MUST run (stale-vs-real is its whole job), even if Retina under-tiered them.
const EVENT_MIN_TIER: Partial<Record<EventType, Tier>> = {
  red_test: 'alert',
  stale_error: 'alert',
  risky_command: 'full_pack',
};

export async function runSwarm(situation: Situation, tier: Tier, provider: Provider = 'cerebras', carriedConcern: string | null = null): Promise<SwarmOutput> {
  const results: SwarmResults = {};
  const trace: TraceEntry[] = [];
  let maxTps = 0;
  const t0 = performance.now();

  // Event-aware floor: red/stale/risky always run the Verifier even if Retina under-tiered them.
  const minTier = EVENT_MIN_TIER[situation.event_type] ?? 'none';
  const effTier: Tier = TIER_RANK[tier] >= TIER_RANK[minTier] ? tier : minTier;
  if (effTier === 'none') return { results, trace, metrics: { calls: 0, maxTotalTime: 0, tps: 0 } };

  const rank = TIER_RANK[effTier];
  const base = situationText(situation);

  const record = <T>(r: CallResult<T>): T | null => { trace.push(r.entry); maxTps = Math.max(maxTps, r.tps); return r.data; };

  // 1) Verifier gates the pack (alert+), voting when ambiguous.
  let isReal = true;
  if (rank >= TIER_RANK.alert) {
    const v = await verify(situation, base, provider);
    trace.push(...v.trace);
    maxTps = Math.max(maxTps, v.tps);
    if (v.result) { results.verifier = v.result; isReal = v.result.is_real; }
  }
  const ctx = `${base}\nverifier_says_real=${isReal}`;

  // 2) Sensors run concurrently, each conditioned on the Verifier's verdict.
  const jobs: Array<Promise<void>> = [
    callAgent<MoodResult>('mood', 'mood', SYS.mood, ctx, provider).then((r) => { const d = record(r); if (d) results.mood = d; }),
  ];
  if (rank >= TIER_RANK.alert) {
    jobs.push(callAgent<FetchResult>('fetch', 'fetch', SYS.fetch, ctx, provider).then((r) => { const d = record(r); if (d) results.fetch = d; }));
  }
  if (rank >= TIER_RANK.full_pack) {
    jobs.push(callAgent<GuardResult>('guard', 'guard', SYS.guard, ctx, provider).then((r) => { const d = record(r); if (d) results.guard = d; }));
  }
  await Promise.all(jobs);

  // 3) Nudge reads the pack (full_pack only).
  if (rank >= TIER_RANK.full_pack) {
    const nudgeCtx = `${ctx}\nmood=${results.mood?.mood ?? 'idle'}\nguard_risk=${results.guard?.risk ?? false}`;
    const d = record(await callAgent<NudgeResult>('nudge', 'nudge', SYS.nudge, nudgeCtx, provider));
    if (d) results.nudge = d;
  }

  // 4) Story synthesizes the whole pack into one line, last.
  const resolvedWorry = situation.event_type === 'green_test' && carriedConcern ? carriedConcern : '';
  const storyCtx = `${base}\npose=${results.mood?.mood ?? ''}\nis_real=${isReal}\nfetch=${results.fetch?.target ?? ''}\nrisk=${results.guard?.risk ?? false}\nresolved_worry=${resolvedWorry || 'none'}`;
  const d = record(await callAgent<StoryResult>('story', 'story', SYS.story, storyCtx, provider));
  if (d) results.story = d;

  const swarmWall = (performance.now() - t0) / 1000;
  return { results, trace, metrics: { calls: trace.length, maxTotalTime: swarmWall, tps: maxTps } };
}
