import { Application } from 'pixi.js';
import { MiroView, createDefaultMiroState, type MiroPose, type MiroDirection } from './miroArt';
import { startCapture, startBuffering, isCapturing, grabSequence, hasChanged } from './perception/capture';
import { runRetina } from './brain/retina';
import { runSwarm } from './brain/instincts';
import { reduce, initialState } from './state/reducer';
import { hydrate, recordReaction, composeGreeting } from './state/memory';
import type { EventType, Situation, SwarmOutput } from './shared/types';

// Miro the desktop overlay: a pet that lives over your real screens, watches, and
// moves with INTENT — she notices, orients, walks over, acts, then settles.
// Clicks pass through except over her body.

declare global {
  interface Window {
    miroOverlay?: { isOverlay: boolean; getSourceId: () => Promise<string>; setInteractive: (v: boolean) => void };
  }
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('no #app');

const style = document.createElement('style');
style.textContent = `
  #ov-stage { position: fixed; inset: 0; }
  .ov-bubble {
    position: fixed; max-width: 260px; padding: 6px 10px;
    background: #fff8e8; color: #2c2118; border: 3px solid #2c2118; border-radius: 10px;
    font: 700 13px ui-monospace, monospace; opacity: 0; transition: opacity .15s ease;
    pointer-events: none;
  }
  .ov-bubble.show { opacity: 1; }
  .ov-bubble[data-mood="worried"], .ov-bubble[data-mood="guard"] { box-shadow: inset 0 0 0 2px #f25d4a; }
  .ov-bubble[data-mood="proud"] { box-shadow: inset 0 0 0 2px #61d66f; }
`;
document.head.appendChild(style);
const bubbleEl = document.createElement('div');
bubbleEl.className = 'ov-bubble';
root.appendChild(bubbleEl);

const app = new Application();
await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: window.devicePixelRatio || 1 });
app.canvas.id = 'ov-stage';
document.body.appendChild(app.canvas);

const PIXEL = 2.5;
const PET_W = 65;
const PET_H = 75;
const miro = new MiroView(createDefaultMiroState('asleep'), { pixel: PIXEL });
app.stage.addChild(miro);
miro.x = window.innerWidth * 0.88 - PET_W / 2; // start perched, top-right
miro.y = window.innerHeight * 0.10 - PET_H;

const MEM_KEY = 'miro.memory.v1';
let memory = hydrate(localStorage.getItem(MEM_KEY));
memory = { ...memory, sessions: memory.sessions + 1, lastSeenISO: new Date().toISOString() };
localStorage.setItem(MEM_KEY, JSON.stringify(memory));
let state = { ...initialState(), openConcern: memory.openConcern, meters: { ...initialState().meters, bond: memory.bond } };
let running = false;
let facing: MiroDirection = 'front';
let dragging = false;
let dragOffX = 0;
let dragOffY = 0;
// Miro's real on-screen rect (from getLocalBounds), refreshed each frame.
let petLeft = miro.x;
let petTop = miro.y;
let petW = PET_W;
let petH = PET_H;

// ---- Intent: movement serves a committed goal, not a re-sampled coordinate ----
type IntentKind = 'rest' | 'investigate' | 'guard' | 'point' | 'celebrate';
type Phase = 'orient' | 'travel' | 'dwell';
interface Intent {
  kind: IntentKind;
  goal: { x: number; y: number }; // normalized 0..1
  noticePose: MiroPose; // while orienting + travelling (alert)
  arrivePose: MiroPose; // emotion shown on arrival
  bubble: string; // spoken on arrival ('' = silent)
  priority: number; // higher preempts a weaker committed intent
  startedAt: number; // performance.now()
  ttlMs: number; // commit this long before yielding back to rest
}

const KIND: Record<EventType, IntentKind> = { risky_command: 'guard', red_test: 'investigate', green_test: 'celebrate', stale_error: 'point', unknown: 'point', normal: 'rest' };
const NOTICE: Record<EventType, MiroPose> = { red_test: 'sniff', risky_command: 'curious', green_test: 'curious', stale_error: 'curious', unknown: 'curious', normal: 'idle' };
const PRIORITY: Record<EventType, number> = { risky_command: 4, red_test: 3, green_test: 3, stale_error: 2, unknown: 2, normal: 1 };
const TTL: Record<EventType, number> = { risky_command: 9000, red_test: 11000, green_test: 6000, stale_error: 6000, unknown: 5000, normal: 4000 };

