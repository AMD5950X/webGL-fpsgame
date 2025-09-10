<script setup lang="ts">
// App.vue 不再直接导入组件，而是使用路由
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: center;
}

header h1 {
  margin: 0;
  font-size: 2rem;
}

header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

main {
  flex: 1;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
