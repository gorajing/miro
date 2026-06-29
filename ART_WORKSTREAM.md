# Miro Art Workstream

Miro is a small pixel dog whose world is the user's computer. The art should make
fast multimodal understanding feel embodied: she sleeps when nothing matters,
sniffs when the screen changes, worries at real failures, guards against risky
actions, and celebrates when the situation resolves.

This is a procedural PixiJS art direction, not a sprite pipeline. Miro is based
on the real dog in the owner-provided references: a small tan-and-cream dog with
large glossy eyes, a cream mask down the forehead and muzzle, a black button
nose, slim legs, white paws, and asymmetric ears that often read as one alert
upright ear plus one softer folded ear. Do not trace or reuse the photos. Build a
stylized original Miro in code.

## Visual Thesis

Miro should read at three distances:

- From across the screen: a warm little dog with ears, tail, and posture.
- In a 60-second video: state changes are obvious from body pose.
- Up close: the small details reward attention without making the UI noisy.

The primary art risk is making Miro too cute-static. Her intelligence should be
visible through posture changes, not just speech bubbles.

## Actual Miro Reference Notes

The real Miro should override generic dog references.

Recognizable traits:

- Tan topcoat with cream underside, chest, paws, muzzle, and forehead stripe.
- Big dark round eyes with a soft highlight, not tiny dot eyes.
- Black rounded nose and short cream snout.
- Slight smile line at the cheek; she often looks quietly amused.
- One ear can stand tall while the other softens/folds outward. This asymmetry is
  the strongest silhouette cue.
- Slim front legs and small white paws, not stubby corgi legs.
- Compact body that can sit alert or lounge sideways on a blanket/couch.
- Tail is tan and expressive; it can tuck, wag, or sweep, but does not need to be
  a perfect tight corgi curl.

Reference-derived signature:

> Miro should look like she was already sitting on the couch watching your screen,
> then perked up because she understood something.

The prior shiba/corgi pixel examples are useful only for pixel simplification.
They are no longer the identity.

Local photo references:

- `/Users/jinchoi/Pictures/Photos Library.photoslibrary/resources/derivatives/7/7BD7A464-6796-4C3F-BFBF-B74CEE4EEF8A_1_105_c.jpeg`:
  close-up alert face, one tall ear, cream muzzle, glossy eye.
- `/Users/jinchoi/Pictures/Photos Library.photoslibrary/resources/derivatives/E/EFAE641D-31BA-47E9-9D55-D3859FA31A77_1_102_o.jpeg`:
  side-lounge couch pose, cream belly, small paws, amused expression.
- `/Users/jinchoi/Pictures/Photos Library.photoslibrary/resources/derivatives/A/AF224338-2FAF-4BF8-B618-D43EF2ABA5D6_1_105_c.jpeg`:
  head/eye/nose detail, soft folded ear, cream forehead stripe.
- `/Users/jinchoi/Pictures/Photos Library.photoslibrary/resources/derivatives/9/9FDFEE5C-5BD9-42FD-9907-FC7C3D12AFAF_1_105_c.jpeg`:
  alert couch sit, slim front legs, chew-stick/fetch posture.

## Palette

Use a limited pixel palette so Miro feels deliberate and fast to redraw.

| Token | Hex | Use |
| --- | --- | --- |
| `outline` | `#2C2118` | Thick body outline, eyes, nose |
| `fur` | `#D89A55` | Main tan dog coat |
| `furLight` | `#E8B978` | Sunlit head and shoulder planes |
| `furShadow` | `#A76534` | One-step shadow on ears, body, tail |
| `cream` | `#F6E8CF` | Forehead stripe, muzzle, chest, paws, belly |
| `creamShadow` | `#D7C2A4` | Muzzle and underside shadow |
| `eyeGloss` | `#2A1711` | Large glossy eyes |
| `eyeSpark` | `#FFF7E8` | 1-pixel eye highlight |
| `blush` | `#E99A92` | Tiny cheek and inner-ear warmth |
| `collar` | `#2AAE9E` | Optional UI collar/tag accent, not a required real trait |
| `success` | `#61D66F` | Green test / proud sparkles |
| `warning` | `#F25D4A` | Red failure / guard pulse |
| `scan` | `#72D8FF` | Retina scan glints, not body color |
| `bubble` | `#FFF8E8` | Speech bubble fill |

