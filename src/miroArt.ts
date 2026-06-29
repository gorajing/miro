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
  paper: 0xfff8e8,
  shadow: 0x4d3b2b,
  mutedFur: 0x8d8981,
  mutedLight: 0xbab1a4,
  mutedCream: 0xd8d0c2,
};

const DEFAULT_PIXEL = 4;
const CELL_UNITS = 2;

type CellPainter = (x: number, y: number, w: number, h: number, color: number) => void;

interface MiroColors {
  fur: number;
  light: number;
  cream: number;
  shadow: number;
}

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
  const cell: CellPainter = (x, y, w, h, color) => {
    graphics
      .rect(x * CELL_UNITS * pixel, y * CELL_UNITS * pixel, w * CELL_UNITS * pixel, h * CELL_UNITS * pixel)
      .fill({ color });
  };

  graphics.clear();

  if (state.pose === 'asleep') {
    drawSleepSprite(cell, frame);
    return;
  }

  if (state.pose === 'guard' || state.pose === 'fetch') {
    drawSideSprite(cell, state.pose, frame);
    return;
  }

  drawSitSprite(cell, state.pose, frame);
}

function colorsForPose(pose: MiroPose): MiroColors {
  if (pose === 'buffering') {
    return {
      fur: palette.mutedFur,
      light: palette.mutedLight,
      cream: palette.mutedCream,
      shadow: 0x6f6a62,
    };
  }

  return {
    fur: palette.fur,
    light: palette.furLight,
    cream: palette.cream,
    shadow: palette.furShadow,
  };
}

function drawSitSprite(c: CellPainter, pose: MiroPose, frame: number): void {
  const colors = colorsForPose(pose);
  const tick = Math.floor(frame / 12);
  const breath = pose === 'idle' ? tick % 16 >= 8 ? 1 : 0 : 0;
  const hop = pose === 'proud' && tick % 2 === 0 ? -1 : 0;
  const shake = pose === 'worried' && tick % 2 === 0 ? -1 : 0;
  const tilt = pose === 'curious' || pose === 'unsure' ? tick % 4 < 2 ? -1 : 0 : 0;
  const baseX = 2 + shake;
  const baseY = 0 + breath + hop;

  drawSitShadow(c, baseX + 8, baseY + 34);
  drawSitTail(c, baseX, baseY, colors, pose, tick);
  drawSitBody(c, baseX, baseY, colors);
  drawSitHead(c, baseX, baseY + tilt, colors, pose, tick);
  drawSitEars(c, baseX, baseY + tilt, colors, pose, tick);
  drawSitFace(c, baseX, baseY + tilt, colors, pose, tick);
  drawSitPoseEffects(c, baseX, baseY, pose, tick);
}

function drawSitBody(c: CellPainter, x: number, y: number, colors: MiroColors): void {
  c(x + 12, y + 23, 15, 10, palette.outline);
  c(x + 13, y + 22, 12, 10, colors.fur);
  c(x + 14, y + 23, 8, 2, colors.light);
  c(x + 14, y + 26, 7, 5, colors.cream);
  c(x + 21, y + 24, 5, 8, colors.fur);
  c(x + 23, y + 25, 3, 5, colors.shadow);

  c(x + 9, y + 30, 8, 4, palette.outline);
  c(x + 10, y + 30, 6, 3, colors.cream);
  c(x + 21, y + 30, 8, 4, palette.outline);
  c(x + 22, y + 30, 6, 3, colors.cream);
  c(x + 15, y + 31, 1, 1, colors.shadow);
  c(x + 27, y + 31, 1, 1, colors.shadow);

  c(x + 13, y + 23, 1, 3, palette.collar);
  c(x + 14, y + 24, 1, 1, palette.tag);
}

function drawSitHead(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  const sniff = pose === 'sniff' ? 2 + (tick % 2) : 0;

  c(x + 6, y + 8, 21, 14, palette.outline);
  c(x + 8, y + 9, 17, 12, colors.light);
  c(x + 11, y + 8, 8, 13, colors.cream);
  c(x + 7, y + 15, 18, 7, colors.cream);
  c(x + 8, y + 10, 4, 3, colors.fur);
  c(x + 21, y + 10, 3, 2, colors.shadow);

  c(x + 6 - sniff, y + 16, 17 + sniff, 6, palette.outline);
  c(x + 7 - sniff, y + 17, 15 + sniff, 4, colors.cream);
  c(x + 4 - sniff, y + 17, 4, 4, palette.outline);
  c(x + 5 - sniff, y + 18, 2, 2, palette.eyeGloss);
  c(x + 11, y + 21, 7, 1, palette.outline);
  c(x + 21, y + 17, 2, 1, palette.blush);
}

