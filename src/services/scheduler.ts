/**
 * 艾宾浩斯复习调度服务
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2
 */

import type { WordEntry, WordProgress, ReviewStage, MemoryStatus } from '../types';
import { REVIEW_INTERVALS } from '../types';

/**
 * 一天的毫秒数
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 获取当前日期的开始时间戳（00:00:00）
 */
export function getStartOfDay(timestamp: number = Date.now()): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 获取当前日期的结束时间戳（23:59:59.999）
 */
export function getEndOfDay(timestamp: number = Date.now()): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/**
 * 解析日期字符串为时间戳
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 */
export function parseDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

/**
 * 复习调度服务类
 */
export class SchedulerService {
  /**
   * 计算下次复习时间
   * @param currentStage 当前复习阶段
   * @param baseTime 基准时间（默认为当前时间）
   * @returns 下次复习时间戳
   * 
   * Requirements: 2.1
   */
  calculateNextReview(currentStage: ReviewStage, baseTime: number = Date.now()): number {
    const intervalDays = REVIEW_INTERVALS[currentStage];
    return getStartOfDay(baseTime) + intervalDays * DAY_MS;
  }

  /**
   * 处理"记住了"操作
   * @param word 单词条目
   * @returns 更新后的单词进度
   * 
   * Requirements: 2.2, 2.4
   */
  handleRemember(word: WordEntry): WordProgress {
    const now = Date.now();
    const currentStage = word.reviewStage;
    
    // 如果已经是阶段6，标记为已掌握
    if (currentStage === 6) {
      return {
        id: word.id,
        reviewStage: 6,
        nextReviewAt: word.nextReviewAt, // 保持不变
        memoryStatus: 'mastered',
        lastReviewedAt: now,
      };
    }
    
    // 推进到下一阶段
    const nextStage = (currentStage + 1) as ReviewStage;
    const nextReviewAt = this.calculateNextReview(nextStage, now);
    
    // 确定记忆状态
    let memoryStatus: MemoryStatus = 'learning';
    if (nextStage === 6) {
      // 完成阶段6后将在下次记住时标记为mastered
      memoryStatus = 'learning';
    }
    
    return {
      id: word.id,
      reviewStage: nextStage,
      nextReviewAt,
      memoryStatus,
      lastReviewedAt: now,
    };
  }

  /**
   * 处理"忘记了"操作
   * @param word 单词条目
   * @returns 更新后的单词进度
   * 
   * Requirements: 2.3
   */
  handleForget(word: WordEntry): WordProgress {
    const now = Date.now();
    
    // 重置到阶段1
    const nextReviewAt = this.calculateNextReview(1, now);
    
    return {
      id: word.id,
      reviewStage: 1,
      nextReviewAt,
      memoryStatus: 'learning',
      lastReviewedAt: now,
    };
  }

  /**
   * 获取今日待复习单词
   * @param words 所有单词列表
   * @returns 今日待复习的单词列表
   * 
   * Requirements: 3.1
   */
  getTodayReviewWords(words: WordEntry[]): WordEntry[] {
    const todayEnd = getEndOfDay();
    
    return words.filter(word => {
      // 排除已掌握的单词
      if (word.memoryStatus === 'mastered') {
        return false;
      }
      // 包含下次复习时间在今天结束之前的单词
      return word.nextReviewAt <= todayEnd;
    });
  }

  /**
   * 获取今日新单词（添加当天的）
   * @param words 所有单词列表
   * @returns 今日新添加的单词列表
   */
  getTodayNewWords(words: WordEntry[]): WordEntry[] {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return words.filter(word => {
      return word.addedDate === today && word.memoryStatus === 'new';
    });
  }

  /**
   * 按紧急程度排序单词
   * 排序规则：逾期单词 > 今日到期单词 > 新单词
   * @param words 待排序的单词列表
   * @returns 排序后的单词列表
   * 
   * Requirements: 3.2
   */
  sortByUrgency(words: WordEntry[]): WordEntry[] {
    const now = Date.now();
    const todayStart = getStartOfDay(now);
    const todayEnd = getEndOfDay(now);
    
    return [...words].sort((a, b) => {
      // 计算优先级分数
      const getPriority = (word: WordEntry): number => {
        // 逾期单词（nextReviewAt < 今日开始）优先级最高
        if (word.nextReviewAt < todayStart) {
          return 0;
        }
        // 今日到期单词（nextReviewAt 在今日范围内）优先级次之
        if (word.nextReviewAt <= todayEnd) {
          return 1;
        }
        // 新单词优先级最低
        return 2;
      };
      
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 同优先级内，按nextReviewAt升序（更早的在前）
      return a.nextReviewAt - b.nextReviewAt;
    });
  }

  /**
   * 为新单词计算初始复习时间
   * 当天添加的单词当天就可以背诵（首次学习）
   * @param addedDate 添加日期 (YYYY-MM-DD)
   * @returns 首次复习时间戳
   * 
   * Requirements: 2.1
   */
  calculateInitialReview(addedDate: string): number {
    const addedTimestamp = parseDateString(addedDate);
    // 当天添加的单词，首次复习时间设为当天开始，这样当天就能背诵
    return getStartOfDay(addedTimestamp);
  }
}

// 导出单例实例
export const schedulerService = new SchedulerService();
