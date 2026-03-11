// ════════════════════════════════════════════════
//  cars.js — Car definitions, preview renders, top-down renders
//
//  SVG sprites are used for the Vacation Wagon only (test implementation).
//  The truck and muscle car still use the original canvas drawing code.
//  To add SVG sprites to the other cars later, follow the same pattern:
//    1. Add an entry to CAR_SPRITES with the car's name as key.
//    2. Provide `preview` and `inGame` image paths.
//    3. Replace drawPreview<n> and drawTop<n> with the SVG draw helpers.
// ════════════════════════════════════════════════

// ── Car definitions ────────────────────────────
// NOTE: w/h are physics collision dimensions — do not change them.
const CAR_DEFS = [
  { name:'wagon',  color:'#d4b882', accent:'#b8956a', roof:'#c8a870',
    w:28, h:50, steerSpeed:0.028, steerReturn:0.055,
    driftFactor:0.45, driftBuild:0.012, maxDrift:22, speed:4.4 },
  { name:'truck',  color:'#e8e4dc', accent:'#6a8ab0', roof:'#d4d0c8',
    w:30, h:54, steerSpeed:0.024, steerReturn:0.05,
    driftFactor:0.5,  driftBuild:0.013, maxDrift:25, speed:4.6 },
  { name:'muscle', color:'#c03028', accent:'#d84030', roof:'#a02020',
    w:32, h:56, steerSpeed:0.022, steerReturn:0.04,
    driftFactor:0.6,  driftBuild:0.014, maxDrift:32, speed:4.8 },
];

// ════════════════════════════════════════════════
//  SVG Sprite Preloader
//
//  Loads SVG assets once at startup into Image objects.
//  drawTopWagon / drawPreviewWagon check .complete before using them
//  and silently fall back to canvas drawing if not yet ready.
//
//  To add sprites for other cars later, un-comment the truck/muscle
//  entries below and supply the correct file paths.
// ════════════════════════════════════════════════

// SVG source paths — relative to index.html
const CAR_SPRITES = {
  wagon: {
    // Top-down in-game sprite (76×136 viewBox — portrait, matches def.w/def.h aspect 0.56)
    inGame:  'assets/vacation_wagon_in_game.svg',
    // Side-view preview sprite (50×28 viewBox — landscape)
    preview: 'assets/vacation_wagon_preview.svg',
  },
  // truck:  { inGame: 'assets/ice_cream_truck_in_game.svg',  preview: 'assets/ice_cream_truck_preview.svg'  },
  // muscle: { inGame: 'assets/pure_muscle_in_game.svg',      preview: 'assets/pure_muscle_preview.svg'      },
};

// Loaded Image objects, keyed by car name
const _sprites = {};

(function preloadSprites() {
  for (const [name, paths] of Object.entries(CAR_SPRITES)) {
    _sprites[name] = { inGame: new Image(), preview: new Image() };
    _sprites[name].inGame.src  = paths.inGame;
    _sprites[name].preview.src = paths.preview;
  }
})();

// ── Shared rounded-rect helper for preview canvases ──
function pRR(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x+r,y); cx.lineTo(x+w-r,y); cx.quadraticCurveTo(x+w,y,x+w,y+r);
  cx.lineTo(x+w,y+h-r); cx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  cx.lineTo(x+r,y+h); cx.quadraticCurveTo(x,y+h,x,y+h-r);
  cx.lineTo(x,y+r); cx.quadraticCurveTo(x,y,x+r,y);
  cx.closePath();
}

// ── Preview dispatcher ─────────────────────────
function drawPreviewCar(id, idx) {
  const el = document.getElementById(id);
  const cx = el.getContext('2d');
  const pw = el.width, ph = el.height;
  cx.clearRect(0, 0, pw, ph);
  if      (idx === 0) drawPreviewWagon(cx, pw, ph);
  else if (idx === 1) drawPreviewTruck(cx, pw, ph);
  else                drawPreviewMuscle(cx, pw, ph);
}

