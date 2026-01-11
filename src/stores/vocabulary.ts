/**
 * 词库状态管理
 * Requirements: 5.1, 5.2, 5.3
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WordEntry, MemoryStatus, WordProgress } from '../types';
import { wordLoaderService } from '../services/wordLoader';

/**
 * 筛选状态类型
 */
export type FilterStatus = 'all' | MemoryStatus;

/**
 * 词库Store
 * 管理单词列表（只读）、搜索和筛选功能
 */
export const useVocabularyStore = defineStore('vocabulary', () => {
  // ============ State ============
  
  /** 所有单词列表 */
  const words = ref<WordEntry[]>([]);
  
  /** 搜索关键词 */
  const searchKeyword = ref('');
  
  /** 筛选状态 */
  const filterStatus = ref<FilterStatus>('all');
  
  /** 加载状态 */
  const isLoading = ref(false);
  
  /** 错误信息 */
  const error = ref<string | null>(null);

  // ============ Getters ============
  
  /**
   * 按日期分组的单词
   * Requirements: 5.1
   */
  const wordsByDate = computed(() => {
    const grouped = new Map<string, WordEntry[]>();
    
    for (const word of words.value) {
      const dateWords = grouped.get(word.addedDate) || [];
      dateWords.push(word);
      grouped.set(word.addedDate, dateWords);
    }
    
    // 转换为数组并按日期降序排序
    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, wordList]) => ({ date, words: wordList }));
  });

  /**
   * 搜索单词
   * 根据单词或释义进行模糊匹配（不区分大小写）
   * Requirements: 5.2
   * 
   * @param wordList 单词列表
   * @param keyword 搜索关键词
   * @returns 匹配的单词列表
   */
  function searchWords(wordList: WordEntry[], keyword: string): WordEntry[] {
    if (!keyword.trim()) {
      return wordList;
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return wordList.filter(word => 
      word.word.toLowerCase().includes(lowerKeyword) ||
      word.meaning.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 按状态筛选单词
   * Requirements: 5.3
   * 
   * @param wordList 单词列表
   * @param status 筛选状态
   * @returns 筛选后的单词列表
   */
  function filterByStatus(wordList: WordEntry[], status: FilterStatus): WordEntry[] {
    if (status === 'all') {
      return wordList;
    }
    
    return wordList.filter(word => word.memoryStatus === status);
  }

  /**
   * 筛选后的单词列表
   * 应用搜索和状态筛选
   */
  const filteredWords = computed(() => {
    let result = words.value;
    
    // 应用状态筛选
    result = filterByStatus(result, filterStatus.value);
    
    // 应用搜索
    result = searchWords(result, searchKeyword.value);
    
    return result;
  });

  /**
   * 筛选后按日期分组的单词
   */
  const filteredWordsByDate = computed(() => {
    const grouped = new Map<string, WordEntry[]>();
    
    for (const word of filteredWords.value) {
      const dateWords = grouped.get(word.addedDate) || [];
      dateWords.push(word);
      grouped.set(word.addedDate, dateWords);
    }
    
    // 转换为数组并按日期降序排序
    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, wordList]) => ({ date, words: wordList }));
  });

  /**
   * 总单词数
   */
  const totalCount = computed(() => words.value.length);

  /**
   * 筛选后的单词数
   */
  const filteredCount = computed(() => filteredWords.value.length);

  // ============ Actions ============

  /**
   * 加载所有单词
   * @param progress 进度数据（可选）
   */
  async function loadWords(progress: WordProgress[] = []): Promise<void> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const loadedWords = await wordLoaderService.loadAllWordsWithProgress(progress);
      words.value = loadedWords;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载单词失败';
      console.error('加载单词失败:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 设置搜索关键词
   * @param keyword 搜索关键词
   */
  function setSearchKeyword(keyword: string): void {
    searchKeyword.value = keyword;
  }

  /**
   * 设置筛选状态
   * @param status 筛选状态
   */
  function setFilterStatus(status: FilterStatus): void {
    filterStatus.value = status;
  }

  /**
   * 清除搜索和筛选
   */
  function clearFilters(): void {
    searchKeyword.value = '';
    filterStatus.value = 'all';
  }

  /**
   * 更新单词进度（用于外部同步）
   * @param updatedWord 更新后的单词
   */
  function updateWord(updatedWord: WordEntry): void {
    const index = words.value.findIndex(w => w.id === updatedWord.id);
    if (index !== -1) {
      words.value[index] = updatedWord;
    }
  }

  /**
   * 批量更新单词进度
   * @param progressList 进度列表
   */
  function updateWordsFromProgress(progressList: WordProgress[]): void {
    const progressMap = new Map<string, WordProgress>();
    for (const p of progressList) {
      progressMap.set(p.id, p);
    }

    words.value = words.value.map(word => {
      const progress = progressMap.get(word.id);
      if (progress) {
        return {
          ...word,
          reviewStage: progress.reviewStage,
          nextReviewAt: progress.nextReviewAt,
          memoryStatus: progress.memoryStatus,
          lastReviewedAt: progress.lastReviewedAt,
        };
      }
      return word;
    });
  }

  /**
   * 根据ID获取单词
   * @param id 单词ID
   */
  function getWordById(id: string): WordEntry | undefined {
    return words.value.find(w => w.id === id);
  }

  return {
    // State
    words,
    searchKeyword,
    filterStatus,
    isLoading,
    error,
    
    // Getters
    wordsByDate,
    filteredWords,
    filteredWordsByDate,
    totalCount,
    filteredCount,
    
    // Actions
    loadWords,
    setSearchKeyword,
    setFilterStatus,
    clearFilters,
    updateWord,
    updateWordsFromProgress,
    getWordById,
    
    // Utility functions (exported for testing)
    searchWords,
    filterByStatus,
  };
});
