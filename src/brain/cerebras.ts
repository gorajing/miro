// Generic strict-JSON LLM client for Miro's two lanes:
//   - cerebras (gemma-4-31b)  → the live product
//   - gemini   (OpenAI-compat) → the side-by-side latency baseline
// Browser calls the Vite proxy (key injected server-side, no CORS). Node (eval/
// tests) calls the API directly with the key from the environment.
// Output tokens are always capped (omitting the cap makes a rate-limiter assume
// full MSL and throttle).

export type Provider = 'cerebras' | 'gemini';

export interface Metrics {
  provider: Provider;
  totalTime: number; // seconds — time_info.total_time when available, else wall
  tps: number; // output tokens/sec
  promptTokens: number;
  completionTokens: number;
  imageTokens: number;
}

export type Content =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

interface ChatOpts {
  system?: string;
  user: Content;
  schema: object;
  schemaName: string;
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  provider?: Provider;
}

const IS_NODE = typeof window === 'undefined';
const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

interface ProviderConfig {
  proxyPath: string; // browser (via Vite proxy)
  directUrl: string; // node (direct)
  model: string;
  keyEnv: string;
  tokenParam: 'max_completion_tokens' | 'max_tokens';
  cacheKey: boolean;
  timeInfo: boolean;
  label: string;
  extraBody?: Record<string, unknown>;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  cerebras: {
    proxyPath: '/cerebras/v1/chat/completions',
    directUrl: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'gemma-4-31b',
    keyEnv: 'CEREBRAS_API_KEY',
    tokenParam: 'max_completion_tokens',
    cacheKey: true,
    timeInfo: true,
    label: 'Cerebras · Gemma 4 31B',
  },
  gemini: {
    proxyPath: '/gemini/v1beta/openai/chat/completions',
    directUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: nodeEnv.GEMINI_MODEL || 'gemini-3.5-flash', // current fast multimodal — fair GPU baseline
    keyEnv: 'GEMINI_API_KEY',
    tokenParam: 'max_tokens',
    cacheKey: false,
    timeInfo: false,
    label: 'Gemini 3.5 Flash (GPU baseline)',
    extraBody: { reasoning_effort: 'none' }, // disable thinking so the JSON isn't truncated
  },
};

export const providerLabel = (p: Provider): string => PROVIDERS[p].label;
export const providerModel = (p: Provider): string => PROVIDERS[p].model;

export async function chatJSON<T>(opts: ChatOpts): Promise<{ data: T; metrics: Metrics }> {
  const provider = opts.provider ?? 'cerebras';
  const cfg = PROVIDERS[provider];

  const messages: Array<{ role: string; content: Content }> = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.user });

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    [cfg.tokenParam]: opts.maxTokens ?? 300,
    temperature: opts.temperature ?? 0.3,
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
    },
    ...(cfg.extraBody ?? {}),
  };
  if (cfg.cacheKey && opts.cacheKey) body.prompt_cache_key = opts.cacheKey;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = nodeEnv[cfg.keyEnv];
  if (IS_NODE && key) headers.Authorization = `Bearer ${key}`;

  const endpoint = IS_NODE ? cfg.directUrl : cfg.proxyPath;
  const t0 = performance.now();
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  const wallSec = (performance.now() - t0) / 1000;

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${provider} ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '';
  const ti = json?.time_info ?? {};
  const u = json?.usage ?? {};
  const completionTokens: number = u.completion_tokens ?? 0;
  const totalTime = cfg.timeInfo && typeof ti.total_time === 'number' ? ti.total_time : wallSec;

  const metrics: Metrics = {
    provider,
    totalTime,
    tps: cfg.timeInfo && ti.completion_time && completionTokens
      ? completionTokens / ti.completion_time
      : completionTokens && wallSec ? completionTokens / wallSec : 0,
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens,
    imageTokens: u.prompt_tokens_details?.image_tokens ?? 0,
  };

  return { data: JSON.parse(content) as T, metrics };
}
