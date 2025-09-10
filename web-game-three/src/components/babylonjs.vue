<template>
  <div class="game-container">
    <canvas ref="renderCanvas"></canvas>
    <div class="ui-overlay">
      <div class="crosshair"></div>
      <div class="stats">
        <div class="health">❤️ {{ playerHealth }}</div>
        <div class="ammo">🔫 {{ currentAmmo }} / {{ maxAmmo }}</div>
        <div class="score">Score: {{ score }}</div>
      </div>
      <div class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? '🟢 Online' : '🔴 Offline' }}
      </div>
    </div>
    <div v-if="!gameStarted" class="menu">
      <h1>WebGL FPS Game</h1>
      <button @click="startGame">开始游戏</button>
      <button @click="connectWebSocket">联机对战</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'
import '@babylonjs/materials'
import '@babylonjs/serializers'
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin'
import * as CANNON from 'cannon'
import { MultiplayerManager } from './MultiplayerManager.ts' // 明确指定文件扩展名

// 游戏状态
const renderCanvas = ref(null)
const gameStarted = ref(false)
const playerHealth = ref(100)
const currentAmmo = ref(30)
const maxAmmo = ref(30)
const score = ref(0)
const isConnected = ref(false)

// Babylon.js 变量
let engine = null
let scene = null
let camera = null
let player = null
let ground = null

// 游戏配置
const config = {
  moveSpeed: 0.2,
  lookSpeed: 0.002,
  jumpHeight: 0.3,
  gravity: -0.01,
  shootCooldown: 100,
  reloadTime: 2000
}

// 输入状态
const keys = {}
const mouse = { x: 0, y: 0, locked: false }
let canShoot = true
let isReloading = false
let velocity = { x: 0, y: 0, z: 0 }
let isGrounded = true

// WebSocket 相关
let ws = null
const wsUrl = 'ws://47.76.122.60:9001' // 连接到您的C++服务器

// 多人游戏管理器
let multiplayerManager = null
const otherPlayers = new Map()
const bullets = []

// 初始化 Babylon.js
const initBabylon = () => {
  engine = new BABYLON.Engine(renderCanvas.value, true)

  scene = new BABYLON.Scene(engine)
  scene.clearColor = new BABYLON.Color3(0.5, 0.8, 1)

  // 启用物理引擎（使用Cannon.js插件）
  const cannonPlugin = new CannonJSPlugin(true, 10, CANNON)
  scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), cannonPlugin)

  // 创建相机（第一人称）
  camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 2, -10), scene)
  camera.setTarget(BABYLON.Vector3.Zero())
  camera.attachControl(renderCanvas.value, false)
  camera.inputs.clear()
  camera.minZ = 0.1
  camera.fov = Math.PI / 3
  camera.inertia = 0

  // 创建玩家（胶囊体）
  player = BABYLON.MeshBuilder.CreateBox('player', {
    height: 2,
    width: 1,
    depth: 1
  }, scene)
  player.position = new BABYLON.Vector3(0, 2, -10)
  player.isVisible = false

  // 相机跟随玩家
  camera.parent = player
  camera.position = new BABYLON.Vector3(0, 0.5, 0)

  // 创建光源
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
  light.intensity = 0.7

  const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, 1), scene)
  dirLight.intensity = 0.5

  // 创建地面
  ground = BABYLON.MeshBuilder.CreateGround('ground', {
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

  // 初始化多人游戏管理器
  multiplayerManager = new MultiplayerManager(scene)
  setupMultiplayerCallbacks()

  // 渲染循环
  engine.runRenderLoop(() => {
    if (gameStarted.value) {
      updateGame()
    }
    scene.render()
  })

  // 窗口大小调整
  window.addEventListener('resize', () => {
    engine.resize()
  })
}

// 创建天空盒
const createSkybox = () => {
  const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 150 }, scene)
  const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene)
  skyboxMaterial.backFaceCulling = false
  skyboxMaterial.disableLighting = true
  skyboxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1)
  skybox.material = skyboxMaterial
}

// 创建障碍物
const createObstacles = () => {
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
    }, scene)

    obstacle.position = new BABYLON.Vector3(pos.x, height / 2, pos.z)

    const mat = new BABYLON.StandardMaterial(`obstacleMat${i}`, scene)
    mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5)
    obstacle.material = mat
  })
}

// 游戏更新循环
const updateGame = () => {
  handleMovement()
  handleShooting()
  updateBullets()
  updateMultiplayer()
}

