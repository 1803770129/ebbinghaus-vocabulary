<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface TabItem {
  path: string
  name: string
  icon: string
  activeIcon: string
}

const route = useRoute()
const router = useRouter()

const tabs: TabItem[] = [
  {
    path: '/',
    name: '首页',
    icon: '🏠',
    activeIcon: '🏠'
  },
  {
    path: '/review',
    name: '复习',
    icon: '📖',
    activeIcon: '📖'
  },
  {
    path: '/wordlist',
    name: '词库',
    icon: '📚',
    activeIcon: '📚'
  },
  {
    path: '/stats',
    name: '统计',
    icon: '📊',
    activeIcon: '📊'
  }
]

const currentPath = computed(() => route.path)

function navigateTo(path: string) {
  router.push(path)
}

function isActive(path: string): boolean {
  return currentPath.value === path
}
</script>

<template>
  <nav class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab.path) }"
      @click="navigateTo(tab.path)"
    >
      <span class="tab-icon">{{ isActive(tab.path) ? tab.activeIcon : tab.icon }}</span>
      <span class="tab-name">{{ tab.name }}</span>
    </div>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 56px;
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: color 0.2s ease;
  color: var(--text-secondary);
}

.tab-item.active {
  color: var(--primary-color);
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 2px;
}

.tab-name {
  font-size: 12px;
  line-height: 1;
}
</style>
