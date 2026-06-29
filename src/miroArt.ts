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
  outline: 0x2c2118,
  fur: 0xd89a55,
  furLight: 0xe8b978,
  furShadow: 0xa76534,
  cream: 0xf6e8cf,
  creamShadow: 0xd7c2a4,
  eyeGloss: 0x2a1711,
  eyeSpark: 0xfff7e8,
  blush: 0xe99a92,
  collar: 0x2aae9e,
  tag: 0xf4cf6a,
  success: 0x61d66f,
  warning: 0xf25d4a,
  scan: 0x72d8ff,
  bubble: 0xfff8e8,
  softShadow: 0x8f7e68,
  baselineGray: 0x8f8a84,
};

const DEFAULT_PIXEL = 4;

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
  const p = options.pixel ?? DEFAULT_PIXEL;
  const frame = state.reducedMotion ? 0 : state.frame;
  const pose = state.pose;
  const breath = pose === 'asleep' || pose === 'idle' ? Math.round(Math.sin(frame / 22) * 1) : 0;
  const hop = pose === 'proud' ? Math.max(0, Math.sin(frame / 5)) * -2 : 0;
  const tremble = pose === 'worried' ? Math.round(Math.sin(frame / 2) * 0.5) : 0;

  const s = (value: number) => value * p;
  const r = (x: number, y: number, w: number, h: number, color: number, alpha = 1) => {
    graphics.rect(s(x), s(y), s(w), s(h)).fill({ color, alpha });
  };
  const poly = (points: Array<[number, number]>, color: number, alpha = 1) => {
    graphics.moveTo(s(points[0][0]), s(points[0][1]));
    for (const [x, y] of points.slice(1)) {
      graphics.lineTo(s(x), s(y));
    }
    graphics.lineTo(s(points[0][0]), s(points[0][1]));
    graphics.fill({ color, alpha });
  };

  graphics.clear();

  if (pose === 'asleep') {
    drawAsleep({ r, poly, frame, breath });
  } else if (pose === 'guard') {
    drawGuard({ r, poly, frame });
  } else if (pose === 'fetch') {
    drawFetch({ r, poly, frame });
  } else {
    drawSitting({ r, poly, pose, frame, breath, hop, tremble });
  }
}

function drawAsleep(draw: DrawHelpers & { frame: number; breath: number }): void {
  const { r, poly, frame, breath } = draw;
  const y = 36 + breath;

  drawGroundShadow(r, 17, 65, 42, 4);

  r(15, y + 13, 44, 10, palette.outline);
  r(12, y + 18, 50, 13, palette.outline);
  r(18, y + 11, 38, 17, palette.fur);
  r(18, y + 23, 29, 6, palette.cream);
  r(49, y + 14, 9, 9, palette.furShadow);
  r(52, y + 21, 7, 7, palette.cream);

  r(13, y + 5, 24, 19, palette.outline);
  r(16, y + 7, 20, 16, palette.furLight);
  r(14, y + 15, 23, 9, palette.cream);
  r(12, y + 16, 5, 5, palette.outline);
  r(13, y + 17, 4, 3, palette.eyeGloss);
  r(20, y + 19, 8, 1, palette.outline);

  poly(
    [
      [16, y + 7],
      [18, y - 5],
      [24, y + 8],
    ],
    palette.outline,
  );
  poly(
    [
      [18, y + 6],
      [19, y - 1],
      [23, y + 8],
    ],
    palette.fur,
  );
  poly(
    [
      [30, y + 7],
      [39, y + 3],
      [37, y + 14],
    ],
    palette.outline,
  );
  poly(
    [
      [32, y + 8],
      [37, y + 5],
      [36, y + 13],
    ],
    palette.furShadow,
  );

  r(24, y + 25, 12, 4, palette.creamShadow);
  if (Math.sin(frame / 36) > 0.4) {
    r(45, y + 2, 2, 2, palette.creamShadow, 0.75);
    r(48, y - 1, 2, 2, palette.creamShadow, 0.55);
  }
}