Keep the body mostly `fur`, `furLight`, `cream`, and `outline`. Use `collar`,
`scan`, `warning`, and `success` as state tells. The teal collar can be a tiny
product accent, but Miro must still read as the real tan-and-cream dog without
it.

## Shape Language

Miro should be built from pixel-snapped rectangles and small polygons:

- Head: soft wedge / rounded fox-like block, slightly wider at cheeks.
- Ears: asymmetric by default; left ear tall/upright, right ear folded or tilted
  unless the pose explicitly perks both ears.
- Body: slim compact dog body; avoid heavy corgi rectangle proportions.
- Muzzle: cream block protruding forward, with a dark rounded nose at the end.
- Forehead: cream stripe from between the eyes down to the muzzle.
- Chest: cream bib for sitting/standing poses.
- Belly: cream patch visible in lounging poses.
- Eyes: large dark glossy pixels with a 1-pixel highlight; preserve the real
  Miro "watching you" expression.
- Smile: one small cheek curve or stepped mouth line on calm/proud poses.
- Paws: small cream blocks; front legs should feel narrow and deer-like.
- Tail: expressive tan sweep/hook; more soft sweep than tight donut curl.
- Collar/tag: optional teal band or tiny tag for UI identity.

The outline should be thick enough to hold up on transparent backgrounds. Use
integer scaling only.

Miro-specific silhouettes to preserve:

- Alert sofa sit: upright chest, slim front legs, one ear tall, one ear soft.
- Side lounge: long tan body, cream belly, paws visible, amused face.
- Couch loaf: relaxed body with head still watchful.
- Nose-forward close-up: big eye, black nose, cream muzzle, asymmetric ear.

## Core Poses

Build these first. Each pose should be a data-driven set of parts, not a separate
bitmap.

### 1. Asleep / Curl Up

Purpose: zero-token governor made visible.

Pose:
- Long loaf body, head resting on front paws.
- Eyes closed as tiny dark horizontal pixels.
- Tail tucked near body.
- One ear relaxed down and the other half-upright, preserving Miro asymmetry.
- Optional tiny `z` is allowed only if it is subtle; prefer body language.

Animation:
- Slow breathing, 6-8 FPS.
- Chest and shoulder move by 1 pixel on breath; optional tag moves only if the
  teal UI tag is enabled.

Use when:
- no signal
- weak screen change
- rate limit cooldown
- user has been idle

### 2. Idle / Present

Purpose: warm presence without asking for attention.

Pose:
- Sitting compact dog with upright cream chest and slim front legs.
- Tail relaxed in a soft sweep behind the body.
- Eyes open but calm.
- One ear upright, the other folded/tilted outward.

Animation:
- Blink every few seconds.
- Tail single-pixel twitch occasionally.
- Slight breathing.

Use when:
- app is ready
- waiting for a meaningful event
- between reactions

### 3. Sniff / Retina

Purpose: show the one vision call.

Pose:
- Head tilted forward, nose extended by 1-2 pixels.
- One front paw lifted.
- Both ears perk briefly, but keep one slightly softer so it still feels like
  Miro.
- Tail stiff but friendly.

Visual effect:
- 2-3 cyan scan pixels near nose or screen-facing side.
- A tiny "sniff" puff can be drawn as two cream/blue pixels.

Animation:
- Nose bob forward/back.
- Scan pixels travel once, then disappear.

Use when:
- Retina call starts
- change detector fires
- screenshot is being interpreted

### 4. Curious / Thinking

Purpose: screen changed, but not alarming.

