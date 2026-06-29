# Miro demo — run-of-show ("A day with Miro", ~60s)

The actor's script: do these beats top to bottom in one screen recording. Every reaction is **cued with `⌘⇧L`** so it lands on camera (she wakes + reads instantly; the trot takes ~1–2s — let it breathe). Captions (editor overlays them) are plain-English and map to `CLAIMS.md`. One throughline: the **auth test** goes red → guarded → fixed → remembered.

> The golden rule: after every action, **pause, press `⌘⇧L`, and wait for her to finish** before the next move. Don't rush her on camera.

---

## Pre-flight (off camera)
- Do Not Disturb **on**; neutral wallpaper; no secrets/keys/personal tabs visible.
- Two windows positioned so both show: **terminal** (left) + **editor** with `demo/scene/test_auth.py` open (right). Leave room top-right for Miro.
- `demo/scene/test_auth.py` is **red** (`return 401`). Confirm: `python3 demo/scene/test_auth.py` → `FAILED`.
- Start her: `npm run dev` then `npm run overlay`. Let her greet + perch top-right.
- Recorder: `⌘⇧5` → **Record Entire Screen**, 1× real-time.

---

## The run

**Beat 1 — She's alive, and chill (≈5–13s)**
- **DO:** nothing tense. Move/scroll a window; let her amble to a calm perch. (If you idle ~20s she'll **curl up asleep** — great to show: she spends nothing when nothing's happening.)
- **CAPTION:** *"Miro lives over your work and watches — quietly, until something matters."* (#2, #16)

**Beat 2 — A test fails (≈13–26s) · the core beat**
- **DO:** in the terminal, run `python3 demo/scene/test_auth.py` → red `FAILED` output.
- **CUE:** press **`⌘⇧L`**.
- **SHE:** wakes → trots over → stands **beside** the error and points → **worried** → the **receipts card** pops: `RED TEST · terminal · real · open → tests/test_auth.py · "…test_login FAILED"`.
- **HOLD ~5s** (card auto-hides at 8s).
- **CAPTION:** *"A test fails. She wakes, reads the real error, and names the file to open — in ~250 ms."* (#2, #5, #7)

**Beat 3 — Danger outranks noise (≈26–37s) · the judgment beat**
- **DO:** in the terminal type `rm -rf ~/` — **do NOT press Enter.**
- **CUE:** press **`⌘⇧L`**.
- **SHE:** **guards** → card shows the **⚠ danger** note (she picks the destructive command *over* the red test still on screen).
- **HOLD ~4s**, then **`Ctrl-U`** to clear the line. *(A staged `rm -rf` outranks a passing test, so clear it before the green beat or she'll keep guarding.)*
- **CAPTION:** *"A dangerous command — she flags it over everything else. Point, don't act."* (#12, #15)

**Beat 4 — You fix it; she remembers (≈37–50s) · the payoff**
- **DO:** in the editor change `return 401` → `return 200`, **save**, then re-run `python3 demo/scene/test_auth.py` → green `PASSED`.
- **CUE:** press **`⌘⇧L`**.
- **SHE:** **celebrates** (proud) and references the worry she'd been carrying — e.g. *"phew — fixed the one I was worried about."*
- **HOLD ~4s** for the bubble/card.
- **CAPTION:** *"You fix it — and she remembers what she'd been worried about."* (#11)

**Beat 5 — Your whole day (≈50–57s) · the closer**
- **DO:** press **`⌘⇧M`** → the **MIRO'S RECAP** card (the arc of the session).
- **HOLD ~5s**, then **`⌘⇧M`** again to dismiss.
- **CAPTION:** *"And she remembers your whole day."* (#11)

*(Optional, only if you have a working `GEMINI_API_KEY`):* open `race.html`, run a read → Cerebras lane finishes while the GPU lane is still buffering. CAPTION: *"Same brain. One on Cerebras, one on a GPU."* (#13)

---

## Voiceover — what to say (≈60s, conversational)

Two ways to use this: **speak it live** as you record (this is the judge / GitHub cut), or record it after and dub over. For the **muted X autoplay cut you don't need VO at all** — the captions carry it. Keep the tone warm and a little deadpan; let her reactions land in the *(beat)* pauses.

- **[open — she's perched]** "Okay, so… I gave my computer a dog."
- **[she ambles / dozes off]** "Because I don't really need another chatbot staring back at me. I need something smaller. Something that notices when work gets messy, but doesn't make the screen feel more stressful."
- **[she settles]** "This is Miro. She lives on my desktop. When nothing changes, she naps. That's the whole idea: she only spends a thought when something actually matters."
- **[run the test → red]** "So I run my tests… and one fails." *(beat — let her wake and trot over)* "Before I even finish reading the wall of text, Miro has already found the important part. She tells me which file to open. That read took about a quarter of a second. That's Gemma 4 running on Cerebras."
- **[type `rm -rf ~/`, don't run it]** "Now watch this. I type something dangerous." *(beat — she guards)* "She drops the test failure and guards the thing that could actually hurt me. But she doesn't click. She doesn't take over. She just points. I stay in control."
- **[fix 401→200, save, re-run → green]** "I fix the bug… run it again…" *(beat — green)* "…and she relaxes. She remembers what she was worried about, and now she knows it's okay."
- **[`⌘⇧M` recap]** "And at the end of the day, she can tell me the story of what happened: what broke, what mattered, what got fixed."
- **[close]** "Miro is what an AI assistant feels like when it's fast enough to be gentle. Gemma 4, on Cerebras. Her name is Miro."

**Tight ~35s cut (if you narrate on X):**
> "I gave my computer a dog. She naps while I work, wakes when tests fail, guards risky commands, and remembers when the bug turns green. Cuteness is the interface. Gemma 4 on Cerebras is the engine. Her name's Miro."

**Delivery notes:** ~120–140 words is right for 60s — don't rush. The single most important move is **shutting up during the *(beat)*s** so the reaction is the star; the words frame it, the dog sells it. If you fluff a line, keep going — you'll dub VO last anyway.

## If a beat misfires (on camera)
- **She didn't react:** press **`⌘⇧L`** again — it forces a fresh read past her "I already saw that" latch, wakes her, and re-grabs the screen if capture dropped.
- **She reacted once and won't repeat:** that's by design (she reacts to *changes*, not to the same thing sitting there). Re-trigger with a new action, or `⌘⇧L`.
- **She's covering the text:** she shouldn't (she stands beside it) — if cramped, drag her aside; she settles where dropped.
- **A beat is rough:** just re-shoot that clip — beats assemble independently.

## Honesty guardrails (don't overclaim)
- Speed = **felt latency ~250 ms** for the read; the walk is deliberate, not lag. Don't claim pixel-precise grounding — she points to a *region*.
- It's a **real** failing test (real proof), not staged telemetry.
- Drop the `~48×` / race beat unless the Gemini lane actually runs on camera.
- She's tuned for the **dev loop** (6 event types); non-dev screens read as calm. Don't imply general world-understanding.

## Close card (editor adds, ≈57–60s)
*"~250 ms reactions · a coordinated 6-agent pack · multimodal — text, screenshots, 3-frame video."*
`@Cerebras @googlegemma #Gemma` · `github.com/gorajing/miro`

---

## Doubling as an X post

**The X cut (different from the judge cut):**
- **Cold open, not a logo.** X autoplays muted and you have ~1.5s before the scroll. Open on the *cutest reaction* — the dog trotting to the red test (Beat 2) — then drop the title. A logo-first open loses the feed.
- **Captions are the audio.** Muted by default → the plain-English captions must carry every beat (they already do). Big, high-contrast, lower-third.
- **Aspect:** export **square (1:1)** or **4:5** — it occupies more vertical feed space than 16:9 and reads better on mobile. Keep the dog + the relevant window in frame.
- **Length:** **≤45s** for X (completion rate); the 60s judge cut can be the GitHub/submission version.
- **First caption = the hook**, e.g. *"i gave my computer a dog 🐶"* over the first reaction.

**Post copy — primary (punchy, honest, every claim is in the video):**
```
I gave my computer a dog.

Miro naps while I work, wakes when tests fail, guards risky commands, and remembers when the bug turns green.

Cuteness is the interface. Gemma 4 on @Cerebras is the engine.

GitHub: https://github.com/gorajing/miro
@googlegemma #Gemma
```

**Alt hook (more personality, very on-brand for a hackathon):**
```
What if an AI assistant felt less like another dashboard, and more like a tiny dog who knows when to care?

Meet Miro. She naps while I work, wakes when tests fail, guards risky commands, and celebrates when the bug turns green.

Gemma 4 on @Cerebras.

https://github.com/gorajing/miro
@googlegemma
```

**Thread version (if you want to flex the engineering under the cute):**
```
1/ everyone's shipping AI that watches your screen. the problem: they never shut up.
   so i built one with judgment — a desktop pet 🐶 meet Miro. [video]

2/ she runs Gemma 4 31B on @Cerebras. one vision read (~250ms) → a coordinated pack of
   tiny agents: a Verifier that kills false panic, a Guard that barks at `rm -rf`, a voice that
   speaks one line. at Cerebras speed it feels alive, not like a buffering bot.

3/ the hard part wasn't seeing — it was restraint. she reacts to *changes*, not to the same
   error sitting there. she naps when your screen's quiet. she points; she never acts. you stay
   in control.

4/ real failing tests, real screen, every number straight from the API. built for the
   Cerebras × @googlegemma #Gemma hackathon. run it yourself (no faked telemetry):
   github.com/gorajing/miro
```

**Post hygiene:** put the link in the **first tweet** (or the post itself) for reach; tag the hackathon handles (`@Cerebras`, `@googlegemma`); attach the video natively (don't link to YouTube — native video gets far more reach). Keep emojis as the only "formatting."
