import * as BABYLON from '@babylonjs/core'

// 物理引擎类型枚举
export enum PhysicsEngineType {
  CANNON = 'cannon',
  AMMO = 'ammo',
  OIMO = 'oimo'
}

// 物理引擎配置接口
export interface PhysicsConfig {
  type: PhysicsEngineType
  gravity: BABYLON.Vector3
  iterations?: number
}

// 默认配置
export const defaultPhysicsConfig: PhysicsConfig = {
  type: PhysicsEngineType.CANNON,
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  iterations: 10
}

// 创建物理引擎插件
export function createPhysicsPlugin(config: PhysicsConfig): BABYLON.IPhysicsEnginePlugin | null {
  try {
    switch (config.type) {
      case PhysicsEngineType.CANNON:
        // 动态导入Cannon.js
        return import('@babylonjs/core/Physics/Plugins/cannonJSPlugin')
          .then(module => {
            const CannonJSPlugin = module.CannonJSPlugin
            return import('cannon').then(cannon => {
              return new CannonJSPlugin(true, config.iterations || 10, cannon)
            })
          })
          .catch(() => null)

      case PhysicsEngineType.AMMO:
        // 动态导入Ammo.js
        return import('@babylonjs/core/Physics/Plugins/ammoJSPlugin')
          .then(module => {
            const AmmoJSPlugin = module.AmmoJSPlugin
            return new AmmoJSPlugin()
          })
          .catch(() => null)

      case PhysicsEngineType.OIMO:
        // 动态导入Oimo.js
        return import('@babylonjs/core/Physics/Plugins/oimoJSPlugin')
          .then(module => {
            const OimoJSPlugin = module.OimoJSPlugin
            return new OimoJSPlugin()
          })
          .catch(() => null)

      default:
        console.warn(`不支持的物理引擎类型: ${config.type}`)
        return null
    }
  } catch (error) {
    console.error('创建物理引擎插件失败:', error)
    return null
  }
}

// 启用场景物理引擎
export async function enableScenePhysics(scene: BABYLON.Scene, config: PhysicsConfig = defaultPhysicsConfig): Promise<boolean> {
  try {
    const plugin = await createPhysicsPlugin(config)
    if (plugin) {
      scene.enablePhysics(config.gravity, plugin)
      console.log(`物理引擎已启用: ${config.type}`)
      return true
    } else {
      console.warn('无法创建物理引擎插件，物理引擎未启用')
      return false
    }
  } catch (error) {
    console.error('启用物理引擎失败:', error)
    return false
  }
}
