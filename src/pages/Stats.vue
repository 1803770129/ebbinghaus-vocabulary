<script setup lang="ts">
/**
 * 统计页 - StatsPage
 * Requirements: 6.1, 6.2, 6.3
 * 
 * 功能：
 * - 显示总单词数、已掌握数、学习中数
 * - 显示连续学习天数
 * - 显示本周学习图表
 * - 导出/导入学习记录
 */
import { computed, onMounted, ref } from 'vue'
import { useVocabularyStore } from '../stores/vocabulary'
import { useProgressStore } from '../stores/progress'
import { progressService } from '../services/progress'
import type { StudyStats, DailyStudy } from '../types'

const vocabularyStore = useVocabularyStore()
const progressStore = useProgressStore()

// ============ State ============

/** 是否显示导入对话框 */
const showImportDialog = ref(false)

/** 导入文本内容 */
const importText = ref('')

/** 操作提示消息 */
const toastMessage = ref('')

/** 提示消息类型 */
const toastType = ref<'success' | 'error'>('success')

/** 是否显示提示 */
const showToast = ref(false)

/** 是否显示重置确认对话框 */
const showResetDialog = ref(false)

// 初始化数据
onMounted(async () => {
  // 加载进度数据
  progressStore.loadProgress()
  // 加载单词数据（带进度）
  await vocabularyStore.loadWords(progressStore.progressList)
})

/**
 * 学习统计数据
 * Requirements: 6.1
 */
const stats = computed((): StudyStats => {
  return progressStore.calculateStats(vocabularyStore.words)
})

/**
 * 连续学习天数
 * Requirements: 6.2
 */
const streakDays = computed(() => progressStore.streakDays)

/**
 * 本周学习数据
 * Requirements: 6.3
 */
const weeklyData = computed((): DailyStudy[] => progressStore.weeklyData)

/**
 * 本周最大复习数（用于图表高度计算）
 */
const maxWeeklyCount = computed(() => {
  const max = Math.max(...weeklyData.value.map(d => d.reviewedCount), 1)
  return max
})

/**
 * 计算柱状图高度百分比
 */
function getBarHeight(count: number): string {
  if (maxWeeklyCount.value === 0) return '0%'
  const percentage = (count / maxWeeklyCount.value) * 100
  return `${Math.max(percentage, count > 0 ? 5 : 0)}%`
}

/**
 * 格式化日期为星期几
 */
function formatDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return days[date.getDay()]
}

/**
 * 判断是否是今天
 */
function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

/**
 * 掌握率百分比
 */
const masteryRate = computed(() => {
  if (stats.value.totalWords === 0) return 0
  return Math.round((stats.value.masteredWords / stats.value.totalWords) * 100)
})

// ============ 导出/导入方法 ============

/**
 * 显示提示消息
 */
function showToastMessage(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

/**
 * 导出学习记录（复制到剪贴板）
 */
async function handleExport() {
  const result = await progressService.copyToClipboard()
  showToastMessage(result.message, result.success ? 'success' : 'error')
}

/**
 * 打开导入对话框
 */
function openImportDialog() {
  importText.value = ''
  showImportDialog.value = true
}

/**
 * 关闭导入对话框
 */
function closeImportDialog() {
  showImportDialog.value = false
  importText.value = ''
}

/**
 * 从剪贴板粘贴
 */
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    importText.value = text
  } catch {
    showToastMessage('无法读取剪贴板，请手动粘贴', 'error')
  }
}

/**
 * 确认导入
 */
async function confirmImport() {
  if (!importText.value.trim()) {
    showToastMessage('请先粘贴学习记录数据', 'error')
    return
  }
  
  const result = progressService.importData(importText.value)
  
  if (result.success) {
    // 重新加载数据
    progressStore.loadProgress()
    await vocabularyStore.loadWords(progressStore.progressList)
    closeImportDialog()
  }
  
  showToastMessage(result.message, result.success ? 'success' : 'error')
}

/**
 * 打开重置确认对话框
 */
function openResetDialog() {
  showResetDialog.value = true
}

/**
 * 关闭重置确认对话框
 */
function closeResetDialog() {
  showResetDialog.value = false
}

/**
 * 确认重置进度
 */
async function confirmReset() {
  const success = progressStore.resetProgress()
  
  if (success) {
    // 重新加载数据
    await vocabularyStore.loadWords([])
    showToastMessage('已重置所有学习进度', 'success')
  } else {
    showToastMessage('重置失败，请重试', 'error')
  }
  
  closeResetDialog()
}
</script>

