# Miro — Architecture & Status
### Cerebras × Google DeepMind Gemma 4 Hackathon (June 2026)

> **Miro is a Tamagotchi whose world is your computer.** A transparent, always-on-top desktop pet (Electron + PixiJS) that watches your screen, understands it through **Gemma 4 31B on Cerebras**, walks to what just happened, and surfaces what she saw — then remembers your day. The differentiator is **latency**: at Cerebras speed she feels *alive*.

**Tracks:** Multiverse Agents (multi-agent + multimodal) · People's Choice (virality). Multimodal = text (terminal) + images (screenshots) + **video** (3-frame sequences).

---

## The Five Design Laws (still hold)

1. **One Retina** — exactly one vision call sees the screen per event and emits structured situation JSON.
2. **Many Instincts** — the swarm reasons over Retina's text output, never re-reading pixels. Cheap, fast, coordinated.
3. **Point, Don't Act** — she points, warns, fetches, suggests. The human acts.
4. **Attention Is Cost Control** — event-driven; "curl up" = zero model calls; a cheap change-detector + cooldown gate all inference.
5. **Latency Is the Feeling** — real telemetry only; the speed *is* the product.

---

## Verified platform facts (measured against the live API)

| Fact | Value |
|---|---|
| Model | `gemma-4-31b` · `https://api.cerebras.ai/v1` (OpenAI-compatible) |
| Throughput | **~1,500–2,600 tok/s** (measured, text; 2,316 tok/s this run); inference `total_time` ~4 ms text / ~14 ms image; reads land ~250 ms (243–340 ms observed) incl. network |
| Image cost | **~280 tokens/screenshot** (≤280 cap); base64 PNG/JPEG only, ≤5 images, ≤10 MB |
| Tier (ours) | **100 RPM / 100K TPM / 131K ctx** |
| Structured output | `response_format: json_schema, strict` → constrained decoding (valid JSON guaranteed); **verified on the image path** |
| Gotchas baked in | `tools` ⊥ `response_format`; **must set `max_completion_tokens`** or the limiter assumes full MSL and throttles |

---

## Architecture (as built)

```
capture (getDisplayMedia / Electron desktopCapturer, 3-frame buffer)
   │  self-mask (her own pixels erased so she never reads herself) + change-gate (8×8 luminance, thr 10)
   │  + cooldown (≤1 / ~3s) + 15s backoff on failure
   ▼
Retina — ONE vision call (≤5 frames) → strict Situation JSON
   │  { event_type(6), app, what_changed, signal_strength, evidence[], uncertainties[],
   │    focus_point, rest_point, recommended_swarm_tier }
   │  safety-priority: a staged destructive command outranks even a red test
   │  terminal-truth: newest output = current state; fed her last reading to judge novelty
   ▼
Belief-latch (edge-trigger) — act on a NEW situation signature; a repeat of the same thing stays calm
   ▼
Coordinated instinct swarm  (event-aware tier floor: red/stale/risky always verify)
   │  Verifier (best-of-N vote when ambiguous) ─ gates ─▶ Mood · Fetch · Guard
   │                                                         └▶ Nudge ─▶ Story (refs carried concern)
   │  per-agent trace + graceful per-agent failure isolation
   ▼
Reducer → RuntimeState { pose, bubble, 3 meters, openConcern, Receipt }
   │  carry-forward: red sets the worry, green resolves it; Verifier downgrades worried→unsure if stale
   ▼
Intent machine (overlay) — event→intent {rest|investigate|guard|point|celebrate}, priority+ttl
   │  hysteresis (commit; stronger preempts; same-kind refreshes) · phases: orient→travel(decel)→dwell
   │  stands BESIDE the focus + turns to face it (points, never covers) · pursues a moved goal · real-bounds clamp
   │  sleep-when-calm: naps after ~20s quiet; wakes on event / pet / hover / ⌘⇧L
   ▼
Output: bubble (emotion) + receipts card (facts) + recurrence chip + recap   ·   Bond memory
```

**Output channels (two, deliberately split):**
- **Bubble** — her emotion, ≤12 words, she/her voice, auto-hides (transient, not a label).
- **Receipts card** ("what I saw") — the factual conclusion she *already computed*: event, app, named cause, the **one file to open** (`fetch.target`), real-vs-stale (Verifier), the literal error line (`evidence`), and any danger (Guard). Auto-shows on notable events; **click her** to recall the last one; **drag her** to move.
- **Recurrence** — `↻ Nth time this session` when a similar issue repeats.
- **Recap** — `⌘⇧M` composes the *arc of your session* into a card (toggle off with the same key, click her, or 20s auto-clear).
- **Look-now / wake** — `⌘⇧L` forces a fresh read past the latch and re-acquires capture if it dropped. A stalled read self-heals (12 s request timeout + 15 s stuck-watchdog) so she never freezes.

**Memory:**
- **Bond** (persisted, localStorage): sessions, bond, lastSeen, openConcern, eventCounts, habits → a greeting that references your history.
- **Session scroll** (in-memory): the moments she saw → recurrence + the recap.

**Embodiment:** transparent, frameless, always-on-top, click-through window; clicks pass through everywhere except her body; auto-granted screen capture (no picker). Cerebras key injected by the Vite proxy (browser) / from env (Node scripts).

---

## Build status

