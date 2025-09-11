<template>
  <div class="babylon-container">
    <canvas ref="renderCanvas"></canvas>
    <div class="ui-overlay">
      <div class="controls-info">
        <h3>物理引擎演示</h3>
        <p>点击屏幕创建物体</p>
        <div class="shape-selector">
          <button @click="setShape('sphere')" :class="{ active: currentShape === 'sphere' }">球体</button>
          <button @click="setShape('box')" :class="{ active: currentShape === 'box' }">立方体</button>
          <button @click="setShape('cylinder')" :class="{ active: currentShape === 'cylinder' }">圆柱体</button>
        </div>
        <div class="material-selector">
          <button @click="setMaterial('default')" :class="{ active: currentMaterial === 'default' }">默认</button>
          <button @click="setMaterial('bouncy')" :class="{ active: currentMaterial === 'bouncy' }">弹性</button>
          <button @click="setMaterial('heavy')" :class="{ active: currentMaterial === 'heavy' }">重型</button>
        </div>
        <div class="actions">
          <button @click="clearObjects">清除所有物体</button>
          <button @click="toggleGravity">{{ isGravityEnabled ? '关闭重力' : '开启重力' }}</button>
        </div>
        <div class="stats">
          <p>物体数量: {{ objectCount }}</p>
          <p>FPS: {{ fps }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Babylon.js 3D物理引擎演示组件
 * 使用Cannon.js作为物理引擎
 * 官方文档参考：https://doc.babylonjs.com/features/featuresDeepDive/physics
 */

import { ref, onMounted, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import { enableScenePhysics, defaultPhysicsConfig } from '../utils/physicsConfig'

// 渲染元素引用 - 用于挂载Babylon.js画布
const renderCanvas = ref<HTMLCanvasElement | null>(null)

// Babylon.js核心对象
let engine: BABYLON.Engine | null = null  // 渲染引擎
let scene: BABYLON.Scene | null = null    // 3D场景
let camera: BABYLON.ArcRotateCamera | null = null  // 相机
let light: BABYLON.HemisphericLight | null = null  // 光源

// 物理引擎状态
const isGravityEnabled = ref(true)  // 重力开关状态
const objectCount = ref(0)          // 场景中物体数量
const fps = ref(0)                  // 帧率

// 物体创建配置
const currentShape = ref<'sphere' | 'box' | 'cylinder'>('sphere')  // 当前选择的形状
const currentMaterial = ref<'default' | 'bouncy' | 'heavy'>('default')  // 当前选择的材质

// 物体列表 - 用于清除
const physicsObjects: BABYLON.Mesh[] = []

/**
 * 设置当前创建的物体形状
 * @param shape - 形状类型: 'sphere' | 'box' | 'cylinder'
 */
const setShape = (shape: 'sphere' | 'box' | 'cylinder') => {
  currentShape.value = shape
}

/**
 * 设置当前创建的物体材质
 * @param material - 材质类型: 'default' | 'bouncy' | 'heavy'
 */
const setMaterial = (material: 'default' | 'bouncy' | 'heavy') => {
  currentMaterial.value = material
}

/**
 * 清除场景中所有物理物体
 * 参考: https://doc.babylonjs.com/features/featuresDeepDive/mesh/disposeBasicMeshes
 */
const clearObjects = () => {
  if (!scene) return
  
  // 遍历所有物体并释放资源
  physicsObjects.forEach(obj => {
    if (obj && !obj.isDisposed()) {
      obj.dispose()  // 释放网格资源
    }
  })
  
  // 清空数组
  physicsObjects.length = 0
  objectCount.value = 0
}

/**
 * 切换重力开关
 * 参考: https://doc.babylonjs.com/features/featuresDeepDive/physics/forces#gravity
 */
const toggleGravity = () => {
  if (!scene || !scene.getPhysicsEngine()) return
  
  isGravityEnabled.value = !isGravityEnabled.value
  
  if (isGravityEnabled.value) {
    // 启用重力 (Y轴负方向，9.81m/s²)
    scene.getPhysicsEngine()!.setGravity(new BABYLON.Vector3(0, -9.81, 0))
  } else {
    // 关闭重力
    scene.getPhysicsEngine()!.setGravity(new BABYLON.Vector3(0, 0, 0))
  }
}

/**
 * 创建物理材质参数
 * @param type - 材质类型
 * @returns 物理材质参数对象
 * 参考: https://doc.babylonjs.com/features/featuresDeepDive/physics/physicsJoint#impostor-properties
 */
const createPhysicsMaterial = (type: 'default' | 'bouncy' | 'heavy') => {
  switch (type) {
    case 'default':
      return { mass: 1, restitution: 0.2, friction: 0.5 }  // 标准物理参数
    case 'bouncy':
      return { mass: 0.5, restitution: 0.9, friction: 0.1 }  // 高弹性，低摩擦
    case 'heavy':
      return { mass: 5, restitution: 0.1, friction: 0.8 }    // 重量大，低弹性
  }
}

/**
 * 在指定位置创建物理物体
 * @param position - 物体位置 (BABYLON.Vector3)
 * 参考: https://doc.babylonjs.com/features/featuresDeepDive/physics/physicsIntro
 */
const createPhysicsObject = (position: BABYLON.Vector3) => {
  if (!scene) return
  
  let mesh: BABYLON.Mesh
  // 创建标准材质
  const material = new BABYLON.StandardMaterial(`material_${Date.now()}`, scene)
  
  // 根据材质类型设置颜色
  switch (currentMaterial.value) {
    case 'default':
      material.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.8)  // 蓝色
      break
    case 'bouncy':
      material.diffuseColor = new BABYLON.Color3(0.8, 0.4, 0.4)  // 红色
      break
    case 'heavy':
      material.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4)  // 绿色
      break
  }
  
  // 根据形状类型创建网格
  switch (currentShape.value) {
    case 'sphere':
      // 创建球体，直径1单位
      mesh = BABYLON.MeshBuilder.CreateSphere(`sphere_${Date.now()}`, { diameter: 1 }, scene)
      break
    case 'box':
      // 创建立方体，尺寸1单位
      mesh = BABYLON.MeshBuilder.CreateBox(`box_${Date.now()}`, { size: 1 }, scene)
      break
    case 'cylinder':
      // 创建圆柱体，高度1单位，直径1单位
      mesh = BABYLON.MeshBuilder.CreateCylinder(`cylinder_${Date.now()}`, { height: 1, diameter: 1 }, scene)
      break
  }
  
  // 设置材质和位置
  mesh.material = material
  mesh.position = position
  
  // 获取物理材质参数
  const physicsMaterial = createPhysicsMaterial(currentMaterial.value)
  
  // 根据形状确定物理模拟类型
  let physicsImpostorType: number
  switch (currentShape.value) {
    case 'sphere':
      physicsImpostorType = BABYLON.PhysicsImpostor.SphereImpostor  // 球体模拟
      break
    case 'box':
      physicsImpostorType = BABYLON.PhysicsImpostor.BoxImpostor     // 立方体模拟
      break
    case 'cylinder':
      physicsImpostorType = BABYLON.PhysicsImpostor.CylinderImpostor // 圆柱体模拟
      break
  }
  
  // 添加物理模拟器
  mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
    mesh,                    // 目标网格
    physicsImpostorType,     // 物理模拟类型
    physicsMaterial,         // 物理参数
    scene                    // 所属场景
  )
  
  // 添加到物体列表并更新计数
  physicsObjects.push(mesh)
  objectCount.value = physicsObjects.length
  
  return mesh
}

