<template>
  <div class="game-container">
    <canvas ref="gameCanvas" class="game-canvas" />
    <div class="ui-overlay">
      <div class="crosshair"></div>
      <div class="controls-info">
        <p>WASD: 移动</p>
        <p>空格: 跳跃</p>
        <p>鼠标: 视角</p>
        <p>左键: 射击</p>
        <p>点击画面锁定鼠标</p>
      </div>
      <div class="fps-counter">FPS: {{ fps }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import * as CANNON from 'cannon'

// 引用
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const fps = ref(0)

// 游戏对象
let engine: BABYLON.Engine | null = null
let scene: BABYLON.Scene | null = null
let camera: BABYLON.FreeCamera | null = null
let world: CANNON.World | null = null
let playerBody: CANNON.Body | null = null

// 输入状态接口
interface InputMap {
  w: boolean
  a: boolean
  s: boolean
  d: boolean
  space: boolean
}

// 输入状态
const inputMap: InputMap = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
}

// 玩家状态接口
interface PlayerState {
  moveSpeed: number
  jumpForce: number
  isOnGround: boolean
}

const playerState: PlayerState = {
  moveSpeed: 8,
  jumpForce: 12,
  isOnGround: false
}

// 鼠标控制变量
let mouseX = 0
let mouseY = 0
let isLocked = false

// 初始化物理世界
function initPhysics(): void {
  world = new CANNON.World()
  world.gravity.set(0, -20, 0)
  world.broadphase = new CANNON.NaiveBroadphase()
  world.solver.iterations = 10

  // 创建接触材料
  const defaultMaterial = new CANNON.Material('defaultMaterial')
  const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.4,
        restitution: 0.3
      }
  )
  world.addContactMaterial(defaultContactMaterial)

  // 地面物理体
  const groundShape = new CANNON.Plane()
  const groundBody = new CANNON.Body({ mass: 0, material: defaultMaterial })
  groundBody.addShape(groundShape)
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
  world.addBody(groundBody)

  // 创建玩家物理体（球体）
  const playerShape = new CANNON.Sphere(0.8)
  playerBody = new CANNON.Body({ mass: 1, material: defaultMaterial })
  playerBody.addShape(playerShape)
  playerBody.position.set(0, 5, 0)
  playerBody.fixedRotation = true // 防止玩家旋转
  world.addBody(playerBody)

  // 创建障碍物
  for (let i = 0; i < 15; i++) {
    const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1))
    const boxBody = new CANNON.Body({ mass: 1, material: defaultMaterial })
    boxBody.addShape(boxShape)
    boxBody.position.set(
        (Math.random() - 0.5) * 40,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 40
    )
    world.addBody(boxBody)
  }
}

// 创建场景
function createScene(): BABYLON.Scene {
  if (!engine) throw new Error('Engine not initialized')

  scene = new BABYLON.Scene(engine)
  scene.collisionsEnabled = true

  // 创建相机
  camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, 0), scene)
  camera.setTarget(BABYLON.Vector3.Zero())

  // 禁用默认输入控制
  camera.inputs.clear()

  // 创建光源
  const hemisphericLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), scene)
  hemisphericLight.intensity = 0.6

  const directionalLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), scene)
  directionalLight.intensity = 1
  directionalLight.position = new BABYLON.Vector3(20, 40, 20)

  // 创建阴影生成器
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, directionalLight)
  shadowGenerator.useExponentialShadowMap = true

  // 创建地面
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene)
  const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene)
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.2)
  groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
  ground.material = groundMaterial
  ground.receiveShadows = true

  // 创建障碍物网格并存储引用
  const obstacles: BABYLON.Mesh[] = []
  for (let i = 0; i < 15; i++) {
    const box = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 2 }, scene)
    const boxMaterial = new BABYLON.StandardMaterial(`boxMat${i}`, scene)
    boxMaterial.diffuseColor = new BABYLON.Color3(
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7
    )
    box.material = boxMaterial
    shadowGenerator.getShadowMap()!.renderList!.push(box)
    box.receiveShadows = true
    obstacles.push(box)
  }

  // 存储障碍物引用到场景
  ;(scene as any).obstacles = obstacles

  return scene
}