function drawSitEars(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  const worriedDrop = pose === 'worried' ? 2 : 0;
  const unsureDrop = pose === 'unsure' ? 1 : 0;
  const sniffLift = pose === 'sniff' ? -2 : 0;
  const twitch = pose === 'idle' && tick % 48 === 24 ? -1 : 0;
  const leftDrop = worriedDrop + unsureDrop + twitch;
  const rightShift = worriedDrop + unsureDrop + sniffLift;

  c(x + 8, y + 7 + leftDrop, 5, 3, palette.outline);
  c(x + 9, y + 4 + leftDrop, 4, 3, palette.outline);
  c(x + 10, y + 1 + leftDrop, 3, 3, palette.outline);
  c(x + 11, y, 2, 2, palette.outline);
  c(x + 9, y + 7 + leftDrop, 3, 2, colors.fur);
  c(x + 10, y + 4 + leftDrop, 2, 3, colors.fur);
  c(x + 11, y + 2 + leftDrop, 1, 3, colors.light);
  c(x + 11, y + 6 + leftDrop, 1, 3, palette.blush);

  c(x + 20, y + 9 + rightShift, 7, 3, palette.outline);
  c(x + 22, y + 11 + rightShift, 5, 3, palette.outline);
  c(x + 25, y + 13 + rightShift, 2, 4, palette.outline);
  c(x + 21, y + 10 + rightShift, 5, 1, colors.shadow);
  c(x + 23, y + 12 + rightShift, 3, 2, colors.shadow);
  c(x + 25, y + 13 + rightShift, 1, 3, palette.blush);
}

function drawSitFace(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  if (pose === 'proud') {
    c(x + 10, y + 14, 4, 1, palette.outline);
    c(x + 19, y + 14, 4, 1, palette.outline);
    c(x + 13, y + 20, 5, 1, palette.outline);
    return;
  }

  const blink = pose === 'idle' && tick % 48 === 24;
  if (blink) {
    c(x + 10, y + 14, 4, 1, palette.outline);
    c(x + 19, y + 14, 4, 1, palette.outline);
    return;
  }

  if (pose === 'worried') {
    c(x + 9, y + 12, 5, 1, palette.outline);
    c(x + 18, y + 12, 5, 1, palette.outline);
  }

  c(x + 9, y + 13, 4, 4, palette.eyeGloss);
  c(x + 19, y + 13, 4, 4, palette.eyeGloss);
  c(x + 11, y + 14, 1, 1, palette.eyeSpark);
  c(x + 20, y + 14, 1, 1, palette.eyeSpark);

  if (pose === 'curious' || pose === 'unsure') {
    c(x + 17, y + 21, 4, 1, palette.outline);
    c(x + 21, y + 22, 1, 1, colors.shadow);
  }
}

function drawSitTail(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  if (pose === 'worried') {
    c(x + 24, y + 28, 7, 3, palette.outline);
    c(x + 25, y + 28, 5, 2, colors.fur);
    return;
  }

  const wag = pose === 'proud' || pose === 'curious' ? tick % 2 : 0;
  c(x + 25, y + 24 - wag, 6, 5, palette.outline);
  c(x + 30, y + 20 - wag, 4, 7, palette.outline);
  c(x + 26, y + 25 - wag, 5, 3, colors.fur);
  c(x + 30, y + 22 - wag, 2, 4, colors.light);
  c(x + 32, y + 21 - wag, 1, 2, colors.cream);
}

function drawSitPoseEffects(c: CellPainter, x: number, y: number, pose: MiroPose, tick: number): void {
  if (pose === 'sniff') {
    const pulse = tick % 3;
    c(x + 1 - pulse * 2, y + 18, 1, 1, palette.scan);
    c(x - 2 - pulse * 2, y + 16, 1, 1, palette.scan);
    c(x - 5 - pulse * 2, y + 19, 1, 1, palette.cream);
  }

  if (pose === 'worried') {
    c(x + 7, y + 25, 23, 2, palette.warning);
    c(x + 30, y + 10, 2, 6, palette.warning);
    c(x + 30, y + 18, 2, 2, palette.warning);
  }

  if (pose === 'proud') {
    c(x + 5, y + 5 + tick % 2, 1, 1, palette.success);
    c(x + 31, y + 15 - tick % 2, 1, 1, palette.success);
    c(x + 29, y + 22, 1, 1, palette.tag);
    c(x + 7, y + 7, 1, 1, palette.tag);
  }

  if (pose === 'unsure') {
    c(x + 28, y + 9, 2, 2, palette.scan);
    c(x + 31, y + 7, 1, 1, palette.creamShadow);
  }

  if (pose === 'buffering') {
    const dot = tick % 3;
    for (let i = 0; i < 3; i += 1) {
      c(x + 28 + i * 2, y + 7, 1, 1, i <= dot ? palette.creamShadow : palette.mutedFur);
    }
  }
}

