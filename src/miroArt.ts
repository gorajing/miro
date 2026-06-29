import { Container, Graphics } from 'pixi.js';

export type MiroPose =
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

export type MiroDirection = 'left' | 'right' | 'front';

export interface MiroArtState {
  pose: MiroPose;
  direction: MiroDirection;
  attention: number;
  trust: number;
  bond: number;
  frame: number;
  reducedMotion: boolean;
}

interface DrawOptions {
  pixel?: number;
}

export const MIRO_POSES: readonly MiroPose[] = [
  'asleep',
  'idle',
  'sniff',
  'curious',
  'worried',
  'guard',
  'fetch',
  'proud',
  'unsure',
  'buffering',
] as const;

const palette = {
  outline: 0x21170f,
  fur: 0xd99243,
  furLight: 0xefbb6b,
  furShadow: 0x9d5c2b,
  cream: 0xffead1,
  creamShadow: 0xd7bb91,
  eyeGloss: 0x160d09,
  eyeSpark: 0xfff5df,
  blush: 0xe8918d,
  collar: 0x27ad9e,
  tag: 0xf2c75c,
  success: 0x63d66f,
  warning: 0xf15b45,
  scan: 0x6fd6ff,
  bubble: 0xfff8e8,
  softShadow: 0x4d3b2b,
  baselineGray: 0x8d8981,
  baselineLight: 0xbab1a4,
  baselineCream: 0xd8d0c2,
};

const DEFAULT_PIXEL = 4;
const CELL_UNITS = 2;

type CellPainter = (x: number, y: number, w: number, h: number, color: number, alpha?: number) => void;

export function createDefaultMiroState(pose: MiroPose = 'idle'): MiroArtState {
  return {
    pose,
    direction: 'right',
    attention: 0.55,
    trust: 0.8,
    bond: 0.2,
    frame: 0,
    reducedMotion: false,
  };
}

export class MiroView extends Container {
  private readonly drawing = new Graphics();
  private state: MiroArtState;
  private readonly pixel: number;

  constructor(state: MiroArtState = createDefaultMiroState(), options: DrawOptions = {}) {
    super();
    this.state = state;
    this.pixel = options.pixel ?? DEFAULT_PIXEL;
    this.addChild(this.drawing);
    this.redraw();
  }

  setState(next: Partial<MiroArtState>): void {
    this.state = { ...this.state, ...next };
    this.redraw();
  }

  tick(deltaFrames: number): void {
    this.state = { ...this.state, frame: this.state.frame + deltaFrames };
    this.redraw();
  }

  redraw(): void {
    drawMiro(this.drawing, this.state, { pixel: this.pixel });
  }
}

export function drawMiro(graphics: Graphics, state: MiroArtState, options: DrawOptions = {}): void {
  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const frame = state.reducedMotion ? 0 : state.frame;
  const pose = state.pose;

  const c: CellPainter = (x, y, w, h, color, alpha = 1) => {
    graphics
      .rect(x * CELL_UNITS * pixel, y * CELL_UNITS * pixel, w * CELL_UNITS * pixel, h * CELL_UNITS * pixel)
      .fill({ color, alpha });
  };

  graphics.clear();

  if (pose === 'asleep') {
    drawAsleep(c, frame);
    return;
  }

  if (pose === 'guard' || pose === 'fetch') {
    drawSidePose(c, pose, frame);
    return;
  }

  drawSittingPose(c, pose, frame);
}

