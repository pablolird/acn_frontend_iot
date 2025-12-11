<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { Trophy, Zap } from 'lucide-vue-next';

// --- Types ---
interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface Obstacle extends Entity {
  scored: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

// --- Config ---
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_HEIGHT = 50;
const NEON_BLUE = '#0ea5e9'; // Sky 500
const NEON_PINK = '#d946ef'; // Fuchsia 500
const NEON_GREEN = '#22c55e'; // Green 500
const BG_COLOR = '#0f172a';  // Slate 900

// --- State ---
const canvasRef = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const highScore = ref(0);
const isGameOver = ref(false);
const gameStarted = ref(false);

// Game Logic State (Refs for loop)
const game = {
  dino: { x: 50, y: 0, width: 30, height: 40, velocityY: 0, isJumping: false } as Entity & { velocityY: number; isJumping: boolean },
  obstacles: [] as Obstacle[],
  particles: [] as Particle[],
  stars: [] as Star[],
  score: 0,
  gameSpeed: 5,
  obstacleTimer: 0,
  obstacleInterval: 100, // Frames
  isRunning: false,
  frameCount: 0
};

let animationFrameId: number;

// --- Visual Effects System ---

const initStars = (width: number, height: number) => {
  game.stars = [];
  for (let i = 0; i < 50; i++) {
    game.stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.1,
      brightness: Math.random()
    });
  }
};

const createExplosion = (x: number, y: number, color: string) => {
  for (let i = 0; i < 20; i++) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      color,
      size: Math.random() * 3 + 1
    });
  }
};

const createJumpDust = (x: number, y: number) => {
  for (let i = 0; i < 5; i++) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      life: 0.6,
      color: '#ffffff',
      size: Math.random() * 2
    });
  }
};

// --- Game Loop ---

const resetGame = () => {
  game.dino.y = 0;
  game.dino.velocityY = 0;
  game.dino.isJumping = false;
  game.obstacles = [];
  game.particles = [];
  game.score = 0;
  game.gameSpeed = 10; // Slightly faster start
  game.obstacleTimer = 0;
  game.obstacleInterval = 90;
  game.isRunning = true;
  
  score.value = 0;
  isGameOver.value = false;
  gameStarted.value = true;
};

const jump = () => {
  if (!game.dino.isJumping && game.isRunning) {
    game.dino.velocityY = JUMP_FORCE;
    game.dino.isJumping = true;
    
    // Dust effect
    const canvas = canvasRef.value;
    if (canvas) {
      createJumpDust(game.dino.x + game.dino.width / 2, canvas.height - GROUND_HEIGHT);
    }
  }
};

const handleGameAction = () => {
  if (isGameOver.value || !gameStarted.value) {
    resetGame();
  } else {
    jump();
  }
};

// External control
defineExpose({ handleGameAction });

// --- Rendering & Update ---

