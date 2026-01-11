<script setup lang="ts">
/**
 * 词库页 - WordListPage
 * Requirements: 5.1, 5.2, 5.3, 5.4
 * 
 * 功能：
 * - 按日期分组显示单词
 * - 实现搜索功能
 * - 实现状态筛选
 * - 显示复习状态
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVocabularyStore, type FilterStatus } from '../stores/vocabulary'
import { useProgressStore } from '../stores/progress'
import type { WordEntry, MemoryStatus } from '../types'
import { REVIEW_INTERVALS } from '../types'

const router = useRouter()
const vocabularyStore = useVocabularyStore()
const progressStore = useProgressStore()

// ============ State ============

/** 搜索输入框的值 */
const searchInput = ref('')

/** 当前选中的筛选状态 */
const currentFilter = ref<FilterStatus>('all')

/** 是否显示搜索框 */
const showSearch = ref(false)

// ============ Computed ============

/**
 * 筛选后按日期分组的单词
 * Requirements: 5.1
 */
const wordsByDate = computed(() => vocabularyStore.filteredWordsByDate)

/**
 * 总单词数
 */
const totalCount = computed(() => vocabularyStore.totalCount)

/**
 * 筛选后的单词数
 */
const filteredCount = computed(() => vocabularyStore.filteredCount)

/**
 * 是否正在加载
 */
const isLoading = computed(() => vocabularyStore.isLoading)

/**
 * 是否有筛选条件
 */
const hasFilter = computed(() => {
  return searchInput.value.trim() !== '' || currentFilter.value !== 'all'
})

// ============ Lifecycle ============

onMounted(async () => {
  // 加载进度数据
  progressStore.loadProgress()
  // 加载单词数据（带进度）
  await vocabularyStore.loadWords(progressStore.progressList)
})

// ============ Methods ============

/**
 * 处理搜索输入
 * Requirements: 5.2
 */
function handleSearch(): void {
  vocabularyStore.setSearchKeyword(searchInput.value)
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchInput.value = ''
  vocabularyStore.setSearchKeyword('')
}

/**
 * 切换搜索框显示
 */
function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    clearSearch()
  }
}

/**
 * 设置筛选状态
 * Requirements: 5.3
 */
function setFilter(status: FilterStatus): void {
  currentFilter.value = status
  vocabularyStore.setFilterStatus(status)
}

/**
 * 清除所有筛选
 */
function clearAllFilters(): void {
  searchInput.value = ''
  currentFilter.value = 'all'
  vocabularyStore.clearFilters()
}

/**
 * 获取记忆状态的显示文本
 */
function getStatusLabel(status: MemoryStatus): string {
  const labels: Record<MemoryStatus, string> = {
    new: '新单词',
    learning: '学习中',
    mastered: '已掌握',
  }
  return labels[status]
}

/**
 * 获取记忆状态的CSS类名
 */
function getStatusClass(status: MemoryStatus): string {
  return `status-${status}`
}

/**
 * 获取复习阶段描述
 * Requirements: 5.4
 */
function getStageLabel(stage: number): string {
  if (stage === 0) return '待首次复习'
  if (stage === 6) return '最后阶段'
  return `第${stage}次复习`
}

/**
 * 格式化下次复习时间
 * Requirements: 5.4
 */
function formatNextReview(word: WordEntry): string {
  if (word.memoryStatus === 'mastered') {
    return '已掌握'
  }
  
  const now = Date.now()
  const diff = word.nextReviewAt - now
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  
  if (days < 0) {
    return `逾期${Math.abs(days)}天`
  } else if (days === 0) {
    return '今日复习'
  } else if (days === 1) {
    return '明天复习'
  } else {
    return `${days}天后复习`
  }
}

/**
 * 获取下次复习时间的CSS类名
 */
function getNextReviewClass(word: WordEntry): string {
  if (word.memoryStatus === 'mastered') {
    return 'review-mastered'
  }
  
  const now = Date.now()
  const diff = word.nextReviewAt - now
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  
  if (days < 0) {
    return 'review-overdue'
  } else if (days === 0) {
    return 'review-today'
  } else {
    return 'review-future'
  }
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  if (dateStr === today) {
    return '今天'
  } else if (dateStr === yesterday) {
    return '昨天'
  } else {
    // 格式化为 MM月DD日
    const [year, month, day] = dateStr.split('-')
    return `${parseInt(month)}月${parseInt(day)}日`
  }
}

/**
 * 返回首页
 */
function goHome(): void {
  router.push('/')
}
</script>

