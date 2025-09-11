<template>
  <div class="home-container">
    <div class="hero">
      <h1>🎮 Babylon.js 物理引擎演示</h1>
      <p>一个基于 Babylon.js 和 Cannon.js 的物理引擎演示</p>
      <div class="cta-buttons">
        <button @click="startPhysicsDemo" class="btn primary">物理引擎演示</button>
        <button @click="startFPSGame" class="btn secondary">FPS游戏</button>
        <button @click="startChat" class="btn tertiary">聊天室</button>
      </div>
    </div>
    
    <div class="features">
      <div class="feature-card">
        <h3>🚀 物理引擎功能</h3>
        <p>支持重力、碰撞检测和物理材质</p>
      </div>
      <div class="feature-card">
        <h3>🛠️ 交互式演示</h3>
        <p>点击场景创建物体，体验不同物理效果</p>
      </div>
      <div class="feature-card">
        <h3>⚙️ 可配置选项</h3>
        <p>可切换不同形状和物理材质</p>
      </div>
    </div>
    
    <div class="instructions">
      <h2>使用说明</h2>
      <ul>
        <li>点击场景创建物理对象</li>
        <li>选择不同的形状（球体、立方体、圆柱体）</li>
        <li>选择不同的物理材质（默认、弹性、重型）</li>
        <li>点击"清除所有物体"按钮重置场景</li>
        <li>点击"切换重力"按钮开启/关闭重力效果</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const startPhysicsDemo = () => {
  router.push('/physics')
}

const startFPSGame = () => {
  router.push('/fps')
}

const startChat = () => {
  router.push('/fps') // 聊天功能集成在FPS游戏中
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