function drawSitting(draw: DrawHelpers & { pose: MiroPose; frame: number; breath: number; hop: number; tremble: number }): void {
  const { r, poly, pose, frame, breath, hop, tremble } = draw;
  const x = 5 + tremble;
  const y = 8 + breath + hop;
  const isWorried = pose === 'worried';
  const isSniff = pose === 'sniff';
  const isCurious = pose === 'curious';
  const isProud = pose === 'proud';
  const isUnsure = pose === 'unsure';
  const isBuffering = pose === 'buffering';
  const colorShift = isBuffering ? palette.baselineGray : palette.fur;
  const lightShift = isBuffering ? 0xb7afa2 : palette.furLight;
  const creamShift = isBuffering ? 0xd8d0c2 : palette.cream;
  const earDrop = isWorried ? 5 : isUnsure ? 2 : 0;
  const headTilt = isCurious || isUnsure ? Math.round(Math.sin(frame / 22) * 1) : 0;
  const noseReach = isSniff ? 4 + Math.round(Math.sin(frame / 5)) : 0;
  const tailWag = isProud ? Math.round(Math.sin(frame / 3) * 2) : isCurious ? 1 : 0;

  drawGroundShadow(r, x + 20, 69, 34, 4);

  // Body and cream chest.
  r(x + 22, y + 39, 30, 25, palette.outline);
  r(x + 24, y + 37, 25, 26, colorShift);
  r(x + 24, y + 48, 14, 15, creamShift);
  r(x + 38, y + 38, 12, 23, colorShift);
  r(x + 28, y + 62, 6, 8, palette.outline);
  r(x + 29, y + 62, 4, 7, creamShift);
  r(x + 44, y + 61, 6, 9, palette.outline);
  r(x + 45, y + 61, 4, 8, creamShift);

  // Tail sweep.
  r(x + 50, y + 42 - tailWag, 13, 8, palette.outline);
  r(x + 57, y + 35 - tailWag, 7, 14, palette.outline);
  r(x + 52, y + 43 - tailWag, 9, 5, colorShift);
  r(x + 58, y + 37 - tailWag, 4, 9, lightShift);
  if (isWorried) {
    r(x + 50, y + 54, 12, 5, palette.outline);
    r(x + 52, y + 54, 8, 3, colorShift);
  }

  // Head, muzzle, and real-Miro forehead stripe.
  r(x + 13, y + 14 + headTilt, 36, 27, palette.outline);
  r(x + 16, y + 16 + headTilt, 31, 23, lightShift);
  r(x + 25, y + 14 + headTilt, 10, 19, creamShift);
  r(x + 18, y + 31 + headTilt, 27, 9, creamShift);
  r(x + 15 - noseReach, y + 28 + headTilt, 30 + noseReach, 13, palette.outline);
  r(x + 17 - noseReach, y + 29 + headTilt, 26 + noseReach, 10, creamShift);
  r(x + 12 - noseReach, y + 31 + headTilt, 8, 7, palette.outline);
  r(x + 13 - noseReach, y + 32 + headTilt, 6, 5, palette.eyeGloss);
  r(x + 20, y + 38 + headTilt, 14, 1, palette.outline);
  r(x + 36, y + 31 + headTilt, 3, 2, palette.blush, isBuffering ? 0.35 : 1);

  // Asymmetric ears: tall left, soft right. Poses modulate but preserve identity.
  poly(
    [
      [x + 15, y + 17 + headTilt],
      [x + 17, y + 4 + earDrop],
      [x + 20, y - 3 + earDrop],
      [x + 24, y + 1 + earDrop],
      [x + 29, y + 18 + headTilt],
    ],
    palette.outline,
  );
  poly(
    [
      [x + 18, y + 15 + headTilt],
      [x + 19, y + 5 + earDrop],
      [x + 21, y + 1 + earDrop],
      [x + 24, y + 4 + earDrop],
      [x + 27, y + 17 + headTilt],
    ],
    colorShift,
  );
  r(x + 22, y + 7 + earDrop, 2, 6, palette.blush, isBuffering ? 0.25 : 0.75);

  const softEarTop = isSniff ? y + 7 : y + 15 + earDrop;
  poly(
    [
      [x + 37, y + 18 + headTilt],
      [x + 51, softEarTop],
      [x + 46, y + 29 + headTilt],
      [x + 41, y + 28 + headTilt],
    ],
    palette.outline,
  );
  poly(
    [
      [x + 39, y + 19 + headTilt],
      [x + 48, softEarTop + 3],
      [x + 44, y + 26 + headTilt],
      [x + 41, y + 26 + headTilt],
    ],
    palette.furShadow,
  );
  r(x + 44, softEarTop + 5, 2, 5, palette.blush, isBuffering ? 0.2 : 0.65);

  drawEyes(r, x, y + headTilt, pose, frame);

  if (isSniff) {
    drawSniffEffects(r, x, y, frame);
  }
  if (isWorried) {
    drawWarningEffects(r, x, y, frame);
  }
  if (isProud) {
    drawSuccessEffects(r, x, y, frame);
  }
  if (isUnsure) {
    r(x + 50, y + 18, 3, 3, palette.scan, 0.75);
    r(x + 54, y + 15, 2, 2, palette.creamShadow, 0.8);
  }
  if (isBuffering) {
    const dot = Math.floor(frame / 18) % 3;
    for (let i = 0; i < 3; i += 1) {
      r(x + 49 + i * 4, y + 12, 2, 2, i <= dot ? palette.creamShadow : palette.baselineGray, 0.75);
    }
  }
}

