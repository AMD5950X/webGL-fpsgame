<template>
  <div class="game-container">
    <canvas ref="renderCanvas"></canvas>
    <div class="ui-overlay">
      <div class="menu" v-if="!gameStarted">
        <h1>WebGL FPS Game - 测试版</h1>
        <button @click="startGame">开始游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/core/Physics/physicsEngineComponent'

// 游戏元素引用
const renderCanvas = ref<HTMLCanvasElement | null>(null)
let engine: BABYLON.Engine | null = null
let scene: BABYLON.Scene | null = null
let camera: BABYLON.UniversalCamera | null = null

// 游戏状态
const gameStarted = ref(false)

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
  scene.clearColor = new BABYLON.Color4(0.2, 0.6, 0.9, 1.0) // 蓝色背景

  // 创建相机
  camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 5, -10), scene)
  camera.setTarget(BABYLON.Vector3.Zero())
  camera.attachControl(renderCanvas.value, true)
  camera.minZ = 0.1

  // 创建光源
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
  light.intensity = 0.7

  // 创建地面
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene)
  const groundMat = new BABYLON.StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3)
  ground.material = groundMat

  // 创建球体
  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene)
  const sphereMat = new BABYLON.StandardMaterial('sphereMat', scene)
  sphereMat.diffuseColor = new BABYLON.Color3(1, 0, 0)
  sphere.material = sphereMat
  sphere.position.y = 1

  // 渲染循环
  engine.runRenderLoop(() => {
    if (scene) {
      scene.render()
    }
  })

  // 窗口大小调整
  window.addEventListener('resize', () => {
    if (engine) {
      engine.resize()
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
</style>