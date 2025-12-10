<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const highScore = ref(0);
const isGameOver = ref(false);

interface GameState {
  dino: { x: number; y: number; width: number; height: number; velocityY: number; isJumping: boolean };
  obstacles: { x: number; y: number; width: number; height: number }[];
  score: number;
  gameSpeed: number;
  gravity: number;
  jumpPower: number;
  isRunning: boolean;
  frameCount: number;
}

// Using a plain object for game state to avoid reactivity overhead in the game loop
// But we sync score/gameOver to reactive refs for UI updates
const game: GameState = {
  dino: { x: 50, y: 150, width: 40, height: 40, velocityY: 0, isJumping: false },
  obstacles: [],
  score: 0,
  gameSpeed: 5,
  gravity: 0.6,
  jumpPower: -12,
  isRunning: true,
  frameCount: 0
};

let animationFrameId: number;

const jump = () => {
  if (!game.dino.isJumping && game.isRunning) {
    game.dino.velocityY = game.jumpPower;
    game.dino.isJumping = true;
  }
};

const handleGameAction = () => {
  if (isGameOver.value) {
    resetGame();
  } else {
    jump();
  }
};

// Expose action for external control (Joystick)
defineExpose({ handleGameAction });

const resetGame = () => {
  game.dino.y = 150;
  game.dino.velocityY = 0;
  game.dino.isJumping = false;
  game.obstacles = [];
  game.score = 0;
  game.gameSpeed = 5;
  game.isRunning = true;
  game.frameCount = 0;
  score.value = 0;
  isGameOver.value = false;
  gameLoop();
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleGameAction();
  }
};

const handleClick = () => {
  handleGameAction();
};

const groundY = 190;

const gameLoop = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (!game.isRunning) {
    return;
  }

  // Clear canvas
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw ground
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, groundY, canvas.width, 2);

  // Update dino
  game.dino.velocityY += game.gravity;
  game.dino.y += game.dino.velocityY;

  if (game.dino.y >= 150) {
    game.dino.y = 150;
    game.dino.velocityY = 0;
    game.dino.isJumping = false;
  }

  // Draw dino
  ctx.fillStyle = '#10b981';
  ctx.fillRect(game.dino.x, game.dino.y, game.dino.width, game.dino.height);
  
  // Draw eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(game.dino.x + 25, game.dino.y + 10, 5, 5);

  // Spawn obstacles
  game.frameCount++;
  if (game.frameCount % 90 === 0) {
    const height = Math.random() > 0.5 ? 30 : 40;
    game.obstacles.push({
      x: canvas.width,
      y: groundY - height,
      width: 20,
      height: height
    });
  }

  // Update and draw obstacles
  for (let i = game.obstacles.length - 1; i >= 0; i--) {
    const obstacle = game.obstacles[i];
    if (!obstacle) continue;

    obstacle.x -= game.gameSpeed;

    // Draw obstacle
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    // Check collision
    if (
      game.dino.x < obstacle.x + obstacle.width &&
      game.dino.x + game.dino.width > obstacle.x &&
      game.dino.y < obstacle.y + obstacle.height &&
      game.dino.y + game.dino.height > obstacle.y
    ) {
      game.isRunning = false;
      isGameOver.value = true;
      if (game.score > highScore.value) {
        highScore.value = game.score;
      }
    }

    // Remove off-screen obstacles
    if (obstacle.x + obstacle.width < 0) {
      game.obstacles.splice(i, 1);
      game.score += 10;
      // Sync score to ref occasionally or on change for UI
      score.value = game.score;
      
      // Increase difficulty
      if (game.score % 100 === 0) {
        game.gameSpeed += 0.5;
      }
    }
  }

  // Draw score (on canvas as well, or just rely on Vue UI overlay)
  // The original React code drew it on canvas but also had UI overlay for Game Over
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`Score: ${game.score}`, 10, 30);
  ctx.fillText(`High Score: ${highScore.value}`, 10, 55);

  if (game.isRunning) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
  // Start loop
  gameLoop();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvasRef"
      width="800"
      height="200"
      class="w-full bg-slate-800 rounded-lg border-2 border-sky-400/30 cursor-pointer"
      @click="handleClick"
    ></canvas>
    <div v-if="isGameOver" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
      <div class="text-center pointer-events-auto">
        <p class="text-sky-50 text-2xl mb-2">Game Over!</p>
        <p class="text-sky-300 mb-4">Click or press Space to restart</p>
        <p class="text-sky-50">Final Score: {{ score }}</p>
      </div>
    </div>
    <p class="text-sky-300 text-sm mt-2 text-center">
      Click the game area or press SPACE to jump
    </p>
  </div>
</template>
