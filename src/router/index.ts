import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue')
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/pages/Review.vue')
  },
  {
    path: '/wordlist',
    name: 'WordList',
    component: () => import('@/pages/WordList.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/pages/Stats.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
