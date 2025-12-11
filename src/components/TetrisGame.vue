<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Canvas Refs ---
const boardCanvas = ref<HTMLCanvasElement | null>(null);
const nextCanvas = ref<HTMLCanvasElement | null>(null);
const holdCanvas = ref<HTMLCanvasElement | null>(null);

// --- Game Constants ---
const COLS = 10;
const ROWS = 20;
const COLORS: Record<string, string> = {
  I: '#2ee4e4', J: '#2b6cff', L: '#ff9f43', O: '#ffd23f',
  S: '#46dd55', T: '#8b5cf6', Z: '#ff5c67', X: '#0b1520'
};
const SHAPES: { [key: string]: number[][][] } = {
  I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]],
  J: [[[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]]],
  L: [[[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]]],
  O: [[[1,1],[1,1]]],
  S: [[[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]]],
  T: [[[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]]],
  Z: [[[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]]]
};

// --- Game State ---
interface Piece {
  type: string;
  shapeIndex: number;
  shape: number[][];
  x: number;
  y: number;
}

let grid: (string | null)[][] = [];
let current: Piece;
let next: Piece;
let hold: Piece | null = null;
let holdUsed = false;

const score = ref(0);
const level = ref(1);
const lines = ref(0);
const duration = ref(0); // [新增] 遊戲時長
const isPaused = ref(false);
const isGameOver = ref(false);
const countDown = ref(3);
const showCountDown = ref(true);

let dropInterval = 800;
let lastTime = 0;
let dropAccum = 0;
let animationId: number;
let durationTimer: any = null; // [新增] 計時器 ID

// --- Helper Functions ---
const randomPiece = (): Piece => {
  const keys = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const k = keys[Math.floor(Math.random() * keys.length)]!;
  const shapeVariants = SHAPES[k]!;
  return {
    type: k,
    shapeIndex: 0,
    shape: shapeVariants[0]!,
    x: Math.floor(COLS / 2) - Math.ceil(shapeVariants[0]![0]!.length / 2),
    y: -1
  };
};

const cloneGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const collides = (g: any[][], p: Piece, ox = 0, oy = 0) => {
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r]!.length; c++) {
      if (p.shape[r]![c]) {
        const x = p.x + c + ox;
        const y = p.y + r + oy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && g[y]![x]) return true;
      }
    }
  }
  return false;
};

// --- Drawing Logic ---
const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 2, y + 2, size - 4, size / 2);
};

const draw = () => {
  if (!boardCanvas.value) return;
  const ctx = boardCanvas.value.getContext('2d')!;
  const w = boardCanvas.value.width;
  const h = boardCanvas.value.height;
  const cellSize = w / COLS; 

  ctx.fillStyle = '#071018';
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r]![c]) {
        drawCell(ctx, c * cellSize, r * cellSize, cellSize, COLORS[grid[r]![c]!]!);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  if (current && !isPaused.value && !isGameOver.value) {
    let ghostY = current.y;
    while (!collides(grid, current, 0, ghostY - current.y + 1)) {
      ghostY++;
    }
    
    ctx.fillStyle = hexWithAlpha(COLORS[current.type]!, 0.2);
    current.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          ctx.fillRect((current.x + c) * cellSize, (ghostY + r) * cellSize, cellSize, cellSize);
          ctx.strokeRect((current.x + c) * cellSize, (ghostY + r) * cellSize, cellSize, cellSize);
        }
      });
    });

    current.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const px = (current.x + c) * cellSize;
          const py = (current.y + r) * cellSize;
          if (py >= -cellSize) {
            drawCell(ctx, px, py, cellSize, COLORS[current.type]!);
          }
        }
      });
    });
  }
};

const hexWithAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const drawPreview = (canvas: HTMLCanvasElement | null, p: Piece | null) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!p) return;
  
  const cellSize = 18;
  const s = p.shape;
  const w = s[0]!.length * cellSize;
  const h = s.length * cellSize;
  const ox = (canvas.width - w) / 2;
  const oy = (canvas.height - h) / 2;

  s.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) drawCell(ctx, ox + c * cellSize, oy + r * cellSize, cellSize, COLORS[p.type]!);
    });
  });
};

// --- Timer Logic [新增] ---
const startDurationTimer = () => {
  stopDurationTimer(); // 確保不會重複開啟
  durationTimer = setInterval(() => {
    duration.value++;
  }, 1000);
};

const stopDurationTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
};

