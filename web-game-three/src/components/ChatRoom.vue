<template>
  <div class="chat-room">
    <div class="connection-status">
      <div :class="['status-indicator', connectionStatus]">
        {{ connectionStatusText }}
      </div>
      <div v-if="isConnected" class="ping-display">
        <span class="ping-label">延迟:</span>
        <span :class="['ping-value', getPingClass(latency)]">
          {{ latency !== null ? latency + 'ms' : '检测中...' }}
        </span>
      </div>
    </div>
    
    <div class="chat-container">
      <div class="messages-panel">
        <h3>💬 聊天室</h3>
        <div ref="messagesContainer" class="messages">
          <div 
            v-for="message in messages" 
            :key="message.id"
            :class="['message', message.type]"
          >
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            <template v-if="message.type === 'chat'">
              <span class="username">{{ message.username }}:</span>
              <span class="content">{{ message.message }}</span>
            </template>
            <template v-else>
              <span class="system-content">{{ message.message }}</span>
            </template>
          </div>
        </div>
      </div>
      
      <div class="input-panel">
        <div class="input-container">
          <input
            v-model="currentMessage"
            @keyup.enter="sendMessage"
            :disabled="!isConnected"
            placeholder="输入消息... (按Enter发送)"
            class="message-input"
          />
          <button 
            @click="sendMessage"
            :disabled="!isConnected || !currentMessage.trim()"
            class="send-button"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'

// 响应式数据
const socket = ref<WebSocket | null>(null)
const isConnected = ref(false)
const currentMessage = ref('')
const messages = ref<Array<{
  id: number
  type: 'chat' | 'system' | 'user_join' | 'user_leave'
  username?: string
  message: string
  timestamp: number
}>>([])

const messagesContainer = ref<HTMLElement>()
let messageId = 0

// 延迟检测相关
const latency = ref<number | null>(null)
const pingInterval = ref<number | null>(null)
const pendingPings = new Map<string, number>()

// 连接状态
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connecting': return '🔄 连接中...'
    case 'connected': return '✅ 已连接'
    case 'disconnected': return '❌ 未连接'
  }
})

// 获取延迟颜色类名
const getPingClass = (ping: number | null): string => {
  if (ping === null) return 'ping-unknown'
  if (ping < 50) return 'ping-excellent'
  if (ping < 100) return 'ping-good'
  if (ping < 200) return 'ping-fair'
  return 'ping-poor'
}

// 延迟检测方法
const startPingTest = () => {
  if (pingInterval.value) {
    clearInterval(pingInterval.value)
  }
  
  const sendPing = () => {
    if (socket.value && isConnected.value) {
      const pingId = Date.now().toString()
      const timestamp = Date.now()
      pendingPings.set(pingId, timestamp)
      
      const pingMessage = JSON.stringify({
        type: 'ping',
        id: pingId,
        timestamp: timestamp
      })
      
      socket.value.send(pingMessage)
      
      // 超时清理
      setTimeout(() => {
        if (pendingPings.has(pingId)) {
          pendingPings.delete(pingId)
        }
      }, 5000)
    }
  }
  
  // 立即发送一次ping
  sendPing()
  
  // 每2秒发送一次ping
  pingInterval.value = setInterval(sendPing, 2000)
}

const stopPingTest = () => {
  if (pingInterval.value) {
    clearInterval(pingInterval.value)
    pingInterval.value = null
  }
  pendingPings.clear()
  latency.value = null
}

