// ════════════════════════════════════════════════
//  ui.js — HUD, screen transitions, button wiring
// ════════════════════════════════════════════════

// ── Game-flow functions ────────────────────────
function startGame() {
  if (selectedCar < 0) return;
  tireMarks = []; smokeParticles = []; leafParticles = []; sceneryObjects = []; gameTime = 0;
  initRoad(); initCar(selectedCar);
  updateCamera(); camX = car.x; camY = car.y; camAngle = car.angle + Math.PI/2;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('gameover-screen').classList.remove('show');
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('drift-indicator').style.display = 'block';
  if (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
    document.getElementById('mobile-controls').style.display = 'block';
  STATE = 'play';
}

function endGame() {
  const m = Math.floor(car.distanceTraveled / 8);
  if (m > bestDistance) bestDistance = m;
  document.getElementById('go-dist').textContent  = m + 'm';
  document.getElementById('go-best').textContent  = bestDistance + 'm';
  document.getElementById('gameover-screen').classList.add('show');
  STATE = 'over';
}

function retryGame() {
  document.getElementById('gameover-screen').classList.remove('show');
  startGame();
}

function changeCar() {
  document.getElementById('gameover-screen').classList.remove('show');
  document.getElementById('hud').style.display = 'none';
  document.getElementById('drift-indicator').style.display = 'none';
  document.getElementById('mobile-controls').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  drawStartBG();
  STATE = 'start';
  keys.left = false; keys.right = false;
}

// ── HUD update (called each game tick) ─────────
function updateHUD() {
  const m = Math.floor(car.distanceTraveled / 8);
  document.getElementById('hud-dist').textContent = m + 'm';
  document.getElementById('hud-best').textContent = Math.max(m, bestDistance) + 'm';
  document.getElementById('drift-indicator').classList.toggle('active', car.driftAmount > 0.3);
}

// ── Car selection cards ────────────────────────
document.querySelectorAll('.car-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.car-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCar = parseInt(card.dataset.car);
    document.getElementById('start-btn').classList.add('visible');
  });
});

// ── Button listeners ───────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', retryGame);
document.getElementById('change-car-btn').addEventListener('click', changeCar);

// ── Boot — runs after all files are loaded ─────
for (let i = 0; i < 3; i++) drawPreviewCar('preview-' + i, i);
drawStartBG();