// 处理移动
const handleMovement = () => {
  if (!player) return

  const forward = camera.getDirection(BABYLON.Vector3.Forward())
  const right = camera.getDirection(BABYLON.Vector3.Right())

  // 只使用水平方向
  forward.y = 0
  right.y = 0
  forward.normalize()
  right.normalize()

  let moveVector = BABYLON.Vector3.Zero()

  if (keys['w'] || keys['W']) moveVector.addInPlace(forward)
  if (keys['s'] || keys['S']) moveVector.subtractInPlace(forward)
  if (keys['a'] || keys['A']) moveVector.subtractInPlace(right)
  if (keys['d'] || keys['D']) moveVector.addInPlace(right)

  if (moveVector.length() > 0) {
    moveVector.normalize()
    moveVector.scaleInPlace(config.moveSpeed)
    player.position.addInPlace(moveVector)
  }

  // 跳跃
  if (keys[' '] && isGrounded) {
    velocity.y = config.jumpHeight
    isGrounded = false
  }

  // 重力
  if (!isGrounded) {
    velocity.y += config.gravity
    player.position.y += velocity.y

    // 简单的地面检测
    if (player.position.y <= 2) {
      player.position.y = 2
      velocity.y = 0
      isGrounded = true
    }
  }

  // 限制玩家在地图内
  player.position.x = Math.max(-45, Math.min(45, player.position.x))
  player.position.z = Math.max(-45, Math.min(45, player.position.z))
}

// 处理射击
const handleShooting = () => {
  if (mouse.leftButton && canShoot && !isReloading && currentAmmo.value > 0) {
    shoot()
    canShoot = false
    setTimeout(() => { canShoot = true }, config.shootCooldown)
  }

  // 重新装弹
  if (keys['r'] || keys['R'] || currentAmmo.value === 0) {
    if (!isReloading) {
      reload()
    }
  }
}

// 射击
const shoot = () => {
  currentAmmo.value--

  // 创建子弹
  const bullet = BABYLON.MeshBuilder.CreateSphere('bullet', { diameter: 0.2 }, scene)
  bullet.position = camera.globalPosition.clone()

  const mat = new BABYLON.StandardMaterial('bulletMat', scene)
  mat.emissiveColor = new BABYLON.Color3(1, 1, 0)
  bullet.material = mat

  const direction = camera.getDirection(BABYLON.Vector3.Forward())

  bullets.push({
    mesh: bullet,
    velocity: direction.scale(2),
    lifetime: 60
  })

  // 发送射击信息到服务器
  if (isConnected.value && multiplayerManager) {
    multiplayerManager.sendShoot(camera.globalPosition.clone(), direction.clone())
  }
}

// 重新装弹
const reload = () => {
  isReloading = true
  setTimeout(() => {
    currentAmmo.value = maxAmmo.value
    isReloading = false
  }, config.reloadTime)
}

// 更新子弹
const updateBullets = () => {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]
    bullet.mesh.position.addInPlace(bullet.velocity)
    bullet.lifetime--

    if (bullet.lifetime <= 0) {
      bullet.mesh.dispose()
      bullets.splice(i, 1)
    }
  }
}

// 更新多人游戏状态
const updateMultiplayer = () => {
  if (isConnected.value && multiplayerManager) {
    multiplayerManager.sendPlayerUpdate(
      player.position,
      { x: camera.rotation.x, y: camera.rotation.y },
      playerHealth.value
    )
  }
}

// 设置多人游戏回调
const setupMultiplayerCallbacks = () => {
  if (!multiplayerManager) return

  multiplayerManager.setOnPlayerUpdateCallback((playerId, data) => {
    let otherPlayer = otherPlayers.get(playerId)
    
    if (!otherPlayer) {
      // 创建其他玩家的网格
      const mesh = BABYLON.MeshBuilder.CreateBox(`otherPlayer_${playerId}`, {
        height: 2,
        width: 1,
        depth: 1
      }, scene)
      
      const mat = new BABYLON.StandardMaterial(`otherPlayerMat_${playerId}`, scene)
      mat.diffuseColor = new BABYLON.Color3(0, 0, 1) // 蓝色表示其他玩家
      mat.emissiveColor = new BABYLON.Color3(0, 0, 0.3)
      mesh.material = mat
      
      otherPlayer = { mesh, data }
      otherPlayers.set(playerId, otherPlayer)
    }
    
    // 更新位置和旋转
    otherPlayer.mesh.position.copyFrom(data.position)
    otherPlayer.data = data
  })

  multiplayerManager.setOnBulletUpdateCallback((bulletId, data) => {
    // 创建其他玩家的子弹
    const bullet = BABYLON.MeshBuilder.CreateSphere(`otherBullet_${bulletId}`, { diameter: 0.2 }, scene)
    bullet.position.copyFrom(data.position)
    
    const mat = new BABYLON.StandardMaterial(`otherBulletMat_${bulletId}`, scene)
    mat.emissiveColor = new BABYLON.Color3(1, 0, 0) // 红色表示其他玩家的子弹
    bullet.material = mat
    
    bullets.push({
      mesh: bullet,
      velocity: data.direction.scale(2),
      lifetime: 60
    })
  })

  multiplayerManager.setOnPlayerDisconnectCallback((playerId) => {
    const otherPlayer = otherPlayers.get(playerId)
    if (otherPlayer) {
      otherPlayer.mesh.dispose()
      otherPlayers.delete(playerId)
    }
  })
}

