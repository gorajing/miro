import { chatJSON, type Metrics, type Provider } from './cerebras';
import { RETINA_SCHEMA } from './schema';
import type { Situation } from '../shared/types';

const SYSTEM = [
  "You are Miro's Retina — the single 'eyes' of a watchful desktop pet.",
  'Look at the screenshot (and any terminal text) and report ONE factual reading of what is happening.',
  'You are good at gist, not pixel precision: identify failures, successes, risky commands, and stale/noisy errors.',
  'event_type: red_test (a test/build just failed), green_test (a previously-failing thing now passes),',
  'risky_command (a destructive/irreversible command is staged), stale_error (an old/cached error, not current),',
  'normal (nothing notable), unknown (cannot tell).',
  'signal_strength is 0..1: how much this deserves the pet\'s attention.',
  'recommended_swarm_tier: none for nothing, sniff for minor, alert for a likely-real event, full_pack for a clear major moment.',
  'Keep what_changed under 16 words. Be precise; do not invent UI that is not visible.',
].join(' ');

export async function runRetina(
  frameDataUri: string,
  hints?: { terminalText?: string; scenario?: string },
  provider: Provider = 'cerebras',
): Promise<{ data: Situation; metrics: Metrics }> {
  const parts: string[] = ['Read this screen for the pet.'];
  if (hints?.terminalText) parts.push(`Terminal text:\n${hints.terminalText.slice(0, 2000)}`);
  if (hints?.scenario) parts.push(`Scenario hint: ${hints.scenario}`);

  return chatJSON<Situation>({
    system: SYSTEM,
    user: [
      { type: 'text', text: parts.join('\n\n') },
      { type: 'image_url', image_url: { url: frameDataUri } },
    ],
    schema: RETINA_SCHEMA,
    schemaName: 'situation',
    maxTokens: 400,
    temperature: 0.2,
    cacheKey: 'miro-retina-v1',
    provider,
  });
}