// ════════════════════════════════════════════════
//  WAGON — SVG-based rendering
// ════════════════════════════════════════════════

// ── Vacation Wagon preview (side view, SVG) ─────
//
//  Preview canvas size: 110×130 px (set in index.html).
//  vacation_wagon_preview.svg viewBox: 50×28 (landscape side view).
//
//  We scale the SVG to fill ~90% of canvas width, centred horizontally,
//  and positioned in the upper-centre of the canvas — matching the
//  visual weight of the original canvas-drawn version.
//
function drawPreviewWagon(cx, pw, ph) {
  const img = _sprites.wagon && _sprites.wagon.preview;

  if (!img || !img.complete || img.naturalWidth === 0) {
    // Fallback: original canvas drawing while image loads
    _drawPreviewWagonCanvas(cx, pw, ph);
    return;
  }

  // SVG natural aspect: 50 × 28 (landscape)
  const SVG_W = 50, SVG_H = 28;
  const scale = (pw * 0.88) / SVG_W;    // fill ~88% of canvas width
  const drawW = SVG_W * scale;
  const drawH = SVG_H * scale;
  const dx    = (pw - drawW) / 2;       // horizontally centred
  const dy    = ph * 0.22;              // upper-middle, matching original positioning

  cx.drawImage(img, dx, dy, drawW, drawH);
}