function drawSittingPose(c: CellPainter, pose: MiroPose, frame: number): void {
  const isBuffering = pose === 'buffering';
  const fur = isBuffering ? palette.baselineGray : palette.fur;
  const furLight = isBuffering ? palette.baselineLight : palette.furLight;
  const cream = isBuffering ? palette.baselineCream : palette.cream;
  const breath = pose === 'idle' ? Math.round(Math.sin(frame / 24)) : 0;
  const hop = pose === 'proud' ? -Math.max(0, Math.round(Math.sin(frame / 5))) : 0;
  const tremble = pose === 'worried' ? Math.round(Math.sin(frame / 2)) : 0;
  const headTilt = pose === 'curious' || pose === 'unsure' ? Math.round(Math.sin(frame / 20)) : 0;
  const noseReach = pose === 'sniff' ? 2 + (Math.floor(frame / 8) % 2) : 0;
  const earDrop = pose === 'worried' ? 2 : pose === 'unsure' ? 1 : 0;
  const tailWag = pose === 'proud' || pose === 'curious' ? Math.round(Math.sin(frame / 4)) : 0;
  const x = 4 + tremble;
  const y = 1 + breath + hop;

  drawShadow(c, x + 8, y + 34, 22);
  drawSittingTail(c, x, y, fur, furLight, tailWag, pose === 'worried');
  drawSittingBody(c, x, y, fur, furLight, cream);
  drawSittingHead(c, x, y + headTilt, fur, furLight, cream, noseReach);
  drawSittingEars(c, x, y + headTilt, fur, furLight, earDrop, pose === 'sniff', isBuffering);
  drawSittingEyes(c, x, y + headTilt, pose, frame);

  if (pose === 'sniff') {
    drawSniffEffects(c, x, y, frame);
  }
  if (pose === 'worried') {
    drawWarningEffects(c, x, y, frame);
  }
  if (pose === 'proud') {
    drawSuccessEffects(c, x, y, frame);
  }
  if (pose === 'unsure') {
    drawUnsureEffects(c, x, y, frame);
  }
  if (isBuffering) {
    drawBufferingEffects(c, x, y, frame);
  }
}

function drawSittingBody(c: CellPainter, x: number, y: number, fur: number, furLight: number, cream: number): void {
  c(x + 11, y + 18, 15, 14, palette.outline);
  c(x + 12, y + 17, 12, 14, fur);
  c(x + 13, y + 18, 9, 2, furLight);
  c(x + 13, y + 24, 7, 7, cream);
  c(x + 20, y + 20, 5, 11, fur);
  c(x + 10, y + 30, 6, 5, palette.outline);
  c(x + 11, y + 30, 4, 5, cream);
  c(x + 21, y + 30, 6, 5, palette.outline);
  c(x + 22, y + 30, 4, 5, cream);
  c(x + 15, y + 31, 1, 1, palette.creamShadow);
  c(x + 25, y + 31, 1, 1, palette.creamShadow);
  c(x + 12, y + 20, 1, 3, palette.collar);
  c(x + 13, y + 22, 1, 1, palette.tag);
}

function drawSittingTail(c: CellPainter, x: number, y: number, fur: number, furLight: number, tailWag: number, tucked: boolean): void {
  if (tucked) {
    c(x + 25, y + 27, 6, 3, palette.outline);
    c(x + 26, y + 27, 4, 2, fur);
    return;
  }

  c(x + 25, y + 20 - tailWag, 6, 5, palette.outline);
  c(x + 30, y + 16 - tailWag, 4, 9, palette.outline);
  c(x + 26, y + 21 - tailWag, 5, 3, fur);
  c(x + 30, y + 18 - tailWag, 2, 6, furLight);
  c(x + 32, y + 17 - tailWag, 1, 2, palette.cream);
}

function drawSittingHead(c: CellPainter, x: number, y: number, fur: number, furLight: number, cream: number, noseReach: number): void {
  c(x + 7, y + 8, 18, 13, palette.outline);
  c(x + 8, y + 9, 16, 11, furLight);
  c(x + 12, y + 8, 6, 12, cream);
  c(x + 7, y + 15, 17, 6, cream);
  c(x + 6 - noseReach, y + 16, 17 + noseReach, 6, palette.outline);
  c(x + 7 - noseReach, y + 17, 15 + noseReach, 4, cream);
  c(x + 4 - noseReach, y + 17, 4, 4, palette.outline);
  c(x + 5 - noseReach, y + 18, 2, 2, palette.eyeGloss);
  c(x + 11, y + 21, 7, 1, palette.outline);
  c(x + 20, y + 16, 2, 1, palette.blush);
  c(x + 8, y + 10, 3, 2, fur);
}

function drawSittingEars(
  c: CellPainter,
  x: number,
  y: number,
  fur: number,
  furLight: number,
  earDrop: number,
  sniffing: boolean,
  muted: boolean,
): void {
  const innerAlpha = muted ? 0.35 : 1;
  c(x + 8, y + 7 + earDrop, 5, 3, palette.outline);
  c(x + 9, y + 4 + earDrop, 4, 3, palette.outline);
  c(x + 10, y + 1 + earDrop, 3, 3, palette.outline);
  c(x + 11, y, 2, 2, palette.outline);
  c(x + 9, y + 7 + earDrop, 3, 2, fur);
  c(x + 10, y + 4 + earDrop, 2, 3, fur);
  c(x + 11, y + 2 + earDrop, 1, 3, furLight);
  c(x + 11, y + 6 + earDrop, 1, 3, palette.blush, innerAlpha);

  const lift = sniffing ? -2 : 0;
  c(x + 19, y + 9 + lift + earDrop, 7, 3, palette.outline);
  c(x + 21, y + 11 + lift + earDrop, 5, 3, palette.outline);
  c(x + 24, y + 13 + lift + earDrop, 2, 4, palette.outline);
  c(x + 20, y + 10 + lift + earDrop, 5, 1, palette.furShadow);
  c(x + 22, y + 12 + lift + earDrop, 3, 2, palette.furShadow);
  c(x + 24, y + 13 + lift + earDrop, 1, 3, palette.blush, innerAlpha);
}

