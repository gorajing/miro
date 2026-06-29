// Strict-mode JSON schemas (Cerebras constrained decoding).
// Rules honored: root object, additionalProperties:false on every object,
// all properties listed in `required`, no pattern/format/minItems.
import { POSES } from '../shared/poses';

const POSE_ENUM = [...POSES];

export const RETINA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    event_type: { type: 'string', enum: ['red_test', 'green_test', 'risky_command', 'stale_error', 'normal', 'unknown'] },
    app: { type: 'string', enum: ['terminal', 'editor', 'browser', 'desktop', 'other'] },
    what_changed: { type: 'string' },
    signal_strength: { type: 'number' },
    evidence: { type: 'array', items: { type: 'string' } },
    uncertainties: { type: 'array', items: { type: 'string' } },
    recommended_swarm_tier: { type: 'string', enum: ['none', 'sniff', 'alert', 'full_pack'] },
  },
  required: ['event_type', 'app', 'what_changed', 'signal_strength', 'evidence', 'uncertainties', 'recommended_swarm_tier'],
};

export const MOOD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    mood: { type: 'string', enum: POSE_ENUM },
    attention_delta: { type: 'number' },
    trust_delta: { type: 'number' },
    bond_delta: { type: 'number' },
  },
  required: ['mood', 'attention_delta', 'trust_delta', 'bond_delta'],
};

export const NUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { speak: { type: 'boolean' } },
  required: ['speak'],
};

export const VERIFIER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { is_real: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['is_real', 'reason'],
};

export const FETCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { target: { type: 'string' } },
  required: ['target'],
};

export const GUARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { risk: { type: 'boolean' }, note: { type: 'string' } },
  required: ['risk', 'note'],
};

export const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { line: { type: 'string' } },
  required: ['line'],
};