// ── Vacation Wagon top-down in-game (SVG) ───────
//
//  Called from render.js → drawCar(), which has already applied:
//    ctx.translate(screenX, screenY)
//    ctx.rotate(va + la)
//    ctx.scale(1.35, 1.35)
//
//  We draw in local space, centred at the origin (0, 0).
//
//  vacation_wagon_in_game.svg viewBox: 76 × 136.
//  def.w = 28, def.h = 50 (physics box, pre-scale local coords).
//  Aspect ratios: SVG = 76/136 = 0.559, def = 28/50 = 0.560 — near-identical.
//  Drawing at def.w × def.h fills the physics box with zero distortion.
//
//  Orientation: the SVG top edge is the car's FRONT (headlights visible there).
//  In game-space, negative-Y is forward, which matches canvas top = forward.
//  No additional rotation needed.
//
function drawTopWagon(def) {
  const img = _sprites.wagon && _sprites.wagon.inGame;

  if (!img || !img.complete || img.naturalWidth === 0) {
    // Fallback: original canvas drawing while image loads
    _drawTopWagonCanvas(def);
    return;
  }

  const cw = def.w;  // 28 — physics collision width  (local coords, before 1.35 scale)
  const ch = def.h;  // 50 — physics collision height

  // Drop shadow (same as original drawTopWagon)
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(1, 3, cw * 0.52, ch * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw SVG sprite centred at origin, sized to match physics box exactly
  ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
}

// ════════════════════════════════════════════════
//  WAGON — Original canvas fallback drawings
//  Kept verbatim. Used automatically if the SVG hasn't loaded yet.
// ════════════════════════════════════════════════

function _drawPreviewWagonCanvas(cx, pw, ph) {
  const ox = pw/2, oy = ph*0.62;
  const W = 88, H = 34;

  cx.save(); cx.globalAlpha = 0.18;
  cx.fillStyle = '#000';
  cx.beginPath(); cx.ellipse(ox+1, oy+H/2+3, W*0.44, 6, 0, 0, Math.PI*2); cx.fill();
  cx.restore();

  cx.fillStyle = '#d4b882';
  pRR(cx, ox-W/2, oy-H/2, W, H, 5); cx.fill();

  cx.fillStyle = '#c0a06a';
  pRR(cx, ox-W/2, oy+H*0.22, W, H*0.38, 3); cx.fill();

  cx.fillStyle = 'rgba(160,210,230,0.55)';
  pRR(cx, ox-W/2+10, oy-H/2+4, W*0.38, H*0.44, 3); cx.fill();
  pRR(cx, ox-W/2+10+W*0.38+4, oy-H/2+4, W*0.22, H*0.44, 3); cx.fill();

  cx.strokeStyle = '#b09060'; cx.lineWidth = 1.5;
  pRR(cx, ox-W/2+10, oy-H/2+4, W*0.38, H*0.44, 3); cx.stroke();
  pRR(cx, ox-W/2+10+W*0.38+4, oy-H/2+4, W*0.22, H*0.44, 3); cx.stroke();

  cx.fillStyle = '#b09060';
  cx.fillRect(ox-W/2+10+W*0.38+1, oy-H/2+4, 3, H*0.44);

  cx.strokeStyle = '#b89060'; cx.lineWidth = 1;
  cx.beginPath(); cx.moveTo(ox-W/2+2, oy+H*0.05); cx.lineTo(ox+W/2-2, oy+H*0.05); cx.stroke();

  cx.fillStyle = '#8a7050';
  cx.fillRect(ox-W/2+12, oy-H/2-4, W-24, 5);
  cx.fillRect(ox-W/2+12, oy-H/2-4, 3, 4);
  cx.fillRect(ox+W/2-15, oy-H/2-4, 3, 4);

  cx.fillStyle = '#8B4513';
  pRR(cx, ox-W*0.28, oy-H/2-10, 18, 8, 2); cx.fill();
  cx.fillStyle = '#6B3010';
  cx.fillRect(ox-W*0.28+7, oy-H/2-10, 4, 8);
  cx.fillStyle = '#c8a060';
  cx.fillRect(ox-W*0.28+7, oy-H/2-7, 4, 2);
  cx.fillStyle = '#d4602a';
  pRR(cx, ox-W*0.05, oy-H/2-9, 14, 7, 2); cx.fill();
  cx.fillStyle = '#b84820';
  cx.fillRect(ox-W*0.05+5, oy-H/2-9, 3, 7);

  cx.fillStyle = '#c8a870';
  cx.fillRect(ox+W/2-3, oy+H*0.18, 5, H*0.28);
  cx.fillRect(ox-W/2-2, oy+H*0.18, 5, H*0.28);

  cx.fillStyle = 'rgba(255,240,160,0.8)';
  cx.fillRect(ox+W/2-2, oy-H*0.28, 4, 8);
  cx.fillStyle = 'rgba(220,60,50,0.85)';
  cx.fillRect(ox-W/2-2, oy-H*0.28, 4, 8);

  [ox-W/2+14, ox+W/2-14].forEach(wx => {
    const wy = oy+H/2+1;
    cx.fillStyle = '#1a1a1a';
    cx.beginPath(); cx.arc(wx, wy, 11, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#3a3a3a';
    cx.beginPath(); cx.arc(wx, wy, 8, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#606060';
    cx.beginPath(); cx.arc(wx, wy, 4.5, 0, Math.PI*2); cx.fill();
    cx.strokeStyle = '#505050'; cx.lineWidth = 1.2;
    for (let a = 0; a < 6; a++) {
      const ang = a*Math.PI/3;
      cx.beginPath(); cx.moveTo(wx, wy); cx.lineTo(wx+Math.cos(ang)*6, wy+Math.sin(ang)*6); cx.stroke();
    }
  });
}

function _drawTopWagonCanvas(def) {
  const cw = def.w, ch = def.h;

  ctx.save(); ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(1, 3, cw*0.52, ch*0.38, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#d4b882';
  roundRect(ctx, -cw/2, -ch/2, cw, ch, 5); ctx.fill();

  ctx.strokeStyle = '#b89860'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-cw/2+3, 0); ctx.lineTo(cw/2-3, 0); ctx.stroke();

  ctx.fillStyle = '#c8a870';
  roundRect(ctx, -cw/2+3, -ch/2+6, cw-6, ch*0.56, 3); ctx.fill();

  ctx.strokeStyle = '#8a7050'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-cw/2+5, -ch/2+8); ctx.lineTo(cw/2-5, -ch/2+8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-cw/2+5, -ch/2+14); ctx.lineTo(cw/2-5, -ch/2+14); ctx.stroke();
  ctx.strokeStyle = '#786040'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-cw/2+5, -ch/2+8); ctx.lineTo(-cw/2+5, -ch/2+14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cw/2-5, -ch/2+8); ctx.lineTo(cw/2-5, -ch/2+14); ctx.stroke();

  ctx.fillStyle = '#8B4513';
  roundRect(ctx, -cw/2+6, -ch/2+9, cw*0.38, ch*0.12, 1); ctx.fill();
  ctx.fillStyle = '#6B3010';
  ctx.fillRect(-cw/2+6+cw*0.15, -ch/2+9, 2, ch*0.12);
  ctx.fillStyle = '#d4602a';
  roundRect(ctx, cw*0.04, -ch/2+9, cw*0.32, ch*0.1, 1); ctx.fill();

  ctx.fillStyle = 'rgba(160,210,230,0.55)';
  roundRect(ctx, -cw/2+5, -ch/2+20, cw-10, ch*0.13, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,240,255,0.3)'; ctx.lineWidth = 0.8;
  roundRect(ctx, -cw/2+5, -ch/2+20, cw-10, ch*0.13, 2); ctx.stroke();

  ctx.fillStyle = '#b89060';
  roundRect(ctx, -cw/2, -ch/2+ch*0.86, cw, ch*0.14, 3); ctx.fill();

  ctx.fillStyle = 'rgba(220,50,40,0.95)';
  roundRect(ctx, -cw/2+2, ch/2-7, cw*0.28, 5, 1); ctx.fill();
  roundRect(ctx, cw/2-2-cw*0.28, ch/2-7, cw*0.28, 5, 1); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,40,0.7)';
  ctx.fillRect(-cw/2+3, ch/2-6, cw*0.14, 3);
  ctx.fillRect(cw/2-3-cw*0.14, ch/2-6, cw*0.14, 3);

  ctx.fillStyle = 'rgba(255,245,200,0.8)';
  roundRect(ctx, -cw/2+3, -ch/2+2, cw*0.28, 4, 1); ctx.fill();
  roundRect(ctx, cw/2-3-cw*0.28, -ch/2+2, cw*0.28, 4, 1); ctx.fill();

  const wr = 5.5, wh = 10;
  drawWheel(-cw/2-2, -ch*0.3, wr, wh, true);
  drawWheel( cw/2+2, -ch*0.3, wr, wh, true);
  drawWheel(-cw/2-2,  ch*0.3, wr, wh, false);
  drawWheel( cw/2+2,  ch*0.3, wr, wh, false);
}

