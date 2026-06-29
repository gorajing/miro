import { Application } from 'pixi.js';
import { MiroView, createDefaultMiroState, type MiroPose, type MiroDirection } from './miroArt';
import { startCapture, startBuffering, isCapturing, grabSequence, hasChanged } from './perception/capture';
import { runRetina } from './brain/retina';
import { runSwarm } from './brain/instincts';
import { reduce, initialState } from './state/reducer';
import { hydrate, recordReaction, composeGreeting } from './state/memory';
import type { SwarmOutput } from './shared/types';

// Miro the desktop overlay: a pet that lives over your real screens, watches, and
// moves to the action (or perches on a calm spot) — clicks pass through except over him.

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

// target = a screen POINT the pet wants to be near (feet at the point, centered on x).
let target = { x: window.innerWidth * 0.88, y: window.innerHeight * 0.10 };
miro.x = target.x - PET_W / 2;
miro.y = target.y - PET_H;

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

let bubbleTimer = 0;
function setBubble(text: string, pose: MiroPose): void {
  bubbleEl.textContent = text;
  bubbleEl.dataset.mood = pose;
  const show = text.length > 0 && pose !== 'asleep';
  bubbleEl.classList.toggle('show', show);
  if (bubbleTimer) window.clearTimeout(bubbleTimer);
  if (show) bubbleTimer = window.setTimeout(() => bubbleEl.classList.remove('show'), 5000); // transient, not a label
}

// Drift toward the target, keep the bubble above Miro's head, face the travel direction.
const WALK_SPEED = 2.2; // px/frame — a slow, deliberate amble (no teleporting)
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
app.ticker.add((t) => {
  miro.tick(t.deltaTime);

  // Use her REAL rendered bounds (sprite size/offset) so clamping is exact.
  const b = miro.getLocalBounds();
  const minX = -b.x;
  const maxX = window.innerWidth - b.x - b.width;
  const minY = -b.y;
  const maxY = window.innerHeight - b.y - b.height;

  if (!dragging) {
    // Desired top-left so her visual center sits on target.x and her feet on target.y.
    const desiredX = clamp(target.x - b.width / 2 - b.x, minX, maxX);
    const desiredY = clamp(target.y - b.height - b.y, minY, maxY);
    const dx = desiredX - miro.x;
    const dy = desiredY - miro.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1.5) {
      const step = Math.min(dist, WALK_SPEED * t.deltaTime);
      miro.x += (dx / dist) * step;
      miro.y += (dy / dist) * step;
      const want: MiroDirection = dx > 4 ? 'right' : dx < -4 ? 'left' : facing;
      if (want !== facing) { facing = want; miro.setState({ direction: facing }); }
    }
  }

  // Always keep her whole body on-screen (covers drag, resize, pose changes).
  miro.x = clamp(miro.x, minX, maxX);
  miro.y = clamp(miro.y, minY, maxY);

  // Cache her true screen rect for hit-testing + bubble placement.
  petLeft = miro.x + b.x;
  petTop = miro.y + b.y;
  petW = b.width;
  petH = b.height;

  // Speech bubble: measured popover — centered over her, clamped horizontally,
  // and flipped BELOW her when there's no room above. Always fully on-screen.
  const bw = bubbleEl.offsetWidth || 120;
  const bh = bubbleEl.offsetHeight || 32;
  const bx = clamp(petLeft + petW / 2 - bw / 2, 6, window.innerWidth - bw - 6);
  let by = petTop - bh - 8;
  if (by < 6) by = petTop + petH + 8; // no room above → drop it below her
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

    facing = s.focus_point.x < 0.4 ? 'left' : s.focus_point.x > 0.6 ? 'right' : 'front';
    miro.setState({ pose: state.pose, direction: facing, attention: state.meters.attention, trust: state.meters.trust, bond: memory.bond });
    setBubble(state.bubble, state.pose);

    // Trot toward what just happened; otherwise drift to a calm perch.
    const pt = s.event_type !== 'normal' ? s.focus_point : s.rest_point;
    target = { x: pt.x * window.innerWidth, y: pt.y * window.innerHeight };
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
  target = { x: petLeft + petW / 2, y: petTop + petH }; // rest where she was dropped
});

// Start watching immediately (Electron auto-grants; no picker).
(async () => {
  try {
    await startCapture();
    startBuffering();
    miro.setState({ pose: 'idle' });
    composeGreeting(memory).then((g) => setBubble(g, 'idle')).catch(() => setBubble('keeping an eye on things.', 'idle'));
  } catch {
    setBubble('let me watch your screen…', 'idle');
  }
})();
