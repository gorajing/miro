import { Application } from 'pixi.js';
import { MiroView, createDefaultMiroState, type MiroPose } from './miroArt';
import './app.css';
import './race.css';

import { startCapture, isCapturing, grabFrame } from './perception/capture';
import { runRetina } from './brain/retina';
import { runSwarm } from './brain/instincts';
import { reduce, initialState } from './state/reducer';
import { providerLabel, type Provider } from './brain/cerebras';
import type { RuntimeState, Tier } from './shared/types';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('Missing #app root');

function laneMarkup(id: Provider): string {
  return `
    <div class="lane panel waiting" id="lane-${id}">
      <div class="lane-head">
        <span class="lane-label" id="label-${id}"></span>
        <span class="tps" id="tps-${id}"></span>
      </div>
      <div class="timer" id="timer-${id}">—</div>
      <div class="stagebox"><div class="bubble" id="bubble-${id}"></div><div id="stage-${id}"></div></div>
    </div>`;
}

appRoot.innerHTML = `
  <div class="race">
    <div class="race-top">
      <p class="eyebrow">Miro — speed in action</p>
      <p class="race-caption">Same dog. Same brain. <span class="accent">One is alive. One is buffering.</span></p>
      <div class="race-controls">
        <button id="share" class="primary">Share screen</button>
        <button id="trigger" disabled>Trigger both</button>
      </div>
      <textarea id="termhint" placeholder="(optional) paste terminal/test output — sent to both lanes"></textarea>
    </div>
    <div class="lanes">${laneMarkup('cerebras')}${laneMarkup('gemini')}</div>
  </div>`;

const pick = <T extends HTMLElement>(sel: string): T => {
  const el = appRoot.querySelector<T>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};

interface Lane {
  provider: Provider;
  miro: MiroView;
  laneEl: HTMLElement;
  bubbleEl: HTMLElement;
  timerEl: HTMLElement;
  tpsEl: HTMLElement;
  state: RuntimeState;
  startedAt: number | null;
}

async function buildLane(provider: Provider): Promise<Lane> {
  const stage = pick<HTMLDivElement>(`#stage-${provider}`);
  pick<HTMLElement>(`#label-${provider}`).textContent = providerLabel(provider);
  const app = new Application();
  await app.init({ width: 440, height: 360, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: window.devicePixelRatio || 1 });
  stage.appendChild(app.canvas);
  const miro = new MiroView(createDefaultMiroState('asleep'), { pixel: 5 });
  miro.x = 150;
  miro.y = 70;
  app.stage.addChild(miro);
  app.ticker.add((t) => miro.tick(t.deltaTime));
  return {
    provider,
    miro,
    laneEl: pick<HTMLElement>(`#lane-${provider}`),
    bubbleEl: pick<HTMLElement>(`#bubble-${provider}`),
    timerEl: pick<HTMLElement>(`#timer-${provider}`),
    tpsEl: pick<HTMLElement>(`#tps-${provider}`),
    state: initialState(),
    startedAt: null,
  };
}

const lanes: Lane[] = [await buildLane('cerebras'), await buildLane('gemini')];

const shareBtn = pick<HTMLButtonElement>('#share');
const triggerBtn = pick<HTMLButtonElement>('#trigger');
const termHint = pick<HTMLTextAreaElement>('#termhint');

function setBubble(lane: Lane, text: string, pose: MiroPose): void {
  lane.bubbleEl.textContent = text;
  lane.bubbleEl.dataset.mood = pose;
  lane.bubbleEl.classList.toggle('show', text.length > 0 && pose !== 'asleep');
}

function laneClass(lane: Lane, name: 'waiting' | 'done' | 'slow' | ''): void {
  lane.laneEl.classList.remove('waiting', 'done', 'slow');
  if (name) lane.laneEl.classList.add(name);
}

const tierForDemo = (t: Tier): Tier => (t === 'none' ? 'sniff' : t);

async function runLane(lane: Lane, frame: string, hint: string): Promise<void> {
  lane.startedAt = performance.now();
  laneClass(lane, 'waiting');
  lane.miro.setState({ pose: 'buffering' });
  setBubble(lane, '…', 'buffering');
  lane.tpsEl.textContent = '';
  try {
    const retina = await runRetina(frame, hint ? { terminalText: hint } : undefined, lane.provider);
    const s = retina.data;
    const tier = tierForDemo(s.recommended_swarm_tier);
    const swarm = await runSwarm(s, tier, lane.provider, lane.state.openConcern);
    const elapsed = performance.now() - (lane.startedAt ?? performance.now());
    lane.startedAt = null;
    lane.state = reduce(lane.state, s, swarm);
    lane.miro.setState({ pose: lane.state.pose, attention: lane.state.meters.attention, trust: lane.state.meters.trust, bond: lane.state.meters.bond });
    setBubble(lane, lane.state.bubble, lane.state.pose);
    lane.timerEl.textContent = `${elapsed.toFixed(0)} ms`;
    lane.tpsEl.textContent = `${Math.max(retina.metrics.tps, swarm.metrics.tps).toFixed(0)} tok/s`;
    laneClass(lane, 'done');
  } catch (err) {
    lane.startedAt = null;
    lane.timerEl.textContent = 'error';
    setBubble(lane, err instanceof Error ? err.message.slice(0, 40) : 'error', 'unsure');
    laneClass(lane, 'slow');
  }
}

// Live timer for lanes still waiting — this is what makes "buffering" visceral.
window.setInterval(() => {
  for (const lane of lanes) {
    if (lane.startedAt === null) continue;
    const ms = performance.now() - lane.startedAt;
    lane.timerEl.textContent = `${ms.toFixed(0)} ms`;
    if (ms > 1200) laneClass(lane, 'slow');
  }
}, 50);

shareBtn.addEventListener('click', async () => {
  try {
    await startCapture();
    shareBtn.disabled = true;
    triggerBtn.disabled = false;
    for (const lane of lanes) { lane.miro.setState({ pose: 'idle' }); laneClass(lane, ''); lane.timerEl.textContent = 'ready'; }
  } catch (err) {
    triggerBtn.textContent = err instanceof Error ? err.message.slice(0, 30) : 'share failed';
  }
});

triggerBtn.addEventListener('click', () => {
  if (!isCapturing()) return;
  const frame = grabFrame();
  const hint = termHint.value.trim();
  // Fire both lanes on the SAME frame at the SAME instant; each updates independently.
  for (const lane of lanes) void runLane(lane, frame, hint);
});
