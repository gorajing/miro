# Miro — Build Plan & Spec
### Cerebras × Google DeepMind Gemma 4 Hackathon (Jun 28–29 2026, 24h, solo)

> **Miro is a Tamagotchi whose world is your computer.**
> A cute desktop pet that watches your screen, understands what's happening through **Gemma 4 31B on Cerebras**, and reacts like a living companion — sleeping, sniffing, worrying, pointing, guarding, celebrating. Its "needs" are grounded in your real work, not fake food or coins. The magic is **latency**: at ~1,850 tok/s Miro feels *alive*; on a GPU it feels like a buffering bot.

**Tracks:** Track 1 — Multiverse Agents (multi-agent + multimodal), **and** Track 2 — People's Choice (impressions). *(Skip Track 3 — not enterprise.)*
**Multimodal claim:** text (terminal/logs) + images (screenshots) + **video** (Miro watches a continuous frame-stream — that's the video modality).

---

## 1. The Five Design Laws (non-negotiable)

1. **One Retina.** Exactly one vision call sees the screenshot per event and emits structured situation JSON. Nothing else touches the image.
2. **Many Instincts.** Instinct agents reason over Retina's *text* output, never the image. Cheap, fast, parallel.
3. **Point, Don't Act.** Miro never clicks, edits, opens files, or runs commands autonomously. It points, warns, fetches context, suggests. The human acts. *(Reaction is robust; action is fragile — and a 31B is worst at pixel grounding.)*
4. **Attention is Cost Control.** Event-driven, never frame-streaming. "Curl Up" = zero model calls. A near-free local change-detector gates all inference.
5. **Latency is the Feeling.** The product *is* the speed. Show real time-to-reaction, tok/s, request count, image-token count. No fake telemetry, ever.

---

## 2. Verified Platform Facts (read the docs — these prevent disasters)

| Fact | Value | Consequence for Miro |
|---|---|---|
| Model ID | `gemma-4-31b` | OpenAI-compatible, `base_url=https://api.cerebras.ai/v1` |
| Throughput | **~1,850 tok/s** | Hero number; verify live = `completion_tokens / completion_time` |
| **Image token cost** | **≤ 280 tokens/image** (dynamic by resolution; 1024×1024→256) | Vision is CHEAP — not the budget squeeze. Real count in `usage.prompt_tokens_details.image_tokens` → **show it on screen** |
| Image downscale | ~768px effective at the 280 cap | **Crop to the region of interest** (terminal pane) or small text blurs out |
| Image format | base64 PNG/JPEG data URI only; hosted URLs unsupported; ≤5 imgs/req | We send 1 cropped screenshot per Retina call |
| **`max_completion_tokens`** | **MUST set on every call** | Rate-limiter estimates spend as input + (this OR full MSL). Omit it → every call billed at ~65K tokens → throttled to ~1 req/min → **demo dies silently**. Retina ≤400, instincts ≤250 |
| Structured outputs | `response_format={type:"json_schema", json_schema:{name, strict:true, schema}}` → token-level constrained decoding, valid JSON guaranteed | Retina + all instincts use this |
| Strict schema rules | root `object`; `additionalProperties:false` on **every** object; ≤5000 chars, ≤10 depth, ≤500 props; **no** `pattern`/`format`/`minItems`/`maxItems`/recursion/`$ref` | Schemas written to these constraints below |
| tools ⊥ response_format | `tools` and `response_format` **cannot** coexist in one request | Fine — Point-Don't-Act needs no tools |
| reasoning_effort | `none` default; `low`/`medium`/`high` opt-in | `none` for instincts (speed); `low` on Verifier only when uncertain |
| Prompt caching | `prompt_cache_key` (≤1024 chars) | Cache the static system prompts (every instinct) |
| Telemetry | `time_info{queue_time, prompt_time, completion_time, total_time, created}` | time-to-reaction = `total_time`; tok/s from completion fields |
| **Rate limit (our tier)** | **100 RPM / 100K TPM**, 131K ctx | Hackathon grant (matches FAQ). PAYG card → 300 RPM / 500K TPM if needed |
| Sampling | recommended temp 1.0 / top_p 0.95 | Use **low temp (~0.3)** for Retina/Verifier *classification* consistency; default for Story *voice* |

---

## 3. Architecture

```
[local change detector]  (pixel-diff / window-title change / terminal-output change / manual demo trigger)
        │  weak signal → Miro curls up, 0 model calls
        ▼  strong signal
[deterministic text floor]  (exit code ≠ 0 or "FAILED"/"Error" → force ≥ sniff tier)
        ▼
[Retina]  1 vision call: cropped screenshot (+ optional terminal text) → strict situation JSON
        │   ─ decides recommended_swarm_tier
        ▼
[Instinct swarm]  Retina serial → instincts CONCURRENT (semaphore ≤3–4 to avoid burst 429)
        ▼
[State reducer]  3 meters + carry-forward concern
        ▼
[Cute pet reaction]  PixiJS character state change + ≤12-word speech bubble
        ▼
[Memory]  tiny local JSON (a few learned habits) — no vector DB
```

### Components
- **Change detector** — cheapest possible gate. Pixel-diff threshold + active-window/title change + terminal buffer change. Plus a **manual trigger button** for demo reliability (backup only; the hero wake must be autonomous).
- **Retina** — the only image consumer. Crops to the active region for legibility. Emits the schema below.
- **Instinct swarm (6 agents, text-only over Retina JSON):**
  - **Mood** — updates meters → pet state (asleep / curious / worried / guarding / proud).
  - **Nudge** — speak or stay quiet? (interrupt only on strong signal).
  - **Verifier** — is the evidence real or stale/noisy? Prevents false panic. (Maps to **Trust**.)
  - **Fetch (Point)** — which file/error/next-context is relevant (point, don't open).
  - **Guard** — flag risky/destructive actions.
  - **Story** — the ≤12-word dog-voice bubble. *Hard-constrained + templated fallback (this is the most-screenshotted asset).*
- **State reducer — 3 meters only:** **Attention** (asleep/curious/worried/excited) · **Trust** (confident/unsure/asks-first) · **Bond** (habits JSON). **Carry-forward concern:** when Miro worries about test X, that concern persists and *resolves on green* ("phew — the one you were sweating"). This continuity is the living-companion illusion. No hunger/coins/streaks.
- **Pet UI** — procedural PixiJS character (no asset pipeline), state machine → mood animations, adaptive frame governor (idle ≈ asleep at low FPS, active at 60), transparent always-on-top frameless overlay, speech bubble, telemetry HUD.

### RPM-aware swarm tiers (Retina picks the tier)
| Tier | Agents | Calls | When |
|---|---|---|---|
| `none` | — | 0 | Curl up. Default. |
| `sniff` | Retina + Mood + Nudge | 3 | Minor change |
| `alert` | + Verifier + Fetch | 5 | Likely-real event |
| `full_pack` | + Guard + Story | 7 | Demo's major moments only |

---

## 4. Stack

- **Electron + TypeScript + Vite (Electron Forge).** Electron gives the transparent always-on-top overlay, native screen capture, and a renderer for the pet in one shell.
- **PixiJS** procedural character (rectangles/graphics primitives — no sprite pipeline, instant to retheme into a dog), driven by a 5-state machine + adaptive frame governor.
- **macOS `screencapture`** → JPEG (cropped) → base64 → Cerebras. Black-frame detection (permission failure) → fail loud.
- **Cerebras brain provider** — a `BrainProvider` interface with `decide()` returning strict JSON; the only network dependency. A second **Gemini** provider powers the side-by-side baseline.
- **Memory** — a single local JSON file. (No DB, no vectors, no encryption for v0.)

---

## 5. Retina schema (strict-mode compliant)

```jsonc
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "event_type":   { "type": "string", "enum": ["red_test","green_test","risky_command","stale_error","normal","unknown"] },
    "app":          { "type": "string", "enum": ["terminal","editor","browser","desktop","other"] },
    "what_changed": { "type": "string" },
    "signal_strength": { "type": "number" },
    "evidence":     { "type": "array", "items": { "type": "string" } },
    "uncertainties":{ "type": "array", "items": { "type": "string" } },
    "recommended_swarm_tier": { "type": "string", "enum": ["none","sniff","alert","full_pack"] }
  },
  "required": ["event_type","app","what_changed","signal_strength","recommended_swarm_tier"]
}
```
*(No `pattern`/`format`/`minItems`; `additionalProperties:false` set. Each instinct gets its own small strict schema in the same shape.)*

---

## 6. Budget math (final, on verified numbers)

- Retina ≈ 280 (img) + ~600 (prompt) + 400 (cap) ≈ **~1.3K tokens**; each instinct ≈ **~0.5K**.
- `full_pack` (7 calls) ≈ **~4.3K tokens**, 7 requests.
- **Binding constraint = RPM, not TPM:** 100 RPM ÷ 7 ≈ **~14 full reactions/min** (TPM allows ~23/min). `sniff` ≈ ~33/min.
- → Plenty for an event-driven pet; impossible for frame-streaming. "Curl Up" is the governor.
- **Concurrency:** Retina serial (gates), then instincts concurrent behind a **semaphore of 3–4** (100 RPM may be enforced ~1.6/s, so a 7-wide burst can 429). At ~1,850 tok/s the batch still finishes in ~1s → feels alive. *Measure the real 429 ceiling in H0.*

---

## 7. The MVP scenario (build this end-to-end first)

1. Miro sleeps on a clean desktop. → 2. You run tests; a **red failure** appears. → 3. Change-detector + text-floor fire. → 4. Retina reads the cropped terminal. → 5. Instinct swarm runs (concurrent). → 6. Miro wakes/worries and says e.g. *"sniffed it — auth route test, not the UI."* → 7. You apply a (real or mocked) fix; tests go **green**. → 8. Miro **celebrates and references the worry it carried** *("phew, the one you were sweating")* and writes one habit: `{"habit":"likes regression tests with fixes"}`.

## 8. Side-by-side (host-sanctioned; commit to it)
- Second lane = **Gemini** (the FAQ explicitly allows a second provider for latency comparison). Same Retina payload, **separate process** (shared event loop contaminates timing), two live timers.
- Caption: **"Same dog. Same brain. One is alive. One is buffering."** Frame honestly ("even a frontier GPU model can't react fast enough to feel alive") and state the baseline in the post.
- **Fallback closer** if unstable by H15: the live timing HUD (real `total_time` + tok/s + image_tokens).

---

## 9. 24-Hour Plan (checkpoint each block; **first-cuts marked ✂**)

- **H0–H2 · Plumbing & access proof.** Probe `gemma-4-31b`: text + image round-trip; capture `time_info` fields, real tok/s, **real `image_tokens` for a cropped screenshot**; find the **concurrency 429 ceiling**; confirm **strict json_schema works on the image path**. Scaffold Electron overlay + PixiJS pet (idle) + grant macOS screen-recording. **✔ Pet on screen + real screenshot→Gemma→strict-JSON with `total_time` & `image_tokens` printed.**
- **H2–H5 · Retina + the GO/NO-GO GATE.** Build Retina (cropped screenshot + optional terminal text → situation JSON) and a **10-screenshot eval set** of real red/green/normal screens. **GATE @ H5: Retina ≥ 8/10 correct, else switch to text-first** (read terminal/exit-code directly; vision only for app-context) before building further. **✔ Retina reliably reads your real screens (or text-first locked).**
- **H5–H9 · Instinct swarm + state reducer.** 6 instincts as cheap structured calls; Retina(serial)→instincts(concurrent, semaphore). Reducer with 3 meters + **carry-forward concern**. Wire pet states + bubble. **✔ A real screen event → visible mood change + bubble, end-to-end, < ~1.5s.**
- **H9–H12 · MVP scenario + gating.** Change-detector + deterministic text floor + tier selection; red→fix→green arc with carry-forward celebrate; **hard-constrain Story** (≤12 words, dog persona, few-shot, templated fallback); real telemetry HUD. **✔ Full scenario autonomous, real Gemma, real telemetry.**
- **H12–H15 · Side-by-side (Gemini).** ✂ Second lane, separate process, two timers, honest caption. **DECISION @ H15: unstable → cut to HUD closer.** **✔ Both lanes react to one event; Cerebras-Miro alive, Gemini-Miro lags.**
- **H15–H18 · Polish.** Animation feel + transitions, bubble-copy tuning, HUD legibility, persona consistency, prompt caching on static prompts, adaptive `reasoning_effort` on Verifier, clean sandbox desktop (no notifications/keys). **✔ Demo-clean, repeatable, arc in ~30–40s.**
- **H18–H21 · Record + edit 60s.** Multiple takes (**space ≥60s apart** for RPM), front-load payoff in first 2–3s, **burn captions** + **"1x real-time, no cuts,"** freeze on the celebrate/win beat, verify every number is real. **✔ 60s MP4 legible muted.**
- **H21–H24 · Submit.** README + repo; **separate Discord posts** to `#g4hackathon-multiverse-agents` (T1) **and** `#g4hackathon-people-choice` (T2); native X video tagging **@Cerebras @googlegemma #Gemma**, repo link in a **self-reply**; confirm exact hashtags in `#gemma-4-hackathon` first. Buffer. **✔ Submissions live + post up.**

**First-cuts if behind:** side-by-side → timing HUD · Guard+Story → drop to `alert` · memory → stateless (the clip doesn't need it).

---

## 10. 60-Second Shot List

- **0–8s** Miro asleep on a clean desktop (ambient, autonomous).
- **8–16s** Run tests → red failure → change-detector fires → Miro perks up.
- **16–28s** Retina + instincts finish fast; Miro sniffs and names the likely cause; HUD shows time-to-reaction + tok/s.
- **28–38s** Verifier ignores a stale/noisy error — Miro does **not** false-panic (Trust beat).
- **38–48s** Fix → green → Miro celebrates and references the worry it carried; writes one habit.
- **48–60s** Side-by-side: *"Same dog. Same brain. One's alive, one's buffering."* + hero numbers (~1,850 tok/s, time-to-reaction). Tags.

---

## 11. Definition of Done

- [ ] Miro reacts to a **real** screenshot via `gemma-4-31b` on Cerebras.
- [ ] Retina emits **strict** structured JSON (constrained decoding).
- [ ] **≥4 instinct agents** run concurrently over Retina's text output.
- [ ] Pet state changes **visibly and correctly**; carry-forward concern resolves on green.
- [ ] **All telemetry real** (`time_info`, `image_tokens`) — nothing faked.
- [ ] No autonomous clicking; no fragile pixel grounding.
- [ ] `max_completion_tokens` set on **every** call.
- [ ] 60s native X video (captions, "1x real-time") + both Discord track posts.

---

## 12. Risk Register

| Risk | Mitigation |
|---|---|
| Model access | ✅ Resolved — `gemma-4-31b` live on your tier (100 RPM/100K TPM) |
| Retina misreads real screens | H5 go/no-go gate → text-first fallback |
| Burst 429 mid-reaction | Concurrency semaphore ≤3–4; measure ceiling H0 |
| Silent TPM throttle | `max_completion_tokens` on every call |
| Small text blurs at 280-tok cap | Crop to region; or read terminal text directly |
| Side-by-side flaky | Cut to live timing HUD (defined fallback) |
| Persona "LLM mush" in bubble | Hard constraints + few-shot + templated fallback |
| Scope creep solo/24h | First-cuts marked; MVP scenario before everything |
| Screen-recording permission | Grant H0; black-frame detection fails loud |
