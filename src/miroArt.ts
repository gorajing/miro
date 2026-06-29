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
  const breath = pose === 'idle' ? tick % 18 >= 9 ? 1 : 0 : 0;
  const hop = pose === 'proud' && tick % 2 === 0 ? -1 : 0;
  const shake = pose === 'worried' && tick % 2 === 0 ? -1 : 0;
  const tilt = pose === 'curious' || pose === 'unsure' ? tick % 4 < 2 ? -1 : 0 : 0;
  const baseX = 5 + shake;
  const baseY = 1 + breath + hop;

  drawSitShadow(c, baseX + 5, baseY + 31);
  drawSitTail(c, baseX, baseY, colors, pose, tick);
  drawSitBody(c, baseX, baseY, colors);
  drawSitHead(c, baseX, baseY + tilt, colors, pose, tick);
  drawSitEars(c, baseX, baseY + tilt, colors, pose, tick);
  drawSitFace(c, baseX, baseY + tilt, pose, tick);
  drawSitPoseEffects(c, baseX, baseY, pose, tick);
}

function drawSitBody(c: CellPainter, x: number, y: number, colors: MiroColors): void {
  c(x + 8, y + 19, 22, 12, palette.outline);
  c(x + 9, y + 20, 5, 9, colors.light);
  c(x + 24, y + 20, 5, 9, colors.shadow);
  c(x + 13, y + 18, 12, 12, colors.cream);

  c(x + 9, y + 29, 8, 3, palette.outline);
  c(x + 10, y + 29, 5, 2, colors.cream);
  c(x + 21, y + 29, 8, 3, palette.outline);
  c(x + 23, y + 29, 5, 2, colors.cream);
  c(x + 18, y + 25, 3, 7, palette.outline);
}

function drawSitHead(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  const sniff = pose === 'sniff' ? 1 + (tick % 2) : 0;

  c(x + 9, y + 6, 20, 4, palette.outline);
  c(x + 6, y + 10, 26, 9, palette.outline);
  c(x + 5, y + 14, 28, 7, palette.outline);
  c(x + 8, y + 9, 20, 4, colors.light);
  c(x + 7, y + 12, 24, 6, colors.light);
  c(x + 8, y + 17, 22, 4, colors.cream);

  c(x + 7, y + 12, 7, 6, colors.fur);
  c(x + 25, y + 12, 6, 6, colors.shadow);
  c(x + 14, y + 10, 11, 11, colors.cream);
  c(x + 8, y + 17, 22, 5, colors.cream);

  c(x + 17 - sniff, y + 18, 3, 2, palette.outline);
  c(x + 18 - sniff, y + 19, 1, 1, palette.eyeGloss);
}

function drawSitEars(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  const worriedDrop = pose === 'worried' ? 2 : 0;
  const unsureDrop = pose === 'unsure' ? 1 : 0;
  const sniffLift = pose === 'sniff' ? -1 : 0;
  const twitch = pose === 'idle' && tick % 48 === 24 ? -1 : 0;
  const leftDrop = worriedDrop + unsureDrop + twitch;
  const rightShift = worriedDrop + unsureDrop + sniffLift;

  c(x + 8, y + 7 + leftDrop, 6, 5, palette.outline);
  c(x + 7, y + 4 + leftDrop, 6, 5, palette.outline);
  c(x + 8, y + 1 + leftDrop, 4, 4, palette.outline);
  c(x + 10, y + 0 + leftDrop, 3, 2, palette.outline);
  c(x + 9, y + 5 + leftDrop, 3, 6, colors.light);
  c(x + 10, y + 2 + leftDrop, 2, 6, colors.light);

  c(x + 23, y + 8 + rightShift, 6, 5, palette.outline);
  c(x + 25, y + 6 + rightShift, 7, 4, palette.outline);
  c(x + 29, y + 8 + rightShift, 5, 7, palette.outline);
  c(x + 28, y + 12 + rightShift, 5, 4, palette.outline);
  c(x + 24, y + 9 + rightShift, 3, 3, colors.shadow);
  c(x + 26, y + 7 + rightShift, 5, 2, colors.light);
  c(x + 29, y + 9 + rightShift, 4, 3, colors.fur);
  c(x + 29, y + 12 + rightShift, 3, 3, colors.shadow);
}

function drawSitFace(c: CellPainter, x: number, y: number, pose: MiroPose, tick: number): void {
  const blink = pose === 'idle' && tick % 48 === 24;
  if (blink) {
    c(x + 13, y + 13, 3, 1, palette.paper);
    c(x + 22, y + 13, 3, 1, palette.paper);
    return;
  }

  c(x + 13, y + 12, 3, 3, palette.paper);
  c(x + 22, y + 12, 3, 3, palette.paper);
  c(x + 11, y + 16, 3, 3, palette.outline);
  c(x + 24, y + 16, 3, 3, palette.outline);

  drawSitMouth(c, x, y, pose, tick);
}

