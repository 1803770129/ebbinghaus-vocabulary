<script setup lang="ts">
/**
 * 复习页 - ReviewPage
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2
 * 
 * 功能：
 * - 实现WordCard卡片翻转组件
 * - 实现进度显示
 * - 实现记住/忘记按钮
 * - 集成发音功能
 * - 支持按日期选择复习单词
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProgressStore } from '../stores/progress'
import { useVocabularyStore } from '../stores/vocabulary'
import { speechService } from '../services/speech'
import { schedulerService } from '../services/scheduler'
import type { VoiceType } from '../types'

const router = useRouter()
const progressStore = useProgressStore()
const vocabularyStore = useVocabularyStore()

// ============ State ============

/** 卡片是否已翻转（显示答案） */
const isFlipped = ref(false)

/** 发音类型 */
const voiceType = ref<VoiceType>('en-US')

/** 是否支持发音 */
const isSpeechSupported = ref(false)

/** 是否正在发音 */
const isSpeaking = ref(false)

/** 是否显示日期选择器 */
const showDatePicker = ref(false)

/** 当前选择的日期（null表示全部） */
const selectedDate = ref<string | null>(null)

// ============ Computed ============

/**
 * 当前正在复习的单词
 * Requirements: 4.1
 */
const currentWord = computed(() => progressStore.currentWord)

/**
 * 复习进度
 * Requirements: 4.5
 */
const progress = computed(() => progressStore.reviewProgress)

/**
 * 可选择的日期列表（按日期降序）
 */
const availableDates = computed(() => {
  return vocabularyStore.wordsByDate.map(group => ({
    date: group.date,
    count: group.words.length
  }))
})

/**
 * 是否还有待复习单词
 */
const hasMoreWords = computed(() => progressStore.hasMoreWords)

/**
 * 复习是否完成
 */
const isComplete = computed(() => progressStore.isReviewComplete)

/**
 * 复习队列是否为空（未开始复习）
 */
const isQueueEmpty = computed(() => progressStore.reviewQueue.length === 0)

// ============ Lifecycle ============

onMounted(async () => {
  // 检查发音支持
  isSpeechSupported.value = speechService.isSupported()
  
  // 如果复习队列为空，尝试加载数据
  if (isQueueEmpty.value) {
    progressStore.loadProgress()
    await vocabularyStore.loadWords(progressStore.progressList)
    
    // 获取今日待复习单词并开始复习
    const todayWords = schedulerService.getTodayReviewWords(vocabularyStore.words)
    if (todayWords.length > 0) {
      progressStore.startReview(todayWords)
    }
  }
})

// 当切换到新单词时，重置翻转状态
watch(currentWord, () => {
  isFlipped.value = false
})

// ============ Methods ============

/**
 * 翻转卡片显示答案
 * Requirements: 4.2
 */
function flipCard(): void {
  if (!isFlipped.value) {
    isFlipped.value = true
  }
}

/**
 * 处理"记住了"操作
 * Requirements: 4.3, 4.4
 */
function handleRemember(): void {
  const result = progressStore.handleRemember()
  if (result) {
    // 同步更新词库中的单词状态
    const word = vocabularyStore.getWordById(result.id)
    if (word) {
      vocabularyStore.updateWord({
        ...word,
        reviewStage: result.reviewStage,
        nextReviewAt: result.nextReviewAt,
        memoryStatus: result.memoryStatus,
        lastReviewedAt: result.lastReviewedAt,
      })
    }
  }
  // 重置翻转状态（由watch自动处理）
}

/**
 * 处理"忘记了"操作
 * Requirements: 4.3, 4.4
 */
function handleForget(): void {
  const result = progressStore.handleForget()
  if (result) {
    // 同步更新词库中的单词状态
    const word = vocabularyStore.getWordById(result.id)
    if (word) {
      vocabularyStore.updateWord({
        ...word,
        reviewStage: result.reviewStage,
        nextReviewAt: result.nextReviewAt,
        memoryStatus: result.memoryStatus,
        lastReviewedAt: result.lastReviewedAt,
      })
    }
  }
  // 重置翻转状态（由watch自动处理）
}

