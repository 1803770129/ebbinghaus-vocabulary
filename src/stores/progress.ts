/**
 * 复习进度状态管理
 * Requirements: 6.1, 6.2, 6.4
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WordEntry, WordProgress, StudyStats, DailyStudy, ProgressData } from '../types';
import { progressService } from '../services/progress';
import { schedulerService } from '../services/scheduler';

/**
 * 进度Store
 * 管理复习进度和统计数据，实现复习操作
 */
export const useProgressStore = defineStore('progress', () => {
  // ============ State ============
  
  /** 所有单词进度 */
  const progressList = ref<WordProgress[]>([]);
  
  /** 连续学习天数 */
  const streakDays = ref(0);
  
  /** 上次学习日期 */
  const lastStudyDate = ref('');
  
  /** 每日复习记录 */
  const dailyReviews = ref<Record<string, number>>({});
  
  /** 当前复习队列 */
  const reviewQueue = ref<WordEntry[]>([]);
  
  /** 当前复习索引 */
  const currentReviewIndex = ref(0);
  
  /** 今日已复习数量 */
  const todayReviewedCount = ref(0);

  // ============ Getters ============

  /**
   * 当前正在复习的单词
   */
  const currentWord = computed((): WordEntry | null => {
    if (reviewQueue.value.length === 0) {
      return null;
    }
    if (currentReviewIndex.value >= reviewQueue.value.length) {
      return null;
    }
    return reviewQueue.value[currentReviewIndex.value];
  });

  /**
   * 复习进度（当前/剩余总数）
   * 由于忘记的单词会重新加入队列，所以显示剩余数量
   */
  const reviewProgress = computed(() => ({
    current: currentReviewIndex.value + 1,
    total: reviewQueue.value.length,
    remaining: reviewQueue.value.length - currentReviewIndex.value,
  }));

  /**
   * 是否还有待复习单词
   */
  const hasMoreWords = computed(() => {
    return currentReviewIndex.value < reviewQueue.value.length;
  });

  /**
   * 复习是否完成
   */
  const isReviewComplete = computed(() => {
    return reviewQueue.value.length > 0 && currentReviewIndex.value >= reviewQueue.value.length;
  });

  /**
   * 获取今日日期字符串
   */
  function getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 本周每日学习数据
   * Requirements: 6.3
   */
  const weeklyData = computed((): DailyStudy[] => {
    const result: DailyStudy[] = [];
    const today = new Date();
    
    // 获取本周的7天数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      result.push({
        date: dateStr,
        reviewedCount: dailyReviews.value[dateStr] || 0,
      });
    }
    
    return result;
  });

  // ============ Actions ============

  /**
   * 从localStorage加载进度数据
   */
  function loadProgress(): void {
    const data = progressService.load();
    
    if (data) {
      progressList.value = data.progress;
      streakDays.value = data.stats.streakDays;
      lastStudyDate.value = data.stats.lastStudyDate;
      dailyReviews.value = data.stats.dailyReviews;
      
      // 计算今日已复习数量
      const today = getTodayDateString();
      todayReviewedCount.value = dailyReviews.value[today] || 0;
    } else {
      // 初始化默认值
      progressList.value = [];
      streakDays.value = 0;
      lastStudyDate.value = '';
      dailyReviews.value = {};
      todayReviewedCount.value = 0;
    }
  }

  /**
   * 保存进度数据到localStorage
   */
  function saveProgress(): boolean {
    const data: ProgressData = {
      version: 1,
      progress: progressList.value,
      stats: {
        streakDays: streakDays.value,
        lastStudyDate: lastStudyDate.value,
        dailyReviews: dailyReviews.value,
      },
      settings: progressService.getSettings(),
    };
    
    return progressService.save(data);
  }

  /**
   * 开始复习
   * @param words 待复习的单词列表
   */
  function startReview(words: WordEntry[]): void {
    // 按紧急程度排序
    reviewQueue.value = schedulerService.sortByUrgency(words);
    currentReviewIndex.value = 0;
  }

  /**
   * 处理"记住了"操作
   * Requirements: 6.4 (更新连续学习天数)
   * @returns 更新后的单词进度
   */
  function handleRemember(): WordProgress | null {
    const word = currentWord.value;
    if (!word) {
      return null;
    }
    
    // 使用调度服务计算新进度
    const newProgress = schedulerService.handleRemember(word);
    
    // 更新进度列表
    updateProgressList(newProgress);
    
    // 更新统计数据
    updateStats();
    
    // 保存到localStorage
    saveProgress();
    
    // 移动到下一个单词
    currentReviewIndex.value++;
    
    return newProgress;
  }

  /**
   * 处理"忘记了"操作
   * 忘记的单词会重新加入队列末尾，在当次复习中再次出现
   * @returns 更新后的单词进度
   */
  function handleForget(): WordProgress | null {
    const word = currentWord.value;
    if (!word) {
      return null;
    }
    
    // 使用调度服务计算新进度
    const newProgress = schedulerService.handleForget(word);
    
    // 更新进度列表
    updateProgressList(newProgress);
    
    // 更新统计数据
    updateStats();
    
    // 保存到localStorage
    saveProgress();
    
    // 将忘记的单词重新加入队列末尾（更新其进度状态）
    const updatedWord: WordEntry = {
      ...word,
      reviewStage: newProgress.reviewStage,
      nextReviewAt: newProgress.nextReviewAt,
      memoryStatus: newProgress.memoryStatus,
      lastReviewedAt: newProgress.lastReviewedAt,
    };
    reviewQueue.value.push(updatedWord);
    
    // 移动到下一个单词
    currentReviewIndex.value++;
    
    return newProgress;
  }

  /**
   * 更新进度列表中的单词进度
   */
  function updateProgressList(progress: WordProgress): void {
    const index = progressList.value.findIndex(p => p.id === progress.id);
    
    if (index >= 0) {
      progressList.value[index] = progress;
    } else {
      progressList.value.push(progress);
    }
  }

  /**
   * 更新统计数据
   */
  function updateStats(): void {
    const today = getTodayDateString();
    
    // 更新今日复习数量
    dailyReviews.value[today] = (dailyReviews.value[today] || 0) + 1;
    todayReviewedCount.value = dailyReviews.value[today];
    
    // 更新连续学习天数
    updateStreakDays(today);
  }

  /**
   * 更新连续学习天数
   * Requirements: 6.2, 6.4
   */
  function updateStreakDays(today: string): void {
    if (!lastStudyDate.value) {
      // 首次学习
      streakDays.value = 1;
      lastStudyDate.value = today;
      return;
    }
    
    if (lastStudyDate.value === today) {
      // 今天已经学习过，不更新
      return;
    }
    
    // 计算日期差
    const lastDate = new Date(lastStudyDate.value);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (diffDays === 1) {
      // 连续学习
      streakDays.value++;
    } else {
      // 中断了，重新开始计数
      streakDays.value = 1;
    }
    
    lastStudyDate.value = today;
  }

  /**
   * 计算学习统计数据
   * Requirements: 6.1
   * @param words 所有单词列表
   */
  function calculateStats(words: WordEntry[]): StudyStats {
    const totalWords = words.length;
    const masteredWords = words.filter(w => w.memoryStatus === 'mastered').length;
    const learningWords = words.filter(w => w.memoryStatus === 'learning').length;
    const newWords = words.filter(w => w.memoryStatus === 'new').length;
    
    return {
      totalWords,
      masteredWords,
      learningWords,
      newWords,
      streakDays: streakDays.value,
      lastStudyDate: lastStudyDate.value,
      weeklyData: weeklyData.value,
    };
  }

  /**
   * 获取单词进度
   * @param wordId 单词ID
   */
  function getWordProgress(wordId: string): WordProgress | undefined {
    return progressList.value.find(p => p.id === wordId);
  }

  /**
   * 重置所有进度
   */
  function resetProgress(): boolean {
    const success = progressService.reset();
    
    if (success) {
      progressList.value = [];
      streakDays.value = 0;
      lastStudyDate.value = '';
      dailyReviews.value = {};
      reviewQueue.value = [];
      currentReviewIndex.value = 0;
      todayReviewedCount.value = 0;
    }
    
    return success;
  }

  /**
   * 跳过当前单词（不更新进度）
   */
  function skipCurrentWord(): void {
    if (hasMoreWords.value) {
      currentReviewIndex.value++;
    }
  }

  /**
   * 重新开始复习（从头开始）
   */
  function restartReview(): void {
    currentReviewIndex.value = 0;
  }

  return {
    // State
    progressList,
    streakDays,
    lastStudyDate,
    dailyReviews,
    reviewQueue,
    currentReviewIndex,
    todayReviewedCount,
    
    // Getters
    currentWord,
    reviewProgress,
    hasMoreWords,
    isReviewComplete,
    weeklyData,
    
    // Actions
    loadProgress,
    saveProgress,
    startReview,
    handleRemember,
    handleForget,
    calculateStats,
    getWordProgress,
    resetProgress,
    skipCurrentWord,
    restartReview,
    updateProgressList,
  };
});
