// ============================================================
//  TIC TAC TOE — POCKETPLAY EDITION
//  game.js
// ============================================================

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────
  const startScreen   = document.getElementById('startScreen');
  const gameScreen    = document.getElementById('gameScreen');
  const matchScreen   = document.getElementById('matchScreen');
  const roundOverlay  = document.getElementById('roundOverlay');
  const startBtn      = document.getElementById('startBtn');
  const nextRoundBtn  = document.getElementById('nextRoundBtn');
  const replayBtn     = document.getElementById('replayBtn');
  const soundToggle   = document.getElementById('soundToggle');
  const boardEl       = document.getElementById('board');
  const cells         = Array.from(document.querySelectorAll('.cell'));
  const statusBar     = document.getElementById('statusBar');
  const scorePlayerEl = document.getElementById('scorePlayer');
  const scoreCpuEl    = document.getElementById('scoreCpu');
  const roundLabel    = document.getElementById('roundLabel');
  const overlayMsg    = document.getElementById('overlayMsg');
  const matchResult   = document.getElementById('matchResult');
  const matchMsg      = document.getElementById('matchMsg');
  const finalScore    = document.getElementById('finalScore');
  const flavorStart   = document.getElementById('flavorStart');
  const pips          = [0,1,2].map(i => document.getElementById('pip'+i));

  // ── State ─────────────────────────────────────────────────
  let board       = Array(9).fill(null);  // null | 'X' | 'O'
  let currentRound = 1;                   // 1-based
  let scorePlayer  = 0;
  let scoreCpu     = 0;
  let roundResults = [];                  // 'win'|'loss'|'draw' per round
  let gameActive   = false;
  let soundOn      = true;

  // ── Copy banks ────────────────────────────────────────────
  const copy = {
    startFlavor: [
      "Think you could beat me?",
      "Ready to embarrass yourself?",
      "Let's see what you've got.",
      "Go on, impress me.",
    ],
    ingame: [
      "Your move, genius.",
      "Don't overthink it.",
      "This should be good.",
      "Bold choice.",
      "Huh. Interesting.",
      "Okay, okay...",
      "I'm watching.",
    ],
    aiThinking: [
      "Hmm...",
      "Let me think...",
      "Oh, I see it.",
      "Easy.",
    ],
    win: [
      "Wow, you beat me.",
      "Okay, rude.",
      "Beginner's luck?",
      "Fine. You got one.",
      "Whatever.",
    ],
    loss: [
      "Nice try.",
      "Better luck next time.",
      "Oof. That was rough.",
      "You really walked into that one.",
      "Did you even try?",
    ],
    draw: [
      "Nobody wins. Boring.",
      "A tie? Really?",
      "Stalemate.",
      "Not bad, I guess.",
      "Well... that happened.",
    ],
    matchWin: [
      "Alright, you win. Don't get cocky.",
      "Okay okay, you got me.",
      "Enjoy your tiny victory.",
    ],
    matchLoss: [
      "Told you so.",
      "Better luck next time.",
      "Maybe stick to checkers.",
    ],
    matchDraw: [
      "A draw? How dull.",
      "Neither of us wins. Great.",
    ],
  };

  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Audio (Web Audio API — no external files) ─────────────
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, volume, delay = 0) {
    if (!soundOn) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    } catch(e) {}
  }

  const sfx = {
    tap: () => {
      playTone(440, 'square', 0.06, 0.15);
    },
    aiMove: () => {
      playTone(280, 'square', 0.06, 0.12);
    },
    win: () => {
      playTone(523, 'square', 0.1, 0.2);
      playTone(659, 'square', 0.1, 0.2, 0.12);
      playTone(784, 'square', 0.18, 0.2, 0.24);
    },
    loss: () => {
      playTone(300, 'sawtooth', 0.1, 0.18);
      playTone(220, 'sawtooth', 0.18, 0.18, 0.12);
    },
    draw: () => {
      playTone(350, 'square', 0.08, 0.15);
      playTone(350, 'square', 0.08, 0.1, 0.14);
    },
    start: () => {
      playTone(392, 'square', 0.08, 0.15);
      playTone(523, 'square', 0.12, 0.15, 0.1);
    },
    matchWin: () => {
      [523,659,784,1047].forEach((f,i) => playTone(f,'square',0.12,0.2,i*0.1));
    },
    matchLoss: () => {
      [300,250,200].forEach((f,i) => playTone(f,'sawtooth',0.12,0.2,i*0.12));
    },
  };

  // ── Win detection ─────────────────────────────────────────
  const WINS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  function checkWinner(b) {
    for (const [a,c,d] of WINS) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], line: [a,c,d] };
      }
    }
    if (b.every(v => v !== null)) return { winner: 'draw', line: [] };
    return null;
  }

  // ── AI logic ──────────────────────────────────────────────
  function getBestMove(b) {
    // 1. Win if possible
    for (const [a,c,d] of WINS) {
      if (b[a] === 'O' && b[c] === 'O' && b[d] === null) return d;
      if (b[a] === 'O' && b[d] === 'O' && b[c] === null) return c;
      if (b[c] === 'O' && b[d] === 'O' && b[a] === null) return a;
    }
    // 2. Block player
    for (const [a,c,d] of WINS) {
      if (b[a] === 'X' && b[c] === 'X' && b[d] === null) return d;
      if (b[a] === 'X' && b[d] === 'X' && b[c] === null) return c;
      if (b[c] === 'X' && b[d] === 'X' && b[a] === null) return a;
    }
    // 3. Center
    if (b[4] === null) return 4;
    // 4. Corners
    const corners = [0,2,6,8].filter(i => b[i] === null);
    if (corners.length) return rand(corners);
    // 5. Any open
    const open = b.map((v,i) => v===null?i:null).filter(v=>v!==null);
    return open.length ? rand(open) : null;
  }

  // ── Screen switcher ───────────────────────────────────────
  function showScreen(id) {
    [startScreen, gameScreen, matchScreen].forEach(s => {
      s.classList.remove('active');
      s.style.display = '';
    });
    document.getElementById(id).classList.add('active');
    document.getElementById(id).style.display = 'flex';
  }

  // ── Render board ──────────────────────────────────────────
  function renderBoard() {
    cells.forEach((cell, i) => {
      cell.textContent = board[i] || '';
      cell.className = 'cell';
      if (board[i] === 'X') cell.classList.add('x');
      if (board[i] === 'O') cell.classList.add('o');
    });
  }

  function highlightWin(line) {
    line.forEach(i => cells[i].classList.add('win-cell'));
  }

  // ── Round management ──────────────────────────────────────
  function startNewRound() {
    board = Array(9).fill(null);
    renderBoard();
    roundOverlay.classList.add('hidden');
    roundLabel.textContent = 'ROUND ' + currentRound;
    statusBar.textContent = rand(copy.ingame);
    gameActive = true;
  }

  function endRound(result, line) {
    gameActive = false;
    roundResults.push(result);

    // Highlight
    if (line && line.length) highlightWin(line);

    // Update pip
    const pipIdx = currentRound - 1;
    if (pipIdx < 3) {
      pips[pipIdx].classList.remove('win','loss','draw');
      pips[pipIdx].classList.add(result);
    }

    // Update scores
    if (result === 'win') {
      scorePlayer++;
      scorePlayerEl.textContent = scorePlayer;
      sfx.win();
      overlayMsg.textContent = rand(copy.win);
    } else if (result === 'loss') {
      scoreCpu++;
      scoreCpuEl.textContent = scoreCpu;
      sfx.loss();
      overlayMsg.textContent = rand(copy.loss);
    } else {
      sfx.draw();
      overlayMsg.textContent = rand(copy.draw);
    }

    // Show overlay after short pause
    setTimeout(() => {
      roundOverlay.classList.remove('hidden');

      // Check match end (best of 3 = first to 2 wins, or 3 rounds played)
      const matchDone = scorePlayer >= 2 || scoreCpu >= 2 || currentRound >= 3;
      if (matchDone) {
        nextRoundBtn.textContent = 'SEE RESULTS';
        nextRoundBtn.dataset.matchDone = '1';
      } else {
        nextRoundBtn.textContent = 'NEXT ROUND';
        nextRoundBtn.dataset.matchDone = '0';
        currentRound++;
      }
    }, 700);
  }

  function endMatch() {
    roundOverlay.classList.add('hidden');
    showScreen('matchScreen');

    if (scorePlayer > scoreCpu) {
      matchResult.textContent = 'YOU WIN!';
      matchMsg.textContent = rand(copy.matchWin);
      sfx.matchWin();
    } else if (scoreCpu > scorePlayer) {
      matchResult.textContent = 'YOU LOSE';
      matchMsg.textContent = rand(copy.matchLoss);
      sfx.matchLoss();
    } else {
      matchResult.textContent = 'IT\'S A DRAW';
      matchMsg.textContent = rand(copy.matchDraw);
      sfx.draw();
    }
    finalScore.textContent = scorePlayer + ' — ' + scoreCpu;
  }

  // ── Player tap ────────────────────────────────────────────
  function handleCellTap(i) {
    if (!gameActive) return;
    if (board[i] !== null) return;

    sfx.tap();
    board[i] = 'X';
    renderBoard();

    const result = checkWinner(board);
    if (result) {
      if (result.winner === 'X') endRound('win', result.line);
      else if (result.winner === 'draw') endRound('draw', result.line);
      return;
    }

    // AI turn
    gameActive = false;
    statusBar.textContent = rand(copy.aiThinking);
    setTimeout(() => {
      const aiIdx = getBestMove(board);
      if (aiIdx === null) return;
      board[aiIdx] = 'O';
      sfx.aiMove();
      renderBoard();

      const r2 = checkWinner(board);
      if (r2) {
        if (r2.winner === 'O') endRound('loss', r2.line);
        else if (r2.winner === 'draw') endRound('draw', r2.line);
        return;
      }
      statusBar.textContent = rand(copy.ingame);
      gameActive = true;
    }, 480);
  }

  // ── Event listeners ───────────────────────────────────────
  cells.forEach((cell, i) => {
    cell.addEventListener('click', () => handleCellTap(i));
    cell.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleCellTap(i);
    }, { passive: false });
  });

  startBtn.addEventListener('click', () => {
    sfx.start();
    resetMatch();
    showScreen('gameScreen');
    startNewRound();
  });

  nextRoundBtn.addEventListener('click', () => {
    if (nextRoundBtn.dataset.matchDone === '1') {
      endMatch();
    } else {
      startNewRound();
    }
  });

  replayBtn.addEventListener('click', () => {
    sfx.start();
    resetMatch();
    showScreen('gameScreen');
    startNewRound();
  });

  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    soundToggle.classList.toggle('muted', !soundOn);
    soundToggle.textContent = soundOn ? '♪' : '✕';
    // Unlock audio on first interaction
    if (soundOn) getAudioCtx();
  });

  // Button press feedback for lcd buttons
  document.querySelectorAll('.lcd-btn').forEach(btn => {
    btn.addEventListener('mousedown', () => btn.classList.add('pressed'));
    btn.addEventListener('mouseup', () => btn.classList.remove('pressed'));
    btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
    btn.addEventListener('touchend', () => btn.classList.remove('pressed'), { passive: true });
  });

  // ── Match reset ───────────────────────────────────────────
  function resetMatch() {
    scorePlayer = 0;
    scoreCpu    = 0;
    currentRound = 1;
    roundResults = [];
    scorePlayerEl.textContent = '0';
    scoreCpuEl.textContent    = '0';
    pips.forEach(p => {
      p.className = 'round-pip';
    });
  }

  // ── Init ──────────────────────────────────────────────────
  flavorStart.textContent = rand(copy.startFlavor);
  showScreen('startScreen');

})();
