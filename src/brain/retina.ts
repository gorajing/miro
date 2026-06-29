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
  'signal_strength is 0..1: how much this deserves the pet\'s attention.',
  'recommended_swarm_tier: none for nothing, sniff for minor, alert for a likely-real event, full_pack for a clear major moment.',
  'focus_point: the normalized location (x,y each 0..1, origin top-left) of the MOST notable thing on screen (the failure, the dialog, the changed area); use {x:0.5,y:0.5} when nothing stands out. Coarse is fine.',
  'Keep what_changed under 16 words. Be precise; do not invent UI that is not visible.',
].join(' ');

export async function runRetina(
  frames: string | string[],
  hints?: { terminalText?: string; scenario?: string },
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