const update = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  game.frameCount++;

  // --- Logic Update ---
  if (game.isRunning) {
    // Dino Physics
    const groundY = height - GROUND_HEIGHT - game.dino.height;
    game.dino.velocityY += GRAVITY;
    game.dino.y += game.dino.velocityY;

    // Ground Collision
    if (game.dino.y >= groundY) {
      game.dino.y = groundY;
      game.dino.velocityY = 0;
      game.dino.isJumping = false;
    }

    // Spawn Obstacles
    game.obstacleTimer++;
    if (game.obstacleTimer > game.obstacleInterval) {
      game.obstacles.push({
        x: width,
        y: height - GROUND_HEIGHT - 40, // standard height
        width: 30,
        height: 40,
        scored: false,
        color: NEON_PINK
      });
      game.obstacleTimer = 0;
      // Difficulty ramp
      if (game.gameSpeed < 12) game.gameSpeed += 0.01;
      if (game.obstacleInterval > 40) game.obstacleInterval -= 0.1;
    }

    // Update Obstacles
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      const obs = game.obstacles[i];
      if (!obs) continue;
      obs.x -= game.gameSpeed;

      // Collision
      if (
        game.dino.x < obs.x + obs.width &&
        game.dino.x + game.dino.width > obs.x &&
        game.dino.y < obs.y + obs.height &&
        game.dino.y + game.dino.height > obs.y
      ) {
        // Game Over
        game.isRunning = false;
        isGameOver.value = true;
        createExplosion(game.dino.x + game.dino.width/2, game.dino.y + game.dino.height/2, NEON_GREEN);
        
        if (game.score > highScore.value) {
          highScore.value = game.score;
        }
      }

      // Scaling/Scoring
      if (obs.x + obs.width < 0) {
        game.obstacles.splice(i, 1);
        game.score += 10;
        score.value = game.score;
      }
    }
  }

  // Update Particles
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    if (!p) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    if (p.life <= 0) game.particles.splice(i, 1);
  }

  // --- Rendering ---
  
  // 1. Clear with Trail Effect (optional, but clean clear is better for now)
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Stars (Parallax)
  ctx.fillStyle = '#ffffff';
  game.stars.forEach(star => {
    // Parallax movement
    if (game.isRunning) star.x -= star.speed;
    if (star.x < 0) star.x = width;

    ctx.globalAlpha = Math.abs(Math.sin(game.frameCount * 0.05 + star.brightness));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // 3. Draw Floor (Neon Grid Header)
  ctx.shadowBlur = 20;
  ctx.shadowColor = NEON_BLUE;
  ctx.strokeStyle = NEON_BLUE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height - GROUND_HEIGHT);
  ctx.lineTo(width, height - GROUND_HEIGHT);
  ctx.stroke();
  
  // Moving grid lines on floor
  if (game.isRunning) {
    const gridOffset = (game.frameCount * game.gameSpeed) % 50;
    for (let x = -gridOffset; x < width; x += 50) {
      if (x < 0) continue; // optimization
      ctx.beginPath();
      // Draw slanted lines for depth perception
      ctx.moveTo(x, height - GROUND_HEIGHT);
      ctx.lineTo(x - 40, height); 
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0; // Reset

  // 4. Draw Dino (Neon Runner)
  if (!isGameOver.value || Math.floor(Date.now() / 200) % 2 === 0) { // Blink if game over
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON_GREEN;
    ctx.fillStyle = NEON_GREEN;
    ctx.fillRect(game.dino.x, game.dino.y, game.dino.width, game.dino.height);
    
    // Inner "Cyber" Detail
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(game.dino.x + 18, game.dino.y + 5, 8, 4); // Eye
  }

  // 5. Draw Obstacles (Spikes)
  game.obstacles.forEach(obs => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON_PINK;
    ctx.fillStyle = NEON_PINK;
    
    // Draw Spike Triangle
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + obs.height);
    ctx.lineTo(obs.x + obs.width / 2, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
    ctx.closePath();
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // 6. Draw Particles
  game.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  animationFrameId = requestAnimationFrame(update);
};

onMounted(async () => {
  await nextTick();
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 300; // Fixed height for gameplay consistecy
    initStars(canvas.width, canvas.height);
    resetGame();
    game.isRunning = false; // Start in "Ready" state
    gameStarted.value = false;
    update();
  }
  
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      handleGameAction();
    }
  });

  window.addEventListener('resize', () => {
    if (canvas) {
       canvas.width = canvas.parentElement?.clientWidth || 800;
       initStars(canvas.width, canvas.height);
    }
  });
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div class="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
    <!-- Header/Score Overlay -->
    <div class="absolute top-4 left-6 flex gap-8 pointer-events-none select-none z-10">
      <div>
        <span class="text-xs text-slate-400 font-mono tracking-widest uppercase">Score</span>
        <div class="text-2xl font-black text-white font-mono shadow-neon">{{ score.toString().padStart(5, '0') }}</div>
      </div>
      <div>
        <span class="text-xs text-slate-400 font-mono tracking-widest uppercase">High Score</span>
        <div class="flex items-center gap-2 text-xl font-bold text-yellow-500 font-mono">
          <Trophy class="w-4 h-4" />
          {{ highScore.toString().padStart(5, '0') }}
        </div>
      </div>
    </div>

    <!-- Connection Status (Cosmetic) -->
    <div class="absolute top-4 right-6 pointer-events-none select-none z-10">
      <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-600 backdrop-blur">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse box-shadow-green"></div>
        <span class="text-xs font-bold text-green-400 font-mono tracking-wider">ONLINE</span>
      </div>
    </div>

    <canvas ref="canvasRef" class="block w-full h-[300px] cursor-pointer" @click="handleGameAction"></canvas>

    <!-- Start / Game Over Overlay -->
    <div v-if="!gameStarted || isGameOver" 
         class="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
      
      <div class="transform space-y-2">
        <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-sans tracking-tighter drop-shadow-2xl">
          {{ isGameOver ? 'SYSTEM FAILURE' : 'NEON RUNNER' }}
        </h2>
        
        <p v-if="isGameOver" class="text-xl text-slate-300 font-mono">Run Terminated. Score: <span class="text-white">{{ score }}</span></p>
        <p v-else class="text-xl text-slate-300 font-mono">Initiate Sequence...</p>
      </div>

      <button
        @click.stop="handleGameAction"
        class="mt-8 group relative px-8 py-4 bg-slate-800 text-white font-bold uppercase tracking-widest overflow-hidden rounded-lg border border-slate-600 transition-all hover:scale-105 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
      >
        <span class="relative z-10 flex items-center gap-2">
           <Zap class="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors" />
           {{ isGameOver ? 'Reboot System' : 'Start Engine' }}
        </span>
        <div class="absolute inset-0 bg-cyan-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
      </button>

      <div class="mt-8 text-xs text-slate-500 font-mono">
        [SPACE] or [JOYSTICK] to Jump
      </div>
    </div>
  </div>
</template>

<style scoped>
.shadow-neon {
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}
.box-shadow-green {
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
}
</style>
