# Miro demo — storyboard ("A day with Miro", ~60s)

Arc (skill's proven shape): title → ONE real example end-to-end → show her **discriminate** (a real edge case, not just the happy path) → the honest "she refuses to cry wolf" → emotional payoff → close. Hero = **live overlay footage**; cards carry the plain-English story. Caption #s map to `CLAIMS.md`.

| # | t | Source | What's on screen | Caption (proof) |
|---|---|---|---|---|
| 0 | 0–5s | **CARD** `title.html` | Miro logo + name | "Miro — a desktop pet who understands your screen." sub: "Gemma 4 31B · Cerebras" (#1) |
| 1 | 5–12s | **FOOTAGE** | Miro perched in the corner of a real coding desktop, calm, blinking, watching | "She lives over your work and watches — quietly, until something matters." (#2,#8) |
| 2 | 12–24s | **FOOTAGE** (the core beat) | Run tests → **red**. Miro notices, walks over, goes worried, **receipts card** pops | "A test fails. She walks over, reads the real error, and names the file — in ~250 ms." (#2,#5,#7) |
| 3 | 24–32s | **FOOTAGE** (discriminate) | A stale/cached error appears → Miro goes **unsure**, not worried | "A stale error? Her Verifier checks — she stays *unsure* instead of crying wolf." (#6,#9) |
| 4 | 32–40s | **FOOTAGE** (delight) | Type `rm -rf …` → Miro **guards**, danger note on the card | "A dangerous command — she plants herself and names the risk. *Point, don't act.*" (#12) |
| 5 | 40–48s | **FOOTAGE** (payoff) | Fix → **green**. Miro celebrates: "no more 401s!" | "You fix it — and she remembers what she'd been worried about." (#11) |
| 6 | 48–55s | **FOOTAGE** (closer) | `⌘⇧M` → **MIRO'S RECAP** card | "And she remembers your whole day." (#11) |
| — | (opt) | FOOTAGE `race.html` | Cerebras vs GPU lanes, timers | "Same brain. One on Cerebras, one on a GPU." (#13 — **only if Gemini key works**) |
| 7 | 55–60s | **CARD** `close.html` | Stats + tags + repo | "~250 ms reactions · a coordinated 6-agent pack · multimodal." @Cerebras @googlegemma #Gemma · github.com/gorajing/miro (#2,#6,#10) |

## Notes
- **Captions over footage:** render each caption to a transparent lower-third PNG (from an HTML card) and `ffmpeg overlay` it onto the clip — avoids the missing-`drawtext` gotcha.
- **One example, walked end-to-end:** the auth-test failure is the through-line (beats 2→5: fails → investigated → fixed → remembered). Keep it the *same* test so the carry-forward payoff lands.
- **Show her discriminate (beat 3)** is non-negotiable — it's what proves judgment, not a rubber stamp.
- **Speed is shown, not just claimed:** the receipts card appearing near-instantly *is* the speed proof; the HUD's live `time_info` number can be visible.
- Keep total tight (~55–60s). Front-load the payoff feel in the first 8s (she's alive + watching).

## Two-track production
- **I build:** `title.html`, `close.html`, caption overlays (PNG), then assemble + run the critic panel.
- **You record (clean sandbox screen, no secrets/notifications):** beats 1–6 as live overlay footage per `CAPTURE.md`.
