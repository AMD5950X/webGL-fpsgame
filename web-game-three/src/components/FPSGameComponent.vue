<template>
  <div class="game-container">
    <canvas ref="renderCanvas"></canvas>
    <div class="ui-overlay">
      <div class="crosshair"></div>
      <div class="stats">
        <div class="health">❤️ {{ gameStatus.playerHealth }}</div>
        <div class="ammo">🔫 {{ gameStatus.currentAmmo }} / {{ gameStatus.maxAmmo }}</div>
        <div class="score">Score: {{ gameStatus.score }}</div>
      </div>
      <div class="connection-status" :class="{ connected: gameStatus.isConnected }">
        {{ gameStatus.isConnected ? '🟢 Online' : '🔴 Offline' }}
      </div>
    </div>
    <div v-if="!gameStatus.gameStarted" class="menu">
      <h1>WebGL FPS Game</h1>
      <button @click="startGame">开始游戏</button>
      <button @click="connectWebSocket">联机对战</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { FPSGame } from './FPSGame'

// 游戏元素引用
const renderCanvas = ref<HTMLCanvasElement | null>(null)
let fpsGame: FPSGame | null = null

// 游戏状态
const gameStatus = computed(() => {
  if (fpsGame) {
    return fpsGame.getGameStatus()
  }
  return {
    playerHealth: 100,
    currentAmmo: 30,
    maxAmmo: 30,
    score: 0,
    isConnected: false,
    gameStarted: false
  }
})

// 开始游戏
const startGame = () => {
  if (fpsGame) {
    fpsGame.startGame()
  }
}

// 连接WebSocket
const connectWebSocket = async () => {
  if (fpsGame) {
    await fpsGame.connectWebSocket()
  }
}

// 生命周期
onMounted(async () => {
  // 确保DOM已更新
  await nextTick()
  if (renderCanvas.value) {
    fpsGame = new FPSGame(renderCanvas.value)
  }
})

onUnmounted(() => {
  if (fpsGame) {
    fpsGame.dispose()
    fpsGame = null
  }
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  margin: 0;
  padding: 0;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
}

.crosshair::before,
.crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.crosshair::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  transform: translateY(-50%);
}

.crosshair::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
}

.stats {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.stats > div {
  margin-bottom: 10px;
}

.health {
  color: #ff4444;
}

.ammo {
  color: #ffaa00;
}

.score {
  color: #44ff44;
}

.connection-status {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 5px;
  font-weight: bold;
}

.connection-status.connected {
  background: rgba(0, 128, 0, 0.5);
}

.menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 40px;
  border-radius: 10px;
  text-align: center;
  color: white;
  z-index: 10;
}

.menu h1 {
  margin-bottom: 30px;
  font-size: 32px;
}

.menu button {
  display: block;
  width: 200px;
  margin: 10px auto;
  padding: 15px;
  font-size: 18px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
  pointer-events: auto;
}

.menu button:hover {
  background: #45a049;
}

.menu button:active {
  transform: scale(0.98);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats {
    font-size: 14px;
    top: 10px;
    left: 10px;
  }
  
  .connection-status {
    top: 10px;
    right: 10px;
    font-size: 12px;
  }
  
  .menu {
    width: 90%;
    padding: 20px;
  }
  
  .menu h1 {
    font-size: 24px;
  }
  
  .menu button {
    width: 100%;
    padding: 12px;
    font-size: 16px;
  }
}
</style>