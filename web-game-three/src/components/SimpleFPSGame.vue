<template>
  <div class="game-container">
    <canvas ref="renderCanvas"></canvas>
    <div class="ui-overlay">
      <div class="crosshair"></div>
      <div class="stats">
        <div class="health">❤️ 100</div>
        <div class="ammo">🔫 30 / 30</div>
        <div class="score">Score: 0</div>
      </div>
    </div>
    <div class="menu" v-if="!gameStarted">
      <h1>Simple FPS Game</h1>
      <button @click="startGame">开始游戏</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'

// 游戏元素引用
const renderCanvas = ref<HTMLCanvasElement | null>(null)
let engine: BABYLON.Engine | null = null
let scene: BABYLON.Scene | null = null
let camera: BABYLON.UniversalCamera | null = null
let player: BABYLON.Mesh | null = null

// 游戏状态
const gameStarted = ref(false)

// 输入状态
const keys = ref<{[key: string]: boolean}>({})
const mouse = ref({ x: 0, y: 0, locked: false })

// 游戏配置
const config = {
  moveSpeed: 0.2,
  lookSpeed: 0.002
}

// 开始游戏
const startGame = () => {
  gameStarted.value = true
  if (renderCanvas.value) {
    renderCanvas.value.requestPointerLock()
  }
}

// 初始化 Babylon.js
const initBabylon = () => {
  if (!renderCanvas.value) return

  // 初始化引擎
  engine = new BABYLON.Engine(renderCanvas.value, true)

  // 创建场景
  scene = new BABYLON.Scene(engine)
  scene.clearColor = new BABYLON.Color4(0.5, 0.8, 1, 1) // 蓝色背景

  // 创建相机（第一人称）
  camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 2, -10), scene)
  camera.setTarget(BABYLON.Vector3.Zero())
  camera.attachControl(renderCanvas.value, true)
  camera.inputs.clear()
  camera.minZ = 0.1
  camera.fov = Math.PI / 3
  camera.inertia = 0

  // 创建玩家（胶囊体）
  player = BABYLON.MeshBuilder.CreateCapsule('player', {
    height: 2,
    radius: 0.5
  }, scene)
  player.position = new BABYLON.Vector3(0, 1, 0)

  // 相机跟随玩家
  camera.parent = player
  camera.position = new BABYLON.Vector3(0, 0.5, 0)

  // 创建光源
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
  light.intensity = 0.7

  const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, 1), scene)
  dirLight.intensity = 0.5

  // 创建地面
  const ground = BABYLON.MeshBuilder.CreateGround('ground', {
    width: 100,
    height: 100
  }, scene)

  const groundMat = new BABYLON.StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3)
  groundMat.specularColor = new BABYLON.Color3(0, 0, 0)
  ground.material = groundMat
  ground.position.y = 0

  // 创建障碍物
  createObstacles()

  // 创建天空盒
  createSkybox()

  // 设置输入处理
  setupInputHandlers()

  // 渲染循环
  engine.runRenderLoop(() => {
    if (scene) {
      scene.render()
    }
    
    if (gameStarted.value) {
      handleMovement()
    }
  })

  // 窗口大小调整
  window.addEventListener('resize', () => {
    if (engine) {
      engine.resize()
    }
  })
}

// 创建天空盒
const createSkybox = () => {
  if (!scene) return
  
  const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 150 }, scene)
  const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene)
  skyboxMaterial.backFaceCulling = false
  skyboxMaterial.disableLighting = true
  skyboxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1)
  skybox.material = skyboxMaterial
  
  // 天空盒不需要物理属性
  skybox.isPickable = false
}

// 创建障碍物
const createObstacles = () => {
  if (!scene) return
  
  const obstaclePositions = [
    { x: 10, z: 10 },
    { x: -10, z: 10 },
    { x: 10, z: -10 },
    { x: -10, z: -10 },
    { x: 0, z: 15 },
    { x: 15, z: 0 },
    { x: -15, z: 0 },
    { x: 0, z: -15 }
  ]

  obstaclePositions.forEach((pos, i) => {
    const height = Math.random() * 3 + 2
    const obstacle = BABYLON.MeshBuilder.CreateBox(`obstacle${i}`, {
      width: 2,
      height: height,
      depth: 2
    }, scene!)

    obstacle.position = new BABYLON.Vector3(pos.x, height / 2, pos.z)

    const mat = new BABYLON.StandardMaterial(`obstacleMat${i}`, scene!)
    mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5)
    obstacle.material = mat
  })
}

// 处理移动
const handleMovement = () => {
  if (!player || !camera) return

  const forward = camera.getDirection(BABYLON.Vector3.Forward())
  const right = camera.getDirection(BABYLON.Vector3.Right())

  // 只使用水平方向
  forward.y = 0
  right.y = 0
  forward.normalize()
  right.normalize()

  let moveVector = BABYLON.Vector3.Zero()

  if (keys.value['w'] || keys.value['W']) moveVector.addInPlace(forward)
  if (keys.value['s'] || keys.value['S']) moveVector.subtractInPlace(forward)
  if (keys.value['a'] || keys.value['A']) moveVector.subtractInPlace(right)
  if (keys.value['d'] || keys.value['D']) moveVector.addInPlace(right)

  if (moveVector.length() > 0) {
    moveVector.normalize()
    moveVector.scaleInPlace(config.moveSpeed)
    player.position.addInPlace(moveVector)
  }

  // 限制玩家在地图内
  player.position.x = Math.max(-45, Math.min(45, player.position.x))
  player.position.z = Math.max(-45, Math.min(45, player.position.z))
}

// 输入事件处理
const setupInputHandlers = () => {
  if (!renderCanvas.value) return

  // 键盘事件
  window.addEventListener('keydown', (e) => {
    keys.value[e.key] = true
  })

  window.addEventListener('keyup', (e) => {
    keys.value[e.key] = false
  })

  // 鼠标移动
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderCanvas.value && camera) {
      // 旋转相机
      camera.rotation.y += e.movementX * config.lookSpeed
      camera.rotation.x += e.movementY * config.lookSpeed

      // 限制垂直视角
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x))
    }
  })

  // 指针锁定状态变化
  document.addEventListener('pointerlockchange', () => {
    mouse.value.locked = document.pointerLockElement === renderCanvas.value
  })

  // ESC 退出
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameStarted.value) {
      gameStarted.value = false
      document.exitPointerLock()
    }
  })
}

// 生命周期
onMounted(() => {
  initBabylon()
})

onUnmounted(() => {
  if (engine) {
    engine.dispose()
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
  pointer-events: auto;
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