/**
 * 初始化Babylon.js场景
 * 参考: https://doc.babylonjs.com/features/featuresDeepDive/scene
 */
const initBabylon = async () => {
  if (!renderCanvas.value) return
  
  // 1. 创建渲染引擎
  // 参数说明: 
  // - canvas: 渲染画布
  // - antialias: 是否开启抗锯齿
  // - options: 引擎选项 (保留绘图缓冲区，启用模板缓冲区)
  engine = new BABYLON.Engine(renderCanvas.value, true, { 
    preserveDrawingBuffer: true, 
    stencil: true 
  })
  
  // 2. 创建场景
  scene = new BABYLON.Scene(engine)
  // 设置场景背景色 (深灰色)
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1)
  
  // 3. 创建相机 (弧旋转相机)
  // 参数说明:
  // - name: 相机名称
  // - alpha: 水平旋转角度 (-π/2 表示初始面向正X轴)
  // - beta: 垂直旋转角度 (π/3 表示向下倾斜60度)
  // - radius: 相机距离目标的距离
  // - target: 相机观察目标点
  camera = new BABYLON.ArcRotateCamera(
    'camera', 
    -Math.PI / 2, 
    Math.PI / 3, 
    15, 
    BABYLON.Vector3.Zero(), 
    scene
  )
  // 启用相机控制
  camera.attachControl(renderCanvas.value, true)
  // 设置相机距离限制
  camera.lowerRadiusLimit = 5  // 最小距离
  camera.upperRadiusLimit = 30 // 最大距离
  
  // 4. 创建光源 (半球光)
  // 参数说明:
  // - name: 光源名称
  // - direction: 光源方向
  // - scene: 所属场景
  light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
  light.intensity = 0.7  // 设置光照强度
  
  // 5. 创建地面
  const ground = BABYLON.MeshBuilder.CreateGround(
    'ground', 
    { width: 20, height: 20 }, 
    scene
  )
  // 创建地面材质
  const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', scene)
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2)  // 深灰色
  groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0)       // 无高光
  ground.material = groundMaterial
  ground.position.y = -2  // 下移2单位
  
  // 6. 启用物理引擎
  await enableScenePhysics(scene, {
    ...defaultPhysicsConfig,  // 使用默认配置
  })
  
  // 7. 为地面添加物理属性
  // 参数说明:
  // - mesh: 目标网格
  // - impostorType: 物理模拟类型 (BoxImpostor表示盒子碰撞体)
  // - options: 物理参数 (mass=0表示静态物体)
  ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, restitution: 0.5, friction: 0.5 },
    scene
  )
  
  // 8. 设置点击事件
  scene.onPointerDown = (evt) => {
    if (evt.button !== 0) return // 只响应左键点击
    
    // 从点击位置创建射线
    // 参数说明:
    // - x, y: 屏幕坐标
    // - worldMatrix: 世界矩阵
    // - camera: 相机对象
    const ray = scene!.createPickingRay(
      scene!.pointerX,
      scene!.pointerY,
      BABYLON.Matrix.Identity(),
      camera
    )
    
    // 检测射线与场景的交点
    const hit = scene!.pickWithRay(ray)
    
    if (hit && hit.pickedPoint) {
      // 在点击位置上方5单位处创建物体
      const position = new BABYLON.Vector3(
        hit.pickedPoint.x,
        hit.pickedPoint.y + 5,
        hit.pickedPoint.z
      )
      createPhysicsObject(position)
    } else {
      // 在相机前方5单位处创建物体
      const forward = camera!.getTarget().subtract(camera!.position).normalize()
      const position = camera!.position.add(forward.scale(5))
      createPhysicsObject(position)
    }
  }
  
  // 9. 创建初始物体
  createInitialObjects()
  
  // 10. 启动渲染循环
  engine.runRenderLoop(() => {
    scene!.render()  // 渲染场景
    fps.value = Math.round(engine!.getFps())  // 更新帧率显示
  })
  
  // 11. 响应窗口大小变化
  window.addEventListener('resize', () => {
    engine!.resize()  // 调整引擎大小
  })
}