| | Workstream | State |
|---|---|---|
| ✅ | Repo + probe (access, ~1,500–2,600 tok/s, ~280 img tok, strict-JSON-on-image) | done |
| ✅ | Web app + brain (Retina → swarm → reducer) | done |
| ✅ | **Multi-agent coordination** (hierarchical pack, best-of-N voting, trace) | done |
| ✅ | **Memory & Bond** (persistent greeting, carry-forward concern) | done |
| ✅ | **Temporal "video" perception** (3-frame sequences) | done |
| ✅ | **Visual grounding** (focus_point/rest_point, pet direction, thumbnail) | done |
| ✅ | **Electron desktop overlay** (transparent, always-on-top, click-through, drag) | done |
| ✅ | **Intentional movement** (intent state machine) | done |
| ✅ | **Receipts card** (surface the understanding) | done |
| ✅ | **Session memory** (recurrence + recap) | done |
| ✅ | **Hardening** (cooldown, backoff, diagnostics, debounce) | done |
| ✅ | **Edge-triggered reactions** (belief-latch: act on changes, calm on repeats) | done |
| ✅ | **Judgment** (safety-priority: danger > noise; terminal-truth: newest output wins) | done |
| ✅ | **Self-perception fix** (masks her own overlay out of the capture) | done |
| ✅ | **Sleep-when-calm** (naps when quiet; wakes on event / pet / hover / ⌘⇧L) | done |
| ✅ | **Self-heal** (12 s request timeout + 15 s watchdog + ⌘⇧L wake — never freezes) | done |
| ✅ | Side-by-side race (Cerebras vs Gemini, ~48×) | built (needs a valid Gemini key to run live) |
| ⬜ | Clickable "open the file" pointer | not built |
| ⬜ | Guard body-block sprite (viral) | not built (needs art) |
| ⬜ | 60s demo video + Track 1/2 submission | next |

---

## File map

- **Brain** — `src/brain/`: `cerebras.ts` (2-provider strict-JSON client), `retina.ts` (vision→situation), `instincts.ts` (coordinated swarm), `schema.ts` (strict schemas)
- **State** — `src/state/`: `reducer.ts` (pose/meters/concern/receipt), `belief.ts` (edge-trigger latch: situation signature + isNewEvent), `drowsiness.ts` (sleep-when-calm), `memory.ts` (Bond + greeting), `session.ts` (scroll + recurrence + recap)
- **Perception** — `src/perception/capture.ts` (capture, temporal buffer, change-gate, self-mask)
- **Embodiment** — `src/overlay.ts` + `electron/main.mjs` + `electron/preload.cjs` (the desktop overlay); `src/live.ts` (windowed `app.html`); `src/race.ts` (`race.html`); `src/hud.ts` (telemetry HUD); `src/miroArt.ts` (procedural character, art workstream)
- **Shared** — `src/shared/types.ts`, `src/shared/poses.ts`
- **Scripts** (`node --env-file=.env --import tsx scripts/<x>.ts`) — `probe.mjs` (access/speed), `eval.ts` (classification, 11/11), `belief-check.ts` (edge-trigger + terminal-truth + repeat suppression), `guard-priority-check.ts` (danger > red test, end-to-end), `drowsiness-check.ts` (sleep/wake transitions), `race-check.ts` (latency gap), `memory-check.ts` (Bond), `temporal-check.ts` (multi-frame), `grounding-check.ts` (focus_point), `vision-smoke.ts` (real-screen vision)

## Run

```bash
npm run overlay   # Electron desktop overlay — she lives on your screen
npm run dev       # web: /app.html (live) · /race.html (side-by-side) · / (art preview)
npm run probe     # verify access + speed
```

## Verification

- **Probe** — access, ~1,500–2,600 tok/s (2,316 this run), ~280 img tokens, strict-JSON-on-image ✓, 10-wide concurrency ✓
- **Eval (`eval.ts`)** — **11/11** classifications across pytest/jest/cargo/tsc/go/vite/`rm -rf`/force-push/stale/normal/noisy
- **Belief-latch (`belief-check.ts`)** — edge-trigger property (acts on changes, calm on repeats) · terminal-truth (green supersedes a scrollback red) · repeat suppression
- **Guard-priority (`guard-priority-check.ts`)** — a staged `rm -rf` outranks a glaring red test → guards with the ⚠ danger note (end-to-end)
- **Sleep (`drowsiness-check.ts`)** — 8/8 sleep/wake transitions (naps after calm, never while busy, rouse resets the clock)
- **Vision smoke** — reads a real editor+terminal screen accurately as `normal`, sane grounding, ~250 ms
- **Grounding** — `focus_point` 2/2 to the correct region · **Temporal** — describes change across a sequence · **Memory** — Bond grows + greeting references history

## Honest caveats / known limits

- **Gemini baseline** needs a fresh key to run the live race; the **~48×** was measured earlier (Cerebras 65 ms vs Gemini 3,134 ms on the same call).
- **Grounding is coarse** (quadrant-ish, not pixel-precise) — by design; it plays to a 31B's strength (gist) not its weakness (exact coordinates).
- **6-event taxonomy is dev-focused** (`red_test/green_test/risky_command/stale_error/normal/unknown`) — depth over breadth; non-dev screens read as `normal` (she stays calm).
- The `CEREBRAS_API_KEY` in `.env` is a temporary hackathon key (rotate after).
- Dev builds log an Electron "Insecure CSP" warning — dev-only, disappears when packaged.