<template>
  <div class="word-list">
    <!-- 顶部导航栏 -->
    <header class="list-header">
      <button class="btn-back" @click="goHome">
        <span class="back-icon">←</span>
        <span>返回</span>
      </button>
      
      <h1 class="header-title">词库</h1>
      
      <button class="btn-search" @click="toggleSearch">
        <span class="search-icon">🔍</span>
      </button>
    </header>

    <!-- 搜索框 Requirements: 5.2 -->
    <div v-if="showSearch" class="search-bar">
      <div class="search-input-wrapper">
        <span class="search-input-icon">🔍</span>
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="搜索单词或释义..."
          @input="handleSearch"
        />
        <button 
          v-if="searchInput" 
          class="btn-clear-search"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 筛选标签 Requirements: 5.3 -->
    <div class="filter-tabs">
      <button
        class="filter-tab"
        :class="{ active: currentFilter === 'all' }"
        @click="setFilter('all')"
      >
        全部 ({{ totalCount }})
      </button>
      <button
        class="filter-tab"
        :class="{ active: currentFilter === 'new' }"
        @click="setFilter('new')"
      >
        新单词
      </button>
      <button
        class="filter-tab"
        :class="{ active: currentFilter === 'learning' }"
        @click="setFilter('learning')"
      >
        学习中
      </button>
      <button
        class="filter-tab"
        :class="{ active: currentFilter === 'mastered' }"
        @click="setFilter('mastered')"
      >
        已掌握
      </button>
    </div>

    <!-- 筛选结果提示 -->
    <div v-if="hasFilter" class="filter-result">
      <span class="result-text">
        找到 {{ filteredCount }} 个单词
      </span>
      <button class="btn-clear-filter" @click="clearAllFilters">
        清除筛选
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="wordsByDate.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h2 class="empty-title">
        {{ hasFilter ? '没有找到匹配的单词' : '词库为空' }}
      </h2>
      <p class="empty-text">
        {{ hasFilter ? '试试其他搜索词或筛选条件' : '在 src/data/words/ 目录添加单词文件' }}
      </p>
      <button v-if="hasFilter" class="btn-secondary" @click="clearAllFilters">
        清除筛选
      </button>
    </div>

    <!-- 单词列表 Requirements: 5.1 -->
    <div v-else class="word-groups">
      <div 
        v-for="group in wordsByDate" 
        :key="group.date"
        class="word-group"
      >
        <!-- 日期分组标题 -->
        <div class="group-header">
          <span class="group-date">{{ formatDate(group.date) }}</span>
          <span class="group-count">{{ group.words.length }} 个单词</span>
        </div>

        <!-- 单词列表项 -->
        <div class="word-items">
          <div 
            v-for="word in group.words" 
            :key="word.id"
            class="word-item"
          >
            <!-- 单词信息 -->
            <div class="word-info">
              <div class="word-main">
                <span class="word-text">{{ word.word }}</span>
                <span 
                  class="word-status"
                  :class="getStatusClass(word.memoryStatus)"
                >
                  {{ getStatusLabel(word.memoryStatus) }}
                </span>
              </div>
              <p class="word-meaning">{{ word.meaning }}</p>
            </div>

            <!-- 复习状态 Requirements: 5.4 -->
            <div class="review-info">
              <span class="review-stage">{{ getStageLabel(word.reviewStage) }}</span>
              <span 
                class="review-next"
                :class="getNextReviewClass(word)"
              >
                {{ formatNextReview(word) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.word-list {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: 80px; /* 为底部导航留空间 */
}

/* 顶部导航栏 */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: transparent;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
}

.btn-back:active {
  background-color: rgba(74, 144, 217, 0.1);
}

.back-icon {
  font-size: 16px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.btn-search {
  padding: 8px 12px;
  background: transparent;
  font-size: 18px;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
}

.btn-search:active {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 搜索框 */
.search-bar {
  padding: 12px 16px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--bg-color);
  border-radius: 20px;
  padding: 8px 16px;
}

.search-input-icon {
  font-size: 14px;
  margin-right: 8px;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-color);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.btn-clear-search {
  padding: 4px 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 50%;
}

.btn-clear-search:active {
  background-color: rgba(0, 0, 0, 0.1);
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  background-color: var(--bg-color);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-tab.active {
  background-color: var(--primary-color);
  color: #fff;
}

.filter-tab:active:not(.active) {
  background-color: var(--border-color);
}

/* 筛选结果提示 */
.filter-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: rgba(74, 144, 217, 0.1);
}

.result-text {
  font-size: 13px;
  color: var(--primary-color);
}

.btn-clear-filter {
  padding: 4px 10px;
  background: transparent;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
}

.btn-clear-filter:active {
  background-color: rgba(74, 144, 217, 0.2);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.btn-secondary {
  padding: 10px 24px;
  background-color: var(--card-bg);
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.btn-secondary:active {
  background-color: var(--bg-color);
}

/* 单词分组 */
.word-groups {
  padding: 16px;
}

.word-group {
  margin-bottom: 20px;
}

.word-group:last-child {
  margin-bottom: 0;
}

/* 分组标题 */
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 8px;
}

.group-date {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
}

.group-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 单词列表项 */
.word-items {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.word-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.word-item:last-child {
  border-bottom: none;
}

/* 单词信息 */
.word-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.word-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.word-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.word-status {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 10px;
}

.status-new {
  background-color: rgba(250, 173, 20, 0.15);
  color: var(--warning-color);
}

.status-learning {
  background-color: rgba(74, 144, 217, 0.15);
  color: var(--primary-color);
}

.status-mastered {
  background-color: rgba(82, 196, 26, 0.15);
  color: var(--success-color);
}

.word-meaning {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 复习信息 */
.review-info {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.review-stage {
  font-size: 11px;
  color: var(--text-secondary);
}

.review-next {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;
}

.review-overdue {
  background-color: rgba(255, 77, 79, 0.15);
  color: var(--error-color);
}

.review-today {
  background-color: rgba(74, 144, 217, 0.15);
  color: var(--primary-color);
}

.review-future {
  background-color: var(--bg-color);
  color: var(--text-secondary);
}

.review-mastered {
  background-color: rgba(82, 196, 26, 0.15);
  color: var(--success-color);
}
</style>
