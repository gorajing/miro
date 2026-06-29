# 🐶 Miro

**A desktop pet who understands your screen.**

Miro is a transparent, always-on-top desktop companion (Electron + PixiJS) that watches your screen and understands what you're doing — powered by **Gemma 4 31B on Cerebras** (~2,600 tok/s, ~250 ms reads). She lives over your work, walks to whatever just happened, and tells you what she saw — the failing test, the one file to open, whether it's real or a stale error — then celebrates when you fix it and remembers your day.

The magic is **latency**: at Cerebras speed her reactions feel *alive*, not like a buffering bot.

> Built for the **Cerebras × Google DeepMind Gemma 4 Hackathon** (June 2026).

## What she does

- **Watches your screen** continuously — 3-frame temporal vision, ~250 ms per read — and stays calm (zero tokens) when nothing's happening.
- **Surfaces what she understood** — a glanceable *"what I saw"* card: the named cause, the **one file to open**, real-vs-stale, the literal error line, and any danger. (Conclusions she computes are shown, not thrown away.)
- **A coordinated agent pack** — a Verifier (best-of-N vote) gates Mood / Fetch / Guard → Nudge → Story; the Verifier kills false panic on stale errors.
- **Reacts with intent** — she *notices*, turns, **walks over**, worries / guards / celebrates, then ambles back to a calm perch. Draggable; clicks pass through everywhere except her body.
- **Remembers** — recurrence (*"↻ 2nd time this session"*), a **Bond** that grows across sessions and greets you back, and an end-of-day **recap** (`⌘⇧M`).
- **Point, don't act** — she points at the problem; you stay in control.

## Why it fits the hackathon

- **Multimodal** — terminal text + screenshots (images) + 3-frame sequences (the "video" modality).
- **Multi-agent** — a genuinely *coordinated* pack (upstream verdicts gate downstream agents), with an inter-agent trace.
- **Speed in action** — ~250 ms reactions are the whole product; `race.html` runs the *same brain* on Cerebras vs a GPU baseline (Gemini) — measured **~48× faster** on an identical call.

## Run it

```bash
cp .env.example .env        # paste your Cerebras key into CEREBRAS_API_KEY
npm install
npm run overlay             # the desktop overlay (Electron) — she lives on your screen
# or the web pages:
npm run dev                 #   /app.html  windowed live demo
                            #   /race.html Cerebras-vs-GPU side-by-side
                            #   /         art pose preview
npm run probe               # confirm Cerebras access + real speed/token numbers
```

macOS: grant **Screen Recording** to Electron on first run. The Cerebras key is injected by the Vite dev-server proxy, so it never reaches the browser bundle.

## How it works

```
screen → Retina (1 vision call → strict situation JSON)
       → coordinated instinct swarm (verifier → mood/fetch/guard → nudge → story)
       → reducer (3 meters + carried concern + receipt)
       → intent machine (notice → walk → react → perch) + Bond memory
```

Full architecture, verified numbers, and build status: **[PLAN.md](./PLAN.md)**. Art direction: **[ART_WORKSTREAM.md](./ART_WORKSTREAM.md)**.

## Stack

Electron · Vite · TypeScript · PixiJS · Cerebras Inference API (OpenAI-compatible, key proxied server-side).