function drawSleepSprite(c: CellPainter, frame: number): void {
  const tick = Math.floor(frame / 16);
  const breath = tick % 4 < 2 ? 0 : 1;
  const x = 2;
  const y = 13 + breath;

  c(x + 5, y + 23, 29, 2, palette.shadow);
  c(x + 8, y + 24, 23, 1, palette.shadow);

  c(x + 7, y + 8, 25, 12, palette.outline);
  c(x + 5, y + 12, 30, 9, palette.outline);
  c(x + 8, y + 9, 23, 10, palette.fur);
  c(x + 9, y + 15, 18, 5, palette.cream);
  c(x + 28, y + 10, 5, 6, palette.furShadow);
  c(x + 30, y + 15, 4, 4, palette.cream);

  c(x + 4, y + 5, 15, 11, palette.outline);
  c(x + 6, y + 6, 12, 9, palette.furLight);
  c(x + 5, y + 11, 13, 5, palette.cream);
  c(x + 3, y + 12, 4, 4, palette.outline);
  c(x + 4, y + 13, 2, 2, palette.eyeGloss);
  c(x + 10, y + 14, 5, 1, palette.outline);
  c(x + 8, y + 3, 4, 3, palette.outline);
  c(x + 9, y + 1, 3, 3, palette.outline);
  c(x + 9, y + 4, 2, 4, palette.fur);
  c(x + 17, y + 5, 7, 3, palette.outline);
  c(x + 20, y + 7, 3, 4, palette.outline);
  c(x + 18, y + 6, 4, 2, palette.furShadow);

  if (tick % 5 < 3) {
    c(x + 28, y + 1, 1, 1, palette.creamShadow);
    c(x + 31, y - 1, 1, 1, palette.creamShadow);
  }
}

function drawSideSprite(c: CellPainter, pose: 'guard' | 'fetch', frame: number): void {
  const tick = Math.floor(frame / 12);
  const lift = pose === 'fetch' && tick % 2 === 0 ? -1 : 0;
  const bark = pose === 'guard' && tick % 2 === 0 ? -1 : 0;
  const x = 2;
  const y = 6 + lift;
  const tailHigh = pose === 'guard';

  c(x + 6, y + 30, 29, 2, palette.shadow);
  c(x + 10, y + 31, 21, 1, palette.shadow);

  c(x + 8, y + 16, 25, 12, palette.outline);
  c(x + 9, y + 15, 22, 12, palette.fur);
  c(x + 9, y + 22, 9, 5, palette.cream);
  c(x + 18, y + 27, 5, 6, palette.outline);
  c(x + 19, y + 27, 3, 5, palette.cream);
  c(x + 29, y + 27, 5, 6, palette.outline);
  c(x + 30, y + 27, 3, 5, palette.cream);

  c(x + 31, y + 15 - (tailHigh ? 3 : 0), 8, 4, palette.outline);
  c(x + 37, y + 11 - (tailHigh ? 3 : 0), 4, 8, palette.outline);
  c(x + 32, y + 16 - (tailHigh ? 3 : 0), 6, 2, palette.furLight);
  c(x + 38, y + 13 - (tailHigh ? 3 : 0), 2, 5, palette.fur);

  c(x + 2, y + 8, 16, 12, palette.outline);
  c(x + 4, y + 9, 13, 10, palette.furLight);
  c(x + 3, y + 14, 13, 6, palette.cream);
  c(x, y + 15, 4, 4, palette.outline);
  c(x + 1, y + 16, 2, 2, palette.eyeGloss);
  c(x + 11, y + 11, 4, 4, palette.eyeGloss);
  c(x + 12, y + 12, 1, 1, palette.eyeSpark);
  c(x + 7, y + 19, 6, 1, palette.outline);
  c(x + 12, y + 9, 4, 8, palette.cream);

  c(x + 4, y + 7, 5, 3, palette.outline);
  c(x + 5, y + 4, 4, 3, palette.outline);
  c(x + 6, y + 1, 3, 3, palette.outline);
  c(x + 6, y + 5, 2, 5, palette.fur);
  c(x + 15, y + 9, 7, 3, palette.outline);
  c(x + 18, y + 11, 4, 5, palette.outline);
  c(x + 16, y + 10, 4, 2, palette.furShadow);
  c(x + 19, y + 12, 1, 3, palette.blush);

  if (pose === 'guard') {
    c(x - 2, y + 14 + bark, 2, 2, palette.warning);
    c(x - 5, y + 12 + bark, 1, 1, palette.warning);
    c(x + 27, y + 7, 5, 8, palette.outline);
    c(x + 28, y + 8, 3, 6, palette.warning);
    c(x + 29, y + 9, 1, 2, palette.paper);
    return;
  }

  c(x - 1, y + 19, 6, 2, palette.outline);
  c(x - 1, y + 20, 4, 1, palette.cream);
  c(x + 30, y + 10, 7, 5, palette.outline);
  c(x + 31, y + 11, 5, 3, palette.paper);
  c(x + 35, y + 13, 2, 1, palette.outline);
  c(x + 33, y + 12, 3, 1, palette.scan);
}

function drawSitShadow(c: CellPainter, x: number, y: number): void {
  c(x, y, 25, 2, palette.shadow);
  c(x + 4, y + 1, 17, 1, palette.shadow);
}