// --- Game Logic ---
const lockPiece = () => {
  current.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val && current.y + r >= 0) {
        grid[current.y + r]![current.x + c] = current.type;
      }
    });
  });
  
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r]!.every(c => c !== null)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }

  if (cleared > 0) {
    lines.value += cleared;
    score.value += ([0, 100, 300, 500, 800][cleared] ?? 0) * level.value;
    level.value = Math.floor(score.value / 1000) + 1;
    dropInterval = Math.max(100, 800 - (level.value - 1) * 50);
  }

  holdUsed = false;
  current = next;
  next = randomPiece();
  
  if (collides(grid, current)) {
    gameOver();
  }
  
  drawPreview(nextCanvas.value, next);
  drawPreview(holdCanvas.value, hold);
};

const update = (time: number) => {
  if (isPaused.value || isGameOver.value || showCountDown.value) return;
  
  const dt = time - lastTime;
  lastTime = time;
  dropAccum += dt;

  if (dropAccum > dropInterval) {
    if (!collides(grid, current, 0, 1)) {
      current.y++;
    } else {
      lockPiece();
    }
    dropAccum = 0;
  }
  draw();
  animationId = requestAnimationFrame(update);
};

const gameOver = async () => {
  isGameOver.value = true;
  cancelAnimationFrame(animationId);
  stopDurationTimer(); // [新增] 遊戲結束停止計時
  draw(); 
  
  try {
    // 上傳包含 duration 的數據
    console.log(`Game Over! Score: ${score.value}, Duration: ${duration.value}s`);
    
    const localRec = JSON.parse(localStorage.getItem('tetris_local_records') || '[]');
    localRec.push({ 
      name: localStorage.getItem('username') || 'Player', 
      score: score.value,
      duration: duration.value // [新增] 紀錄時長
    });
    localRec.sort((a:any, b:any) => b.score - a.score);
    localStorage.setItem('tetris_local_records', JSON.stringify(localRec));
  } catch (e) { console.error(e); }
};

// --- Input Handling ---
const handleKeydown = (e: KeyboardEvent) => {
  if (isGameOver.value || isPaused.value || showCountDown.value) return;

  if (e.key === 'ArrowLeft') {
    if (!collides(grid, current, -1, 0)) current.x--;
  } else if (e.key === 'ArrowRight') {
    if (!collides(grid, current, 1, 0)) current.x++;
  } else if (e.key === 'ArrowDown') {
    if (!collides(grid, current, 0, 1)) current.y++;
    score.value += 1; 
  } else if (e.key === 'ArrowUp') {
    const variants = SHAPES[current.type];
    if (variants && variants.length > 0) {
      const nextIdx = (current.shapeIndex + 1) % variants.length;
      const nextShape = variants[nextIdx]!;
      if (!collides(grid, { ...current, shape: nextShape })) {
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      } else if (!collides(grid, { ...current, shape: nextShape, x: current.x - 1 })) {
        current.x--;
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      } else if (!collides(grid, { ...current, shape: nextShape, x: current.x + 1 })) {
        current.x++;
        current.shape = nextShape;
        current.shapeIndex = nextIdx;
      }
    }
  } else if (e.key === ' ') {
    while (!collides(grid, current, 0, 1)) {
      current.y++;
      score.value += 2;
    }
    lockPiece();
  } else if (e.key === 'c' || e.key === 'C') {
    if (!holdUsed) {
      if (!hold) {
        hold = { type: current.type, shapeIndex: 0, shape: SHAPES[current.type]![0]!, x:0, y:0 };
        current = next;
        next = randomPiece();
      } else {
        const temp = { type: current.type, shapeIndex: 0, shape: SHAPES[current.type]![0]!, x:0, y:0 };
        current = { ...hold, x: Math.floor(COLS/2)-1, y: -1 };
        hold = temp;
      }
      holdUsed = true;
      drawPreview(holdCanvas.value, hold);
      drawPreview(nextCanvas.value, next);
    }
  }
  draw();
};

const pauseGame = () => {
  isPaused.value = true;
  stopDurationTimer(); // [新增] 暫停時停止計時
};

const resumeGame = () => {
  if (!isPaused.value) return;
  
  showCountDown.value = true;
  countDown.value = 3;
  const timer = setInterval(() => {
    countDown.value--;
    if (countDown.value <= 0) {
      clearInterval(timer);
      showCountDown.value = false;
      isPaused.value = false;
      startDurationTimer(); // [新增] 恢復時重新開始計時
      lastTime = performance.now();
      dropAccum = 0;
      animationId = requestAnimationFrame(update);
    }
  }, 1000);
};