function drawGuard(draw: DrawHelpers & { frame: number }): void {
  const { r, poly, frame } = draw;
  const bark = Math.sin(frame / 4) > 0 ? -1 : 0;
  drawSideBody({ r, poly, x: 7, y: 18, pose: 'guard' });
  r(16, 31 + bark, 3, 2, palette.outline);
  r(13, 28 + bark, 2, 2, palette.warning);
  r(10, 25 + bark, 2, 2, palette.warning, 0.8);
  r(50, 17, 9, 12, palette.outline);
  r(52, 19, 5, 8, palette.warning);
  r(53, 21, 3, 2, palette.bubble);
}

function drawFetch(draw: DrawHelpers & { frame: number }): void {
  const { r, poly, frame } = draw;
  const lift = Math.round(Math.sin(frame / 5) * 1);
  drawSideBody({ r, poly, x: 8, y: 19 + lift, pose: 'fetch' });
  r(8, 38, 10, 4, palette.outline);
  r(7, 39, 8, 2, palette.cream);
  r(53, 24, 11, 8, palette.outline);
  r(54, 25, 8, 6, palette.bubble);
  r(60, 28, 3, 2, palette.outline);
  r(57, 27, 4, 1, palette.scan);
}

function drawSideBody(args: DrawHelpers & { x: number; y: number; pose: 'guard' | 'fetch' }): void {
  const { r, poly, x, y, pose } = args;
  const tailHigh = pose === 'guard';
  drawGroundShadow(r, x + 17, y + 50, 42, 4);

  r(x + 14, y + 30, 42, 20, palette.outline);
  r(x + 16, y + 27, 36, 21, palette.fur);
  r(x + 16, y + 39, 15, 8, palette.cream);
  r(x + 31, y + 47, 6, 9, palette.outline);
  r(x + 32, y + 47, 4, 8, palette.cream);
  r(x + 48, y + 47, 6, 9, palette.outline);
  r(x + 49, y + 47, 4, 8, palette.cream);

  r(x + 53, y + 27 - (tailHigh ? 5 : 0), 13, 7, palette.outline);
  r(x + 61, y + 20 - (tailHigh ? 5 : 0), 6, 14, palette.outline);
  r(x + 55, y + 28 - (tailHigh ? 5 : 0), 9, 4, palette.furLight);
  r(x + 62, y + 22 - (tailHigh ? 5 : 0), 3, 9, palette.fur);

  r(x + 5, y + 14, 26, 22, palette.outline);
  r(x + 8, y + 16, 22, 18, palette.furLight);
  r(x + 5, y + 25, 22, 12, palette.cream);
  r(x + 2, y + 27, 7, 5, palette.outline);
  r(x + 2, y + 28, 5, 3, palette.eyeGloss);
  r(x + 19, y + 20, 5, 5, palette.eyeGloss);
  r(x + 20, y + 21, 1, 1, palette.eyeSpark);
  r(x + 13, y + 35, 10, 1, palette.outline);
  r(x + 22, y + 15, 6, 13, palette.cream);

  poly(
    [
      [x + 8, y + 16],
      [x + 12, y],
      [x + 18, y + 17],
    ],
    palette.outline,
  );
  poly(
    [
      [x + 11, y + 15],
      [x + 13, y + 5],
      [x + 17, y + 17],
    ],
    palette.fur,
  );
  poly(
    [
      [x + 25, y + 17],
      [x + 38, y + 10],
      [x + 33, y + 27],
    ],
    palette.outline,
  );
  poly(
    [
      [x + 27, y + 17],
      [x + 35, y + 13],
      [x + 32, y + 24],
    ],
    palette.furShadow,
  );
}