Pose:
- Seated, head tilted.
- One ear higher than the other.
- Big glossy eyes offset toward the active window.
- Tail pauses mid-sweep.

Visual effect:
- One small thought pixel above head, not a full bubble.

Animation:
- Head tilt toggles every 500-700ms.

Use when:
- `sniff` tier
- low-to-medium signal
- Miro is deciding whether to speak

### 5. Worried / Red Failure

Purpose: Miro noticed a real problem.

Pose:
- Body lowers slightly.
- Ears flatten outward.
- Big eyes become lower/rounder rather than angry; she should look concerned.
- Tail droops from soft sweep to half-lowered.
- Front paws close together.

Visual effect:
- One small warning pulse behind Miro or near collar tag.
- Do not overdo sadness; she should feel concerned, not melodramatic.

Animation:
- Short recoil on event start.
- Subtle tremble only for one beat.

Use when:
- red test
- likely real error
- verifier says evidence is current

### 6. Guard / Risk

Purpose: "barks at the door, does not open it."

Pose:
- Standing sideways, body between user and risky action.
- Ears forward.
- Tail upright and rigid.
- One front paw planted ahead.
- Mouth open as a tiny bark mark.

Visual effect:
- Red-orange shield or exclamation pixel cluster near the speech bubble.

Animation:
- One bark hop, then hold.

Use when:
- risky/destructive command appears
- guard agent says "warn"
- verifier is uncertain and asks first

### 7. Fetch / Point

Purpose: Miro points to context without acting.

Pose:
- Body angled toward target side.
- Nose and eyes point left/right/up depending on target.
- One paw lifted in pointing direction.
- Tail wagging.

Visual effect:
- Tiny arrow-paw marker or highlighted tag glint.

Animation:
- Paw lift + nose point.
- Optional small fetch-card icon appears beside Miro, not in her mouth.

Use when:
- fetch agent identifies likely file/error/context
- Miro suggests a next place to look

### 8. Proud / Green

Purpose: resolution and emotional payoff.

Pose:
- Upright chest.
- Eyes happy arcs or big glossy crescent eyes.
- Tail high wag.
- Front paws bounce.

Visual effect:
- Green/gold sparkles around collar and tail.
- No confetti storm; keep it screen-recording clean.

Animation:
- Two-hop celebration, then settle to idle.

Use when:
- tests go green
- previous carried concern resolves
- demo climax

### 9. Unsure / Trust Check

Purpose: verifier prevents false panic.

Pose:
- One ear up, one ear sideways.
- Head tilt.
- Tail still.
- Mouth closed.

Visual effect:
- Small gray/blue question pixel near collar tag.

Animation:
- Slow blink + head tilt.

Use when:
- stale error detected
- evidence is contradictory
- Miro should ask before warning

### 10. Buffering Baseline Dog

Purpose: side-by-side emotional latency demo.

Pose:
- Same Miro silhouette, but delayed/washed.
- Eyes blank or half-open.
- Tail not moving.

Visual effect:
- Three slow gray dots near head or a low-opacity spinner.

Animation:
- Slow delayed blink.
- No lively scan pixels.

Use when:
- GPU/baseline lane is still waiting
- caption says same dog, one alive, one buffering

## UI Art Elements

### Speech Bubble

The speech bubble is the most screenshotted asset. Keep it compact.

Rules:
- Max 12 words in demo mode.
- Rounded pixel bubble with `bubble` fill and `outline` border.
- Tail points to Miro's mouth/collar area.
- No paragraph text inside the floating pet overlay.

Bubble moods:
- neutral: cream fill
- warning: tiny red corner tab
- success: tiny green corner tab
- unsure: tiny blue/gray corner tab

### Telemetry HUD

Must feel like a collar tag / vet chart, not enterprise analytics.

Include:
- time to reaction
- image tokens
- requests
- tokens/sec
- current swarm tier

Style:
- Small monospaced pixel labels.
- Anchor near Miro or side panel; never cover the dog.
- Use real numbers only.