const initGame = () => {
  grid = cloneGrid();
  current = randomPiece();
  next = randomPiece();
  hold = null;
  holdUsed = false;
  score.value = 0;
  level.value = 1;
  lines.value = 0;
  duration.value = 0; // [新增] 重置時間
  isGameOver.value = false;
  isPaused.value = false;
  
  if (boardCanvas.value) {
    boardCanvas.value.width = 300; 
    boardCanvas.value.height = 600;
  }
  
  drawPreview(nextCanvas.value, next);
  
  showCountDown.value = true;
  countDown.value = 3;
  const timer = setInterval(() => {
    countDown.value--;
    if (countDown.value <= 0) {
      clearInterval(timer);
      showCountDown.value = false;
      startDurationTimer(); // [新增] 倒數結束開始計時
      lastTime = performance.now();
      animationId = requestAnimationFrame(update);
    }
  }, 1000);
};

onMounted(() => {
  initGame();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  cancelAnimationFrame(animationId);
  stopDurationTimer(); // [新增] 組件卸載時清除計時器
});
</script>

<template>
  <div class="game-wrapper">
    <!-- 主遊戲區 -->
    <canvas ref="boardCanvas" class="main-board"></canvas>
    
    <!-- HUD 資訊面板 -->
    <div class="hud">
      <div class="hud-panel small-panel">
        <span class="label">HOLD (C)</span>
        <canvas ref="holdCanvas" width="80" height="60"></canvas>
      </div>
      
      <div class="hud-panel info-panel">
        <div>
          <div class="label">SCORE</div>
          <div class="value">{{ score }}</div>
        </div>
        <div>
          <div class="label">LEVEL</div>
          <div class="value">{{ level }}</div>
        </div>
        <!-- [新增] 時間顯示區塊 -->
        <div>
          <div class="label">TIME</div>
          <div class="value">{{ duration }}s</div>
        </div>
        <div>
          <div class="label">LINES</div>
          <div class="value">{{ lines }}</div>
        </div>
      </div>

      <div class="hud-panel small-panel">
        <span class="label">NEXT</span>
        <canvas ref="nextCanvas" width="80" height="60"></canvas>
      </div>

      <div class="controls">
        <button v-if="isGameOver" @click="initGame" class="primary-btn">再玩一次</button>
        <button v-else-if="isPaused" @click="resumeGame" class="secondary-btn">繼續</button>
        <!-- [修改] 這裡改用 pauseGame 函數來確保計時器停止 -->
        <button v-else @click="pauseGame" class="secondary-btn">暫停</button>
        <button @click="router.back()" class="secondary-btn" style="margin-top:5px;">離開</button>
      </div>
    </div>

    <!-- 倒數遮罩 -->
    <div v-if="showCountDown" class="overlay">
      <h1 class="count-text">{{ countDown }}</h1>
    </div>

    <!-- 遊戲結束遮罩 -->
    <div v-if="isGameOver" class="overlay glass-card" style="width: auto; height: auto;">
      <h2>GAME OVER</h2>
      <p>Score: {{ score }}</p>
      <p>Time: {{ duration }}s</p> <!-- [新增] 結束畫面顯示時間 -->
      <button @click="initGame" class="primary-btn">重試</button>
      <button @click="router.push('/leaderboard')" class="secondary-btn" style="margin-top:10px;">排行榜</button>
    </div>
  </div>
</template>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
  padding: 20px;
}

.main-board {
  width: 300px; /* 顯示寬度 */
  height: 600px; /* 顯示高度 */
  background: var(--cell-0);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid var(--glass-border);
}

.hud {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 120px;
}

.hud-panel {
  background: var(--panel);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.info-panel { gap: 10px; }
.label { font-size: 10px; color: var(--muted); font-weight: 700; margin-bottom: 2px; }
.value { font-size: 18px; color: #fff; font-weight: 700; }

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.count-text {
  font-size: 100px;
  color: var(--accent);
  font-weight: 900;
  text-shadow: 0 0 20px var(--accent);
}

@media (max-width: 600px) {
  .game-wrapper { flex-direction: column; align-items: center; }
  .hud { flex-direction: row; width: 100%; justify-content: space-between; }
  .main-board { width: 240px; height: 480px; }
}
</style>