function drawSittingEyes(c: CellPainter, x: number, y: number, pose: MiroPose, frame: number): void {
  if (pose === 'proud') {
    c(x + 10, y + 14, 3, 1, palette.outline);
    c(x + 18, y + 14, 3, 1, palette.outline);
    return;
  }

  const blink = Math.floor(frame / 90) % 9 === 0;
  if (blink) {
    c(x + 10, y + 14, 3, 1, palette.outline);
    c(x + 18, y + 14, 3, 1, palette.outline);
    return;
  }

  if (pose === 'worried') {
    c(x + 9, y + 12, 5, 1, palette.outline);
    c(x + 18, y + 12, 5, 1, palette.outline);
  }

  c(x + 9, y + 13, 4, 4, palette.eyeGloss);
  c(x + 18, y + 13, 4, 4, palette.eyeGloss);
  c(x + 11, y + 14, 1, 1, palette.eyeSpark);
  c(x + 19, y + 14, 1, 1, palette.eyeSpark);
}

function drawAsleep(c: CellPainter, frame: number): void {
  const breath = Math.round(Math.sin(frame / 28));
  const x = 3;
  const y = 14 + breath;

  drawShadow(c, x + 5, y + 19, 25);
  c(x + 7, y + 7, 25, 12, palette.outline);
  c(x + 5, y + 11, 30, 9, palette.outline);
  c(x + 8, y + 8, 23, 10, palette.fur);
  c(x + 9, y + 14, 18, 5, palette.cream);
  c(x + 28, y + 9, 5, 6, palette.furShadow);
  c(x + 30, y + 14, 4, 4, palette.cream);

  c(x + 4, y + 4, 15, 11, palette.outline);
  c(x + 6, y + 5, 12, 9, palette.furLight);
  c(x + 5, y + 10, 13, 5, palette.cream);
  c(x + 3, y + 11, 4, 4, palette.outline);
  c(x + 4, y + 12, 2, 2, palette.eyeGloss);
  c(x + 10, y + 13, 5, 1, palette.outline);
  c(x + 8, y + 2, 4, 3, palette.outline);
  c(x + 9, y, 3, 3, palette.outline);
  c(x + 9, y + 3, 2, 4, palette.fur);
  c(x + 17, y + 4, 7, 3, palette.outline);
  c(x + 20, y + 6, 3, 4, palette.outline);
  c(x + 18, y + 5, 4, 2, palette.furShadow);

  if (Math.sin(frame / 34) > 0.35) {
    c(x + 27, y + 1, 1, 1, palette.creamShadow, 0.85);
    c(x + 30, y - 1, 1, 1, palette.creamShadow, 0.65);
  }
}

