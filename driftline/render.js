// ════════════════════════════════════════════════
//  render.js — Camera, world-to-screen, and all draw functions
// ════════════════════════════════════════════════

// ── Camera ─────────────────────────────────────
let camX = 0, camY = 0, camAngle = 0;

function updateCamera() {
  const ta = car.angle + Math.PI/2;
  camX += (car.x - camX)*0.08;
  camY += (car.y - camY)*0.08;
  let da = ta - camAngle;
  while (da >  Math.PI) da -= Math.PI*2;
  while (da < -Math.PI) da += Math.PI*2;
  camAngle += da*0.08;
}

function w2s(wx, wy) {
  const dx = wx - camX, dy = wy - camY;
  const cos = Math.cos(-camAngle), sin = Math.sin(-camAngle);
  return {
    x: canvas.width/2  + dx*cos - dy*sin,
    y: canvas.height*0.55 + dx*sin + dy*cos
  };
}

// ── Draw Road ──────────────────────────────────
function drawRoad() {
  if (roadSegs.length < 2) return;
  ctx.fillStyle = '#3a3a30'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const n = roadSegs.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const seg = roadSegs[i], perp = seg.angle + Math.PI/2;
    left.push(w2s(seg.x + Math.cos(perp)*ROAD_W, seg.y + Math.sin(perp)*ROAD_W));
    right.push(w2s(seg.x - Math.cos(perp)*ROAD_W, seg.y - Math.sin(perp)*ROAD_W));
  }

  // road surface
  ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fillStyle = '#4a4a44'; ctx.fill();

  // centre dashes
  ctx.save(); ctx.strokeStyle = 'rgba(255,240,180,0.18)'; ctx.lineWidth = 2; ctx.setLineDash([24, 28]);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const s = w2s(roadSegs[i].x, roadSegs[i].y);
    if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke(); ctx.restore();

  // edge lines
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(right[0].x, right[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(right[i].x, right[i].y); ctx.stroke();
  ctx.restore();

  // curb stripes
  for (let i = 0; i < n-1; i += 2) {
    const s = roadSegs[i], s2 = roadSegs[Math.min(i+2, n-1)];
    const p = s.angle+Math.PI/2, p2 = s2.angle+Math.PI/2;
    const col = (i/2)%2===0 ? 'rgba(220,60,50,0.5)' : 'rgba(240,240,230,0.4)';
    [[1],[-1]].forEach(([sign]) => {
      const a  = w2s(s.x  + Math.cos(p) *sign*(ROAD_W-6), s.y  + Math.sin(p) *sign*(ROAD_W-6));
      const b  = w2s(s.x  + Math.cos(p) *sign*(ROAD_W+6), s.y  + Math.sin(p) *sign*(ROAD_W+6));
      const c2 = w2s(s2.x + Math.cos(p2)*sign*(ROAD_W-6), s2.y + Math.sin(p2)*sign*(ROAD_W-6));
      const d  = w2s(s2.x + Math.cos(p2)*sign*(ROAD_W+6), s2.y + Math.sin(p2)*sign*(ROAD_W+6));
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(c2.x, c2.y);
      ctx.closePath(); ctx.fill();
    });
  }
}

// ── Draw Scenery ───────────────────────────────
function drawScenery() {
  for (const obj of sceneryObjects) {
    const s = w2s(obj.x, obj.y);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(obj.angle - camAngle);
    switch (obj.type) {
      case 'gasstation': dGasStation(); break;
      case 'tires':      dTireStack();  break;
      case 'fence':      dFence();      break;
      case 'smallhouse': dHouse();      break;
      case 'parkedcar':  dParkedCar();  break;
      case 'barrier':    dBarrier();    break;
      case 'bush':       dBush();       break;
    }
    ctx.restore();
  }
}

function dGasStation() {
  ctx.fillStyle = '#5a5248'; ctx.fillRect(-28, -18, 56, 6);
  ctx.fillStyle = '#4a4240'; ctx.fillRect(-24, -28, 6, 10); ctx.fillRect(18, -28, 6, 10);
  ctx.fillStyle = '#6a6058'; ctx.fillRect(4, -26, 8, 16);
  ctx.fillStyle = '#888070'; ctx.fillRect(6, -24, 4, 8);
}
function dTireStack() {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#282820'; ctx.beginPath(); ctx.ellipse(i*8-8, 0, 7, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#383830'; ctx.beginPath(); ctx.ellipse(i*8-8, -3, 5, 3.5, 0, 0, Math.PI*2); ctx.fill();
  }
}
function dFence() {
  ctx.strokeStyle = '#6a5a48'; ctx.lineWidth = 2;
  for (let i = -30; i <= 30; i += 10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, -12); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(30, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(30, -4); ctx.stroke();
}
function dHouse() {
  ctx.fillStyle = '#5a5248'; ctx.fillRect(-18, -14, 36, 22);
  ctx.fillStyle = '#4a3e38';
  ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(0, -32); ctx.lineTo(22, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a3028'; ctx.fillRect(-6, -6, 10, 14);
  ctx.fillStyle = '#2a2a22'; ctx.fillRect(8, -8, 6, 6);
}
function dParkedCar() {
  ctx.fillStyle = '#5a5858';
  roundRect(ctx, -14, -8, 28, 16, 4); ctx.fill();
  ctx.fillStyle = '#383838'; ctx.fillRect(-10, -6, 8, 4); ctx.fillRect(2, -6, 8, 4);
  ctx.fillStyle = '#222';
  [[-12,-5],[-12,5],[12,-5],[12,5]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.ellipse(wx, wy, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  });
}
function dBarrier() {
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i%2===0 ? '#cc4422' : '#ddd';
    ctx.fillRect(i*12-5, -10, 10, 18);
  }
}
function dBush() {
  const cols = ['#3a4a2a','#4a5a3a','#2a3a1a'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i%3];
    ctx.beginPath(); ctx.arc((i-1)*10, -(i===1?8:5), 8+i*2, 0, Math.PI*2); ctx.fill();
  }
}

