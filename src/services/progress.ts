/**
 * 进度存储服务
 * Requirements: 8.1, 8.2, 8.3
 */

import type { ProgressData, WordProgress, AppSettings } from '../types';

/**
 * localStorage存储键名
 */
const STORAGE_KEY = 'ebbinghaus-progress';

/**
 * 当前数据版本号
 */
const CURRENT_VERSION = 1;

/**
 * 默认应用设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  voiceType: 'en-US',
};

/**
 * 创建默认的进度数据
 */
function createDefaultProgressData(): ProgressData {
  return {
    version: CURRENT_VERSION,
    progress: [],
    stats: {
      streakDays: 0,
      lastStudyDate: '',
      dailyReviews: {},
    },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * 验证ProgressData结构是否有效
 */
function isValidProgressData(data: unknown): data is ProgressData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 检查必需字段
  if (typeof obj.version !== 'number') {
    return false;
  }

  if (!Array.isArray(obj.progress)) {
    return false;
  }

  if (!obj.stats || typeof obj.stats !== 'object') {
    return false;
  }

  const stats = obj.stats as Record<string, unknown>;
  if (typeof stats.streakDays !== 'number') {
    return false;
  }
  if (typeof stats.lastStudyDate !== 'string') {
    return false;
  }
  if (!stats.dailyReviews || typeof stats.dailyReviews !== 'object') {
    return false;
  }

  if (!obj.settings || typeof obj.settings !== 'object') {
    return false;
  }

  return true;
}

/**
 * 进度存储服务类
 */
export class ProgressService {
  private readonly storageKey: string;

  constructor(storageKey: string = STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  /**
   * 检查localStorage是否可用
   */
  private isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 加载进度数据
   * @returns 进度数据，如果不存在或解析失败则返回null
   * 
   * Requirements: 8.2
   */
  load(): ProgressData | null {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，进度数据无法持久化');
      return null;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const data = JSON.parse(raw);

      if (!isValidProgressData(data)) {
        console.warn('进度数据格式无效');
        return null;
      }

      return data;
    } catch (error) {
      console.error('加载进度数据失败:', error);
      return null;
    }
  }

  /**
   * 保存进度数据
   * @param data 要保存的进度数据
   * @returns 是否保存成功
   * 
   * Requirements: 8.1
   */
  save(data: ProgressData): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，进度数据无法持久化');
      return false;
    }

    try {
      const json = JSON.stringify(data);
      localStorage.setItem(this.storageKey, json);
      return true;
    } catch (error) {
      // 可能是存储空间不足
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('存储空间不足，无法保存进度数据');
      } else {
        console.error('保存进度数据失败:', error);
      }
      return false;
    }
  }

  /**
   * 更新单词进度
   * @param wordId 单词ID
   * @param progress 要更新的进度字段
   * @returns 是否更新成功
   * 
   * Requirements: 8.1
   */
  updateWordProgress(wordId: string, progress: Partial<WordProgress>): boolean {
    const data = this.load() ?? createDefaultProgressData();

    const existingIndex = data.progress.findIndex(p => p.id === wordId);

    if (existingIndex >= 0) {
      // 更新现有进度
      data.progress[existingIndex] = {
        ...data.progress[existingIndex],
        ...progress,
        id: wordId, // 确保ID不被覆盖
      };
    } else {
      // 添加新进度（需要完整的WordProgress）
      if (this.isCompleteWordProgress(progress)) {
        data.progress.push({
          ...progress,
          id: wordId,
        });
      } else {
        console.warn('无法添加不完整的单词进度');
        return false;
      }
    }

    // 更新今日复习计数
    const today = new Date().toISOString().split('T')[0];
    data.stats.dailyReviews[today] = (data.stats.dailyReviews[today] || 0) + 1;

    // 更新连续学习天数
    this.updateStreakDays(data, today);

    return this.save(data);
  }

  /**
   * 检查是否是完整的WordProgress
   */
  private isCompleteWordProgress(progress: Partial<WordProgress>): progress is WordProgress {
    return (
      typeof progress.id === 'string' &&
      typeof progress.reviewStage === 'number' &&
      typeof progress.nextReviewAt === 'number' &&
      typeof progress.memoryStatus === 'string'
    );
  }

  /**
   * 更新连续学习天数
   */
  private updateStreakDays(data: ProgressData, today: string): void {
    const lastStudyDate = data.stats.lastStudyDate;

    if (!lastStudyDate) {
      // 首次学习
      data.stats.streakDays = 1;
      data.stats.lastStudyDate = today;
      return;
    }

    if (lastStudyDate === today) {
      // 今天已经学习过，不更新
      return;
    }

    // 计算日期差
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      // 连续学习
      data.stats.streakDays += 1;
    } else {
      // 中断了，重新开始计数
      data.stats.streakDays = 1;
    }

    data.stats.lastStudyDate = today;
  }

  /**
   * 重置所有数据
   * @returns 是否重置成功
   * 
   * Requirements: 8.3
   */
  reset(): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用');
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('重置进度数据失败:', error);
      return false;
    }
  }

  /**
   * 获取单词进度
   * @param wordId 单词ID
   * @returns 单词进度，如果不存在则返回undefined
   */
  getWordProgress(wordId: string): WordProgress | undefined {
    const data = this.load();
    if (!data) {
      return undefined;
    }
    return data.progress.find(p => p.id === wordId);
  }

  /**
   * 获取所有单词进度
   * @returns 单词进度列表
   */
  getAllProgress(): WordProgress[] {
    const data = this.load();
    return data?.progress ?? [];
  }

  /**
   * 获取统计数据
   */
  getStats(): ProgressData['stats'] | null {
    const data = this.load();
    return data?.stats ?? null;
  }

  /**
   * 获取应用设置
   */
  getSettings(): AppSettings {
    const data = this.load();
    return data?.settings ?? { ...DEFAULT_SETTINGS };
  }

  /**
   * 更新应用设置
   * @param settings 要更新的设置
   * @returns 是否更新成功
   */
  updateSettings(settings: Partial<AppSettings>): boolean {
    const data = this.load() ?? createDefaultProgressData();
    data.settings = {
      ...data.settings,
      ...settings,
    };
    return this.save(data);
  }

  /**
   * 导出进度数据为JSON字符串
   * 用于跨设备同步
   * @returns JSON字符串，如果没有数据则返回null
   */
  exportData(): string | null {
    const data = this.load();
    if (!data) {
      return null;
    }
    
    // 添加导出时间戳
    const exportData = {
      ...data,
      exportedAt: Date.now(),
      exportVersion: CURRENT_VERSION,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从JSON字符串导入进度数据
   * @param jsonString JSON字符串
   * @returns 导入结果 { success: boolean, message: string }
   */
  importData(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      
      // 移除导出时的额外字段
      delete data.exportedAt;
      delete data.exportVersion;
      
      if (!isValidProgressData(data)) {
        return { success: false, message: '数据格式无效，请检查导入的内容' };
      }
      
      // 保存导入的数据
      const saved = this.save(data);
      
      if (saved) {
        return { success: true, message: `成功导入 ${data.progress.length} 个单词的学习记录` };
      } else {
        return { success: false, message: '保存数据失败，请检查存储空间' };
      }
    } catch (error) {
      return { success: false, message: '解析数据失败，请确保复制了完整的内容' };
    }
  }

  /**
   * 复制进度数据到剪贴板
   * @returns Promise<{ success: boolean, message: string }>
   */
  async copyToClipboard(): Promise<{ success: boolean; message: string }> {
    const data = this.exportData();
    
    if (!data) {
      return { success: false, message: '没有可导出的学习记录' };
    }
    
    try {
      await navigator.clipboard.writeText(data);
      return { success: true, message: '学习记录已复制到剪贴板' };
    } catch (error) {
      // 降级方案：创建临时textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return { success: true, message: '学习记录已复制到剪贴板' };
      } catch {
        return { success: false, message: '复制失败，请手动复制' };
      }
    }
  }

  /**
   * 从剪贴板读取并导入进度数据
   * @returns Promise<{ success: boolean, message: string }>
   */
  async importFromClipboard(): Promise<{ success: boolean; message: string }> {
    try {
      const text = await navigator.clipboard.readText();
      
      if (!text.trim()) {
        return { success: false, message: '剪贴板为空' };
      }
      
      return this.importData(text);
    } catch (error) {
      return { success: false, message: '无法读取剪贴板，请手动粘贴数据' };
    }
  }
}

// 导出单例实例
export const progressService = new ProgressService();
