import { Application, Container, Graphics, Text } from 'pixi.js';
import { createDefaultMiroState, MIRO_POSES, MiroPose, MiroView } from './miroArt';
import './styles.css';

void bootPreview();

async function bootPreview(): Promise<void> {
  const appRoot = document.querySelector<HTMLDivElement>('#app');

  if (!appRoot) {
    throw new Error('Missing #app root');
  }

  appRoot.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Miro pixel-art workbench</p>
          <h1>A tiny dog who already knows what happened.</h1>
          <p class="copy">
            Procedural PixiJS pass based on the real Miro: tan coat, cream face,
            glossy eyes, slim paws, and the one-ear-up / one-ear-soft silhouette.
          </p>
        </div>
        <div class="controls" aria-label="Pose controls"></div>
      </section>
      <section class="stage-wrap">
        <div id="pixi-stage" class="stage"></div>
        <aside class="notes">
          <h2>Art target</h2>
          <p>
            Pose should carry the state before the speech bubble does. The teal
            tag is optional; Miro must still read as herself from ears, mask,
            eyes, and paws.
          </p>
          <dl>
            <dt>Current pose</dt>
            <dd id="pose-name">idle</dd>
            <dt>Keyboard</dt>
            <dd>left / right switch pose</dd>
          </dl>
        </aside>
      </section>
    </main>
  `;

  const controls = document.querySelector<HTMLDivElement>('.controls');
  const stageHost = document.querySelector<HTMLDivElement>('#pixi-stage');
  const poseName = document.querySelector<HTMLElement>('#pose-name');

  if (!controls || !stageHost || !poseName) {
    throw new Error('Preview DOM did not initialize');
  }

  const poseControls = controls;
  const poseLabel = poseName;
  let currentPoseIndex = 1;
  let activePose: MiroPose = MIRO_POSES[currentPoseIndex];

  const app = new Application();
  await app.init({
    width: 1120,
    height: 620,
    backgroundAlpha: 0,
    antialias: false,
    preference: 'webgl',
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  stageHost.appendChild(app.canvas);

  const scene = new Container();
  app.stage.addChild(scene);

  const background = new Graphics();
  scene.addChild(background);

  const activeMiro = new MiroView(createDefaultMiroState(activePose), { pixel: 4.35 });
  activeMiro.x = 505;
  activeMiro.y = 132;
  scene.addChild(activeMiro);

  const bubble = new Graphics();
  scene.addChild(bubble);

  const bubbleText = new Text({
    text: 'I sniffed the screen.',
    style: {
      fill: 0x2c2118,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 16,
      fontWeight: '700',
    },
  });
  scene.addChild(bubbleText);

  const gallery = new Container();
  gallery.x = 44;
  gallery.y = 452;
  scene.addChild(gallery);

  const galleryDogs = MIRO_POSES.map((pose, index) => {
    const holder = new Container();
    holder.x = index * 104;
    holder.y = 0;

    const dog = new MiroView(createDefaultMiroState(pose), { pixel: 1.3 });
    dog.x = 22;
    dog.y = 5;
    holder.addChild(dog);

    const label = new Text({
      text: pose,
      style: {
        fill: 0x5f5348,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
      },
    });
    label.x = 5;
    label.y = 100;
    holder.addChild(label);

    gallery.addChild(holder);
    return dog;
  });

  for (const pose of MIRO_POSES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = pose;
    button.addEventListener('click', () => setPose(pose));
    controls.appendChild(button);
  }

  function setPose(pose: MiroPose): void {
    activePose = pose;
    currentPoseIndex = MIRO_POSES.indexOf(pose);
    activeMiro.setState({ pose, frame: 0 });
    poseLabel.textContent = pose;
    for (const button of Array.from(poseControls.querySelectorAll('button'))) {
      button.toggleAttribute('aria-pressed', button.textContent === pose);
    }
  }

  function drawPreviewBackground(frame: number): void {
    background.clear();
    background.rect(28, 28, 1064, 350).fill({ color: 0xf9f4e8 });
    background.rect(28, 28, 1064, 350).stroke({ color: 0xeadcc8, width: 2 });
    background.rect(28, 334, 1064, 44).fill({ color: 0xe7d8c0 });
    background.rect(40, 346, 1040, 2).fill({ color: 0xd2c0a6, alpha: 0.8 });

    for (let x = 50; x < 1060; x += 28) {
      background.rect(x, 346, 12, 2).fill({ color: 0xcbb99f, alpha: 0.35 });
    }

    const glint = Math.sin(frame / 30) * 0.35 + 0.45;
    background.rect(800, 62, 190, 110).fill({ color: 0xd6f5ff, alpha: 0.24 });
    background.rect(814, 76, 162, 82).stroke({ color: 0x72d8ff, width: 2, alpha: glint });
  }

  function drawSpeechBubble(): void {
    const textForPose: Record<MiroPose, string> = {
      asleep: 'curling up. zero tokens.',
      idle: 'watching quietly.',
      sniff: 'sniffing the screen.',
      curious: 'hmm. something changed.',
      worried: 'that failure looks real.',
      guard: 'wait. this seems risky.',
      fetch: 'look over here.',
      proud: 'phew. green again.',
      unsure: 'stale error? checking.',
      buffering: 'still buffering...',
    };
    bubbleText.text = textForPose[activePose];
    bubbleText.x = 632;
    bubbleText.y = 94;

    const padX = 16;
    const padY = 11;
    const width = bubbleText.width + padX * 2;
    const height = bubbleText.height + padY * 2;
    const x = bubbleText.x - padX;
    const y = bubbleText.y - padY;

    bubble.clear();
    bubble.roundRect(x, y, width, height, 8).fill({ color: 0xfff8e8 });
    bubble.roundRect(x, y, width, height, 8).stroke({ color: 0x2c2118, width: 3 });
    bubble
      .moveTo(x + 36, y + height - 1)
      .lineTo(x + 48, y + height + 16)
      .lineTo(x + 62, y + height - 1)
      .fill({ color: 0xfff8e8 });
    bubble
      .moveTo(x + 36, y + height - 1)
      .lineTo(x + 48, y + height + 16)
      .lineTo(x + 62, y + height - 1)
      .stroke({ color: 0x2c2118, width: 3 });

    const moodColor = activePose === 'proud'
      ? 0x61d66f
      : activePose === 'worried' || activePose === 'guard'
        ? 0xf25d4a
        : activePose === 'sniff'
          ? 0x72d8ff
          : 0x2aae9e;
    bubble.rect(x + width - 18, y + 8, 8, 8).fill({ color: moodColor });
  }

  function drawGallerySelection(): void {
    galleryDogs.forEach((dog, index) => {
      const selected = MIRO_POSES[index] === activePose;
      dog.alpha = selected ? 1 : 0.58;
      dog.scale.set(selected ? 1.08 : 1);
    });
  }

  app.ticker.add((ticker) => {
    drawPreviewBackground(ticker.lastTime / 16);
    activeMiro.tick(ticker.deltaTime);
    galleryDogs.forEach((dog) => dog.tick(ticker.deltaTime));
    drawSpeechBubble();
    drawGallerySelection();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentPoseIndex + delta + MIRO_POSES.length) % MIRO_POSES.length;
    setPose(MIRO_POSES[nextIndex]);
  });

  setPose(activePose);
}