/**
 * 播放单词发音
 * Requirements: 7.2
 */
function speakWord(): void {
  if (!currentWord.value || !isSpeechSupported.value) {
    return
  }
  
  isSpeaking.value = true
  speechService.speak(currentWord.value.word, voiceType.value)
  
  // 模拟发音结束（Web Speech API没有可靠的结束事件）
  setTimeout(() => {
    isSpeaking.value = false
  }, 1500)
}

/**
 * 切换发音类型
 */
function toggleVoiceType(): void {
  voiceType.value = voiceType.value === 'en-US' ? 'en-GB' : 'en-US'
}

/**
 * 返回首页
 */
function goHome(): void {
  router.push('/')
}

/**
 * 继续复习（完成后重新开始）
 */
async function continueReview(): Promise<void> {
  // 重新加载数据并开始复习
  progressStore.loadProgress()
  await vocabularyStore.loadWords(progressStore.progressList)
  
  // 获取所有单词重新开始复习（不只是今日待复习的）
  const allWords = vocabularyStore.words
  if (allWords.length > 0) {
    progressStore.startReview(allWords)
  }
  isFlipped.value = false
}

/**
 * 复习全部单词（从暂无任务页面触发）
 */
async function reviewAllWords(): Promise<void> {
  progressStore.loadProgress()
  await vocabularyStore.loadWords(progressStore.progressList)
  
  const allWords = vocabularyStore.words
  if (allWords.length > 0) {
    progressStore.startReview(allWords)
  }
  isFlipped.value = false
}

/**
 * 显示日期选择器
 */
function openDatePicker(): void {
  showDatePicker.value = true
}

/**
 * 关闭日期选择器
 */
function closeDatePicker(): void {
  showDatePicker.value = false
}

/**
 * 选择日期并开始复习
 */
