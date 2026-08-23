// ════════════════════════════════════════════════
//  game.js — Canvas setup, shared helpers, car physics, game loop
// ════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  if (STATE !== 'play') drawStartBG();
});

// ── Global state ───────────────────────────────
let STATE       = 'start';
let selectedCar = -1;
let bestDistance = 0;

// ── Shared canvas helper ───────────────────────
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.quadraticCurveTo(x+w, y, x+w, y+r);
  c.lineTo(x+w, y+h-r); c.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  c.lineTo(x+r, y+h); c.quadraticCurveTo(x, y+h, x, y+h-r);
  c.lineTo(x, y+r); c.quadraticCurveTo(x, y, x+r, y);
  c.closePath();
}

// ── Car state ──────────────────────────────────
let car = {
  x: 0, y: 0, angle: -Math.PI/2,
  driftAngle: 0, driftAmount: 0, steerInput: 0,
  def: null, distanceTraveled: 0, alive: true, crashTimer: 0
};

function initCar(idx) {
  const def = CAR_DEFS[idx];
  car.def = def;
  const seg = roadSegs[4];
  car.x = seg.x; car.y = seg.y; car.angle = seg.angle;
  car.driftAngle = 0; car.driftAmount = 0; car.steerInput = 0;
  car.distanceTraveled = 0; car.alive = true; car.crashTimer = 0;
}

// ── Input ──────────────────────────────────────
const keys = { left: false, right: false };

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

document.getElementById('btn-left').addEventListener('touchstart',  e => { e.preventDefault(); keys.left  = true;  }, { passive: false });
document.getElementById('btn-left').addEventListener('touchend',    e => { e.preventDefault(); keys.left  = false; }, { passive: false });
document.getElementById('btn-right').addEventListener('touchstart', e => { e.preventDefault(); keys.right = true;  }, { passive: false });
document.getElementById('btn-right').addEventListener('touchend',   e => { e.preventDefault(); keys.right = false; }, { passive: false });

// ── Off-road check ─────────────────────────────
function lateralOffRoad() {
  let best = Infinity, bestIdx = 0;
  for (let i = 0; i < roadSegs.length; i++) {
    const seg = roadSegs[i], dx = car.x - seg.x, dy = car.y - seg.y;
    const d2 = dx*dx + dy*dy; if (d2 < best) { best = d2; bestIdx = i; }
  }
  const seg = roadSegs[bestIdx];
  const dx = car.x - seg.x, dy = car.y - seg.y, perp = seg.angle + Math.PI/2;
  return Math.abs(dx*Math.cos(perp) + dy*Math.sin(perp));
}

// ── Update ─────────────────────────────────────
let gameTime = 0;

function updateGame() {
  if (!car.alive) return;
  gameTime++;
  roadDifficulty = Math.min(1, gameTime / 3600);
  while (roadSegs.length < VISIBLE_SEGS+20) extendRoad();

  const def = car.def;
  let steer = 0;
  if (keys.left)  steer = -1;
  if (keys.right) steer =  1;

  car.steerInput += (steer - car.steerInput)*0.15;
  if (steer !== 0) {
    car.driftAngle  += steer * def.driftBuild * 2;
    car.driftAmount  = Math.min(1, car.driftAmount + 0.025);
  } else {
    car.driftAngle  *= (1 - def.steerReturn);
    car.driftAmount  = Math.max(0, car.driftAmount - 0.04);
  }
  car.driftAngle = Math.max(-def.maxDrift*Math.PI/180, Math.min(def.maxDrift*Math.PI/180, car.driftAngle));
  car.angle += car.steerInput*def.steerSpeed + car.driftAngle*def.driftFactor*0.015;
  car.x += Math.cos(car.angle)*def.speed;
  car.y += Math.sin(car.angle)*def.speed;
  car.distanceTraveled += def.speed;

  // tire marks
  if (car.driftAmount > 0.3) {
    const perp = car.angle + Math.PI/2, ww = def.w*0.45;
    tireMarks.push({ x: car.x + Math.cos(perp)*ww, y: car.y + Math.sin(perp)*ww, r: 2.5, alpha: car.driftAmount });
    tireMarks.push({ x: car.x - Math.cos(perp)*ww, y: car.y - Math.sin(perp)*ww, r: 2.5, alpha: car.driftAmount });
    if (tireMarks.length > 600) tireMarks.splice(0, 50);
  }

  // smoke
  if (car.driftAmount > 0.5 && Math.random() < 0.4) {
    const back = car.angle + Math.PI;
    spawnSmoke(car.x + Math.cos(back)*def.h*0.4, car.y + Math.sin(back)*def.h*0.4);
  }

  // update smoke & leaves
  for (const p of smokeParticles) { p.x += p.vx; p.y += p.vy; p.life -= 0.022; }
  smokeParticles = smokeParticles.filter(p => p.life > 0);
  maybeSpawnLeaf();
  for (const lf of leafParticles) { lf.x += lf.vx; lf.y += lf.vy; lf.angle += lf.spin; lf.life -= 0.004; }
  leafParticles = leafParticles.filter(lf => lf.life > 0 && lf.y < canvas.height+20);

  // cull road & spawn scenery
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < roadSegs.length; i++) {
    const seg = roadSegs[i], dx = car.x - seg.x, dy = car.y - seg.y, d2 = dx*dx + dy*dy;
    if (d2 < bestDist) { bestDist = d2; bestIdx = i; }
  }
  if (bestIdx > 10) {
    const newSeg = roadSegs[roadSegs.length-1];
    if (Math.random() < 0.3) spawnScenery(newSeg, roadSegs.length-1);
    roadSegs.splice(0, bestIdx-8);
    sceneryObjects = sceneryObjects.filter(o => o.segIdx >= bestIdx-10);
  }

  // off-road crash
  const lat = lateralOffRoad();
  if (lat > ROAD_W+30) {
    car.crashTimer++;
    if (car.crashTimer > 30) { car.alive = false; endGame(); }
  } else {
    car.crashTimer = 0;
  }

  updateHUD();
}

// ── Game loop ──────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (STATE !== 'play') return;
  updateCamera(); updateGame();
  ctx.fillStyle = '#3a3a30'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawRoad(); drawParticles(); drawScenery(); drawCar();
  // vignette
  const g = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, canvas.height*0.2,
    canvas.width/2, canvas.height/2, canvas.height*0.8
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
}
requestAnimationFrame(gameLoop);

// Boot is called at the end of ui.js, after all files are loaded.
