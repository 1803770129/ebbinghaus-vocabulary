/**
 * 单词加载服务
 * Requirements: 1.1, 1.2, 1.4
 */

import type { RawWord, WordEntry, WordProgress, WordFile } from '../types';
import { schedulerService } from './scheduler';

/**
 * 验证日期格式是否为 YYYY-MM-DD
 */
function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }
  // 验证日期是否有效
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * 验证原始单词格式是否正确
 */
function isValidRawWord(word: unknown): word is RawWord {
  if (!word || typeof word !== 'object') {
    return false;
  }
  const obj = word as Record<string, unknown>;
  return (
    typeof obj.word === 'string' &&
    obj.word.trim().length > 0 &&
    typeof obj.meaning === 'string' &&
    obj.meaning.trim().length > 0 &&
    (obj.example === undefined || typeof obj.example === 'string')
  );
}

/**
 * 生成单词ID
 * @param date 添加日期 (YYYY-MM-DD)
 * @param word 单词
 */
export function generateWordId(date: string, word: string): string {
  return `${date}_${word}`;
}

/**
 * 单词加载服务类
 */
export class WordLoaderService {
  /**
   * 使用 import.meta.glob 加载所有单词文件
   * Requirements: 1.1, 1.2
   */
  async loadAllWords(): Promise<WordEntry[]> {
    // 使用 import.meta.glob 动态导入所有 JSON 文件
    const wordModules = import.meta.glob<RawWord[]>(
      '../data/words/*.json',
      { eager: true, import: 'default' }
    );

    const allWords: WordEntry[] = [];

    for (const [path, rawWords] of Object.entries(wordModules)) {
      // 从路径中提取日期 (例如: ../data/words/2026-01-11.json -> 2026-01-11)
      const fileName = path.split('/').pop()?.replace('.json', '') ?? '';

      // 验证文件名格式
      if (!isValidDateFormat(fileName)) {
        console.warn(`跳过无效文件名格式: ${path}`);
        continue;
      }

      // 验证文件内容是否为数组
      if (!Array.isArray(rawWords)) {
        console.warn(`跳过无效文件格式 (非数组): ${path}`);
        continue;
      }

      // 处理每个单词
      for (const rawWord of rawWords) {
        // 验证单词格式
        if (!isValidRawWord(rawWord)) {
          console.warn(`跳过无效单词格式: ${path}`, rawWord);
          continue;
        }

        const wordEntry = this.createWordEntry(rawWord, fileName);
        allWords.push(wordEntry);
      }
    }

    return allWords;
  }

  /**
   * 按日期获取单词
   * @param date 日期 (YYYY-MM-DD)
   */
  async getWordsByDate(date: string): Promise<WordEntry[]> {
    const allWords = await this.loadAllWords();
    return allWords.filter(word => word.addedDate === date);
  }

  /**
   * 获取所有单词文件信息
   */
  getAllWordFiles(): WordFile[] {
    const wordModules = import.meta.glob<RawWord[]>(
      '../data/words/*.json',
      { eager: true, import: 'default' }
    );

    const wordFiles: WordFile[] = [];

    for (const [path, rawWords] of Object.entries(wordModules)) {
      const fileName = path.split('/').pop()?.replace('.json', '') ?? '';

      if (!isValidDateFormat(fileName)) {
        continue;
      }

      if (!Array.isArray(rawWords)) {
        continue;
      }

      const validWords = rawWords.filter(isValidRawWord);
      wordFiles.push({
        date: fileName,
        words: validWords,
      });
    }

    // 按日期排序（最新的在前）
    return wordFiles.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * 合并单词数据和进度数据
   * @param words 原始单词列表（带日期）
   * @param progress 进度数据列表
   * @returns 合并后的单词条目列表
   * 
   * Requirements: 1.2
   */
  mergeWithProgress(
    words: Array<{ raw: RawWord; date: string }>,
    progress: WordProgress[]
  ): WordEntry[] {
    // 创建进度映射表
    const progressMap = new Map<string, WordProgress>();
    for (const p of progress) {
      progressMap.set(p.id, p);
    }

    return words.map(({ raw, date }) => {
      const id = generateWordId(date, raw.word);
      const existingProgress = progressMap.get(id);

      if (existingProgress) {
        // 使用已有进度
        return {
          id,
          word: raw.word,
          meaning: raw.meaning,
          example: raw.example,
          addedDate: date,
          reviewStage: existingProgress.reviewStage,
          nextReviewAt: existingProgress.nextReviewAt,
          memoryStatus: existingProgress.memoryStatus,
          lastReviewedAt: existingProgress.lastReviewedAt,
        };
      }

      // 创建新单词条目
      return this.createWordEntry(raw, date);
    });
  }

  /**
   * 创建新的单词条目（无进度记录）
   * @param rawWord 原始单词
   * @param addedDate 添加日期
   */
  private createWordEntry(rawWord: RawWord, addedDate: string): WordEntry {
    const id = generateWordId(addedDate, rawWord.word);
    const nextReviewAt = schedulerService.calculateInitialReview(addedDate);

    return {
      id,
      word: rawWord.word,
      meaning: rawWord.meaning,
      example: rawWord.example,
      addedDate,
      reviewStage: 0,
      nextReviewAt,
      memoryStatus: 'new',
    };
  }

  /**
   * 加载所有单词并与进度合并
   * @param progress 进度数据列表
   * @returns 合并后的单词条目列表
   */
  async loadAllWordsWithProgress(progress: WordProgress[]): Promise<WordEntry[]> {
    const wordModules = import.meta.glob<RawWord[]>(
      '../data/words/*.json',
      { eager: true, import: 'default' }
    );

    const wordsWithDate: Array<{ raw: RawWord; date: string }> = [];

    for (const [path, rawWords] of Object.entries(wordModules)) {
      const fileName = path.split('/').pop()?.replace('.json', '') ?? '';

      if (!isValidDateFormat(fileName)) {
        console.warn(`跳过无效文件名格式: ${path}`);
        continue;
      }

      if (!Array.isArray(rawWords)) {
        console.warn(`跳过无效文件格式 (非数组): ${path}`);
        continue;
      }

      for (const rawWord of rawWords) {
        if (!isValidRawWord(rawWord)) {
          console.warn(`跳过无效单词格式: ${path}`, rawWord);
          continue;
        }
        wordsWithDate.push({ raw: rawWord, date: fileName });
      }
    }

    return this.mergeWithProgress(wordsWithDate, progress);
  }
}

// 导出单例实例
export const wordLoaderService = new WordLoaderService();