async function selectDate(date: string | null): Promise<void> {
  selectedDate.value = date
  showDatePicker.value = false
  
  progressStore.loadProgress()
  await vocabularyStore.loadWords(progressStore.progressList)
  
  let wordsToReview = vocabularyStore.words
  if (date) {
    wordsToReview = wordsToReview.filter(w => w.addedDate === date)
  }
  
  if (wordsToReview.length > 0) {
    progressStore.startReview(wordsToReview)
  }
  isFlipped.value = false
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 获取复习阶段描述
 */
function getStageLabel(stage: number): string {
  const labels = ['新单词', '第1次', '第2次', '第3次', '第4次', '第5次', '第6次']
  return labels[stage] || '未知'
}
</script>

<template>
  <div class="review">
    <!-- 顶部导航栏 -->
    <header class="review-header">
      <button class="btn-back" @click="goHome">
        <span class="back-icon">←</span>
        <span>返回</span>
      </button>
      
      <!-- 进度显示 Requirements: 4.5 -->
      <div v-if="!isQueueEmpty && !isComplete" class="progress-indicator">
        <span class="progress-text">{{ progress.current }} / {{ progress.total }}</span>
      </div>
      
      <!-- 日期选择按钮 -->
      <button class="btn-date" @click="openDatePicker">
        <span>📅</span>
        <span v-if="selectedDate">{{ formatDate(selectedDate) }}</span>
        <span v-else>选择日期</span>
      </button>
    </header>

    <!-- 日期选择弹窗 -->
    <div v-if="showDatePicker" class="date-picker-overlay" @click="closeDatePicker">
      <div class="date-picker-modal" @click.stop>
        <div class="date-picker-header">
          <h3>选择复习日期</h3>
          <button class="btn-close" @click="closeDatePicker">×</button>
        </div>
        <div class="date-picker-content">
          <button 
            class="date-option"
            :class="{ active: selectedDate === null }"
            @click="selectDate(null)"
          >
            <span class="date-label">全部单词</span>
            <span class="date-count">{{ vocabularyStore.totalCount }} 个</span>
          </button>
          <button 
            v-for="item in availableDates" 
            :key="item.date"
            class="date-option"
            :class="{ active: selectedDate === item.date }"
            @click="selectDate(item.date)"
          >
            <span class="date-label">{{ formatDate(item.date) }}</span>
            <span class="date-count">{{ item.count }} 个</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 复习队列为空提示 -->
    <div v-if="isQueueEmpty" class="empty-state">
      <div class="empty-icon">📝</div>
      <h2 class="empty-title">暂无复习任务</h2>
      <p class="empty-text">今日没有需要复习的单词</p>
      <div class="complete-actions">
        <button class="btn-primary" @click="goHome">返回首页</button>
        <button class="btn-secondary" @click="openDatePicker">选择日期复习</button>
      </div>
    </div>

    <!-- 复习完成提示 -->
    <div v-else-if="isComplete" class="complete-state">
      <div class="complete-icon">🎉</div>
      <h2 class="complete-title">复习完成！</h2>
      <p class="complete-text">太棒了！你已完成今日所有复习任务</p>
      <div class="complete-stats">
        <div class="stat-item">
          <span class="stat-value">{{ progress.total }}</span>
          <span class="stat-label">已复习</span>
        </div>
      </div>
      <div class="complete-actions">
        <button class="btn-primary" @click="goHome">返回首页</button>
        <button class="btn-secondary" @click="continueReview">再复习一遍</button>
        <button class="btn-secondary" @click="openDatePicker">选择其他日期</button>
      </div>
    </div>

    <!-- 复习卡片区域 -->
    <div v-else-if="currentWord" class="review-content">
      <!-- 进度条 -->
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(progress.current / progress.total) * 100}%` }"
        ></div>
      </div>

      <!-- 单词卡片 Requirements: 4.1, 4.2 -->
      <div 
        class="word-card"
        :class="{ flipped: isFlipped }"
        @click="flipCard"
      >
        <!-- 卡片正面 - 只显示单词 -->
        <div class="card-front">
          <div class="card-content">
            <!-- 复习阶段标签 -->
            <div class="stage-badge">
              {{ getStageLabel(currentWord.reviewStage) }}
            </div>
            
            <!-- 单词 -->
            <h1 class="word-text">{{ currentWord.word }}</h1>
            
            <!-- 发音按钮 Requirements: 7.2 -->
            <button 
              v-if="isSpeechSupported"
              class="btn-speak"
              :class="{ speaking: isSpeaking }"
              @click.stop="speakWord"
            >
              <span class="speak-icon">🔊</span>
              <span class="voice-type">{{ voiceType === 'en-US' ? '美' : '英' }}</span>
            </button>
            
            <!-- 提示文字 -->
            <p class="hint-text">点击卡片查看释义</p>
          </div>
        </div>

        <!-- 卡片背面 - 显示释义和例句 -->
        <div class="card-back">
          <div class="card-content">
            <!-- 复习阶段标签 -->
            <div class="stage-badge">
              {{ getStageLabel(currentWord.reviewStage) }}
            </div>
            
            <!-- 单词 -->
            <h1 class="word-text">{{ currentWord.word }}</h1>
            
            <!-- 发音按钮 -->
            <button 
              v-if="isSpeechSupported"
              class="btn-speak"
              :class="{ speaking: isSpeaking }"
              @click.stop="speakWord"
            >
              <span class="speak-icon">🔊</span>
              <span class="voice-type">{{ voiceType === 'en-US' ? '美' : '英' }}</span>
            </button>
            
            <!-- 释义 -->
            <div class="meaning-section">
              <p class="meaning-text">{{ currentWord.meaning }}</p>
            </div>
            
            <!-- 例句 -->
            <div v-if="currentWord.example" class="example-section">
              <p class="example-label">例句</p>
              <p class="example-text">{{ currentWord.example }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 发音类型切换 -->
      <div v-if="isSpeechSupported" class="voice-toggle">
        <button 
          class="btn-voice-toggle"
          @click="toggleVoiceType"
        >
          切换发音：{{ voiceType === 'en-US' ? '美式' : '英式' }}
        </button>
      </div>

      <!-- 操作按钮区域 Requirements: 4.3 -->
      <div class="action-buttons">
        <!-- 未翻转时显示"显示答案"按钮 -->
        <button 
          v-if="!isFlipped"
          class="btn-show-answer"
          @click="flipCard"
        >
          显示答案
        </button>
        
        <!-- 翻转后显示"记住了"和"忘记了"按钮 -->
        <template v-else>
          <button 
            class="btn-forget"
            @click="handleForget"
          >
            <span class="btn-icon">😕</span>
            <span>忘记了</span>
          </button>
          
          <button 
            class="btn-remember"
            @click="handleRemember"
          >
            <span class="btn-icon">😊</span>
            <span>记住了</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>


<style scoped>
.review {
  min-height: 100vh;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.review-header {
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

.progress-indicator {
  background-color: var(--bg-color);
  padding: 6px 16px;
  border-radius: 20px;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.header-spacer {
  width: 60px;
}

/* 空状态 */
.empty-state,
.complete-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon,
.complete-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title,
.complete-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.empty-text,
.complete-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.complete-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.complete-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 280px;
}

/* 复习内容区域 */
.review-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

/* 进度条 */
.progress-bar {
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color) 0%, #357abd 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* 单词卡片 */
.word-card {
  flex: 1;
  cursor: pointer;
  margin-bottom: 20px;
  min-height: 300px;
  max-height: 450px;
  border-radius: 16px;
  background-color: var(--card-bg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card-front,
.card-back {
  width: 100%;
  height: 100%;
  border-radius: 16px;
}

.card-front {
  display: block;
}

.card-back {
  display: none;
}

.word-card.flipped .card-front {
  display: none;
}

.word-card.flipped .card-back {
  display: block;
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}

/* 复习阶段标签 */
.stage-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 4px 12px;
  background-color: var(--primary-color);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
}

/* 单词文字 */
.word-text {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  margin-bottom: 16px;
  word-break: break-word;
}

/* 发音按钮 */
.btn-speak {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: var(--bg-color);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  margin-bottom: 16px;
}

.btn-speak:active,
.btn-speak.speaking {
  background-color: var(--primary-color);
  color: #fff;
}

.speak-icon {
  font-size: 18px;
}

.voice-type {
  font-size: 12px;
  font-weight: 500;
}

/* 提示文字 */
.hint-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: auto;
}

/* 释义区域 */
.meaning-section {
  width: 100%;
  text-align: center;
  margin-bottom: 16px;
}

.meaning-text {
  font-size: 20px;
  color: var(--text-color);
  line-height: 1.6;
}

/* 例句区域 */
.example-section {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  margin-top: auto;
}

.example-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.example-text {
  font-size: 14px;
  color: var(--text-color);
  font-style: italic;
  line-height: 1.5;
}

/* 发音类型切换 */
.voice-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.btn-voice-toggle {
  padding: 8px 16px;
  background-color: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

/* 操作按钮区域 */
.action-buttons {
  display: flex;
  gap: 16px;
  padding: 16px 0;
}

.btn-show-answer {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #357abd 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-show-answer:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.2);
}

.btn-forget,
.btn-remember {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--border-radius);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-forget {
  background-color: var(--card-bg);
  color: var(--error-color);
  border: 2px solid var(--error-color);
}

.btn-forget:active {
  background-color: var(--error-color);
  color: #fff;
}

.btn-remember {
  background: linear-gradient(135deg, var(--success-color) 0%, #3da50f 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.btn-remember:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

.btn-icon {
  font-size: 24px;
}

/* 通用按钮样式 */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #357abd 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
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
}

.btn-secondary:active {
  background-color: var(--bg-color);
}

/* 日期选择按钮 */
.btn-date {
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

.btn-date:active {
  background-color: rgba(74, 144, 217, 0.1);
}

/* 日期选择弹窗 */
.date-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.date-picker-modal {
  width: 100%;
  max-width: 500px;
  max-height: 70vh;
  background-color: var(--card-bg);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.date-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.date-picker-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-secondary);
  font-size: 24px;
  border-radius: 50%;
}

.btn-close:active {
  background-color: var(--bg-color);
}

.date-picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  padding-bottom: 80px;
}

.date-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.date-option:active {
  background-color: var(--border-color);
}

.date-option.active {
  background-color: var(--primary-color);
}

.date-option.active .date-label,
.date-option.active .date-count {
  color: #fff;
}

.date-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
}

.date-count {
  font-size: 14px;
  color: var(--text-secondary);
}

</style>
