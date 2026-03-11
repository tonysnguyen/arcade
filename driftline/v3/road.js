// ════════════════════════════════════════════════
//  road.js — Road generation, scenery, particles
// ════════════════════════════════════════════════

// ── Road constants & state ─────────────────────
const ROAD_W = 220, SEG_LEN = 60, VISIBLE_SEGS = 80;
let roadSegs = [], roadGenAngle = -Math.PI/2, roadGenX = 0, roadGenY = 0;
let roadGenCurvature = 0, roadGenCurveTarget = 0, roadGenTimer = 0, roadDifficulty = 0;

function initRoad() {
  roadSegs = []; roadGenAngle = -Math.PI/2; roadGenX = 0; roadGenY = 0;
  roadGenCurvature = 0; roadGenCurveTarget = 0; roadGenTimer = 0; roadDifficulty = 0;
  for (let i = 0; i < VISIBLE_SEGS+20; i++) extendRoad();
}

function extendRoad() {
  roadGenTimer--;
  if (roadGenTimer <= 0) {
    const maxC = 0.012 + roadDifficulty*0.022;
    roadGenCurveTarget = (Math.random()-0.5)*2*maxC;
    roadGenTimer = 30 + Math.floor(Math.random()*60*(1-roadDifficulty*0.5));
  }
  roadGenCurvature += (roadGenCurveTarget - roadGenCurvature)*0.06;
  roadGenAngle += roadGenCurvature;
  roadSegs.push({ x: roadGenX, y: roadGenY, angle: roadGenAngle });
  roadGenX += Math.cos(roadGenAngle)*SEG_LEN;
  roadGenY += Math.sin(roadGenAngle)*SEG_LEN;
}

// ── Scenery ────────────────────────────────────
let sceneryObjects = [];
const SCENERY_TYPES = ['gasstation','tires','fence','smallhouse','parkedcar','barrier','bush'];

function spawnScenery(seg, segIdx) {
  if (segIdx < 5) return;
  const type = SCENERY_TYPES[Math.floor(Math.random()*SCENERY_TYPES.length)];
  const side = Math.random() < 0.5 ? -1 : 1;
  const offset = ROAD_W + 40 + Math.random()*120;
  const px = seg.x + Math.cos(seg.angle+Math.PI/2)*side*offset;
  const py = seg.y + Math.sin(seg.angle+Math.PI/2)*side*offset;
  sceneryObjects.push({ type, x: px, y: py, angle: Math.random()*Math.PI*2, segIdx });
}

// ── Particles ──────────────────────────────────
let smokeParticles = [], leafParticles = [], tireMarks = [];

function spawnSmoke(x, y) {
  for (let i = 0; i < 2; i++) {
    smokeParticles.push({
      x, y,
      vx: (Math.random()-0.5)*0.8, vy: (Math.random()-0.5)*0.8,
      life: 1, size: 4+Math.random()*5
    });
  }
}

let leafTimer = 0;
function maybeSpawnLeaf() {
  leafTimer++;
  if (leafTimer > 40+Math.random()*80) {
    leafTimer = 0;
    leafParticles.push({
      x: Math.random()*canvas.width, y: -10,
      vx: 0.4+Math.random()*0.8, vy: 0.6+Math.random()*1.2,
      angle: Math.random()*Math.PI*2, spin: (Math.random()-0.5)*0.06,
      size: 3+Math.random()*3, life: 1
    });
  }
}