### Agent Chips

Use small dog-instinct chips:

- Retina: eye/nose icon
- Mood: heart/collar tag
- Nudge: speech bubble
- Verifier: check nose
- Fetch: paw/arrow
- Guard: shield/bark
- Story: tiny mouth

States:
- idle: outlined
- running: scan color pulse
- done: filled cream/green
- uncertain: blue-gray
- warning: red tab

### Side-By-Side Lane

The side-by-side should communicate emotion before metrics.

Left lane:
- Cerebras-Miro, full color, lively motion.

Right lane:
- Baseline-Miro, same dog, reduced saturation while waiting.

Do not create two different mascots. Same dog, different latency.

## Procedural Implementation Notes

Recommended shape:

```ts
type MiroPose =
  | 'asleep'
  | 'idle'
  | 'sniff'
  | 'curious'
  | 'worried'
  | 'guard'
  | 'fetch'
  | 'proud'
  | 'unsure'
  | 'buffering';

type MiroDirection = 'left' | 'right' | 'front';

interface MiroArtState {
  pose: MiroPose;
  direction: MiroDirection;
  attention: number;
  trust: number;
  bond: number;
  frame: number;
  reducedMotion: boolean;
}
```

Drawing strategy:

- Use one root `PIXI.Container`.
- Inside it, separate layers: shadow, body, markings, face, collar, effects,
  bubble anchor.
- Each frame clears and redraws from state, or update positioned sub-containers
  if performance requires it.
- Snap every coordinate to an integer multiple of `pixel`.
- Default `pixel = 6` or `8`; avoid fractional scaling.
- Avoid filters and gradients. Use solid fills and simple alpha only.

Suggested primitives:

```ts
drawPixelRect(x, y, w, h, color)
drawSteppedTail(x, y, direction, pose)
drawEar(x, y, side, pose)
drawMuzzle(x, y, pose)
drawEyes(x, y, pose)
drawCollar(x, y, pose)
drawEffectPixels(pose, frame)
```

## Animation Priority

If time is tight, prioritize in this order:

1. Pose silhouettes: asleep, sniff, worried, proud.
2. Tail and ears.
3. Speech bubble and HUD.
4. Fetch/guard/unsure refinements.
5. Baseline buffering lane.
6. Extra idle flourishes.

The demo can win with four excellent poses. It cannot win with ten muddy ones.

## First-Pass Milestones

### Art P0

- Miro draws procedurally in PixiJS.
- Supports `asleep`, `idle`, `sniff`, `worried`, `proud`.
- Each pose is readable at small size.
- Asymmetric ears, cream mask, glossy eyes, and slim paws make Miro recognizable.
- No external image assets required.

### Art P1

- Add `guard`, `fetch`, `unsure`, `buffering`.
- Add speech bubble moods.
- Add agent chips.
- Add telemetry HUD styling.

### Art P2

- Add side-by-side polish.
- Add tiny collar tag memory glow.
- Add reduced-motion mode.
- Add capture-safe demo layout.

## Demo Art Beats

The final 60-second video should have these visible beats:

1. Miro curled up asleep. No tokens spent.
2. Red test appears. Miro wakes and sniffs.
3. Retina/instinct chips flash fast.
4. Miro worries and points to likely cause.
5. Verifier catches stale/noisy evidence; Miro becomes unsure instead of
   panicking.
6. Green test appears. Miro celebrates.
7. Baseline lane is still buffering while Cerebras-Miro has already reacted.

If a viewer watches muted, they should still understand the story from Miro's
body language.

## Avoid

- Watermarked or copied sprite references.
- Large decorative backgrounds in the transparent overlay.
- Fake hunger/coins/streaks.
- Generic chatbot face in a dog costume.
- Tiny state tells that only work when zoomed in.
- Fully autonomous action animations that imply Miro clicked or edited.
- Overly sad failure states; Miro is helpful, not needy.