function restIntent(g: { x: number; y: number }, ttlMs = 5000): Intent {
  return { kind: 'rest', goal: g, noticePose: 'idle', arrivePose: 'idle', bubble: '', priority: 1, startedAt: performance.now(), ttlMs };
}
function buildIntent(s: Situation, pose: MiroPose, bubble: string): Intent {
  return {
    kind: KIND[s.event_type],
    goal: s.event_type === 'normal' ? s.rest_point : s.focus_point,
    noticePose: NOTICE[s.event_type],
    arrivePose: pose,
    bubble: s.event_type === 'normal' ? '' : bubble,
    priority: PRIORITY[s.event_type],
    startedAt: performance.now(),
    ttlMs: TTL[s.event_type],
  };
}

let intent: Intent = restIntent({ x: 0.88, y: 0.1 });
let phase: Phase = 'dwell';
let phaseStart = performance.now();
let lastRest = { x: 0.88, y: 0.1 };

/** Adopt a new intent only if it preempts the committed one (priority) or that one expired. */
function adopt(c: Intent): void {
  const now = performance.now();
  const expired = now - intent.startedAt > intent.ttlMs;
  if (c.priority > intent.priority || expired) {
    intent = c;
    phase = 'orient';
    phaseStart = now;
  } else if (c.kind === intent.kind) {
    intent = { ...intent, goal: c.goal, bubble: c.bubble, startedAt: now }; // same goal continuing — refresh, no re-orient
  }
  // else: weaker + different while committed → ignore (this is the anti-twitch hysteresis)
}

let lastPose: MiroPose = 'asleep';
function setPose(p: MiroPose): void {
  if (p !== lastPose) { lastPose = p; miro.setState({ pose: p }); } // change-only, so animation never freezes
}

let bubbleTimer = 0;
function setBubble(text: string, pose: MiroPose): void {
  bubbleEl.textContent = text;
  bubbleEl.dataset.mood = pose;
  const show = text.length > 0 && pose !== 'asleep';
  bubbleEl.classList.toggle('show', show);
  if (bubbleTimer) window.clearTimeout(bubbleTimer);
  if (show) bubbleTimer = window.setTimeout(() => bubbleEl.classList.remove('show'), 5000); // transient, not a label
}

const WALK_SPEED = 2.2; // px/frame cruise — a slow, deliberate amble
const DECEL = 70; // px from goal where she starts easing to a stop
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

app.ticker.add((t) => {
  miro.tick(t.deltaTime);

  // Real rendered bounds → exact clamping + hit/bubble geometry.
  const b = miro.getLocalBounds();
  const minX = -b.x;
  const maxX = window.innerWidth - b.x - b.width;
  const minY = -b.y;
  const maxY = window.innerHeight - b.y - b.height;
  const centerX = miro.x + b.x + b.width / 2;

  if (!dragging) {
    const now = performance.now();
    const goalX = intent.goal.x * window.innerWidth;
    const desiredX = clamp(goalX - b.width / 2 - b.x, minX, maxX);
    const desiredY = clamp(intent.goal.y * window.innerHeight - b.height - b.y, minY, maxY);

    if (phase === 'orient') {
      // Turn toward the goal and hold the "noticing" pose for a beat, then set off.
      const want: MiroDirection = goalX > centerX + 6 ? 'right' : goalX < centerX - 6 ? 'left' : facing;
      if (want !== facing) { facing = want; miro.setState({ direction: facing }); }
      setPose(intent.noticePose);
      if (now - phaseStart > 450) { phase = 'travel'; phaseStart = now; }
    } else if (phase === 'travel') {
      const dx = desiredX - miro.x;
      const dy = desiredY - miro.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const speed = dist < DECEL ? Math.max(0.5, WALK_SPEED * (dist / DECEL)) : WALK_SPEED; // ease to a stop
        const step = Math.min(dist, speed * t.deltaTime);
        miro.x += (dx / dist) * step;
        miro.y += (dy / dist) * step;
        const want: MiroDirection = dx > 4 ? 'right' : dx < -4 ? 'left' : facing;
        if (want !== facing) { facing = want; miro.setState({ direction: facing }); }
      } else {
        phase = 'dwell';
        phaseStart = now;
        setPose(intent.arrivePose);
        if (intent.bubble) setBubble(intent.bubble, intent.arrivePose);
      }
    } else if (intent.kind !== 'rest' && now - intent.startedAt > intent.ttlMs) {
      // Done attending — amble back to a calm perch.
      intent = restIntent(lastRest);
      phase = 'orient';
      phaseStart = now;
    }
  }

  // Keep her whole body on-screen (drag, resize, pose changes).
  miro.x = clamp(miro.x, minX, maxX);
  miro.y = clamp(miro.y, minY, maxY);

  petLeft = miro.x + b.x;
  petTop = miro.y + b.y;
  petW = b.width;
  petH = b.height;

  // Bubble: measured popover — centered, clamped, flips below when no room above.
  const bw = bubbleEl.offsetWidth || 120;
  const bh = bubbleEl.offsetHeight || 32;
  const bx = clamp(petLeft + petW / 2 - bw / 2, 6, window.innerWidth - bw - 6);
  let by = petTop - bh - 8;
  if (by < 6) by = petTop + petH + 8;
  by = clamp(by, 6, window.innerHeight - bh - 6);
  bubbleEl.style.left = `${bx}px`;
  bubbleEl.style.top = `${by}px`;
});