function drawSitMouth(c: CellPainter, x: number, y: number, pose: MiroPose, tick: number): void {
  if (pose === 'sniff') {
    const sniff = 1 + (tick % 2);
    c(x + 18 - sniff, y + 21, 2, 1, palette.outline);
    return;
  }

  if (pose === 'proud' || pose === 'fetch') {
    c(x + 17, y + 21, 1, 1, palette.outline);
    c(x + 18, y + 22, 3, 1, palette.outline);
    c(x + 21, y + 21, 1, 1, palette.outline);
    return;
  }

  if (pose === 'worried' || pose === 'guard') {
    c(x + 17, y + 22, 4, 1, palette.outline);
    return;
  }

  if (pose === 'curious' || pose === 'unsure') {
    c(x + 18, y + 22, 3, 1, palette.outline);
    return;
  }

  if (pose === 'buffering') {
    c(x + 18, y + 22, 2, 1, palette.outline);
    return;
  }

  c(x + 18, y + 21, 1, 2, palette.outline);
}

function drawSitTail(c: CellPainter, x: number, y: number, colors: MiroColors, pose: MiroPose, tick: number): void {
  if (pose === 'worried') {
    c(x + 29, y + 25, 7, 3, palette.outline);
    c(x + 30, y + 25, 5, 2, colors.light);
    return;
  }

  const wag = pose === 'proud' || pose === 'curious' || pose === 'fetch' ? tick % 2 : 0;
  c(x + 29, y + 22 - wag, 6, 8, palette.outline);
  c(x + 34, y + 20 - wag, 3, 8, palette.outline);
  c(x + 30, y + 23 - wag, 4, 5, colors.light);
  c(x + 34, y + 22 - wag, 1, 4, colors.cream);
}

function drawSitPoseEffects(c: CellPainter, x: number, y: number, pose: MiroPose, tick: number): void {
  if (pose === 'sniff') {
    const pulse = tick % 3;
    c(x + 10 - pulse * 2, y + 18, 1, 1, palette.scan);
    c(x + 7 - pulse * 2, y + 16, 1, 1, palette.scan);
    c(x + 5 - pulse * 2, y + 19, 1, 1, palette.cream);
  }

  if (pose === 'worried') {
    c(x + 16, y + 28, 6, 1, palette.warning);
    c(x + 34, y + 12, 1, 4, palette.warning);
    c(x + 34, y + 18, 1, 1, palette.warning);
  }

  if (pose === 'guard') {
    c(x + 18, y - 1 + tick % 2, 5, 5, palette.outline);
    c(x + 19, y + tick % 2, 3, 3, palette.warning);
    c(x + 20, y + 1 + tick % 2, 1, 1, palette.paper);
    c(x + 20, y + 3 + tick % 2, 1, 1, palette.paper);
  }

  if (pose === 'fetch') {
    c(x + 31, y + 23, 7, 5, palette.outline);
    c(x + 32, y + 24, 5, 3, palette.paper);
    c(x + 34, y + 25, 3, 1, palette.scan);
    c(x + 36, y + 26, 2, 1, palette.outline);
    c(x + 7, y + 24, 3, 1, palette.tag);
  }

  if (pose === 'proud') {
    c(x + 7, y + 5 + tick % 2, 1, 1, palette.success);
    c(x + 32, y + 15 - tick % 2, 1, 1, palette.success);
    c(x + 29, y + 22, 1, 1, palette.tag);
    c(x + 9, y + 7, 1, 1, palette.tag);
  }

  if (pose === 'unsure') {
    c(x + 31, y + 9, 2, 2, palette.scan);
    c(x + 34, y + 7, 1, 1, palette.creamShadow);
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
  const x = 3;
  const y = 12 + breath;

  c(x + 5, y + 23, 28, 2, palette.shadow);
  c(x + 9, y + 24, 20, 1, palette.shadow);

  c(x + 8, y + 10, 23, 5, palette.outline);
  c(x + 5, y + 13, 30, 10, palette.outline);
  c(x + 8, y + 11, 22, 5, palette.furLight);
  c(x + 7, y + 14, 25, 8, palette.fur);
  c(x + 10, y + 17, 21, 5, palette.cream);
  c(x + 28, y + 14, 6, 5, palette.furShadow);
  c(x + 30, y + 18, 4, 4, palette.cream);

  c(x + 5, y + 7, 15, 11, palette.outline);
  c(x + 7, y + 8, 12, 8, palette.furLight);
  c(x + 6, y + 13, 14, 5, palette.cream);
  c(x + 3, y + 14, 4, 4, palette.outline);
  c(x + 4, y + 15, 2, 2, palette.eyeGloss);
  c(x + 11, y + 15, 5, 1, palette.outline);
  c(x + 9, y + 5, 4, 3, palette.outline);
  c(x + 10, y + 3, 3, 3, palette.outline);
  c(x + 10, y + 6, 2, 4, palette.furLight);
  c(x + 18, y + 8, 7, 3, palette.outline);
  c(x + 20, y + 10, 4, 4, palette.outline);
  c(x + 19, y + 9, 4, 2, palette.furShadow);

  if (tick % 5 < 3) {
    c(x + 28, y + 2, 1, 1, palette.creamShadow);
    c(x + 31, y, 1, 1, palette.creamShadow);
  }
}

function drawSideSprite(c: CellPainter, pose: 'guard' | 'fetch', frame: number): void {
  drawSitSprite(c, pose, frame);
}

function drawSitShadow(c: CellPainter, x: number, y: number): void {
  c(x, y, 22, 2, palette.shadow);
  c(x + 4, y + 1, 14, 1, palette.shadow);
}