function drawSidePose(c: CellPainter, pose: 'guard' | 'fetch', frame: number): void {
  const lift = pose === 'fetch' ? Math.round(Math.sin(frame / 5)) : 0;
  const bark = pose === 'guard' ? Math.round(Math.sin(frame / 4)) : 0;
  const x = 3;
  const y = 7 + lift;
  const tailHigh = pose === 'guard';

  drawShadow(c, x + 6, y + 28, 27);
  c(x + 8, y + 15, 25, 12, palette.outline);
  c(x + 9, y + 14, 22, 12, palette.fur);
  c(x + 9, y + 21, 9, 5, palette.cream);
  c(x + 18, y + 26, 5, 6, palette.outline);
  c(x + 19, y + 26, 3, 5, palette.cream);
  c(x + 29, y + 26, 5, 6, palette.outline);
  c(x + 30, y + 26, 3, 5, palette.cream);

  c(x + 31, y + 14 - (tailHigh ? 3 : 0), 8, 4, palette.outline);
  c(x + 37, y + 10 - (tailHigh ? 3 : 0), 4, 8, palette.outline);
  c(x + 32, y + 15 - (tailHigh ? 3 : 0), 6, 2, palette.furLight);
  c(x + 38, y + 12 - (tailHigh ? 3 : 0), 2, 5, palette.fur);

  c(x + 2, y + 7, 16, 12, palette.outline);
  c(x + 4, y + 8, 13, 10, palette.furLight);
  c(x + 3, y + 13, 13, 6, palette.cream);
  c(x, y + 14, 4, 4, palette.outline);
  c(x + 1, y + 15, 2, 2, palette.eyeGloss);
  c(x + 11, y + 10, 3, 4, palette.eyeGloss);
  c(x + 12, y + 11, 1, 1, palette.eyeSpark);
  c(x + 7, y + 18, 6, 1, palette.outline);
  c(x + 12, y + 8, 4, 8, palette.cream);

  c(x + 4, y + 6, 5, 3, palette.outline);
  c(x + 5, y + 3, 4, 3, palette.outline);
  c(x + 6, y, 3, 3, palette.outline);
  c(x + 6, y + 4, 2, 5, palette.fur);
  c(x + 15, y + 8, 7, 3, palette.outline);
  c(x + 18, y + 10, 4, 5, palette.outline);
  c(x + 16, y + 9, 4, 2, palette.furShadow);
  c(x + 19, y + 11, 1, 3, palette.blush);

  if (pose === 'guard') {
    c(x - 2, y + 13 - bark, 2, 2, palette.warning);
    c(x - 5, y + 11 - bark, 1, 1, palette.warning, 0.85);
    c(x + 27, y + 6, 5, 8, palette.outline);
    c(x + 28, y + 7, 3, 6, palette.warning);
    c(x + 29, y + 8, 1, 2, palette.bubble);
  } else {
    c(x - 1, y + 18, 6, 2, palette.outline);
    c(x - 1, y + 19, 4, 1, palette.cream);
    c(x + 30, y + 9, 7, 5, palette.outline);
    c(x + 31, y + 10, 5, 3, palette.bubble);
    c(x + 35, y + 12, 2, 1, palette.outline);
    c(x + 33, y + 11, 3, 1, palette.scan);
  }
}

function drawShadow(c: CellPainter, x: number, y: number, width: number): void {
  c(x, y, width, 2, palette.softShadow, 0.3);
  c(x + 3, y + 1, width - 6, 1, palette.softShadow, 0.24);
}

function drawSniffEffects(c: CellPainter, x: number, y: number, frame: number): void {
  const pulse = Math.floor(frame / 7) % 3;
  c(x + 1 - pulse * 2, y + 18, 1, 1, palette.scan);
  c(x - 2 - pulse * 2, y + 16, 1, 1, palette.scan, 0.75);
  c(x - 5 - pulse * 2, y + 19, 1, 1, palette.cream, 0.6);
}

function drawWarningEffects(c: CellPainter, x: number, y: number, frame: number): void {
  const alpha = 0.5 + Math.abs(Math.sin(frame / 8)) * 0.35;
  c(x + 7, y + 25, 23, 2, palette.warning, alpha);
  c(x + 29, y + 9, 2, 6, palette.warning, alpha);
  c(x + 29, y + 17, 2, 2, palette.warning, alpha);
}

function drawSuccessEffects(c: CellPainter, x: number, y: number, frame: number): void {
  const bob = Math.round(Math.sin(frame / 4));
  c(x + 4, y + 5 + bob, 1, 1, palette.success);
  c(x + 31, y + 14 - bob, 1, 1, palette.success);
  c(x + 29, y + 21 + bob, 1, 1, palette.tag);
  c(x + 6, y + 7 + bob, 1, 1, palette.tag);
}

function drawUnsureEffects(c: CellPainter, x: number, y: number, frame: number): void {
  const pulse = Math.floor(frame / 18) % 2;
  c(x + 27, y + 9, 2, 2, palette.scan, pulse ? 0.45 : 0.8);
  c(x + 30, y + 7, 1, 1, palette.creamShadow, 0.8);
}

function drawBufferingEffects(c: CellPainter, x: number, y: number, frame: number): void {
  const dot = Math.floor(frame / 18) % 3;
  for (let i = 0; i < 3; i += 1) {
    c(x + 27 + i * 2, y + 7, 1, 1, i <= dot ? palette.creamShadow : palette.baselineGray, 0.8);
  }
}
