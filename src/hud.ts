// Telemetry HUD — "vet chart" feel, not enterprise analytics. Real numbers only.
export interface HudData {
  timeToReaction: number; // seconds (felt latency: retina + slowest instinct)
  tps: number;
  imageTokens: number;
  requests: number;
  tier: string;
  meters: { attention: number; trust: number; bond: number };
}

export interface Hud {
  update(d: HudData): void;
  log(message: string, isError?: boolean): void;
}

export function createHud(host: HTMLElement): Hud {
  host.innerHTML = `
    <div class="panel hud">
      <h2>Vitals</h2>
      <dl>
        <dt>time to reaction</dt><dd class="big" id="h-ttr">—</dd>
        <dt>tokens / sec</dt><dd id="h-tps">—</dd>
        <dt>prompt tokens</dt><dd id="h-img">—</dd>
        <dt>requests</dt><dd id="h-req">—</dd>
      </dl>
      <div class="tier">swarm tier: <b id="h-tier">none</b></div>
      <div class="meters">
        <div class="meter"><span>attention</span><div class="bar"><span id="m-att"></span></div></div>
        <div class="meter"><span>trust</span><div class="bar"><span id="m-tru"></span></div></div>
        <div class="meter"><span>bond</span><div class="bar"><span id="m-bon"></span></div></div>
      </div>
      <div class="log" id="h-log"></div>
    </div>`;

  const $ = (id: string): HTMLElement => {
    const el = host.querySelector<HTMLElement>(`#${id}`);
    if (!el) throw new Error(`HUD element #${id} missing`);
    return el;
  };
  const ttr = $('h-ttr'), tps = $('h-tps'), img = $('h-img'), req = $('h-req'), tier = $('h-tier');
  const att = $('m-att'), tru = $('m-tru'), bon = $('m-bon'), logEl = $('h-log');

  return {
    update(d: HudData): void {
      ttr.textContent = `${(d.timeToReaction * 1000).toFixed(0)} ms`;
      tps.textContent = d.tps ? `${d.tps.toFixed(0)}` : '—';
      img.textContent = d.imageTokens ? `${d.imageTokens}` : '—';
      req.textContent = `${d.requests}`;
      tier.textContent = d.tier;
      att.style.width = `${Math.round(d.meters.attention * 100)}%`;
      tru.style.width = `${Math.round(d.meters.trust * 100)}%`;
      bon.style.width = `${Math.round(d.meters.bond * 100)}%`;
    },
    log(message: string, isError = false): void {
      const line = document.createElement('div');
      if (isError) line.className = 'err';
      line.textContent = message;
      logEl.prepend(line);
      while (logEl.childElementCount > 24) logEl.lastElementChild?.remove();
    },
  };
}
