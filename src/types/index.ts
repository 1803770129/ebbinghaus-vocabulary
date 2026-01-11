/**
 * 艾宾浩斯背单词H5 - 数据类型定义
 * Requirements: 1.3
 */

/**
 * 复习阶段类型
 * 0: 新单词（未复习）
 * 1-6: 对应艾宾浩斯复习阶段
 */
export type ReviewStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 记忆状态类型
 * new: 新添加，未开始学习
 * learning: 学习中
 * mastered: 已掌握（完成所有复习阶段）
 */
export type MemoryStatus = 'new' | 'learning' | 'mastered';

/**
 * 发音类型
 * en-US: 美式英语
 * en-GB: 英式英语
 */
export type VoiceType = 'en-US' | 'en-GB';

/**
 * 原始单词 - 文件中的格式
 * 存储在 src/data/words/YYYY-MM-DD.json 文件中
 */
export interface RawWord {
  /** 单词 */
  word: string;
  /** 释义 */
  meaning: string;
  /** 例句（可选） */
  example?: string;
}

/**
 * 运行时单词条目
 * 合并了原始单词数据和复习进度
 */
export interface WordEntry {
  /** 唯一标识 (date_word) */
  id: string;
  /** 单词 */
  word: string;
  /** 释义 */
  meaning: string;
  /** 例句（可选） */
  example?: string;
  /** 添加日期 (YYYY-MM-DD，来自文件名) */
  addedDate: string;
  /** 复习阶段 (0-6) */
  reviewStage: ReviewStage;
  /** 下次复习时间戳 */
  nextReviewAt: number;
  /** 记忆状态 */
  memoryStatus: MemoryStatus;
  /** 上次复习时间戳 */
  lastReviewedAt?: number;
}

/**
 * 单词复习进度 - 存储在localStorage
 */
export interface WordProgress {
  /** 单词ID (date_word) */
  id: string;
  /** 复习阶段 */
  reviewStage: ReviewStage;
  /** 下次复习时间戳 */
  nextReviewAt: number;
  /** 记忆状态 */
  memoryStatus: MemoryStatus;
  /** 上次复习时间戳 */
  lastReviewedAt?: number;
}

/**
 * 复习间隔配置（天数）
 * 阶段0→1天，阶段1→1天，阶段2→2天，阶段3→4天，
 * 阶段4→7天，阶段5→15天，阶段6→30天
 */
export const REVIEW_INTERVALS: Record<ReviewStage, number> = {
  0: 1,   // 新单词：1天后首次复习
  1: 1,   // 第1次复习后：1天
  2: 2,   // 第2次复习后：2天
  3: 4,   // 第3次复习后：4天
  4: 7,   // 第4次复习后：7天
  5: 15,  // 第5次复习后：15天
  6: 30,  // 第6次复习后：30天（完成后标记为已掌握）
};

/**
 * 每日学习数据
 */
export interface DailyStudy {
  /** 日期 (YYYY-MM-DD) */
  date: string;
  /** 复习单词数 */
  reviewedCount: number;
}

/**
 * 学习统计
 */
export interface StudyStats {
  /** 总单词数 */
  totalWords: number;
  /** 已掌握数 */
  masteredWords: number;
  /** 学习中数 */
  learningWords: number;
  /** 新单词数 */
  newWords: number;
  /** 连续学习天数 */
  streakDays: number;
  /** 上次学习日期 (YYYY-MM-DD) */
  lastStudyDate: string;
  /** 本周每日数据 */
  weeklyData: DailyStudy[];
}

/**
 * 应用设置
 */
export interface AppSettings {
  /** 发音类型 */
  voiceType: VoiceType;
}

/**
 * localStorage存储结构
 */
export interface ProgressData {
  /** 数据版本号 */
  version: number;
  /** 单词进度列表 */
  progress: WordProgress[];
  /** 统计数据 */
  stats: {
    /** 连续学习天数 */
    streakDays: number;
    /** 上次学习日期 */
    lastStudyDate: string;
    /** 每日复习数量 date -> count */
    dailyReviews: Record<string, number>;
  };
  /** 应用设置 */
  settings: AppSettings;
}

/**
 * 单词文件结构
 */
export interface WordFile {
  /** 日期 (YYYY-MM-DD) */
  date: string;
  /** 单词列表 */
  words: RawWord[];
}