<template>
  <div class="stats-page">
    <!-- 头部标题 -->
    <header class="stats-header">
      <h1 class="page-title">学习统计</h1>
    </header>

    <!-- 连续学习天数卡片 -->
    <div class="streak-card">
      <div class="streak-icon">🔥</div>
      <div class="streak-info">
        <span class="streak-count">{{ streakDays }}</span>
        <span class="streak-label">连续学习天数</span>
      </div>
    </div>

    <!-- 总览统计 Requirements: 6.1 -->
    <section class="overview-section">
      <h2 class="section-title">词汇总览</h2>
      
      <div class="stats-grid">
        <!-- 总单词数 -->
        <div class="stat-card total-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">{{ stats.totalWords }}</div>
          <div class="stat-label">总单词</div>
        </div>
        
        <!-- 已掌握数 -->
        <div class="stat-card mastered-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ stats.masteredWords }}</div>
          <div class="stat-label">已掌握</div>
        </div>
        
        <!-- 学习中数 -->
        <div class="stat-card learning-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">{{ stats.learningWords }}</div>
          <div class="stat-label">学习中</div>
        </div>
        
        <!-- 新单词数 -->
        <div class="stat-card new-card">
          <div class="stat-icon">✨</div>
          <div class="stat-value">{{ stats.newWords }}</div>
          <div class="stat-label">新单词</div>
        </div>
      </div>
    </section>

    <!-- 掌握率进度条 -->
    <section class="mastery-section">
      <div class="mastery-header">
        <span class="mastery-title">掌握率</span>
        <span class="mastery-percent">{{ masteryRate }}%</span>
      </div>
      <div class="mastery-bar">
        <div 
          class="mastery-progress" 
          :style="{ width: `${masteryRate}%` }"
        ></div>
      </div>
      <div class="mastery-detail">
        <span>已掌握 {{ stats.masteredWords }} / {{ stats.totalWords }} 个单词</span>
      </div>
    </section>

    <!-- 本周学习图表 Requirements: 6.3 -->
    <section class="chart-section">
      <h2 class="section-title">本周学习</h2>
      
      <div class="weekly-chart">
        <div class="chart-bars">
          <div 
            v-for="day in weeklyData" 
            :key="day.date"
            class="bar-container"
          >
            <div class="bar-wrapper">
              <div 
                class="bar"
                :class="{ 'bar-today': isToday(day.date), 'bar-empty': day.reviewedCount === 0 }"
                :style="{ height: getBarHeight(day.reviewedCount) }"
              >
                <span v-if="day.reviewedCount > 0" class="bar-value">
                  {{ day.reviewedCount }}
                </span>
              </div>
            </div>
            <div class="bar-label" :class="{ 'label-today': isToday(day.date) }">
              {{ formatDayOfWeek(day.date) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 本周统计摘要 -->
      <div class="weekly-summary">
        <div class="summary-item">
          <span class="summary-value">
            {{ weeklyData.reduce((sum, d) => sum + d.reviewedCount, 0) }}
          </span>
          <span class="summary-label">本周复习</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-value">
            {{ Math.round(weeklyData.reduce((sum, d) => sum + d.reviewedCount, 0) / 7) }}
          </span>
          <span class="summary-label">日均复习</span>
        </div>
      </div>
    </section>

    <!-- 学习提示 -->
    <section class="tips-section">
      <div class="tip-card">
        <div class="tip-icon">💡</div>
        <div class="tip-content">
          <p class="tip-title">坚持就是胜利</p>
          <p class="tip-text">每天复习一点，积少成多，词汇量自然提升</p>
        </div>
      </div>
    </section>

    <!-- 数据同步区域 -->
    <section class="sync-section">
      <h2 class="section-title">数据同步</h2>
      <div class="sync-card">
        <p class="sync-desc">导出学习记录到其他设备，或从其他设备导入</p>
        <div class="sync-buttons">
          <button class="btn-export" @click="handleExport">
            <span class="btn-icon">📤</span>
            <span>导出记录</span>
          </button>
          <button class="btn-import" @click="openImportDialog">
            <span class="btn-icon">📥</span>
            <span>导入记录</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 重置进度区域 -->
    <section class="reset-section">
      <h2 class="section-title">重置数据</h2>
      <div class="reset-card">
        <p class="reset-desc">清除所有学习进度，重新开始学习</p>
        <button class="btn-reset" @click="openResetDialog">
          <span class="btn-icon">🗑️</span>
          <span>重置学习进度</span>
        </button>
      </div>
    </section>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="dialog-overlay" @click.self="closeImportDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">导入学习记录</h3>
          <button class="btn-close" @click="closeImportDialog">✕</button>
        </div>
        <div class="dialog-body">
          <p class="dialog-desc">请粘贴从其他设备导出的学习记录数据</p>
          <textarea
            v-model="importText"
            class="import-textarea"
            placeholder="在此粘贴学习记录数据..."
            rows="8"
          ></textarea>
          <button class="btn-paste" @click="pasteFromClipboard">
            <span>📋</span> 从剪贴板粘贴
          </button>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="closeImportDialog">取消</button>
          <button class="btn-confirm" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>

    <!-- 重置确认对话框 -->
    <div v-if="showResetDialog" class="dialog-overlay" @click.self="closeResetDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">确认重置</h3>
          <button class="btn-close" @click="closeResetDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="reset-warning">
            <span class="warning-icon">⚠️</span>
            <p class="warning-text">此操作将清除所有学习进度，包括：</p>
            <ul class="warning-list">
              <li>所有单词的复习记录</li>
              <li>连续学习天数</li>
              <li>每日复习统计</li>
            </ul>
            <p class="warning-note">此操作不可恢复，请谨慎操作！</p>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="closeResetDialog">取消</button>
          <button class="btn-danger" @click="confirmReset">确认重置</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div 
      v-if="showToast" 
      class="toast"
      :class="{ 'toast-success': toastType === 'success', 'toast-error': toastType === 'error' }"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.stats-page {
  padding: 20px 16px;
  padding-bottom: 80px;
  min-height: 100vh;
  background-color: var(--bg-color);
}

/* 头部样式 */
.stats-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
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

/* 总览统计 */
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
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.total-card .stat-value {
  color: var(--primary-color);
}

.mastered-card .stat-value {
  color: var(--success-color);
}

.learning-card .stat-value {
  color: var(--warning-color);
}

.new-card .stat-value {
  color: #9c27b0;
}

/* 掌握率进度条 */
.mastery-section {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.mastery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mastery-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.mastery-percent {
  font-size: 20px;
  font-weight: 700;
  color: var(--success-color);
}

.mastery-bar {
  height: 12px;
  background-color: #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.mastery-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--success-color) 0%, #73d13d 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.mastery-detail {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

/* 本周学习图表 */
.chart-section {
  margin-bottom: 24px;
}

.weekly-chart {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 20px 16px;
  box-shadow: var(--shadow);
}

.chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 150px;
  padding-bottom: 30px;
  position: relative;
}

.bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  padding: 0 4px;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: linear-gradient(180deg, var(--primary-color) 0%, #357abd 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.3s ease;
}

.bar-empty {
  background: #e8e8e8;
  min-height: 4px;
}

.bar-today {
  background: linear-gradient(180deg, var(--success-color) 0%, #73d13d 100%);
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
}

.bar-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.label-today {
  color: var(--success-color);
  font-weight: 600;
}

/* 本周统计摘要 */
.weekly-summary {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background-color: var(--border-color);
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

/* 数据同步区域 */
.sync-section {
  margin-top: 24px;
}

.sync-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px;
  box-shadow: var(--shadow);
}

.sync-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-align: center;
}

.sync-buttons {
  display: flex;
  gap: 12px;
}

.btn-export,
.btn-import {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-export {
  background-color: var(--primary-color);
  color: #fff;
}

.btn-export:active {
  background-color: var(--primary-dark, #357abd);
}

.btn-import {
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-import:active {
  background-color: var(--border-color);
}

.btn-icon {
  font-size: 16px;
}

/* 重置进度区域 */
.reset-section {
  margin-top: 24px;
}

.reset-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 16px;
  box-shadow: var(--shadow);
}

.reset-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-align: center;
}

.btn-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 500;
  background-color: var(--bg-color);
  color: var(--error-color);
  border: 1px solid var(--error-color);
  transition: all 0.2s ease;
}

.btn-reset:active {
  background-color: var(--error-color);
  color: #fff;
}

/* 重置警告样式 */
.reset-warning {
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.warning-text {
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 12px;
}

.warning-list {
  text-align: left;
  padding-left: 20px;
  margin-bottom: 16px;
}

.warning-list li {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.warning-note {
  font-size: 13px;
  color: var(--error-color);
  font-weight: 500;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 500;
  background-color: var(--error-color);
  color: #fff;
}

.btn-danger:active {
  opacity: 0.8;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  background-color: var(--card-bg);
  border-radius: var(--border-radius-lg, 12px);
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 16px;
  color: var(--text-secondary);
}

.btn-close:active {
  background-color: var(--bg-color);
}

.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.dialog-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.import-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
  min-height: 120px;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.import-textarea:focus {
  border-color: var(--primary-color);
  outline: none;
}

.btn-paste {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  margin-top: 12px;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 14px;
  border-radius: var(--border-radius);
  border: 1px dashed var(--border-color);
}

.btn-paste:active {
  background-color: var(--border-color);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 500;
}

.btn-cancel {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.btn-cancel:active {
  background-color: var(--border-color);
}

.btn-confirm {
  background-color: var(--primary-color);
  color: #fff;
}

.btn-confirm:active {
  background-color: var(--primary-dark, #357abd);
}

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1001;
  animation: toastIn 0.3s ease;
}

.toast-success {
  background-color: var(--success-color);
  color: #fff;
}

.toast-error {
  background-color: var(--error-color);
  color: #fff;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