/**
 * 创建初始物体 (演示用)
 */
const createInitialObjects = () => {
  if (!scene) return
  
  // 创建一个小金字塔
  const positions = [
    new BABYLON.Vector3(-2, 0, -2),
    new BABYLON.Vector3(2, 0, -2),
    new BABYLON.Vector3(-2, 0, 2),
    new BABYLON.Vector3(2, 0, 2),
    new BABYLON.Vector3(0, 0, 0),
    new BABYLON.Vector3(0, 1, 0)
  ]
  
  // 保存当前选择
  const originalShape = currentShape.value
  const originalMaterial = currentMaterial.value
  
  // 创建底层方块 (重型材质)
  currentShape.value = 'box'
  currentMaterial.value = 'heavy'
  positions.slice(0, 4).forEach(pos => {
    createPhysicsObject(pos)
  })
  
  // 创建中间方块 (默认材质)
  currentMaterial.value = 'default'
  createPhysicsObject(positions[4])
  
  // 创建顶部球体 (弹性材质)
  currentShape.value = 'sphere'
  currentMaterial.value = 'bouncy'
  createPhysicsObject(positions[5])
  
  // 恢复原始选择
  currentShape.value = originalShape
  currentMaterial.value = originalMaterial
}

// 组件挂载时初始化Babylon.js
onMounted(() => {
  initBabylon()
})

// 组件卸载时释放资源
onUnmounted(() => {
  if (scene) {
    scene.dispose()  // 释放场景资源
  }
  
  if (engine) {
    engine.dispose() // 释放引擎资源
  }
})
</script>

<style scoped>
.babylon-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.controls-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px;
  border-radius: 8px;
  max-width: 300px;
  pointer-events: auto;
}

.controls-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #4cc9f0;
}

.controls-info p {
  margin-bottom: 15px;
}

.shape-selector,
.material-selector,
.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

button {
  background: #333;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #444;
}

button.active {
  background: #4cc9f0;
  color: #111;
}

.stats {
  margin-top: 15px;
  font-size: 0.9em;
  opacity: 0.8;
}

.stats p {
  margin: 5px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls-info {
    max-width: 250px;
    padding: 10px;
    font-size: 0.9em;
  }
  
  .shape-selector,
  .material-selector,
  .actions {
    flex-wrap: wrap;
  }
  
  button {
    padding: 6px 10px;
    font-size: 0.9em;
  }
}
</style>