// 设置鼠标控制
function setupMouseControls(): void {
  if (!gameCanvas.value) return

  // 点击锁定鼠标
  gameCanvas.value.addEventListener('click', () => {
    if (!isLocked) {
      gameCanvas.value!.requestPointerLock()
    }
  })

  // 监听指针锁定状态
  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === gameCanvas.value
  })

  // 鼠标移动事件
  document.addEventListener('mousemove', (event: MouseEvent) => {
    if (!isLocked || !camera) return

    const sensitivity = 0.002
    mouseX += event.movementX * sensitivity
    mouseY += event.movementY * sensitivity
    mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY))

    camera.rotation.y = mouseX
    camera.rotation.x = mouseY
  })

  // 鼠标点击射击
  document.addEventListener('mousedown', (event: MouseEvent) => {
    if (event.button === 0 && isLocked) {
      createBullet()
    }
  })
}

// 设置键盘控制
function setupKeyboardControls(): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
        inputMap.w = true
        break
      case 'KeyA':
        inputMap.a = true
        break
      case 'KeyS':
        inputMap.s = true
        break
      case 'KeyD':
        inputMap.d = true
        break
      case 'Space':
        inputMap.space = true
        event.preventDefault()
        break
    }
  })

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
        inputMap.w = false
        break
      case 'KeyA':
        inputMap.a = false
        break
      case 'KeyS':
        inputMap.s = false
        break
      case 'KeyD':
        inputMap.d = false
        break
      case 'Space':
        inputMap.space = false
        break
    }
  })
}

// 处理玩家移动
function updatePlayer(): void {
  if (!playerBody || !camera) return

  // 获取相机方向
  const forward = camera.getDirection(BABYLON.Vector3.Forward()).normalize()
  const right = camera.getDirection(BABYLON.Vector3.Right()).normalize()

  // 计算移动向量
  let moveX = 0
  let moveZ = 0

  if (inputMap.w) {
    moveX += forward.x
    moveZ += forward.z
  }
  if (inputMap.s) {
    moveX -= forward.x
    moveZ -= forward.z
  }
  if (inputMap.a) {
    moveX -= right.x
    moveZ -= right.z
  }
  if (inputMap.d) {
    moveX += right.x
    moveZ += right.z
  }

  // 标准化移动向量
  const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ)
  if (moveLength > 0) {
    moveX = (moveX / moveLength) * playerState.moveSpeed
    moveZ = (moveZ / moveLength) * playerState.moveSpeed
  }

  // 应用移动
  playerBody.velocity.x = moveX
  playerBody.velocity.z = moveZ

  // 跳跃
  if (inputMap.space && Math.abs(playerBody.velocity.y) < 0.1) {
    playerBody.velocity.y = playerState.jumpForce
  }

  // 更新相机位置
  camera.position.x = playerBody.position.x
  camera.position.y = playerBody.position.y + 1.2
  camera.position.z = playerBody.position.z
}

