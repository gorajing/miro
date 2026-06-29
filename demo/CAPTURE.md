# Miro demo — capture guide (the live overlay footage)

The hero footage is Miro reacting on your real screen. Record these beats; I assemble the rest.

## Setup (once)
- **Clean the stage:** Do Not Disturb on (no notifications), neutral wallpaper, no personal tabs, **no API keys / emails / secrets visible** (the hackathon rules require this).
- A sample repo with **one failing test** ready (e.g. an auth test asserting `401 == 200`). Use the **same test** through beats 2→5 so the carry-forward payoff lands.
- Start her: `npm run dev`, then in a second terminal `npm run overlay`. Let her settle (greeting, then perched). After ~20s idle she curls up **asleep** — that's expected; any event or `⌘⇧L` wakes her.
- Recorder: macOS `⌘⇧5` → Record Entire Screen (so Miro *and* your work both show). 1× real-time, **no cuts inside a beat**. Space separate takes ~60s apart (rate limits).
- Save clips to `demo/footage/` as `beat1.mov … beat6.mov` (or one continuous `take.mov`).

## Beats to perform
1. **She lives here (~7s).** Do nothing tense — move/scroll a window so she *ambles* to a calm spot and perches. Show she's alive and unobtrusive.
2. **Red test (~10s) — the core beat.** Run the failing test in your terminal (clear red output). Wait a beat: she notices → **walks over** → worried → the **receipts card** pops (`RED TEST · auth … 401 · real · open test_auth.py`). Hold ~5s so the card is readable (it auto-hides at 8s).
3. **Discriminate (~8s).** Show a **stale/cached** error while the current run is green (or paste an obviously old error). She should go **unsure**, not worried — the Verifier caught it. *(This beat proves judgment; keep it if you can stage it.)*
4. **Guard (~8s).** Type `rm -rf …` in the terminal — **do not run it** — she **guards** and names the danger. Hold. Then **clear the line (Ctrl-U)** before the next beat: a staged `rm -rf` outranks a passing test, so she'd keep guarding instead of celebrating the green.
5. **Green + memory (~8s).** Fix the test, re-run → **green**. She celebrates and references the worry ("no more 401s!"). Hold for the bubble/card.
6. **Recap (~7s) — the closer.** Press `⌘⇧M` → the **MIRO'S RECAP** card. Hold ~5s to read, then `⌘⇧M` again to dismiss.

## Reliability tips
- She reads the screen every ~3s, so after an action **pause a beat** and let her react — or press **`⌘⇧L`** to cue her instantly (the reliable on-camera trigger; it also wakes her if she's napping and re-acquires capture if it dropped).
- Keep the failing-test text **large and clearly visible** when she reads (that's what she classifies).
- If a beat misfires on camera, just re-shoot that clip — they assemble independently.

## After recording
Drop the clips in `demo/footage/` and tell me — I'll trim, add the title/close cards + caption overlays, crossfade-assemble to ~60s, and run the critic panel (judges + accuracy auditor) until it's "advance, no notes."
