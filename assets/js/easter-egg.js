'use strict';

// Easter egg: a pixel version of Mark that can run and jump on the page itself.
// Text lines, headings, images, buttons and cards are one-way platforms.
// Tall images, the video, cards and the screen edges can be wall-slid and wall-jumped off.
// Toggle with the controller button (bottom-right) or the P key; Esc also exits.
(function () {
  // Only on devices with a real pointer and keyboard-sized screens
  const desktopQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)');
  if (!desktopQuery.matches) return;

  // Colors (tweak freely)
  const PALETTE = {
    H: '#a08353', // dark blond hair
    h: '#c2a77c', // faded sides
    S: '#f1c9a5', // skin
    E: '#6f8796', // blue-gray eyes
    M: '#c98f74', // mouth
    T: '#4a4a4f', // t-shirt
    K: '#38383c', // collar
    C: '#d9d9d9', // silver chain
    L: '#bdbdbd', // shirt print
    P: '#3d5a80', // jeans
    B: '#f2f2f2'  // sneakers
  };

  // Facing right; flipped when running left
  const BODY = [
    '....HHHH....',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.hHSSSSSSSh.',
    '.SSSSESSSES.',
    '.SSSSSSSSSS.',
    '..SSSSSMMSS.',
    '...SSSSSSS..',
    '....SSSS....',
    '..TTKSSKTT..',
    '.TTTCTTCTTT.',
    'STTTTCCTTTTS',
    'STTLLLLLLTTS',
    '..PPPPPPPP..'
  ];
  const LEGS = {
    idle: ['..PPP..PPP..', '..PPP..PPP..', '..BBB..BBB..'],
    runA: ['.PPP....PPP.', '.PPP....PPP.', 'BBB......BBB'],
    runB: ['...PPPPPP...', '....PPPP....', '....BBBB....'],
    jump: ['..PPPPPPPP..', '.BBB....BBB.', '............']
  };

  const PIXEL = 3;
  const COLS = 12;
  const ROWS = BODY.length + 3;
  const W = COLS * PIXEL;
  const H = ROWS * PIXEL;
  const FOOT_INSET = 9; // feet are narrower than the sprite

  const GRAVITY = 2200;
  const JUMP_SPEED = 820;
  const DOUBLE_JUMP_SPEED = 700;
  const FAST_FALL = 1800;
  const MAX_FALL = 1400;
  const RUN_SPEED = 320;
  const ACCEL = 2400;
  const FRICTION = 2000;
  const DROP_TIME = 0.25;
  const DROP_GAP = 16;

  const BODY_INSET = 6;       // side-collision box is a bit narrower than the sprite
  const WALL_MIN_HEIGHT = 60; // only tall elements get solid sides
  const WALL_SLIDE_SPEED = 110;
  const WALL_JUMP_SPEED = 760;
  const WALL_PUSH = 300;
  const WALL_COYOTE = 0.12;   // grace time to wall-jump right after leaving a wall
  const WALL_CONTROL_LOCK = 0.14;

  const CAMERA_TOP = 140;
  const CAMERA_BOTTOM = 180;

  // Text and elements the character can stand on
  const TEXT_SELECTOR = 'h1, h2, h3, h4, p, li, a, span';
  const BLOCK_SELECTOR = 'img, iframe, .btn, .filter-btn, .portfolio-item, .social-link, .contact-social-link, .hero-image-wrapper, .hero-video-wrapper';
  const WALL_SELECTOR = 'img, iframe, .portfolio-item, .hero-image-wrapper, .hero-video-wrapper';
  const IGNORE_SELECTOR = '.top-navbar, #portfolio-modal, .egg-toggle, .egg-hint, .egg-canvas, script, style, noscript';

  // Pre-render every frame (and its mirror) once
  function renderFrame(legs, flip) {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const g = off.getContext('2d');
    BODY.concat(legs).forEach((row, r) => {
      for (let c = 0; c < COLS; c++) {
        const color = PALETTE[row[c]];
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect((flip ? COLS - 1 - c : c) * PIXEL, r * PIXEL, PIXEL, PIXEL);
      }
    });
    return off;
  }

  const frames = {};
  Object.keys(LEGS).forEach(name => {
    frames[name] = { right: renderFrame(LEGS[name], false), left: renderFrame(LEGS[name], true) };
  });

  // Toggle button
  const button = document.createElement('button');
  button.className = 'egg-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Play mini game');
  button.title = 'Play (P)';
  button.innerHTML = '<ion-icon name="game-controller-outline"></ion-icon>';
  document.body.appendChild(button);

  // Controls hint
  const hint = document.createElement('div');
  hint.className = 'egg-hint';
  hint.innerHTML =
    '<kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> run &nbsp;·&nbsp; ' +
    '<kbd>W</kbd> / <kbd>↑</kbd> / <kbd>Space</kbd> jump (×2) &nbsp;·&nbsp; ' +
    '<kbd>S</kbd> / <kbd>↓</kbd> drop &nbsp;·&nbsp; ' +
    'wall jump &nbsp;·&nbsp; ' +
    '<kbd>P</kbd> / <kbd>Esc</kbd> exit';
  document.body.appendChild(hint);

  // Full-screen canvas; the character is drawn in page coordinates minus the scroll
  const canvas = document.createElement('canvas');
  canvas.className = 'egg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const keys = { left: false, right: false, down: false };
  const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    facing: 1, grounded: false, airJumps: 1, runTime: 0,
    dropTimer: 0, dropFromY: 0, standingOn: null,
    wallDir: 0, wallTimer: 0, controlLock: 0
  };
  let platforms = [];
  let walls = [];
  let active = false;
  let followCamera = true;
  let lastTime = 0;
  let frameId = null;
  let scanTimer = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // Collect the top edges of text lines and solid elements, in page coordinates
  function scanPlatforms() {
    const found = [];
    const sy = window.scrollY;

    function add(rect) {
      if (rect.width < 12 || rect.height < 4) return;
      found.push({ x1: rect.left, x2: rect.right, y: Math.round(rect.top + sy) });
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(IGNORE_SELECTOR) || !parent.closest(TEXT_SELECTOR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const range = document.createRange();
    while (walker.nextNode()) {
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) add(rect);
    }

    document.querySelectorAll(BLOCK_SELECTOR).forEach(el => {
      if (el.closest(IGNORE_SELECTOR)) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      add(el.getBoundingClientRect());
    });

    // Solid left/right sides of tall elements, for wall sliding and wall jumps.
    // side 'left' = the element's left edge (solid to its right), 'right' = its right edge.
    const foundWalls = [];
    document.querySelectorAll(WALL_SELECTOR).forEach(el => {
      if (el.closest(IGNORE_SELECTOR)) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < WALL_MIN_HEIGHT || rect.width < 12) return;
      const y1 = rect.top + sy;
      const y2 = rect.bottom + sy;
      foundWalls.push({ x: rect.left, y1, y2, side: 'left' });
      foundWalls.push({ x: rect.right, y1, y2, side: 'right' });
    });

    platforms = found;
    walls = foundWalls;
  }

  function pageBottom() {
    return document.documentElement.scrollHeight;
  }

  function findLanding(prevBottom, newBottom) {
    const feetL = player.x + FOOT_INSET;
    const feetR = player.x + W - FOOT_INSET;
    let best = null;
    for (const p of platforms) {
      // While dropping, ignore the platform we left (compared by height, since rescans replace the objects)
      // Also skip edges just below it (e.g. an image inside its frame) so one drop always goes somewhere
      if (player.dropTimer > 0 && p.y <= player.dropFromY + DROP_GAP) continue;
      if (feetR < p.x1 || feetL > p.x2) continue;
      if (prevBottom <= p.y + 1 && newBottom >= p.y && (!best || p.y < best.y)) best = p;
    }
    return best;
  }

  function supportUnderFeet() {
    const bottom = player.y + H;
    const feetL = player.x + FOOT_INSET;
    const feetR = player.x + W - FOOT_INSET;
    return platforms.find(p => Math.abs(p.y - bottom) <= 2 && feetR >= p.x1 && feetL <= p.x2) || null;
  }

  function land(y, platform) {
    player.y = y - H;
    player.vy = 0;
    player.grounded = true;
    player.airJumps = 1;
    player.standingOn = platform;
  }

  function overlapsVertically(wall) {
    return wall.y1 < player.y + H - 2 && wall.y2 > player.y + 4;
  }

  // Block movement into the side of a tall element (only when coming from outside it)
  function collideWalls(prevX) {
    const prevLeft = prevX + BODY_INSET;
    const prevRight = prevX + W - BODY_INSET;
    for (const wall of walls) {
      if (!overlapsVertically(wall)) continue;
      const left = player.x + BODY_INSET;
      const right = player.x + W - BODY_INSET;
      if (wall.side === 'left' && prevRight <= wall.x + 0.5 && right > wall.x) {
        player.x = wall.x - (W - BODY_INSET);
        player.vx = 0;
      } else if (wall.side === 'right' && prevLeft >= wall.x - 0.5 && left < wall.x) {
        player.x = wall.x - BODY_INSET;
        player.vx = 0;
      }
    }
  }

  // Which side a wall is touching: 1 = wall on the right, -1 = on the left, 0 = none
  function touchingWall() {
    // The screen edges count as walls too
    if (player.x <= 0.5) return -1;
    if (player.x >= window.innerWidth - W - 0.5) return 1;

    const left = player.x + BODY_INSET;
    const right = player.x + W - BODY_INSET;
    for (const wall of walls) {
      if (!overlapsVertically(wall)) continue;
      if (wall.side === 'left' && Math.abs(right - wall.x) <= 1.5) return 1;
      if (wall.side === 'right' && Math.abs(left - wall.x) <= 1.5) return -1;
    }
    return 0;
  }

  function update(dt) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

    if (player.controlLock > 0) {
      // Right after a wall jump, keep the push-off so it can't be cancelled instantly
      player.controlLock -= dt;
    } else if (dir !== 0) {
      player.vx += dir * ACCEL * dt;
      player.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, player.vx));
      player.facing = dir;
    } else {
      const slow = FRICTION * dt;
      player.vx = Math.abs(player.vx) <= slow ? 0 : player.vx - Math.sign(player.vx) * slow;
    }

    const prevX = player.x;
    player.x += player.vx * dt;
    collideWalls(prevX);

    const maxX = window.innerWidth - W;
    if (player.x < 0) {
      player.x = 0;
      player.vx = 0;
    } else if (player.x > maxX) {
      player.x = maxX;
      player.vx = 0;
    }

    // Wall contact while airborne: slide when holding toward the wall, and allow a wall jump
    const wallSide = player.grounded ? 0 : touchingWall();
    const holdingIntoWall = wallSide !== 0 && dir === wallSide;
    if (holdingIntoWall) {
      player.wallDir = wallSide;
      player.wallTimer = WALL_COYOTE;
      player.airJumps = 1;
      player.facing = wallSide;
    } else if (player.wallTimer > 0) {
      player.wallTimer -= dt;
    }

    if (player.dropTimer > 0) player.dropTimer -= dt;

    // Walked off the edge of a platform
    if (player.grounded && player.standingOn && !supportUnderFeet()) {
      player.grounded = false;
      player.standingOn = null;
    }

    if (!player.grounded) {
      player.vy += (GRAVITY + (keys.down ? FAST_FALL : 0)) * dt;
      player.vy = Math.min(player.vy, holdingIntoWall ? WALL_SLIDE_SPEED : MAX_FALL);

      const prevBottom = player.y + H;
      player.y += player.vy * dt;
      const newBottom = player.y + H;

      if (player.vy > 0) {
        const hit = findLanding(prevBottom, newBottom);
        if (hit) land(hit.y, hit);
        else if (newBottom >= pageBottom()) land(pageBottom(), null);
      }
    }

    player.runTime = Math.abs(player.vx) > 20 ? player.runTime + dt : 0;
  }

  // Scroll the page to keep the character on screen
  function updateCamera(dt) {
    if (!followCamera) return;
    const screenY = player.y - window.scrollY;
    let target = null;
    if (screenY < CAMERA_TOP) target = player.y - CAMERA_TOP;
    else if (screenY + H > window.innerHeight - CAMERA_BOTTOM) target = player.y + H - window.innerHeight + CAMERA_BOTTOM;
    if (target === null) return;

    const next = window.scrollY + (target - window.scrollY) * Math.min(1, dt * 8);
    window.scrollTo({ top: next, behavior: 'instant' });
  }

  function currentFrame() {
    if (!player.grounded) return frames.jump;
    if (Math.abs(player.vx) > 20) return Math.floor(player.runTime * 10) % 2 === 0 ? frames.runA : frames.runB;
    return frames.idle;
  }

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const frame = currentFrame()[player.facing < 0 ? 'left' : 'right'];
    const bob = player.grounded && Math.abs(player.vx) <= 20 ? Math.round(Math.sin(lastTime / 300)) : 0;

    // Soft gold glow so the dark hair and jeans stay visible on the dark page
    ctx.shadowColor = 'rgba(255, 219, 112, 0.55)';
    ctx.shadowBlur = 8;
    ctx.drawImage(frame, Math.round(player.x), Math.round(player.y - window.scrollY + bob));
    ctx.shadowBlur = 0;
  }

  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 1 / 30);
    lastTime = time;
    if (!modalOpen()) {
      update(dt);
      updateCamera(dt);
    }
    draw();
    frameId = requestAnimationFrame(loop);
  }

  function jump() {
    if (player.grounded) {
      player.vy = -JUMP_SPEED;
    } else if (player.wallTimer > 0) {
      // Wall jump: kick up and away from the wall, and get the double jump back
      player.vy = -WALL_JUMP_SPEED;
      player.vx = -player.wallDir * WALL_PUSH;
      player.facing = -player.wallDir;
      player.controlLock = WALL_CONTROL_LOCK;
      player.wallTimer = 0;
      player.airJumps = 1;
    } else if (player.airJumps > 0) {
      player.vy = -DOUBLE_JUMP_SPEED;
      player.airJumps--;
    } else {
      return;
    }
    player.grounded = false;
    player.standingOn = null;
  }

  function dropDown() {
    if (!player.grounded || !player.standingOn) return;
    player.dropTimer = DROP_TIME;
    player.dropFromY = player.y + H;
    player.grounded = false;
    player.vy = 120;
  }

  function start() {
    active = true;
    followCamera = true;
    document.body.classList.add('egg-active');
    button.setAttribute('aria-label', 'Stop mini game');
    button.title = 'Stop (P)';
    resize();
    scanPlatforms();

    // Drop in from the top-middle of the current screen
    spawnInView();

    // Layout can change (filters, images loading), so rescan now and then
    scanTimer = setInterval(scanPlatforms, 1000);
    lastTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }

  function stop() {
    active = false;
    document.body.classList.remove('egg-active');
    button.setAttribute('aria-label', 'Play mini game');
    button.title = 'Play (P)';
    cancelAnimationFrame(frameId);
    clearInterval(scanTimer);
    keys.left = keys.right = keys.down = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function toggle() {
    active ? stop() : start();
  }

  function isTyping(target) {
    return target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  function modalOpen() {
    const modal = document.getElementById('portfolio-modal');
    return modal && modal.classList.contains('active');
  }

  function setKey(e, pressed) {
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = pressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = pressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = pressed;
        if (pressed && !e.repeat) dropDown();
        break;
      case 'KeyW':
      case 'ArrowUp':
      case 'Space':
        if (pressed && !e.repeat) jump();
        break;
      default:
        return false;
    }
    if (pressed) resumeCamera();
    return true;
  }

  // After the visitor scrolled or clicked somewhere else, bring the character to them
  // instead of dragging the page back to where it was
  function resumeCamera() {
    if (followCamera) return;
    followCamera = true;
    const screenY = player.y - window.scrollY;
    if (screenY + H < 0 || screenY > window.innerHeight) spawnInView();
  }

  function spawnInView() {
    Object.assign(player, {
      x: (window.innerWidth - W) / 2,
      y: window.scrollY + CAMERA_TOP,
      vx: 0, vy: 0, grounded: false, airJumps: 1, standingOn: null, dropTimer: 0,
      wallDir: 0, wallTimer: 0, controlLock: 0
    });
  }

  button.addEventListener('click', () => {
    toggle();
    button.blur();
  });

  // Capture phase, so an open popup is still detected before its own Esc handler closes it
  window.addEventListener('keydown', e => {
    if (isTyping(e.target) || modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.code === 'KeyP') {
      toggle();
      return;
    }
    if (!active) return;
    if (e.code === 'Escape') {
      stop();
      return;
    }
    // Stop Space and the arrow keys from scrolling the page while playing
    if (setKey(e, true)) e.preventDefault();
  }, true);

  document.addEventListener('keyup', e => {
    if (active) setKey(e, false);
  });

  // Let the visitor scroll and click freely (nav links, buttons, scrollbar);
  // the camera picks up again on the next move
  const pauseCamera = () => {
    if (active) followCamera = false;
  };
  window.addEventListener('wheel', pauseCamera, { passive: true });
  window.addEventListener('pointerdown', pauseCamera, true);

  // Release keys if the window loses focus mid-press
  window.addEventListener('blur', () => {
    keys.left = keys.right = keys.down = false;
  });

  window.addEventListener('resize', () => {
    if (!active) return;
    resize();
    scanPlatforms();
  });

  // Turn off if the screen becomes too small or touch-only
  desktopQuery.addEventListener('change', e => {
    if (!e.matches && active) stop();
  });
})();