const handlePongMessage = (data: any) => {
  const pingId = data.id
  const originalTimestamp = pendingPings.get(pingId)
  
  if (originalTimestamp) {
    const currentTime = Date.now()
    const rtt = currentTime - originalTimestamp
    latency.value = rtt
    pendingPings.delete(pingId)
  }
}
const connectWebSocket = () => {
  try {
    connectionStatus.value = 'connecting'
    // 从环境变量读取WebSocket URL，如果没有则使用默认值
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://47.76.122.60:9001'
    socket.value = new WebSocket(wsUrl)
    
    socket.value.onopen = () => {
      isConnected.value = true
      connectionStatus.value = 'connected'
      console.log('WebSocket连接已建立')
      addSystemMessage('已连接到游戏服务器')
      // 开始延迟检测
      startPingTest()
    }
    
    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (error) {
        // 处理纯文本消息
        addSystemMessage(`收到消息: ${event.data}`)
      }
    }
    
    socket.value.onclose = () => {
      isConnected.value = false
      connectionStatus.value = 'disconnected'
      console.log('WebSocket连接已断开')
      addSystemMessage('与服务器连接断开')
      // 停止延迟检测
      stopPingTest()
      
      // 自动重连
      setTimeout(() => {
        if (!isConnected.value) {
          connectWebSocket()
        }
      }, 3000)
    }
    
    socket.value.onerror = (error) => {
      console.error('WebSocket错误:', error)
      addSystemMessage('连接错误，将尝试重新连接...')
    }
  } catch (error) {
    console.error('创建WebSocket连接失败:', error)
    connectionStatus.value = 'disconnected'
  }
}

// 处理收到的消息
const handleMessage = (data: any) => {
  switch (data.type) {
    case 'system':
      addSystemMessage(data.message)
      break
    case 'chat':
      addChatMessage(data.username, data.message, data.timestamp)
      break
    case 'user_join':
      addSystemMessage(`${data.username} 加入了聊天室`)
      break
    case 'user_leave':
      addSystemMessage(`${data.username} 离开了聊天室`)
      break
    case 'pong':
      handlePongMessage(data)
      break
    default:
      console.log('未知消息类型:', data)
  }
}

// 添加系统消息
const addSystemMessage = (message: string) => {
  messages.value.push({
    id: messageId++,
    type: 'system',
    message,
    timestamp: Date.now()
  })
  scrollToBottom()
}

// 添加聊天消息
const addChatMessage = (username: string, message: string, timestamp?: number) => {
  messages.value.push({
    id: messageId++,
    type: 'chat',
    username,
    message,
    timestamp: timestamp ? timestamp * 1000 : Date.now()
  })
  scrollToBottom()
}

// 发送消息
const sendMessage = () => {
  const message = currentMessage.value.trim()
  if (message && socket.value && isConnected.value) {
    socket.value.send(message)
    currentMessage.value = ''
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  stopPingTest()
  if (socket.value) {
    // 移除事件监听器后再关闭连接
    socket.value.onopen = null
    socket.value.onmessage = null
    socket.value.onclose = null
    socket.value.onerror = null
    socket.value.close()
  }
})
</script>

<style scoped>
.chat-room {
  max-width: 800px;
  margin: 0 auto;
  height: 600px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.connection-status {
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ping-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.ping-label {
  color: #666;
  font-weight: 500;
}

.ping-value {
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.ping-excellent {
  background: #d4edda;
  color: #155724;
}

.ping-good {
  background: #d1ecf1;
  color: #0c5460;
}

.ping-fair {
  background: #fff3cd;
  color: #856404;
}

.ping-poor {
  background: #f8d7da;
  color: #721c24;
}

.ping-unknown {
  background: #e2e3e5;
  color: #6c757d;
}

.status-indicator {
  font-size: 0.9rem;
  font-weight: 500;
}

.status-indicator.connecting {
  color: #ffa500;
}

.status-indicator.connected {
  color: #28a745;
}

.status-indicator.disconnected {
  color: #dc3545;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages-panel h3 {
  margin: 0;
  padding: 1rem;
  background: #667eea;
  color: white;
  text-align: center;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
}

.message {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  line-height: 1.4;
}

.message.chat {
  background: white;
  border-left: 3px solid #667eea;
}

.message.system {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
  font-style: italic;
}

.timestamp {
  font-size: 0.75rem;
  color: #666;
  margin-right: 0.5rem;
}

.username {
  font-weight: bold;
  color: #667eea;
  margin-right: 0.5rem;
}

.content {
  color: #333;
}

.system-content {
  color: #666;
}

.input-panel {
  border-top: 1px solid #e0e0e0;
  padding: 1rem;
  background: white;
}

.input-container {
  display: flex;
  gap: 0.5rem;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
}

.message-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #5a67d8;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 滚动条样式 */
.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>