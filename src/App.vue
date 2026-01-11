<script setup lang="ts">
import { RouterView } from 'vue-router'
import TabBar from './components/TabBar.vue'
</script>

<template>
  <div class="app">
    <main class="main-content">
      <RouterView />
    </main>
    <TabBar />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.main-content {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
  min-height: 100vh;
}
</style>
