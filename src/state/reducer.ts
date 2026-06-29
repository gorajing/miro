import type { MiroPose } from '../miroArt';
import type { EventType, RuntimeState, Situation, SwarmOutput } from '../shared/types';

const FALLBACK_BUBBLE: Record<MiroPose, string> = {
  asleep: 'curling up. zero tokens.',
  idle: 'watching quietly.',
  sniff: 'sniffing the screen.',
  curious: 'hmm, something changed.',
  worried: 'that failure looks real.',
  guard: 'wait — this looks risky.',
  fetch: 'look over here.',
  proud: 'phew, green again.',
  unsure: 'stale error? not panicking.',
  buffering: '…',
};

function poseFromEvent(e: EventType): MiroPose {
  switch (e) {
    case 'red_test': return 'worried';
    case 'green_test': return 'proud';
    case 'risky_command': return 'guard';
    case 'stale_error': return 'unsure';
    case 'normal': return 'idle';
    default: return 'curious';
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function reduce(prev: RuntimeState, situation: Situation, swarm: SwarmOutput): RuntimeState {
  const r = swarm.results;

  let pose: MiroPose = r.mood ? r.mood.mood : poseFromEvent(situation.event_type);
  let openConcern = prev.openConcern;
  let bubble = r.story?.line ?? FALLBACK_BUBBLE[pose];

  // Carry-forward concern: remember a real worry, and pay it off when it resolves.
  if (situation.event_type === 'red_test') {
    openConcern = situation.what_changed;
  }
  if (situation.event_type === 'green_test' && prev.openConcern) {
    pose = 'proud';
    bubble = r.story?.line ?? 'phew — fixed the one I was worried about.';
    openConcern = null;
  }

  // Verifier prevents false panic: a stale/unreal worry becomes "unsure", not alarm.
  if (r.verifier && r.verifier.is_real === false && pose === 'worried') {
    pose = 'unsure';
    bubble = r.story?.line ?? 'looks stale — checking before I bark.';
  }

  const meters = {
    attention: clamp01((r.mood?.attention_delta ?? situation.signal_strength) +
      (pose === 'asleep' || pose === 'idle' ? 0 : 0.2)),
    trust: clamp01(
      prev.meters.trust +
      (r.mood?.trust_delta ?? 0) +
      (r.verifier ? (r.verifier.is_real ? 0.05 : -0.1) : 0),
    ),
    bond: clamp01(
      prev.meters.bond +
      (r.mood?.bond_delta ?? 0) +
      (situation.event_type === 'green_test' && prev.openConcern ? 0.1 : 0),
    ),
  };

  return { pose, bubble, meters, openConcern };
}

export function initialState(): RuntimeState {
  return { pose: 'asleep', bubble: FALLBACK_BUBBLE.asleep, meters: { attention: 0, trust: 0.5, bond: 0.3 }, openConcern: null };
}
