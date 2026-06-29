import type { MiroPose } from '../miroArt';

export type Tier = 'none' | 'sniff' | 'alert' | 'full_pack';

export type EventType =
  | 'red_test'
  | 'green_test'
  | 'risky_command'
  | 'stale_error'
  | 'normal'
  | 'unknown';

export type AppKind = 'terminal' | 'editor' | 'browser' | 'desktop' | 'other';

/** Retina's single structured read of the screen. */
export interface Situation {
  event_type: EventType;
  app: AppKind;
  what_changed: string;
  signal_strength: number;
  evidence: string[];
  uncertainties: string[];
  recommended_swarm_tier: Tier;
}

// --- Instinct outputs (each its own strict schema) -------------------------
export interface MoodResult { mood: MiroPose; attention_delta: number; trust_delta: number; bond_delta: number; }
export interface NudgeResult { speak: boolean; }
export interface VerifierResult { is_real: boolean; reason: string; }
export interface FetchResult { target: string; }
export interface GuardResult { risk: boolean; note: string; }
export interface StoryResult { line: string; }

export interface SwarmResults {
  mood?: MoodResult;
  nudge?: NudgeResult;
  verifier?: VerifierResult;
  fetch?: FetchResult;
  guard?: GuardResult;
  story?: StoryResult;
}

export type InstinctKey = keyof SwarmResults;

export interface SwarmMetrics { calls: number; maxTotalTime: number; tps: number; }
export interface SwarmOutput { results: SwarmResults; metrics: SwarmMetrics; }

export interface Meters { attention: number; trust: number; bond: number; }

export interface RuntimeState {
  pose: MiroPose;
  bubble: string;
  meters: Meters;
  /** What Miro is currently worried about, carried forward until it resolves. */
  openConcern: string | null;
}
