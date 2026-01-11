<script setup lang="ts">
/**
 * 首页 - HomePage
 * Requirements: 3.1, 3.3, 6.2
 * 
 * 功能：
 * - 显示今日待复习数和新单词数
 * - 显示连续学习天数
 * - 开始复习按钮
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVocabularyStore } from '../stores/vocabulary'
import { useProgressStore } from '../stores/progress'
import { schedulerService } from '../services/scheduler'

const router = useRouter()
const vocabularyStore = useVocabularyStore()
const progressStore = useProgressStore()

// 初始化数据
onMounted(async () => {
  // 加载进度数据
  progressStore.loadProgress()
  // 加载单词数据（带进度）
  await vocabularyStore.loadWords(progressStore.progressList)
})

/**
 * 今日待复习单词列表
 * Requirements: 3.1
 */
const todayReviewWords = computed(() => {
  return schedulerService.getTodayReviewWords(vocabularyStore.words)
})

/**
 * 今日待复习数量
 */
const todayReviewCount = computed(() => todayReviewWords.value.length)

/**
 * 今日新单词列表
 */
const todayNewWords = computed(() => {
  return schedulerService.getTodayNewWords(vocabularyStore.words)
})

/**
 * 今日新单词数量
 */
const todayNewCount = computed(() => todayNewWords.value.length)

/**
 * 连续学习天数
 * Requirements: 6.2
 */
const streakDays = computed(() => progressStore.streakDays)

/**
 * 是否有待复习任务
 */
const hasReviewTask = computed(() => todayReviewCount.value > 0)

/**
 * 今日已复习数量
 */
const todayReviewedCount = computed(() => progressStore.todayReviewedCount)

/**
 * 开始复习
 * Requirements: 3.3
 */
function startReview() {
  if (hasReviewTask.value) {
    // 设置复习队列
    progressStore.startReview(todayReviewWords.value)
    // 跳转到复习页面
    router.push('/review')
  }
}

/**
 * 查看词库
 */
function goToWordList() {
  router.push('/wordlist')
}
</script>

<template>
  <div class="home">
    <!-- 头部标题 -->
    <header class="home-header">
      <h1 class="app-title">艾宾浩斯背单词</h1>
      <p class="app-subtitle">科学记忆，高效学习</p>
    </header>

    <!-- 连续学习天数卡片 -->
    <div class="streak-card">
      <div class="streak-icon">🔥</div>
      <div class="streak-info">
        <span class="streak-count">{{ streakDays }}</span>
        <span class="streak-label">连续学习天数</span>
      </div>
    </div>

    <!-- 今日学习概览 -->
    <div class="overview-section">
      <h2 class="section-title">今日学习</h2>
      
      <div class="stats-grid">
        <!-- 待复习卡片 -->
        <div class="stat-card review-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">{{ todayReviewCount }}</div>
          <div class="stat-label">待复习</div>
        </div>
        
        <!-- 新单词卡片 -->
        <div class="stat-card new-card">
          <div class="stat-icon">✨</div>
          <div class="stat-value">{{ todayNewCount }}</div>
          <div class="stat-label">新单词</div>
        </div>
        
        <!-- 已复习卡片 -->
        <div class="stat-card done-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ todayReviewedCount }}</div>
          <div class="stat-label">已复习</div>
        </div>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <!-- 开始复习按钮 -->
      <button 
        v-if="hasReviewTask"
        class="btn-primary btn-start"
        @click="startReview"
      >
        开始复习 ({{ todayReviewCount }})
      </button>
      
      <!-- 无复习任务提示 -->
      <div v-else class="no-task-hint">
        <div class="hint-icon">🎉</div>
        <p class="hint-text">今日无复习任务</p>
        <p class="hint-subtext">去词库添加新单词吧</p>
      </div>
      
      <!-- 查看词库按钮 -->
      <button 
        class="btn-secondary btn-wordlist"
        @click="goToWordList"
      >
        查看词库
      </button>
    </div>

    <!-- 学习提示 -->
    <div class="tips-section">
      <div class="tip-card">
        <div class="tip-icon">💡</div>
        <div class="tip-content">
          <p class="tip-title">艾宾浩斯记忆法</p>
          <p class="tip-text">按照1-2-4-7-15-30天的间隔复习，让记忆更持久</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 20px 16px;
  min-height: 100vh;
  background-color: var(--bg-color);
}

/* 头部样式 */
.home-header {
  text-align: center;
  margin-bottom: 24px;
  padding-top: 20px;
}

.app-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 4px;
}

.app-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 连续学习天数卡片 */
.streak-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%);
  border-radius: var(--border-radius);
  padding: 16px 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.streak-icon {
  font-size: 36px;
  margin-right: 16px;
}

.streak-info {
  display: flex;
  flex-direction: column;
}

.streak-count {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.streak-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

/* 今日学习概览 */
.overview-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.review-card .stat-value {
  color: var(--primary-color);
}

.new-card .stat-value {
  color: var(--warning-color);
}

.done-card .stat-value {
  color: var(--success-color);
}

/* 操作按钮区域 */
.action-section {
  margin-bottom: 24px;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #357abd 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.2);
}

.btn-secondary {
  width: 100%;
  padding: 14px;
  background-color: var(--card-bg);
  color: var(--text-color);
  font-size: 16px;
  font-weight: 500;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  margin-top: 12px;
  transition: background-color 0.2s ease;
}

.btn-secondary:active {
  background-color: var(--bg-color);
}

/* 无复习任务提示 */
.no-task-hint {
  text-align: center;
  padding: 32px 20px;
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.hint-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.hint-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 4px;
}

.hint-subtext {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 学习提示 */
.tips-section {
  margin-top: 24px;
}

.tip-card {
  display: flex;
  align-items: flex-start;
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px;
  box-shadow: var(--shadow);
}

.tip-icon {
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 4px;
}

.tip-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
