import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Wifi, WifiOff, Trophy } from 'lucide-react';

export default function DinoGame({ onNavigateToDashboard }) {
  const canvasRef = useRef(null);
  
  // React State (for UI rendering)
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const wsRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // GAME STATE REF (The Source of Truth for Logic)
  // We added 'isPlaying' and 'isGameOver' here to avoid stale closures
  const gameStateRef = useRef({
    dino: {
      x: 50,
      y: 0,
      width: 40,
      height: 50,
      velocityY: 0,
      jumping: false,
      groundY: 0
    },
    obstacles: [],
    score: 0,
    gameSpeed: 5,
    obstacleTimer: 0,
    obstacleInterval: 100,
    isPlaying: false,   // <--- Added this to track gameStarted
    isGameOver: false   // <--- Added this to track gameOver
  });

  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const GROUND_HEIGHT = 50;

  // --- Core Game Functions ---

  const resetGame = useCallback(() => {
    const game = gameStateRef.current;
    
    // Reset Physics/Game Data
    game.dino.y = 0;
    game.dino.velocityY = 0;
    game.dino.jumping = false;
    game.obstacles = [];
    game.score = 0;
    game.gameSpeed = 5;
    game.obstacleTimer = 0;
    game.obstacleInterval = 100;
    
    // Sync Ref Flags (Important for WebSocket!)
    game.isPlaying = true;
    game.isGameOver = false;
    
    // Sync React State (Important for UI!)
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  const handleJump = useCallback(() => {
    const game = gameStateRef.current;
    // Only allow jump if on ground (or double jump logic if you prefer)
    // Simple check: if not already jumping
    if (!game.dino.jumping) {
      game.dino.velocityY = JUMP_FORCE;
      game.dino.jumping = true;
    }
  }, []);

  // This is the CRITICAL function that fixes the Joystick
  // It reads from gameStateRef, so it always knows the REAL status
  const handleGameAction = useCallback(() => {
    const game = gameStateRef.current;
    
    // Check if game is NOT playing and NOT over (Start Screen)
    if (!game.isPlaying && !game.isGameOver) {
      console.log("Action: Starting Game");
      resetGame();
      return;
    }
    
    // Check if game IS over (Game Over Screen)
    if (game.isGameOver) {
      console.log("Action: Restarting Game");
      resetGame();
      return;
    }
    
    // If we are here, the game is running -> JUMP!
    console.log("Action: Jumping");
    handleJump();
  }, [handleJump, resetGame]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasHeight = canvas.height;
    const canvasWidth = canvas.width;
    const game = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw ground
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(0, canvasHeight - GROUND_HEIGHT, canvasWidth, GROUND_HEIGHT);

    // Calculate dino position
    const dinoY = game.dino.y + (canvasHeight - GROUND_HEIGHT - game.dino.height);

    // Draw dino
    ctx.fillStyle = '#10B981';
    ctx.fillRect(game.dino.x, dinoY, game.dino.width, game.dino.height);
    
    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(game.dino.x + 25, dinoY + 10, 5, 5);

    // Draw obstacles
    ctx.fillStyle = '#EF4444';
    game.obstacles.forEach(obstacle => {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
  }, []);

  const updateGame = useCallback(() => {
    const game = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasHeight = canvas.height;
    const canvasWidth = canvas.width;

    // Update ground reference
    game.dino.groundY = 0; 

    // Physics
    if (game.dino.jumping || game.dino.y < game.dino.groundY) {
      game.dino.velocityY += GRAVITY;
      game.dino.y += game.dino.velocityY;

      if (game.dino.y >= game.dino.groundY) {
        game.dino.y = game.dino.groundY;
        game.dino.velocityY = 0;
        game.dino.jumping = false;
      }
    }

    // Logic updates (Only if Ref says we are playing)
    if (game.isPlaying && !game.isGameOver) {
      game.obstacleTimer++;
      
      // Spawn Obstacles
      if (game.obstacleTimer > game.obstacleInterval) {
        game.obstacles.push({
          x: canvasWidth,
          y: canvasHeight - GROUND_HEIGHT - 40,
          width: 30,
          height: 40,
          scored: false
        });
        game.obstacleTimer = 0;
        
        if (game.obstacleInterval > 50) game.obstacleInterval -= 0.5;
        if (game.gameSpeed < 10) game.gameSpeed += 0.05;
      }

      // Move/Check Obstacles
      game.obstacles = game.obstacles.filter(obstacle => {
        obstacle.x -= game.gameSpeed;
        
        const dinoY = game.dino.y + (canvasHeight - GROUND_HEIGHT - game.dino.height);
        
        // Collision Detection
        if (
          game.dino.x < obstacle.x + obstacle.width &&
          game.dino.x + game.dino.width > obstacle.x &&
          dinoY < obstacle.y + obstacle.height &&
          dinoY + game.dino.height > obstacle.y
        ) {
          // GAME OVER LOGIC
          game.isPlaying = false;     // Update Ref
          game.isGameOver = true;     // Update Ref
          
          setGameStarted(false);      // Update UI
          setGameOver(true);          // Update UI
          
          if (game.score > highScore) {
            setHighScore(game.score);
          }
          return false;
        }
        
        // Score update
        if (obstacle.x + obstacle.width < game.dino.x && !obstacle.scored) {
          obstacle.scored = true;
          game.score++;
          setScore(game.score);
        }
        
        return obstacle.x > -obstacle.width;
      });
    }

    drawGame();
    animationFrameRef.current = requestAnimationFrame(updateGame);

  }, [drawGame, highScore]); 

  // --- WebSocket ---
  // The connect function needs to be stable or used inside useEffect
  useEffect(() => {
    console.log('Connecting to WebSocket...');
    const ws = new WebSocket('ws://10.42.0.225:8000/ws');
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'joystick_button' && data.pressed === true) {
          // Because handleGameAction reads from REF, it will work!
          handleGameAction();
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [handleGameAction]); // handleGameAction is stable via useCallback

  // --- Initialization & Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = 400;
      drawGame();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start the Loop
    const renderLoop = () => {
      updateGame();
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawGame, updateGame]);

  // --- Keyboard Control ---
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleGameAction();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleGameAction]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <button
              onClick={onNavigateToDashboard}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Dino Jump Game
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-full shadow-inner">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-6 h-6 text-green-400 animate-pulse" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-400" />
              )}
              <span className={`text-md font-bold ${
                connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Current Score</div>
            <div className="text-4xl font-bold text-white">{score}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>High Score</span>
            </div>
            <div className="text-4xl font-bold text-yellow-400">{highScore}</div>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl mb-6">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full bg-gray-900 rounded-lg"
              style={{ height: '400px', display: 'block' }}
            />
            
            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
                <div className="text-center">
                  <h2 className="text-5xl font-bold text-red-500 mb-4">Game Over!</h2>
                  <p className="text-2xl text-white mb-2">Score: {score}</p>
                  {score === highScore && score > 0 && (
                    <p className="text-xl text-yellow-400 mb-4">🎉 New High Score!</p>
                  )}
                  <p className="text-gray-300 mb-6">Press joystick button to restart</p>
                  <button
                    onClick={handleGameAction}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Restart Game
                  </button>
                </div>
              </div>
            )}
            
            {/* Start Screen */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
                <div className="text-center">
                  <h2 className="text-5xl font-bold text-green-500 mb-4">Dino Jump</h2>
                  <p className="text-xl text-white mb-4">Press joystick button to start!</p>
                  <p className="text-gray-400 mb-6">Jump to avoid the red obstacles</p>
                  <p className="text-sm text-gray-500 mb-4">(Space bar also works)</p>
                  <button
                    onClick={handleGameAction}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}