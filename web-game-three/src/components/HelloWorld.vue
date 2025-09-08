<template>
  <div>
    <h2>WebSocket Echo 示例</h2>
    <div>连接状态: <span :style="{color: connected ? 'green' : 'red'}">{{ connected ? '已连接' : '未连接' }}</span></div>
    <input v-model="input" placeholder="输入消息" @keyup.enter="sendMsg" />
    <button @click="sendMsg" :disabled="!connected">发送</button>
    <div v-if="messages.length">
      <h3>收到消息:</h3>
      <ul>
        <li v-for="(msg, idx) in messages" :key="idx">{{ msg }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup >
import { ref, onMounted, onBeforeUnmount } from 'vue'

const wsUrl = 'ws://47.76.122.60:9001'
const ws = ref(null)
const connected = ref(false)
const input = ref('')
const messages = ref([])

function sendMsg() {
  if (ws.value && connected.value && input.value) {
    ws.value.send(input.value)
    input.value = ''
  }
}

onMounted(() => {
  ws.value = new WebSocket(wsUrl)
  ws.value.onopen = () => {
    connected.value = true
  }
  ws.value.onclose = () => {
    connected.value = false
  }
  ws.value.onmessage = (event) => {
    messages.value.push(event.data)
  }
})

onBeforeUnmount(() => {
  if (ws.value) ws.value.close()
})
</script>