interface DrawHelpers {
  r: (x: number, y: number, w: number, h: number, color: number, alpha?: number) => void;
  poly: (points: Array<[number, number]>, color: number, alpha?: number) => void;
}

function drawGroundShadow(
  r: DrawHelpers['r'],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  r(x, y, w, h, palette.softShadow, 0.18);
  r(x + 3, y + 1, w - 6, h, palette.softShadow, 0.16);
}

function drawEyes(r: DrawHelpers['r'], x: number, y: number, pose: MiroPose, frame: number): void {
  const blink = Math.floor(frame / 90) % 8 === 0;
  if (pose === 'proud') {
    r(x + 22, y + 27, 5, 1, palette.outline);
    r(x + 36, y + 27, 5, 1, palette.outline);
    return;
  }
  if (pose === 'worried') {
    r(x + 22, y + 24, 6, 6, palette.eyeGloss);
    r(x + 36, y + 24, 6, 6, palette.eyeGloss);
    r(x + 23, y + 26, 1, 1, palette.eyeSpark);
    r(x + 37, y + 26, 1, 1, palette.eyeSpark);
    r(x + 21, y + 23, 6, 1, palette.outline);
    r(x + 36, y + 23, 6, 1, palette.outline);
    return;
  }
  if (blink) {
    r(x + 22, y + 26, 5, 1, palette.outline);
    r(x + 36, y + 26, 5, 1, palette.outline);
    return;
  }
  r(x + 22, y + 23, 6, 7, palette.eyeGloss);
  r(x + 21, y + 25, 1, 3, palette.eyeGloss);
  r(x + 36, y + 23, 6, 7, palette.eyeGloss);
  r(x + 42, y + 25, 1, 3, palette.eyeGloss);
  r(x + 23, y + 24, 1, 1, palette.eyeSpark);
  r(x + 25, y + 25, 1, 1, palette.eyeSpark);
  r(x + 37, y + 24, 1, 1, palette.eyeSpark);
  r(x + 40, y + 25, 1, 1, palette.eyeSpark);
}

function drawSniffEffects(r: DrawHelpers['r'], x: number, y: number, frame: number): void {
  const pulse = Math.floor(frame / 5) % 3;
  r(x + 5 - pulse * 2, y + 30, 2, 2, palette.scan, 0.9);
  r(x + 1 - pulse * 2, y + 27, 2, 2, palette.scan, 0.7);
  r(x - 3 - pulse * 2, y + 33, 2, 2, palette.cream, 0.55);
}

function drawWarningEffects(r: DrawHelpers['r'], x: number, y: number, frame: number): void {
  const alpha = 0.4 + Math.abs(Math.sin(frame / 8)) * 0.35;
  r(x + 10, y + 49, 46, 3, palette.warning, alpha);
  r(x + 52, y + 17, 3, 8, palette.warning, alpha);
  r(x + 52, y + 27, 3, 3, palette.warning, alpha);
}

function drawSuccessEffects(r: DrawHelpers['r'], x: number, y: number, frame: number): void {
  const bob = Math.round(Math.sin(frame / 4));
  r(x + 12, y + 8 + bob, 2, 2, palette.success);
  r(x + 58, y + 20 - bob, 2, 2, palette.success);
  r(x + 54, y + 35 + bob, 2, 2, palette.tag);
  r(x + 16, y + 10 + bob, 1, 1, palette.tag);
}
