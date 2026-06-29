import { Application } from 'pixi.js';
import { MiroView, createDefaultMiroState, type MiroPose } from './miroArt';
import './app.css';

import { startCapture, stopCapture, isCapturing, grabFrame, hasChanged } from './perception/capture';
import { runRetina } from './brain/retina';
import { runSwarm } from './brain/instincts';
import { reduce, initialState } from './state/reducer';
import { hydrate, recordReaction, composeGreeting, type MiroMemory } from './state/memory';
import { createHud } from './hud';
import type { SwarmOutput, Tier } from './shared/types';

// Miro LIVE — the real product: screen → Retina (Gemma 4/Cerebras) → instinct
// swarm → state → the pet reacts, with REAL telemetry. (The pose-preview shell
// lives in main.ts/index.html.)

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('Missing #app root');

appRoot.innerHTML = `
  <div class="live">
    <div class="stage-col">
      <p class="eyebrow">Miro — live</p>
      <h1>A tiny dog who already knows what happened.</h1>
      <div class="stagebox"><div id="bubble"></div><div id="stage"></div></div>
      <div class="controls">
        <button id="share" class="primary">Share screen</button>
        <button id="stop" disabled>Stop</button>
        <button id="trigger" disabled>Trigger now</button>
        <button id="auto" disabled>Auto: off</button>
      </div>
      <textarea id="termhint" placeholder="(optional) paste terminal / test output — text-first perception + forces Miro awake on FAIL/Error"></textarea>
    </div>
    <div id="side"></div>
  </div>`;

const pick = <T extends HTMLElement>(sel: string): T => {
  const el = appRoot.querySelector<T>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};
const stageHost = pick<HTMLDivElement>('#stage');
const bubbleEl = pick<HTMLDivElement>('#bubble');
const shareBtn = pick<HTMLButtonElement>('#share');
const stopBtn = pick<HTMLButtonElement>('#stop');
const triggerBtn = pick<HTMLButtonElement>('#trigger');
const autoBtn = pick<HTMLButtonElement>('#auto');
const termHint = pick<HTMLTextAreaElement>('#termhint');
const hud = createHud(pick<HTMLDivElement>('#side'));

const app = new Application();
await app.init({ width: 520, height: 440, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: window.devicePixelRatio || 1 });
stageHost.appendChild(app.canvas);

const miro = new MiroView(createDefaultMiroState('asleep'), { pixel: 4.8 });
miro.x = 120;
miro.y = 38;
app.stage.addChild(miro);
app.ticker.add((t) => miro.tick(t.deltaTime));

const MEM_KEY = 'miro.memory.v1';
const loadMem = (): MiroMemory => hydrate(localStorage.getItem(MEM_KEY));
const saveMem = (m: MiroMemory): void => { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch { /* private mode */ } };

let memory = loadMem();
memory = { ...memory, sessions: memory.sessions + 1, lastSeenISO: new Date().toISOString() };
saveMem(memory);

let state = { ...initialState(), openConcern: memory.openConcern, meters: { ...initialState().meters, bond: memory.bond } };
let running = false;
let autoOn = false;

const TIER_ORDER: Tier[] = ['none', 'sniff', 'alert', 'full_pack'];
const maxTier = (a: Tier, b: Tier): Tier => TIER_ORDER[Math.max(TIER_ORDER.indexOf(a), TIER_ORDER.indexOf(b))];
const floorFromText = (t: string): Tier => (/FAIL|ERROR|✗|Traceback|exit code\s*[1-9]/i.test(t) ? 'sniff' : 'none');

function setBubble(text: string, pose: MiroPose): void {
  bubbleEl.textContent = text; // LLM output → textContent (never innerHTML)
  bubbleEl.dataset.mood = pose;
  bubbleEl.classList.toggle('show', text.length > 0 && pose !== 'asleep');
}

function setBusy(busy: boolean): void {
  triggerBtn.disabled = busy || !isCapturing();
  triggerBtn.textContent = busy ? 'thinking…' : 'Trigger now';
}