// 游戏结束
const gameOver = () => {
  gameStarted.value = false
  alert(`游戏结束！得分: ${score.value}`)
  resetGame()
}

// 重置游戏
const resetGame = () => {
  playerHealth.value = 100
  currentAmmo.value = 30
  score.value = 0
  player.position = new BABYLON.Vector3(0, 2, -10)

  // 清理子弹
  bullets.forEach(bullet => bullet.mesh.dispose())
  bullets.length = 0
}

// 开始游戏
const startGame = () => {
  gameStarted.value = true
  lockPointer()
}

// 锁定鼠标指针
const lockPointer = () => {
  renderCanvas.value.requestPointerLock()
}

// WebSocket 连接
const connectWebSocket = async () => {
  try {
    if (multiplayerManager) {
      await multiplayerManager.connect(wsUrl)
      isConnected.value = true
      startGame()
    }
  } catch (error) {
    console.error('Failed to connect to multiplayer server:', error)
    alert('无法连接到服务器，请检查网络连接')
  }
}

// 输入事件处理
const setupInputHandlers = () => {
  // 定义事件处理函数，以便后续可以正确移除
  const keydownHandler = (e) => {
    keys[e.key] = true
  }

  const keyupHandler = (e) => {
    keys[e.key] = false
  }

  const mousemoveHandler = (e) => {
    if (document.pointerLockElement === renderCanvas.value) {
      // 旋转相机
      camera.rotation.y += e.movementX * config.lookSpeed
      camera.rotation.x += e.movementY * config.lookSpeed

      // 限制垂直视角
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x))
    }
  }

  const mousedownHandler = (e) => {
    if (e.button === 0) {
      mouse.leftButton = true
    }
  }

  const mouseupHandler = (e) => {
    if (e.button === 0) {
      mouse.leftButton = false
    }
  }

  const pointerlockchangeHandler = () => {
    mouse.locked = document.pointerLockElement === renderCanvas.value
  }

  const escKeyHandler = (e) => {
    if (e.key === 'Escape' && gameStarted.value) {
      gameStarted.value = false
      document.exitPointerLock()
    }
  }

  // 添加事件监听器
  window.addEventListener('keydown', keydownHandler)
  window.addEventListener('keyup', keyupHandler)
  window.addEventListener('mousemove', mousemoveHandler)
  window.addEventListener('mousedown', mousedownHandler)
  window.addEventListener('mouseup', mouseupHandler)
  document.addEventListener('pointerlockchange', pointerlockchangeHandler)
  window.addEventListener('keydown', escKeyHandler)

  // 返回清理函数
  return () => {
    window.removeEventListener('keydown', keydownHandler)
    window.removeEventListener('keyup', keyupHandler)
    window.removeEventListener('mousemove', mousemoveHandler)
    window.removeEventListener('mousedown', mousedownHandler)
    window.removeEventListener('mouseup', mouseupHandler)
    document.removeEventListener('pointerlockchange', pointerlockchangeHandler)
    window.removeEventListener('keydown', escKeyHandler)
  }
}

// 生命周期
onMounted(() => {
  initBabylon()
  // 保存清理函数
  cleanupFunction = setupInputHandlers()
})

onUnmounted(() => {
  if (engine) {
    engine.dispose()
  }
  if (multiplayerManager) {
    multiplayerManager.disconnect()
  }
  
  // 执行事件监听器清理
  if (cleanupFunction) {
    cleanupFunction()
  }
})

// 添加cleanupFunction变量来保存清理函数
let cleanupFunction = null
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