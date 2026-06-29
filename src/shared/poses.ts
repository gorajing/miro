// Canonical pose list, owned by the brain layer so it has NO dependency on the
// renderer (src/miroArt.ts pulls in PixiJS, which can't load in Node). This lets
// the brain run headless for evals/tests. Keep these strings in sync with
// MiroPose in src/miroArt.ts — they are structurally identical string unions.
export const POSES = [
  'asleep',
  'idle',
  'sniff',
  'curious',
  'worried',
  'guard',
  'fetch',
  'proud',
  'unsure',
  'buffering',
] as const;

export type Pose = (typeof POSES)[number];
