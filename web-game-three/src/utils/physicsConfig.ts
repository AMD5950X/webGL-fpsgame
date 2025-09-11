import * as BABYLON from '@babylonjs/core'
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin'
import * as CANNON from 'cannon'


// 物理引擎配置接口
export interface PhysicsConfig {
  gravity: BABYLON.Vector3
  iterations?: number
}

// 默认配置
export const defaultPhysicsConfig: PhysicsConfig = {
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  iterations: 10
}

// 创建Cannon.js物理引擎插件
export function createCannonPlugin(config: PhysicsConfig): BABYLON.IPhysicsEnginePlugin {
  return new CannonJSPlugin(true, config.iterations || 10, CANNON)
}

// 启用场景物理引擎
export async function enableScenePhysics(scene: BABYLON.Scene, config: PhysicsConfig = defaultPhysicsConfig): Promise<boolean> {
  try {
    const plugin = createCannonPlugin(config)
    scene.enablePhysics(config.gravity, plugin)
    console.log('Cannon.js物理引擎已启用')
    return true
  } catch (error) {
    console.error('启用物理引擎失败:', error)
    return false
  }
}