// ── Draw Car (dispatches to cars.js) ───────────
function drawCar() {
  const s = w2s(car.x, car.y);
  const def = car.def;
  const va = car.angle - camAngle + Math.PI/2;
  const la = car.driftAngle*0.5;
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(va + la);
  ctx.scale(1.35, 1.35);
  if      (def.name === 'wagon')  drawTopWagon(def);
  else if (def.name === 'truck')  drawTopTruck(def);
  else                            drawTopMuscle(def);
  ctx.restore();
}

// ── Draw Particles ─────────────────────────────
function drawParticles() {
  for (const tm of tireMarks) {
    const s = w2s(tm.x, tm.y);
    ctx.save(); ctx.globalAlpha = tm.alpha*0.5; ctx.fillStyle = '#1a1a18';
    ctx.beginPath(); ctx.arc(s.x, s.y, tm.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  for (const p of smokeParticles) {
    const s = w2s(p.x, p.y);
    ctx.save(); ctx.globalAlpha = p.life*0.4;
    ctx.fillStyle = `rgba(200,200,180,${p.life*0.3})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, p.size*(2-p.life), 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  for (const lf of leafParticles) {
    ctx.save(); ctx.translate(lf.x, lf.y); ctx.rotate(lf.angle);
    ctx.globalAlpha = lf.life*0.7; ctx.fillStyle = '#7a8a4a';
    ctx.beginPath(); ctx.ellipse(0, 0, lf.size, lf.size*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Start screen background ────────────────────
function drawStartBG() {
  ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx2 = canvas.width/2;
  ctx.fillStyle = 'rgba(74,74,68,0.3)';
  ctx.beginPath();
  ctx.moveTo(cx2-80, canvas.height); ctx.lineTo(cx2-40, canvas.height*0.3);
  ctx.lineTo(cx2+40, canvas.height*0.3); ctx.lineTo(cx2+80, canvas.height);
  ctx.closePath(); ctx.fill();
}
