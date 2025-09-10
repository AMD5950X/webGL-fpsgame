import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import '@babylonjs/materials';
import '@babylonjs/serializers';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
import * as CANNON from 'cannon';

// 玩家数据接口
interface PlayerData {
  id: string;
  position: BABYLON.Vector3;
  rotation: { x: number; y: number };
  health: number;
}

// 子弹数据接口
interface BulletData {
  id: string;
  position: BABYLON.Vector3;
  direction: BABYLON.Vector3;
}

// 其他玩家对象接口
interface OtherPlayer {
  mesh: BABYLON.Mesh;
  data: PlayerData;
}

// 子弹对象接口
interface Bullet {
  mesh: BABYLON.Mesh;
  velocity: BABYLON.Vector3;
  lifetime: number;
}

// 多人游戏管理器类
class MultiplayerManager {
  private ws: WebSocket | null = null;
  private playerId: string;
  private players: Map<string, { mesh: BABYLON.Mesh; data: PlayerData }> = new Map();
  private bullets: Map<string, { mesh: BABYLON.Mesh; data: BulletData }> = new Map();
  private scene: BABYLON.Scene;
  private onPlayerUpdateCallback: ((playerId: string, data: PlayerData) => void) | null = null;
  private onBulletUpdateCallback: ((bulletId: string, data: BulletData) => void) | null = null;
  private onPlayerDisconnectCallback: ((playerId: string) => void) | null = null;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.playerId = this.generatePlayerId();
  }

  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Connected to multiplayer server');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing server message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from multiplayer server');
      };
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendPlayerUpdate(position: BABYLON.Vector3, rotation: { x: number; y: number }, health: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const playerData: PlayerData = {
        id: this.playerId,
        position: position.clone(),
        rotation: { ...rotation },
        health
      };

      // 发送到服务器
      this.ws.send(JSON.stringify({
        type: 'playerUpdate',
        data: playerData
      }));
    }
  }

  public sendShoot(position: BABYLON.Vector3, direction: BABYLON.Vector3): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const bulletId = this.generateBulletId();
      const bulletData: BulletData = {
        id: bulletId,
        position: position.clone(),
        direction: direction.clone()
      };

      // 发送到服务器
      this.ws.send(JSON.stringify({
        type: 'playerShoot',
        data: bulletData
      }));
    }
  }

  public setOnPlayerUpdateCallback(callback: (playerId: string, data: PlayerData) => void): void {
    this.onPlayerUpdateCallback = callback;
  }

  public setOnBulletUpdateCallback(callback: (bulletId: string, data: BulletData) => void): void {
    this.onBulletUpdateCallback = callback;
  }

  public setOnPlayerDisconnectCallback(callback: (playerId: string) => void): void {
    this.onPlayerDisconnectCallback = callback;
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  private handleServerMessage(data: any): void {
    switch (data.type) {
      case 'playerUpdate':
        this.handlePlayerUpdate(data.data);
        break;
      case 'playerShoot':
        this.handlePlayerShoot(data.data);
        break;
      case 'user_join':
        // 处理用户加入消息
        console.log('User joined:', data.username);
        break;
      case 'user_leave':
        // 处理用户离开消息
        console.log('User left:', data.username);
        if (this.onPlayerDisconnectCallback) {
          this.onPlayerDisconnectCallback(data.username);
        }
        break;
      case 'chat':
        // 处理聊天消息
        console.log('Chat message:', data.username, data.message);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private handlePlayerUpdate(data: PlayerData): void {
    if (data.id === this.playerId) return; // Ignore own updates

    if (this.onPlayerUpdateCallback) {
      this.onPlayerUpdateCallback(data.id, data);
    }
  }

  private handlePlayerShoot(data: BulletData): void {
    if (data.id === this.playerId) return; // Ignore own bullets

    if (this.onBulletUpdateCallback) {
      this.onBulletUpdateCallback(data.id, data);
    }
  }

  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }

  private generateBulletId(): string {
    return 'bullet_' + Math.random().toString(36).substr(2, 9);
  }
}

// FPS游戏主类
export class FPSGame {
  // 游戏元素
  private canvas: HTMLCanvasElement;
  private engine!: BABYLON.Engine;
  private scene!: BABYLON.Scene;
  private camera!: BABYLON.UniversalCamera;
  private player!: BABYLON.Mesh;
  private ground!: BABYLON.Mesh;

  // 游戏状态
  private gameStarted: boolean = false;
  private playerHealth: number = 100;
  private currentAmmo: number = 30;
  private maxAmmo: number = 30;
  private score: number = 0;
  private isConnected: boolean = false;

  // Babylon.js 变量
  private light!: BABYLON.HemisphericLight;
  private dirLight!: BABYLON.DirectionalLight;

  // 游戏配置
  private config = {
    moveSpeed: 0.2,
    lookSpeed: 0.002,
    jumpHeight: 0.3,
    gravity: -0.01,
    shootCooldown: 100,
    reloadTime: 2000
  };

  // 输入状态
  private keys: { [key: string]: boolean } = {};
  private mouse = { leftButton: false, x: 0, y: 0, locked: false };
  private canShoot: boolean = true;
  private isReloading: boolean = false;
  private velocity = { x: 0, y: 0, z: 0 };
  private isGrounded: boolean = true;

  // WebSocket 相关
  private wsUrl: string = import.meta.env.VITE_WEBSOCKET_URL || 'ws://47.76.122.60:9001'; // 从环境变量读取，或使用默认值

  // 多人游戏管理器
  private multiplayerManager!: MultiplayerManager;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private bullets: Bullet[] = [];

  // 保存事件处理函数的引用，以便正确移除
  private keydownHandler!: (e: KeyboardEvent) => void;
  private keyupHandler!: (e: KeyboardEvent) => void;
  private mousemoveHandler!: (e: MouseEvent) => void;
  private mousedownHandler!: (e: MouseEvent) => void;
  private mouseupHandler!: (e: MouseEvent) => void;
  private pointerlockchangeHandler!: () => void;
  private escKeyHandler!: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initBabylon();
  }

  // 初始化 Babylon.js
  private initBabylon(): void {
    // 初始化引擎
    this.engine = new BABYLON.Engine(this.canvas, true);

    // 创建场景
    this.scene = new BABYLON.Scene(this.engine);
    // 设置更明显的背景色以便调试
    this.scene.clearColor = new BABYLON.Color4(0.2, 0.6, 0.9, 1.0);

    // 启用物理引擎（使用Cannon.js插件）
    const cannonPlugin = new CannonJSPlugin(true, 10, CANNON);
    this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), cannonPlugin);

    // 创建相机（第一人称）
    this.camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 2, -10), this.scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.camera.attachControl(this.canvas, true); // 确保相机控制已附加
    this.camera.inputs.clear();
    this.camera.minZ = 0.1;
    this.camera.fov = Math.PI / 3;
    this.camera.inertia = 0;

    // 创建玩家（胶囊体）
    this.player = BABYLON.MeshBuilder.CreateCapsule('player', {
      height: 2,
      radius: 0.5
    }, this.scene);
    this.player.position = new BABYLON.Vector3(0, 2, -10);
    
    // 为玩家添加物理属性
    this.player.physicsImpostor = new BABYLON.PhysicsImpostor(
      this.player,
      BABYLON.PhysicsImpostor.CapsuleImpostor,
      { mass: 1, restitution: 0.1, friction: 0.5 },
      this.scene
    );
    
    // 禁用玩家的重力影响，由自定义重力控制
    if (this.player.physicsImpostor) {
      this.player.physicsImpostor.physicsBody.setActivationState(4); // 禁用休眠
    }

    // 相机跟随玩家
    this.camera.parent = this.player;
    this.camera.position = new BABYLON.Vector3(0, 0.5, 0);

    // 创建光源
    this.light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.light.intensity = 0.7;

    this.dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, 1), this.scene);
    this.dirLight.intensity = 0.5;

    // 创建地面
    this.ground = BABYLON.MeshBuilder.CreateGround('ground', {
      width: 100,
      height: 100
    }, this.scene);

    const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3);
    groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    this.ground.material = groundMat;
    this.ground.position.y = 0;

    // 为地面添加物理属性
    this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(
      this.ground,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.1, friction: 0.5 }, // 质量为0表示静态物体
      this.scene
    );

    // 创建障碍物
    this.createObstacles();

    // 创建天空盒
    this.createSkybox();

    // 初始化多人游戏管理器
    this.multiplayerManager = new MultiplayerManager(this.scene);
    this.setupMultiplayerCallbacks();

    // 设置输入处理
    this.setupInputHandlers();

    // 渲染循环
    this.engine.runRenderLoop(() => {
      // 始终渲染场景，不仅仅在游戏开始时
      this.scene.render();
      
      if (this.gameStarted) {
        this.updateGame();
      }
    });

    // 窗口大小调整
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  // 创建天空盒
  private createSkybox(): void {
    const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 150 }, this.scene);
    const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
    skybox.material = skyboxMaterial;
    
    // 天空盒不需要物理属性
    skybox.isPickable = false;
  }

  // 创建障碍物
  private createObstacles(): void {
    const obstaclePositions = [
      { x: 10, z: 10 },
      { x: -10, z: 10 },
      { x: 10, z: -10 },
      { x: -10, z: -10 },
      { x: 0, z: 15 },
      { x: 15, z: 0 },
      { x: -15, z: 0 },
      { x: 0, z: -15 }
    ];

    obstaclePositions.forEach((pos, i) => {
      const height = Math.random() * 3 + 2;
      const obstacle = BABYLON.MeshBuilder.CreateBox(`obstacle${i}`, {
        width: 2,
        height: height,
        depth: 2
      }, this.scene);

      obstacle.position = new BABYLON.Vector3(pos.x, height / 2, pos.z);

      const mat = new BABYLON.StandardMaterial(`obstacleMat${i}`, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      obstacle.material = mat;
      
      // 为障碍物添加物理属性
      obstacle.physicsImpostor = new BABYLON.PhysicsImpostor(
        obstacle,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, restitution: 0.1, friction: 0.5 }, // 质量为0表示静态物体
        this.scene
      );
    });
  }

  // 游戏更新循环
  private updateGame(): void {
    this.handleMovement();
    this.handleShooting();
    this.updateBullets();
    this.updateMultiplayer();
  }

  // 处理移动
  private handleMovement(): void {
    if (!this.player || !this.player.physicsImpostor) return;

    const forward = this.camera.getDirection(BABYLON.Vector3.Forward());
    const right = this.camera.getDirection(BABYLON.Vector3.Right());

    // 只使用水平方向
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    let moveVector = BABYLON.Vector3.Zero();

    if (this.keys['w'] || this.keys['W']) moveVector.addInPlace(forward);
    if (this.keys['s'] || this.keys['S']) moveVector.subtractInPlace(forward);
    if (this.keys['a'] || this.keys['A']) moveVector.subtractInPlace(right);
    if (this.keys['d'] || this.keys['D']) moveVector.addInPlace(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      moveVector.scaleInPlace(this.config.moveSpeed);
      
      // 使用物理引擎移动玩家
      const currentVelocity = this.player.physicsImpostor.getLinearVelocity() || BABYLON.Vector3.Zero();
      this.player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(
        moveVector.x * 10,
        currentVelocity.y,
        moveVector.z * 10
      ));
    }

    // 跳跃
    if ((this.keys[' '] || this.keys['Spacebar']) && this.isGrounded) {
      const currentVelocity = this.player.physicsImpostor.getLinearVelocity() || BABYLON.Vector3.Zero();
      this.player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(
        currentVelocity.x,
        this.config.jumpHeight * 20,
        currentVelocity.z
      ));
      this.isGrounded = false;
      
      // 设置一个定时器来重置isGrounded状态
      setTimeout(() => {
        this.isGrounded = true;
      }, 300);
    }

    // 限制玩家在地图内
    const playerPos = this.player.position;
    playerPos.x = Math.max(-45, Math.min(45, playerPos.x));
    playerPos.z = Math.max(-45, Math.min(45, playerPos.z));
    
    // 检查是否在地面上
    if (playerPos.y <= 1) {
      this.isGrounded = true;
      playerPos.y = 1;
    }
  }

  // 处理射击
  private handleShooting(): void {
    if (this.mouse.leftButton && this.canShoot && !this.isReloading && this.currentAmmo > 0) {
      this.shoot();
      this.canShoot = false;
      setTimeout(() => { this.canShoot = true; }, this.config.shootCooldown);
    }

    // 重新装弹
    if ((this.keys['r'] || this.keys['R']) || this.currentAmmo === 0) {
      if (!this.isReloading) {
        this.reload();
      }
    }
  }

  // 射击
  private shoot(): void {
    this.currentAmmo--;

    // 创建子弹
    const bullet = BABYLON.MeshBuilder.CreateSphere('bullet', { diameter: 0.2 }, this.scene);
    bullet.position = this.camera.globalPosition.clone().add(this.camera.getDirection(BABYLON.Vector3.Forward()).scale(0.5));

    const mat = new BABYLON.StandardMaterial('bulletMat', this.scene);
    mat.emissiveColor = new BABYLON.Color3(1, 1, 0);
    bullet.material = mat;

    const direction = this.camera.getDirection(BABYLON.Vector3.Forward());

    // 为子弹添加物理属性
    bullet.physicsImpostor = new BABYLON.PhysicsImpostor(
      bullet,
      BABYLON.PhysicsImpostor.SphereImpostor,
      { mass: 0.1, restitution: 0.1, friction: 0.1 },
      this.scene
    );
    
    // 设置子弹的速度
    if (bullet.physicsImpostor) {
      bullet.physicsImpostor.setLinearVelocity(direction.scale(20));
    }

    this.bullets.push({
      mesh: bullet,
      velocity: direction.scale(2),
      lifetime: 60
    });

    // 发送射击信息到服务器
    if (this.isConnected && this.multiplayerManager) {
      this.multiplayerManager.sendShoot(this.camera.globalPosition.clone(), direction.clone());
    }
  }

  // 重新装弹
  private reload(): void {
    this.isReloading = true;
    setTimeout(() => {
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
    }, this.config.reloadTime);
  }

  // 更新子弹
  private updateBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.lifetime--;

      // 检查子弹是否与障碍物碰撞
      if (bullet.mesh.physicsImpostor && bullet.mesh.physicsImpostor.getLinearVelocity) {
        const velocity = bullet.mesh.physicsImpostor.getLinearVelocity();
        if (velocity && velocity.length() < 0.1) {
          bullet.lifetime = 0; // 如果子弹停止移动，销毁它
        }
      }

      if (bullet.lifetime <= 0) {
        if (bullet.mesh && !bullet.mesh.isDisposed()) {
          bullet.mesh.dispose();
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  // 更新多人游戏状态
  private updateMultiplayer(): void {
    if (this.isConnected && this.multiplayerManager) {
      this.multiplayerManager.sendPlayerUpdate(
        this.player.position,
        { x: this.camera.rotation.x, y: this.camera.rotation.y },
        this.playerHealth
      );
    }
  }

  // 设置多人游戏回调
  private setupMultiplayerCallbacks(): void {
    if (!this.multiplayerManager) return;

    this.multiplayerManager.setOnPlayerUpdateCallback((playerId, data) => {
      let otherPlayer = this.otherPlayers.get(playerId);
      
      if (!otherPlayer) {
        // 创建其他玩家的网格
        const mesh = BABYLON.MeshBuilder.CreateCapsule(`otherPlayer_${playerId}`, {
          height: 2,
          radius: 0.5
        }, this.scene);
        
        const mat = new BABYLON.StandardMaterial(`otherPlayerMat_${playerId}`, this.scene);
        mat.diffuseColor = new BABYLON.Color3(0, 0, 1); // 蓝色表示其他玩家
        mat.emissiveColor = new BABYLON.Color3(0, 0, 0.3);
        mesh.material = mat;
        
        // 为其他玩家添加物理属性
        mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
          mesh,
          BABYLON.PhysicsImpostor.CapsuleImpostor,
          { mass: 1, restitution: 0.1, friction: 0.5 },
          this.scene
        );
        
        // 禁用其他玩家的重力影响
        if (mesh.physicsImpostor) {
          mesh.physicsImpostor.physicsBody.setActivationState(4); // 禁用休眠
        }
        
        otherPlayer = { mesh, data };
        this.otherPlayers.set(playerId, otherPlayer);
      }
      
      // 更新位置和旋转
      if (otherPlayer.mesh && !otherPlayer.mesh.isDisposed()) {
        otherPlayer.mesh.position.copyFrom(data.position);
        // 直接设置网格位置而不是物理模拟器位置
      }
      otherPlayer.data = data;
    });

    this.multiplayerManager.setOnBulletUpdateCallback((bulletId, data) => {
      // 创建其他玩家的子弹
      const bullet = BABYLON.MeshBuilder.CreateSphere(`otherBullet_${bulletId}`, { diameter: 0.2 }, this.scene);
      bullet.position.copyFrom(data.position);
      
      const mat = new BABYLON.StandardMaterial(`otherBulletMat_${bulletId}`, this.scene);
      mat.emissiveColor = new BABYLON.Color3(1, 0, 0); // 红色表示其他玩家的子弹
      bullet.material = mat;
      
      // 为子弹添加物理属性
      bullet.physicsImpostor = new BABYLON.PhysicsImpostor(
        bullet,
        BABYLON.PhysicsImpostor.SphereImpostor,
        { mass: 0.1, restitution: 0.1, friction: 0.1 },
        this.scene
      );
      
      // 设置子弹的速度
      if (bullet.physicsImpostor) {
        bullet.physicsImpostor.setLinearVelocity(data.direction.scale(20));
      }
      
      this.bullets.push({
        mesh: bullet,
        velocity: data.direction.scale(2),
        lifetime: 60
      });
    });

    this.multiplayerManager.setOnPlayerDisconnectCallback((playerId) => {
      const otherPlayer = this.otherPlayers.get(playerId);
      if (otherPlayer) {
        if (otherPlayer.mesh && !otherPlayer.mesh.isDisposed()) {
          otherPlayer.mesh.dispose();
        }
        this.otherPlayers.delete(playerId);
      }
    });
  }

  // 游戏结束
  private gameOver(): void {
    this.gameStarted = false;
    alert(`游戏结束！得分: ${this.score}`);
    this.resetGame();
  }

  // 重置游戏
  private resetGame(): void {
    this.playerHealth = 100;
    this.currentAmmo = 30;
    this.score = 0;
    
    if (this.player) {
      this.player.position = new BABYLON.Vector3(0, 2, -10);
      // 直接设置网格位置而不是物理模拟器位置
    }

    // 清理子弹
    this.bullets.forEach(bullet => {
      if (bullet.mesh && !bullet.mesh.isDisposed()) {
        bullet.mesh.dispose();
      }
    });
    this.bullets.length = 0;
  }

  // 锁定鼠标指针
  private lockPointer(): void {
    this.canvas.requestPointerLock();
  }

  // WebSocket 连接
  public async connectWebSocket(url?: string): Promise<void> {
    try {
      // 如果提供了URL参数，则使用该URL，否则使用默认URL
      const connectUrl = url || this.wsUrl;
      
      if (this.multiplayerManager) {
        await this.multiplayerManager.connect(connectUrl);
        this.isConnected = true;
        this.startGame();
      }
    } catch (error) {
      console.error('Failed to connect to multiplayer server:', error);
      alert('无法连接到服务器，请检查网络连接');
    }
  }

  // 开始游戏
  public startGame(): void {
    this.gameStarted = true;
    this.lockPointer();
    // 重新附加相机控制
    this.camera.attachControl(this.canvas, true);
  }

  // 输入事件处理
  private setupInputHandlers(): void {
    // 定义事件处理函数
    this.keydownHandler = (e: KeyboardEvent) => {
      this.keys[e.key] = true;
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      this.keys[e.key] = false;
    };

    this.mousemoveHandler = (e: MouseEvent) => {
      if (document.pointerLockElement === this.canvas) {
        // 旋转相机
        this.camera.rotation.y += e.movementX * this.config.lookSpeed;
        this.camera.rotation.x += e.movementY * this.config.lookSpeed;

        // 限制垂直视角
        this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
      }
    };

    this.mousedownHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouse.leftButton = true;
      }
    };

    this.mouseupHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouse.leftButton = false;
      }
    };

    this.pointerlockchangeHandler = () => {
      this.mouse.locked = document.pointerLockElement === this.canvas;
    };

    this.escKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.gameStarted) {
        this.gameStarted = false;
        document.exitPointerLock();
        // 重新附加相机控制
        this.camera.attachControl(this.canvas, true);
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);
    window.addEventListener('mousedown', this.mousedownHandler);
    window.addEventListener('mouseup', this.mouseupHandler);
    document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);
    window.addEventListener('keydown', this.escKeyHandler);
  }

  // 销毁游戏
  public dispose(): void {
    if (this.engine) {
      this.engine.dispose();
    }
    if (this.multiplayerManager) {
      this.multiplayerManager.disconnect();
    }

    // 清理事件监听器
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('mousemove', this.mousemoveHandler);
    window.removeEventListener('mousedown', this.mousedownHandler);
    window.removeEventListener('mouseup', this.mouseupHandler);
    document.removeEventListener('pointerlockchange', this.pointerlockchangeHandler);
    window.removeEventListener('keydown', this.escKeyHandler);
  }

  // 获取游戏状态
  public getGameStatus(): {
    playerHealth: number;
    currentAmmo: number;
    maxAmmo: number;
    score: number;
    isConnected: boolean;
    gameStarted: boolean;
  } {
    return {
      playerHealth: this.playerHealth,
      currentAmmo: this.currentAmmo,
      maxAmmo: this.maxAmmo,
      score: this.score,
      isConnected: this.isConnected,
      gameStarted: this.gameStarted
    };
  }
}