// ════════════════════════════════════════════════
//  TRUCK & MUSCLE — unchanged canvas rendering
// ════════════════════════════════════════════════

// ── Ice Cream Truck preview (side view) ─────────
function drawPreviewTruck(cx, pw, ph) {
  const ox = pw/2, oy = ph*0.60;
  const W = 86, H = 38;

  cx.save(); cx.globalAlpha = 0.18;
  cx.fillStyle = '#000';
  cx.beginPath(); cx.ellipse(ox, oy+H/2+4, W*0.42, 6, 0, 0, Math.PI*2); cx.fill();
  cx.restore();

  cx.fillStyle = '#e8e4dc';
  pRR(cx, ox-W/2, oy-H/2, W, H, 4); cx.fill();

  cx.fillStyle = '#5a88b8';
  pRR(cx, ox-W/2, oy+H*0.28, W, H*0.38, 3); cx.fill();

  cx.fillStyle = 'rgba(140,100,60,0.4)';
  pRR(cx, ox-W/2+10, oy-H*0.32, W*0.42, H*0.48, 3); cx.fill();
  cx.strokeStyle = '#8a8070'; cx.lineWidth = 1.5;
  pRR(cx, ox-W/2+10, oy-H*0.32, W*0.42, H*0.48, 3); cx.stroke();

  const awL = ox-W/2+8, awR = ox-W/2+8+W*0.44, awY = oy-H*0.32-3;
  for (let i = 0; i < 5; i++) {
    cx.fillStyle = i%2===0 ? '#f0a0b0' : '#f8f0f0';
    cx.fillRect(awL+i*(W*0.44/5), awY-8, W*0.44/5, 10);
  }
  cx.strokeStyle = '#c07080'; cx.lineWidth = 1;
  cx.strokeRect(awL, awY-8, W*0.44, 10);
  cx.fillStyle = '#f0a0b0';
  for (let i = 0; i < 5; i++) {
    const sx = awL+i*(W*0.44/5)+W*0.044/2;
    cx.beginPath(); cx.arc(sx, awY+2, 4, 0, Math.PI); cx.fill();
  }

  const coneX = ox+W*0.18, coneBaseY = oy-H/2;
  cx.fillStyle = '#d4a870';
  cx.beginPath();
  cx.moveTo(coneX-8, coneBaseY); cx.lineTo(coneX+8, coneBaseY); cx.lineTo(coneX, coneBaseY-16);
  cx.closePath(); cx.fill();
  cx.strokeStyle = '#b88a50'; cx.lineWidth = 0.8;
  cx.beginPath(); cx.moveTo(coneX-8, coneBaseY); cx.lineTo(coneX+8, coneBaseY); cx.stroke();
  cx.strokeStyle = '#c09060'; cx.lineWidth = 0.7;
  for (let y = 0; y < 3; y++) {
    const yy = coneBaseY-4-y*4;
    const xspan = 8*(1-(y*4/16));
    cx.beginPath(); cx.moveTo(coneX-xspan, yy); cx.lineTo(coneX+xspan, yy); cx.stroke();
  }
  cx.fillStyle = '#f8d0d8';
  cx.beginPath(); cx.arc(coneX, coneBaseY-16, 7, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#f0a8b8';
  cx.beginPath(); cx.arc(coneX-2, coneBaseY-21, 5, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#f8d0d8';
  cx.beginPath(); cx.arc(coneX+1, coneBaseY-26, 4, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#f0a8b8';
  cx.beginPath(); cx.arc(coneX-1, coneBaseY-30, 2.5, 0, Math.PI*2); cx.fill();

  cx.fillStyle = '#d8d4cc';
  pRR(cx, ox+W/2-22, oy-H/2, 22, H*0.65, 4); cx.fill();
  cx.fillStyle = 'rgba(160,210,230,0.6)';
  pRR(cx, ox+W/2-20, oy-H/2+3, 18, H*0.35, 3); cx.fill();

  cx.fillStyle = 'rgba(255,240,160,0.9)';
  cx.fillRect(ox+W/2-1, oy-H*0.2, 4, 7);
  cx.fillStyle = 'rgba(220,60,50,0.85)';
  cx.fillRect(ox-W/2-3, oy-H*0.1, 4, 8);

  [ox-W/2+13, ox+W/2-13].forEach(wx => {
    const wy = oy+H/2+1;
    cx.fillStyle = '#1a1a1a';
    cx.beginPath(); cx.arc(wx, wy, 11, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#3a3a3a';
    cx.beginPath(); cx.arc(wx, wy, 8, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#585858';
    cx.beginPath(); cx.arc(wx, wy, 4, 0, Math.PI*2); cx.fill();
    cx.strokeStyle = '#484848'; cx.lineWidth = 1.2;
    for (let a = 0; a < 6; a++) {
      const ang = a*Math.PI/3;
      cx.beginPath(); cx.moveTo(wx, wy); cx.lineTo(wx+Math.cos(ang)*6, wy+Math.sin(ang)*6); cx.stroke();
    }
  });
}

// ── Pure Muscle preview (side view) ─────────────
function drawPreviewMuscle(cx, pw, ph) {
  const ox = pw/2, oy = ph*0.64;
  const W = 90, H = 28;

  cx.save(); cx.globalAlpha = 0.2;
  cx.fillStyle = '#000';
  cx.beginPath(); cx.ellipse(ox, oy+H/2+4, W*0.45, 5, 0, 0, Math.PI*2); cx.fill();
  cx.restore();

  cx.fillStyle = '#c03028';
  pRR(cx, ox-W/2, oy-H/2, W, H, 4); cx.fill();

  cx.fillStyle = '#a82820';
  pRR(cx, ox-W/2, oy+H*0.2, W, H*0.42, 3); cx.fill();

  cx.fillStyle = 'rgba(255,255,255,0.88)';
  cx.fillRect(ox-W*0.08, oy-H/2, 10, H);
  cx.fillRect(ox+W*0.05, oy-H/2, 10, H);

  cx.fillStyle = '#8a1818';
  cx.beginPath();
  cx.moveTo(ox-W*0.3, oy-H/2);
  cx.lineTo(ox-W*0.38, oy-H*0.0);
  cx.lineTo(ox+W*0.3, oy-H*0.04);
  cx.lineTo(ox+W*0.36, oy-H/2);
  cx.closePath(); cx.fill();

  cx.fillStyle = 'rgba(150,205,220,0.5)';
  cx.beginPath();
  cx.moveTo(ox-W*0.28, oy-H/2+1); cx.lineTo(ox-W*0.36, oy+H*0.04);
  cx.lineTo(ox-W*0.12, oy+H*0.04); cx.lineTo(ox-W*0.12, oy-H/2+1);
  cx.closePath(); cx.fill();

  cx.fillStyle = 'rgba(150,205,220,0.4)';
  cx.beginPath();
  cx.moveTo(ox+W*0.14, oy-H/2+1); cx.lineTo(ox+W*0.14, oy+H*0.04);
  cx.lineTo(ox+W*0.32, oy+H*0.04); cx.lineTo(ox+W*0.35, oy-H/2+1);
  cx.closePath(); cx.fill();

  cx.fillStyle = '#1a1a1a';
  cx.fillRect(ox-W*0.3-2, oy-H/2-8, W*0.28, 5);
  cx.fillRect(ox-W*0.3-2, oy-H/2-8, 3, 8);
  cx.fillRect(ox-W*0.3-2+W*0.28-3, oy-H/2-8, 3, 8);

  cx.fillStyle = '#606060';
  cx.fillRect(ox-W*0.42, oy+H*0.28, 16, 5);
  cx.fillRect(ox-W*0.42, oy+H*0.38, 16, 4);
  cx.fillStyle = '#888';
  cx.fillRect(ox-W*0.42+13, oy+H*0.28, 3, 5);
  cx.fillRect(ox-W*0.42+13, oy+H*0.38, 3, 4);

  cx.fillStyle = 'rgba(255,240,160,0.8)';
  cx.fillRect(ox+W/2-2, oy-H*0.2, 4, 7);
  cx.fillStyle = 'rgba(220,50,40,0.9)';
  cx.fillRect(ox-W/2-2, oy-H*0.2, 4, 7);
  cx.fillStyle = 'rgba(255,100,60,0.5)';
  cx.fillRect(ox-W/2-2, oy-H*0.05, 4, 4);

  [ox-W/2+14, ox+W/2-14].forEach(wx => {
    const wy = oy+H/2+2;
    cx.fillStyle = '#111';
    cx.beginPath(); cx.arc(wx, wy, 12, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#2a2a2a';
    cx.beginPath(); cx.arc(wx, wy, 9, 0, Math.PI*2); cx.fill();
    cx.fillStyle = '#888';
    cx.beginPath(); cx.arc(wx, wy, 5, 0, Math.PI*2); cx.fill();
    cx.strokeStyle = '#666'; cx.lineWidth = 1.5;
    for (let a = 0; a < 5; a++) {
      const ang = a*Math.PI*2/5;
      cx.beginPath(); cx.moveTo(wx+Math.cos(ang)*2, wy+Math.sin(ang)*2);
      cx.lineTo(wx+Math.cos(ang)*8, wy+Math.sin(ang)*8); cx.stroke();
    }
  });
}

// ════════════════════════════════════════════════
//  Top-down in-game car rendering
// ════════════════════════════════════════════════

// Shared top-down wheel helper (uses global ctx & car)
function drawWheel(x, y, w, h, steer) {
  ctx.save(); ctx.translate(x, y);
  if (steer) ctx.rotate(car.steerInput * 0.35);
  ctx.fillStyle = '#1a1a18';
  roundRect(ctx, -w/2, -h/2, w, h, 2); ctx.fill();
  ctx.fillStyle = '#2e2e2c';
  ctx.fillRect(-w/2+1, -h/2+2, w-2, h-4);
  ctx.restore();
}

// ── Ice Cream Truck — top-down rear view ─────────
function drawTopTruck(def) {
  const cw = def.w, ch = def.h;

  ctx.save(); ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(1, 3, cw*0.55, ch*0.42, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e8e4dc';
  roundRect(ctx, -cw/2, -ch/2, cw, ch, 4); ctx.fill();

  ctx.fillStyle = '#5a88b8';
  ctx.fillRect(-cw/2, ch*0.1, cw, ch*0.22);

  ctx.fillStyle = '#d8d4cc';
  roundRect(ctx, -cw/2+3, -ch/2+4, cw-6, ch*0.5, 3); ctx.fill();

  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i%2===0 ? '#f0a0b0' : '#f5f0ec';
    ctx.fillRect(-cw/2+4+i*(cw-8)/5, -ch/2+4, (cw-8)/5, ch*0.18);
  }

  const coneX = 0, coneY = -ch*0.1;
  ctx.fillStyle = '#d4a870';
  ctx.beginPath(); ctx.moveTo(coneX-7, coneY+6); ctx.lineTo(coneX+7, coneY+6); ctx.lineTo(coneX, coneY+18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b88a50'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(coneX-7, coneY+6); ctx.lineTo(coneX+7, coneY+6); ctx.stroke();
  ctx.fillStyle = '#f8d0d8';
  ctx.beginPath(); ctx.arc(coneX, coneY+3, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f0a8b8';
  ctx.beginPath(); ctx.arc(coneX, coneY-2, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f8d0d8';
  ctx.beginPath(); ctx.arc(coneX, coneY-7, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f0b0c0';
  ctx.beginPath(); ctx.arc(coneX, coneY-11, 2, 0, Math.PI*2); ctx.fill();
  const sprinkles = [[-3,-4,'#e84'],[4,-2,'#4a8'],[2,2,'#84e'],[-4,1,'#e44'],[0,-8,'#4ae']];
  sprinkles.forEach(([sx, sy, sc]) => { ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(coneX+sx, coneY+sy, 0.9, 0, Math.PI*2); ctx.fill(); });

  ctx.fillStyle = '#d0ccc4';
  roundRect(ctx, -cw/2, ch/2-9, cw, 9, 2); ctx.fill();

  ctx.fillStyle = 'rgba(220,50,40,0.95)';
  roundRect(ctx, -cw/2+2, ch/2-7, cw*0.25, 5, 1); ctx.fill();
  roundRect(ctx, cw/2-2-cw*0.25, ch/2-7, cw*0.25, 5, 1); ctx.fill();

  ctx.fillStyle = 'rgba(255,245,200,0.85)';
  roundRect(ctx, -cw/2+3, -ch/2+2, cw*0.25, 4, 1); ctx.fill();
  roundRect(ctx, cw/2-3-cw*0.25, -ch/2+2, cw*0.25, 4, 1); ctx.fill();

  const wr = 5.5, wh = 11;
  drawWheel(-cw/2-2, -ch*0.3, wr, wh, true);
  drawWheel( cw/2+2, -ch*0.3, wr, wh, true);
  drawWheel(-cw/2-2,  ch*0.3, wr, wh, false);
  drawWheel( cw/2+2,  ch*0.3, wr, wh, false);
}

// ── Pure Muscle — top-down rear view ─────────────
function drawTopMuscle(def) {
  const cw = def.w, ch = def.h;

  ctx.save(); ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(1, 4, cw*0.58, ch*0.4, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#c03028';
  roundRect(ctx, -cw/2, -ch/2, cw, ch, 4); ctx.fill();

  ctx.fillStyle = '#a02020';
  ctx.fillRect(-cw/2, ch*0.12, cw, ch*0.3);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-cw*0.12, -ch/2, cw*0.1, ch);
  ctx.fillRect( cw*0.02, -ch/2, cw*0.1, ch);

  ctx.fillStyle = '#8a1818';
  roundRect(ctx, -cw/2+4, -ch/2+8, cw-8, ch*0.42, 3); ctx.fill();

  ctx.fillStyle = 'rgba(150,210,225,0.5)';
  roundRect(ctx, -cw/2+6, -ch/2+16, cw-12, ch*0.14, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,240,255,0.3)'; ctx.lineWidth = 0.7;
  roundRect(ctx, -cw/2+6, -ch/2+16, cw-12, ch*0.14, 2); ctx.stroke();

  ctx.fillStyle = '#701010';
  roundRect(ctx, -cw*0.12, -ch/2+2, cw*0.24, ch*0.1, 2); ctx.fill();
  ctx.fillStyle = '#1a0808';
  roundRect(ctx, -cw*0.09, -ch/2+3, cw*0.18, ch*0.06, 1); ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, -cw/2-3, ch/2-5, cw+6, 4, 1); ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-cw/2+4, ch/2-10, 4, 6);
  ctx.fillRect( cw/2-8,  ch/2-10, 4, 6);

  ctx.fillStyle = '#585850';
  roundRect(ctx, -cw/2-3, ch*0.08, 4, 8, 1); ctx.fill();
  roundRect(ctx, -cw/2-3, ch*0.22, 4, 8, 1); ctx.fill();
  ctx.fillStyle = '#888880';
  ctx.beginPath(); ctx.ellipse(-cw/2-2, ch*0.08+4, 1.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-cw/2-2, ch*0.22+4, 1.5, 3, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#901818';
  roundRect(ctx, -cw/2, ch/2-8, cw, 8, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,50,40,0.95)';
  roundRect(ctx, -cw/2+2, ch/2-7, cw*0.32, 5, 1); ctx.fill();
  roundRect(ctx, cw/2-2-cw*0.32, ch/2-7, cw*0.32, 5, 1); ctx.fill();
  ctx.fillStyle = 'rgba(255,80,60,0.6)';
  ctx.fillRect(-cw*0.08, ch/2-7, cw*0.16, 5);

  ctx.fillStyle = 'rgba(255,245,180,0.85)';
  roundRect(ctx, -cw/2+3, -ch/2+2, cw*0.3, 4, 1); ctx.fill();
  roundRect(ctx, cw/2-3-cw*0.3, -ch/2+2, cw*0.3, 4, 1); ctx.fill();

  const wr = 6, wh = 11;
  drawWheel(-cw/2-3, -ch*0.28, wr, wh, true);
  drawWheel( cw/2+3, -ch*0.28, wr, wh, true);
  drawWheel(-cw/2-3,  ch*0.3,  wr, wh, false);
  drawWheel( cw/2+3,  ch*0.3,  wr, wh, false);
}
