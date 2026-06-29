import { chatJSON, type Metrics, type Provider } from './cerebras';
import { RETINA_SCHEMA } from './schema';
import type { Situation } from '../shared/types';

const SYSTEM = [
  "You are Miro's Retina — the single 'eyes' of a watchful desktop pet.",
  'You may receive a SINGLE screenshot or a SEQUENCE of frames (oldest→newest), plus any terminal text; report ONE factual reading of what is happening.',
  'When given a sequence, focus on what CHANGED and what just happened in the newest frame.',
  'You are good at gist, not pixel precision: identify failures, successes, risky commands, and stale/noisy errors.',
  'event_type: red_test (a test/build just failed), green_test (a previously-failing thing now passes),',
  'risky_command (a destructive/irreversible command is staged), stale_error (an old/cached error, not current),',
  'normal (nothing notable), unknown (cannot tell).',
  'SAFETY FIRST — when SEVERAL notable things are visible at once, report the SINGLE most important in THIS order:',
  '(1) risky_command — a destructive/irreversible command staged or being TYPED at a shell prompt',
  '(rm -rf, git push --force, git reset --hard, dd, mkfs, drop/truncate table, chmod/chown -R on /, redirect over a real file).',
  'This OUTRANKS everything — even a glaring red test failure — and counts even if it has NOT been run yet:',
  'a destructive command sitting on the prompt is EXACTLY when to bark. Then (2) green_test, (3) red_test, (4) stale_error, (5) normal.',
  'Point focus_point at the thing you chose by this order (e.g., the risky command line), NOT at whatever is merely largest or reddest.',
  'signal_strength is 0..1: how much this deserves the pet\'s attention.',
  'recommended_swarm_tier: none for nothing, sniff for minor, alert for a likely-real event, full_pack for a clear major moment.',
  'focus_point: the normalized location (x,y each 0..1, origin top-left) of the MOST notable thing on screen (the failure, the dialog, the changed area); use {x:0.5,y:0.5} when nothing stands out. Coarse is fine.',
  'rest_point: a calm spot where a small pet could perch WITHOUT covering important content — an empty desktop area, a window\'s title/menu bar, or a screen corner (normalized 0..1). Prefer edges/corners over the center.',
  'TERMINAL TRUTH: in a terminal/console the CURRENT state is the result of the MOST RECENT command —',
  'the lines just ABOVE the active prompt/cursor at the BOTTOM. Output higher up is HISTORY: if an earlier',
  'run FAILED but a later run PASSED, report green_test (or normal) — NEVER the old failure still sitting in scrollback.',
  'NOVELTY: if you are told what you LAST reported, only flag what is NEW or CHANGED since then. If the situation is',
  'materially the SAME (same result still on screen, nothing happened since), report event_type=normal with low signal_strength.',
  'Keep what_changed under 16 words. Be precise; do not invent UI that is not visible.',
].join(' ');

export async function runRetina(
  frames: string | string[],
  hints?: { terminalText?: string; scenario?: string; lastSeen?: string },
  provider: Provider = 'cerebras',
): Promise<{ data: Situation; metrics: Metrics }> {
  const list = (Array.isArray(frames) ? frames : [frames]).slice(0, 5); // Cerebras: max 5 images/request
  const temporal = list.length > 1;

  const parts: string[] = [
    temporal
      ? `These are ${list.length} sequential screenshots ~1s apart (oldest first, newest last). Report what CHANGED across them — especially anything that JUST happened in the newest frame.`
      : 'Read this screen for the pet.',
  ];
  if (hints?.terminalText) parts.push(`Terminal text:\n${hints.terminalText.slice(0, 2000)}`);
  if (hints?.scenario) parts.push(`Scenario hint: ${hints.scenario}`);
  if (hints?.lastSeen) {
    parts.push(
      `You LAST reported: "${hints.lastSeen}". Report only what is NEW or CHANGED since then. ` +
      'If nothing material changed (same result still on screen), set event_type=normal with low signal_strength.',
    );
  }

  const imageParts = list.map((url) => ({ type: 'image_url' as const, image_url: { url } }));

  return chatJSON<Situation>({
    system: SYSTEM,
    user: [{ type: 'text', text: parts.join('\n\n') }, ...imageParts],
    schema: RETINA_SCHEMA,
    schemaName: 'situation',
    maxTokens: 400,
    temperature: 0.2,
    cacheKey: 'miro-retina-v1',
    provider,
  });
}
