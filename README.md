# 🐶 Miro

**A Tamagotchi whose world is your computer.**

Miro is a cute desktop pet that watches your screen, understands what's happening through **Gemma 4 31B on Cerebras**, and reacts like a living companion — it sleeps, sniffs, worries, points, guards, and celebrates. Its moods come from your *real* work: a red test makes Miro worried; a fixed failure makes it celebrate; a quiet screen makes it curl up and spend nothing.

The magic is **latency**. At ~1,850 tokens/sec, Miro reacts fast enough to feel *alive*. On a slow GPU it feels like a buffering bot. Speed isn't a number here — it's the difference between a pet and a progress bar.

> Built for the **Cerebras × Google DeepMind Gemma 4 Hackathon** (June 2026).

## How it works

```
screen change → Retina (1 vision call → situation JSON)
             → instinct swarm (Mood · Nudge · Verifier · Fetch · Guard · Story)
             → Miro's mood + a little speech bubble
```

One **Retina** agent sees the screenshot; a swarm of cheap **instinct** agents reason over its text output in parallel — all on Gemma 4 via Cerebras. Miro never clicks or acts on your behalf; it *points, warns, and reacts*. The full design lives in [`PLAN.md`](./PLAN.md).

## Quickstart

```bash
cp .env.example .env        # then paste your Cerebras key into .env
npm run probe               # confirms access + prints real speed/token numbers
```

The probe round-trips text **and** an image through `gemma-4-31b`, prints live tokens/sec and time-to-reaction from the API's `time_info`, measures the real per-image token cost, and finds your concurrency ceiling — the numbers the whole loop is budgeted against.

## Stack

Electron · TypeScript · PixiJS (procedural character) · macOS screen capture · Cerebras Inference API (OpenAI-compatible).