async function processReaction(frame: string, hint: string, manual: boolean): Promise<void> {
  const retina = await runRetina(frame, hint ? { terminalText: hint } : undefined);
  const s = retina.data;

  let tier = maxTier(s.recommended_swarm_tier, floorFromText(hint));
  if (manual) tier = maxTier(tier, 'sniff');

  let swarm: SwarmOutput = { results: {}, metrics: { calls: 0, maxTotalTime: 0, tps: 0 } };
  if (tier !== 'none') swarm = await runSwarm(s, tier);

  const prevConcern = state.openConcern;
  state = reduce(state, s, swarm);
  const resolved = prevConcern !== null && state.openConcern === null && s.event_type === 'green_test';
  memory = recordReaction(memory, s.event_type, { resolvedConcern: resolved, concern: state.openConcern });
  saveMem(memory);
  state = { ...state, meters: { ...state.meters, bond: memory.bond } };
  miro.setState({ pose: state.pose, attention: state.meters.attention, trust: state.meters.trust, bond: state.meters.bond });
  setBubble(state.bubble, state.pose);

  hud.update({
    timeToReaction: retina.metrics.totalTime + swarm.metrics.maxTotalTime,
    tps: Math.max(retina.metrics.tps, swarm.metrics.tps),
    imageTokens: retina.metrics.imageTokens || retina.metrics.promptTokens,
    requests: 1 + swarm.metrics.calls,
    tier,
    meters: state.meters,
  });
  hud.log(`${s.event_type} · ${s.app} · ${s.what_changed} (${tier})`);
}

async function react(manual: boolean): Promise<void> {
  if (running) return;
  if (!isCapturing()) { hud.log('share your screen first', true); return; }
  running = true;
  setBusy(true);
  try {
    await processReaction(grabFrame(), termHint.value.trim(), manual);
  } catch (err) {
    hud.log(err instanceof Error ? err.message : String(err), true);
  } finally {
    running = false;
    setBusy(false);
  }
}

// Self-test: run the full loop on a synthetic frame — no screen-share picker needed.
function makeSyntheticFrame(text: string): string {
  const c = document.createElement('canvas');
  c.width = 900; c.height = 560;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '18px ui-monospace, monospace';
  text.split('\n').forEach((ln, i) => {
    ctx.fillStyle = /FAIL|ERROR|assert|✗/i.test(ln) ? '#f25d4a' : '#cdd6e0';
    ctx.fillText(ln.slice(0, 80), 24, 48 + i * 28);
  });
  return c.toDataURL('image/jpeg', 0.85);
}

async function selfReact(terminalText: string): Promise<void> {
  if (running) return;
  running = true;
  triggerBtn.textContent = 'thinking…';
  try {
    await processReaction(makeSyntheticFrame(terminalText), terminalText, true);
  } catch (err) {
    hud.log(err instanceof Error ? err.message : String(err), true);
  } finally {
    running = false;
    triggerBtn.textContent = 'Trigger now';
  }
}

shareBtn.addEventListener('click', async () => {
  try {
    await startCapture();
    shareBtn.disabled = true;
    stopBtn.disabled = false;
    triggerBtn.disabled = false;
    autoBtn.disabled = false;
    miro.setState({ pose: 'idle' });
    setBubble('…', 'idle');
    hud.log('screen shared — Miro is watching.');
    composeGreeting(memory).then((g) => setBubble(g, 'idle')).catch(() => setBubble('watching quietly.', 'idle'));
  } catch (err) {
    hud.log(err instanceof Error ? err.message : String(err), true);
  }
});

stopBtn.addEventListener('click', () => {
  stopCapture();
  autoOn = false;
  autoBtn.textContent = 'Auto: off';
  shareBtn.disabled = false;
  stopBtn.disabled = true;
  triggerBtn.disabled = true;
  autoBtn.disabled = true;
  miro.setState({ pose: 'asleep' });
  setBubble('', 'asleep');
  hud.log('stopped.');
});

triggerBtn.addEventListener('click', () => { void react(true); });

autoBtn.addEventListener('click', () => {
  autoOn = !autoOn;
  autoBtn.textContent = `Auto: ${autoOn ? 'on' : 'off'}`;
});

// Auto watch: only spends tokens when the screen actually changed ("Curl Up").
window.setInterval(() => {
  if (autoOn && isCapturing() && !running && hasChanged()) void react(false);
}, 2000);

hud.log('ready — share a screen to begin.');

// Self-test buttons (visible with ?selftest) — see the event reactions without sharing a screen.
if (new URLSearchParams(location.search).has('selftest')) {
  const controls = pick<HTMLDivElement>('.controls');
  const RED = 'tests/test_auth.py::test_login FAILED\nE   assert 401 == 200\n=== 1 failed, 11 passed ===';
  const GREEN = 'PASS  src/auth.test.ts\nTests: 24 passed, 24 total\nDone in 1.9s.';
  const addSim = (label: string, hint: string): void => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => { void selfReact(hint); });
    controls.appendChild(b);
  };
  addSim('Sim: red test', RED);
  addSim('Sim: tests pass', GREEN);
  hud.log('self-test mode: use the Sim buttons (no screen share needed).');
}