async function react(): Promise<void> {
  if (running || !isCapturing()) return;
  running = true;
  try {
    const frames = grabSequence(3);
    const retina = await runRetina(frames, undefined, 'cerebras');
    const s = retina.data;

    let swarm: SwarmOutput = { results: {}, metrics: { calls: 0, maxTotalTime: 0, tps: 0 } };
    if (s.recommended_swarm_tier !== 'none') swarm = await runSwarm(s, s.recommended_swarm_tier, 'cerebras', state.openConcern);

    const prevConcern = state.openConcern;
    state = reduce(state, s, swarm);
    const resolved = prevConcern !== null && state.openConcern === null && s.event_type === 'green_test';
    memory = recordReaction(memory, s.event_type, { resolvedConcern: resolved, concern: state.openConcern });
    localStorage.setItem(MEM_KEY, JSON.stringify(memory));

    miro.setState({ attention: state.meters.attention, trust: state.meters.trust, bond: memory.bond });
    lastRest = s.rest_point;
    adopt(buildIntent(s, state.pose, state.bubble)); // movement, pose + bubble now flow through the intent machine
  } catch {
    /* stay calm on a hiccup */
  } finally {
    running = false;
  }
}

// Ambient watch: only spends tokens when the screen meaningfully changed (Curl Up).
window.setInterval(() => { if (!running && isCapturing() && hasChanged()) void react(); }, 2500);

// Click-through everywhere except over Miro's body. Grab + drag her to reposition her.
let interactive = false;
const overPet = (x: number, y: number): boolean => x >= petLeft && x <= petLeft + petW && y >= petTop && y <= petTop + petH;

window.addEventListener('mousedown', (e) => {
  if (overPet(e.clientX, e.clientY)) {
    dragging = true;
    dragOffX = e.clientX - miro.x;
    dragOffY = e.clientY - miro.y;
  }
});

window.addEventListener('mousemove', (e) => {
  if (dragging) {
    miro.x = e.clientX - dragOffX;
    miro.y = e.clientY - dragOffY;
    return; // stay interactive for the whole drag
  }
  const over = overPet(e.clientX, e.clientY);
  if (over !== interactive) {
    interactive = over;
    window.miroOverlay?.setInteractive(over);
  }
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  // Settle where she was dropped, and stay put until a real event calls her.
  const g = { x: (petLeft + petW / 2) / window.innerWidth, y: (petTop + petH) / window.innerHeight };
  lastRest = g;
  intent = restIntent(g, 600000);
  phase = 'dwell';
});

// Start watching immediately (Electron auto-grants; no picker).
(async () => {
  try {
    await startCapture();
    startBuffering();
    setPose('idle');
    composeGreeting(memory).then((g) => setBubble(g, 'idle')).catch(() => setBubble('keeping an eye on things.', 'idle'));
  } catch {
    setBubble('let me watch your screen…', 'idle');
  }
})();
