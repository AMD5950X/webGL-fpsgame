<template>
  <div class="container">
    <h1>Babylon.js 简单测试</h1>
    <canvas ref="renderCanvas" width="800" height="600"></canvas>
    <div class="controls">
      <button @click="initScene">初始化场景</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as BABYLON from '@babylonjs/core'

const renderCanvas = ref<HTMLCanvasElement | null>(null)
let engine: BABYLON.Engine | null = null
let scene: BABYLON.Scene | null = null

const initScene = () => {
  if (!renderCanvas.value) return

  // 初始化引擎
  engine = new BABYLON.Engine(renderCanvas.value, true)

  // 创建场景
  scene = new BABYLON.Scene(engine)
  scene.clearColor = new BABYLON.Color4(0.2, 0.6, 0.9, 1.0) // 蓝色背景

  // 创建相机
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 10, BABYLON.Vector3.Zero(), scene)
  camera.attachControl(renderCanvas.value, true)

  // 创建光源
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene)
  light.intensity = 0.7

  // 创建球体
  const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene)
  const sphereMat = new BABYLON.StandardMaterial("sphereMat", scene)
  sphereMat.diffuseColor = new BABYLON.Color3(1, 0, 0) // 红色
  sphere.material = sphereMat

  // 创建地面
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene)
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene)
  groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3) // 绿色
  ground.material = groundMat

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

onMounted(() => {
  // 组件挂载后自动初始化场景
  // initScene()
})
</script>

<style scoped>
.container {
  padding: 20px;
  text-align: center;
}

canvas {
  border: 1px solid #ccc;
  margin: 20px auto;
  display: block;
}

.controls {
  margin: 20px 0;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}
</style>