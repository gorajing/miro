// Thin Cerebras client. Calls the Vite proxy (/cerebras → api.cerebras.ai) so the
// API key stays server-side. Every call is strict-JSON + capped output tokens
// (omitting max_completion_tokens makes the rate-limiter assume full MSL → throttle).

export interface Metrics {
  totalTime: number; // seconds, from time_info.total_time (falls back to wall)
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
}

const ENDPOINT = '/cerebras/v1/chat/completions';
const MODEL = 'gemma-4-31b';

export async function chatJSON<T>(opts: ChatOpts): Promise<{ data: T; metrics: Metrics }> {
  const messages: Array<{ role: string; content: Content }> = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.user });

  const body = {
    model: MODEL,
    messages,
    max_completion_tokens: opts.maxTokens ?? 300,
    temperature: opts.temperature ?? 0.3,
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
    },
    ...(opts.cacheKey ? { prompt_cache_key: opts.cacheKey } : {}),
  };

  const t0 = performance.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const wallSec = (performance.now() - t0) / 1000;

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Cerebras ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '';
  const ti = json?.time_info ?? {};
  const u = json?.usage ?? {};

  const metrics: Metrics = {
    totalTime: typeof ti.total_time === 'number' ? ti.total_time : wallSec,
    tps: ti.completion_time && u.completion_tokens ? u.completion_tokens / ti.completion_time : 0,
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    imageTokens: u.prompt_tokens_details?.image_tokens ?? 0,
  };

  // strict mode guarantees schema-valid JSON, so parse is safe.
  return { data: JSON.parse(content) as T, metrics };
}
