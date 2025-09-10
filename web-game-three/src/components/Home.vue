<template>
  <div class="home-container">
    <div class="hero">
      <h1>🎮 WebGL FPS Game</h1>
      <p>一个基于 Babylon.js 构建的 3D 第一人称射击游戏</p>
      <div class="cta-buttons">
        <button @click="startSinglePlayer" class="btn primary">单人游戏</button>
        <button @click="startMultiplayer" class="btn secondary">多人游戏</button>
        <button @click="openChat" class="btn tertiary">聊天室</button>
        <button @click="testGame" class="btn quaternary">测试游戏</button>
        <button @click="simpleTest" class="btn quinary">简单测试</button>
        <button @click="simpleFPS" class="btn senary">简化版FPS</button>
        <button @click="babylonPhysics" class="btn septenary">Babylon物理引擎FPS</button>
      </div>
    </div>
    
    <div class="features">
      <div class="feature-card">
        <h3>🚀 高性能 3D 渲染</h3>
        <p>基于 Babylon.js 引擎，提供流畅的 3D 游戏体验</p>
      </div>
      <div class="feature-card">
        <h3>🌐 实时多人对战</h3>
        <p>通过 WebSocket 实现低延迟多人游戏体验</p>
      </div>
      <div class="feature-card">
        <h3>🎯 丰富的游戏机制</h3>
        <p>包含射击、移动、跳跃等完整的 FPS 游戏功能</p>
      </div>
    </div>
    
    <div class="instructions">
      <h2>游戏说明</h2>
      <ul>
        <li>WASD 键控制移动</li>
        <li>鼠标控制视角</li>
        <li>左键射击</li>
        <li>R 键重新装弹</li>
        <li>空格键跳跃</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const startSinglePlayer = () => {
  router.push('/game')
}

const startMultiplayer = () => {
  router.push('/game?mode=multiplayer')
}

const openChat = () => {
  router.push('/chat')
}

const testGame = () => {
  router.push('/test')
}

const simpleTest = () => {
  router.push('/simple')
}

const simpleFPS = () => {
  router.push('/simplefps')
}

const babylonPhysics = () => {
  router.push('/babylonphysics')
}
</script>

<style scoped>
.home-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 2rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  overflow-y: auto;
  box-sizing: border-box;
}

.hero {
  text-align: center;
  padding: 3rem 0;
  margin-top: 2rem;
}

.hero h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #00dbde, #fc00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #e6e6e6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 1.2rem 2.5rem;
  font-size: 1.3rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  min-width: 200px;
}

.btn.primary {
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 176, 155, 0.3);
}

.btn.secondary {
  background: linear-gradient(90deg, #ff416c, #ff4b2b);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 65, 108, 0.3);
}

.btn.tertiary {
  background: linear-gradient(90deg, #4A00E0, #8E2DE2);
  color: white;
  box-shadow: 0 4px 15px rgba(142, 45, 226, 0.3);
}

.btn.quaternary {
  background: linear-gradient(90deg, #ffa726, #ff7043);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 167, 38, 0.3);
}

.btn.quinary {
  background: linear-gradient(90deg, #ab47bc, #7b1fa2);
  color: white;
  box-shadow: 0 4px 15px rgba(171, 71, 188, 0.3);
}

.btn.senary {
  background: linear-gradient(90deg, #26a69a, #00897b);
  color: white;
  box-shadow: 0 4px 15px rgba(38, 166, 154, 0.3);
}

.btn.septenary {
  background: linear-gradient(90deg, #5c6bc0, #3949ab);
  color: white;
  box-shadow: 0 4px 15px rgba(92, 107, 192, 0.3);
}

.btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2.5rem;
  margin: 5rem auto;
  max-width: 1400px;
  padding: 0 2rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 2.5rem;
  border-radius: 15px;
  text-align: center;
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.feature-card:hover {
  transform: translateY(-10px);
}

.feature-card h3 {
  margin-bottom: 1.5rem;
  color: #4cc9f0;
  font-size: 1.8rem;
}

.instructions {
  background: rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 15px;
  margin: 5rem auto;
  max-width: 1200px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.instructions h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #f72585;
  font-size: 2.5rem;
}

.instructions ul {
  list-style-type: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 0;
}

.instructions li {
  padding: 1.2rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 1.2rem;
}

.instructions li::before {
  content: "🎮";
  margin-right: 15px;
  font-size: 1.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
  }

  .hero h1 {
    font-size: 2.5rem;
  }

  .hero p {
    font-size: 1.2rem;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .btn {
    width: 80%;
    padding: 1rem 2rem;
  }

  .features {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .feature-card {
    padding: 1.5rem;
  }

  .instructions {
    padding: 2rem 1rem;
    margin: 3rem auto;
  }

  .instructions ul {
    grid-template-columns: 1fr;
  }
}
</style>