# Miro demo — verified claim set (master narrative)

**Rule:** nothing appears on screen unless it's in this list with a re-derivable proof. Captions draw only from here. Honesty is the credibility.

| # | On-screen claim (honest phrasing) | Proof / command | Status |
|---|---|---|---|
| 1 | "Powered by Gemma 4 31B on Cerebras" | `npm run probe` → `gemma-4-31b` responds | ✅ verified |
| 2 | **"Sees & reacts in ~250 ms"** (the headline) | probe wall ~226 ms; live reads 243–340 ms (vision-smoke / soak log) | ✅ verified, stable |
| 3 | "Cerebras: ~1,500–2,600 tok/s" (range, or show the live number) | `probe` — varies per call (1,574 / 2,600 observed). **Do not cherry-pick a peak**; show the live telemetry figure | ✅ verified (range) |
| 4 | "~280 tokens per screenshot" | probe `prompt_tokens=297` with image ≈ 280 image tokens | ✅ verified |
| 5 | "One vision call → guaranteed-valid JSON (on the image path)" | probe: strict json_schema returns valid JSON with an image | ✅ verified |
| 6 | "A coordinated 6-agent pack" (Verifier→Mood/Fetch/Guard→Nudge→Story) | `src/brain/instincts.ts`; eval trace shows the chain | ✅ verified (6 = verifier,mood,fetch,guard,nudge,story) |
| 7 | "Reads dev events correctly — 11/11" | `eval.ts` → 11/11 across pytest/jest/cargo/tsc/go/vite/rm-rf/force-push/stale/normal/noisy | ✅ verified |
| 8 | "Reads a real screen accurately" | `vision-smoke.ts` → real editor+terminal read as `normal`, accurate | ✅ verified |
| 9 | "Doesn't cry wolf — Verifier catches stale errors" | eval `stale_error` → `unsure`, `verifier.is_real=false` | ✅ verified |
| 10 | "Multimodal: text + screenshots + 3-frame sequences" | `temporal-check.ts` → describes change across a frame sequence | ✅ verified |
| 11 | "Remembers — recurrence, a Bond across sessions, a day recap" | `memory-check.ts` (bond grows, greeting refs history); `session.ts` recurrence | ✅ verified |
| 12 | "Point, don't act — she points; you decide" | design law; `SYS.fetch` = "point only, never act" | ✅ by design |
| 13 | "~48× faster than a GPU model on the same call" | `race-check.ts` earlier: Cerebras 65 ms vs Gemini 3,134 ms | ⚠️ **needs a fresh Gemini key to re-derive/film** — else cut this beat |
| 14 | "Reacts to changes, not noise — once, not 24×" | `belief-check.ts` → edge-trigger property + repeat suppression + terminal-truth | ✅ verified |
| 15 | "Danger first — a staged `rm -rf` outranks a louder red test" | `guard-priority-check.ts` → `risky_command` + ⚠ danger note, end-to-end | ✅ verified |
| 16 | "Naps when your screen is quiet, wakes when something happens" | `drowsiness-check.ts` → 8/8 sleep/wake transitions | ✅ verified |

## Honesty guardrails (what NOT to do)
- **Speed:** lead with felt latency (~250 ms). If a tok/s number is shown, use the *live* telemetry value, not a remembered peak.
- **48× / side-by-side:** only film it if we have a working Gemini key and can re-run `race-check` on camera. Otherwise the speed story is felt-latency + Cerebras tok/s, and we drop the multiplier.
- **Grounding:** she points to the *region/quadrant*, not a pixel — never claim pixel precision.
- **Taxonomy:** she's tuned for the dev loop (6 event types); non-dev screens read as `normal`. Don't imply general world-understanding.
- **Data:** the demo is a *real* coding session (real failing tests) — that's the proof. No staged/faked telemetry; every number on the HUD is from `time_info`.