// 创建子弹
function createBullet(): void {
  if (!scene || !camera || !world) return

  // 创建子弹网格
  const bullet = BABYLON.MeshBuilder.CreateSphere('bullet', { diameter: 0.1 }, scene)
  const bulletMaterial = new BABYLON.StandardMaterial('bulletMat', scene)
  bulletMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0)
  bulletMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0)
  bullet.material = bulletMaterial

  // 设置子弹起始位置
  const startPos = camera.position.add(camera.getDirection(BABYLON.Vector3.Forward()).scale(1))
  bullet.position = startPos.clone()

  // 创建子弹物理体
  const bulletShape = new CANNON.Sphere(0.05)
  const bulletBody = new CANNON.Body({ mass: 0.1 })
  bulletBody.addShape(bulletShape)
  bulletBody.position.set(startPos.x, startPos.y, startPos.z)

  // 设置子弹速度
  const direction = camera.getDirection(BABYLON.Vector3.Forward())
  const speed = 50
  bulletBody.velocity.set(
      direction.x * speed,
      direction.y * speed,
      direction.z * speed
  )

  world.addBody(bulletBody)

  // 更新子弹位置的函数
  const updateBullet = () => {
    bullet.position.x = bulletBody.position.x
    bullet.position.y = bulletBody.position.y
    bullet.position.z = bulletBody.position.z
  }

  scene.registerBeforeRender(updateBullet)

  // 5秒后销毁子弹
  setTimeout(() => {
    scene!.unregisterBeforeRender(updateBullet)
    bullet.dispose()
    world!.remove(bulletBody)
  }, 5000)
}

// 同步物理体和渲染网格
function syncPhysics(): void {
  if (!world || !scene) return

  const obstacles = (scene as any).obstacles as BABYLON.Mesh[]

  // 同步障碍物（跳过地面和玩家，从索引2开始）
  for (let i = 2; i < world.bodies.length && i - 2 < obstacles.length; i++) {
    const body = world.bodies[i]
    const mesh = obstacles[i - 2]

    if (body && mesh) {
      mesh.position.x = body.position.x
      mesh.position.y = body.position.y
      mesh.position.z = body.position.z

      mesh.rotationQuaternion = new BABYLON.Quaternion(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w
      )
    }
  }
}

// FPS计算
let frameCount = 0
let lastTime = performance.now()

function updateFPS(): void {
  frameCount++
  const currentTime = performance.now()

  if (currentTime - lastTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastTime = currentTime
  }
}

// 游戏循环
function gameLoop(): void {
  if (!world || !scene) return

  // 物理步进
  world.step(1 / 60)

  // 更新玩家
  updatePlayer()

  // 同步物理
  syncPhysics()

  // 更新FPS
  updateFPS()

  // 渲染场景
  scene.render()
}

// 组件挂载
onMounted(async () => {
  if (!gameCanvas.value) return

  try {
    // 初始化Babylon.js引擎
    engine = new BABYLON.Engine(gameCanvas.value, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    })

    // 初始化物理世界
    initPhysics()

    // 创建场景
    createScene()

    // 设置控制
    setupMouseControls()
    setupKeyboardControls()

    // 窗口大小调整
    window.addEventListener('resize', () => {
      engine?.resize()
    })

    // 开始渲染循环
    engine.runRenderLoop(gameLoop)

    console.log('游戏初始化完成')
  } catch (error) {
    console.error('游戏初始化失败:', error)
  }
})

// 定义子弹数组类型
interface BulletObject {
  cleanup: () => void;
}

// 子弹数组
const bullets: BulletObject[] = [];

// 组件卸载
onUnmounted(() => {
  // 清理所有子弹
  bullets.forEach((bullet: BulletObject) => {
    bullet.cleanup()
  })
  bullets.length = 0

  if (engine) {
    engine.dispose()
  }

  // 清理事件监听器
  window.removeEventListener('resize', () => {})
  document.removeEventListener('keydown', () => {})
  document.removeEventListener('keyup', () => {})
  document.removeEventListener('mousemove', () => {})
  document.removeEventListener('mousedown', () => {})
  document.removeEventListener('pointerlockchange', () => {})
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.crosshair::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 8px;
  margin: -4px 0 0 -1px;
  background: rgba(255, 255, 255, 0.8);
}

.crosshair::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 2px;
  margin: -1px 0 0 -4px;
  background: rgba(255, 255, 255, 0.8);
}

.controls-info {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 5px;
}

.controls-info p {
  margin: 3px 0;
  line-height: 1.4;
}

.fps-counter {
  position: absolute;
  top: 20px;
  right: 20px;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.5);
  padding: 10px;
  border-radius: 5px;
}
</style>