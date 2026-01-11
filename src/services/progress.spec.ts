/**
 * ProgressService 单元测试
 * 验证进度存储服务功能正确性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from './progress';
import type { ProgressData, WordProgress } from '../types';

describe('ProgressService', () => {
  let service: ProgressService;
  const testStorageKey = 'test-ebbinghaus-progress';

  beforeEach(() => {
    // 清理测试存储
    localStorage.removeItem(testStorageKey);
    service = new ProgressService(testStorageKey);
  });

  afterEach(() => {
    localStorage.removeItem(testStorageKey);
  });

  describe('load', () => {
    it('should return null when no data exists', () => {
      const result = service.load();
      expect(result).toBeNull();
    });

    it('should load valid data correctly', () => {
      const testData: ProgressData = {
        version: 1,
        progress: [],
        stats: {
          streakDays: 5,
          lastStudyDate: '2026-01-10',
          dailyReviews: {},
        },
        settings: {
          voiceType: 'en-US',
        },
      };
      localStorage.setItem(testStorageKey, JSON.stringify(testData));

      const result = service.load();
      expect(result).toEqual(testData);
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem(testStorageKey, 'invalid json');
      const result = service.load();
      expect(result).toBeNull();
    });

    it('should return null for invalid data structure', () => {
      localStorage.setItem(testStorageKey, JSON.stringify({ invalid: 'data' }));
      const result = service.load();
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save data correctly', () => {
      const testData: ProgressData = {
        version: 1,
        progress: [],
        stats: {
          streakDays: 3,
          lastStudyDate: '2026-01-11',
          dailyReviews: {},
        },
        settings: {
          voiceType: 'en-GB',
        },
      };

      const result = service.save(testData);
      expect(result).toBe(true);

      const stored = localStorage.getItem(testStorageKey);
      expect(stored).toBe(JSON.stringify(testData));
    });
  });

  describe('updateWordProgress', () => {
    it('should add new word progress', () => {
      const progress: WordProgress = {
        id: '2026-01-11_test',
        reviewStage: 1,
        nextReviewAt: Date.now() + 86400000,
        memoryStatus: 'learning',
      };

      const result = service.updateWordProgress(progress.id, progress);
      expect(result).toBe(true);

      const data = service.load();
      expect(data?.progress).toHaveLength(1);
      expect(data?.progress[0].id).toBe(progress.id);
    });

    it('should update existing word progress', () => {
      // 先添加一个进度
      const initialProgress: WordProgress = {
        id: '2026-01-11_test',
        reviewStage: 1,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };
      service.updateWordProgress(initialProgress.id, initialProgress);

      // 更新进度
      const updatedProgress: Partial<WordProgress> = {
        reviewStage: 2,
        memoryStatus: 'learning',
      };
      service.updateWordProgress(initialProgress.id, updatedProgress);

      const data = service.load();
      expect(data?.progress).toHaveLength(1);
      expect(data?.progress[0].reviewStage).toBe(2);
    });
  });

  describe('reset', () => {
    it('should remove all data', () => {
      const testData: ProgressData = {
        version: 1,
        progress: [],
        stats: {
          streakDays: 5,
          lastStudyDate: '2026-01-10',
          dailyReviews: {},
        },
        settings: {
          voiceType: 'en-US',
        },
      };
      service.save(testData);

      const result = service.reset();
      expect(result).toBe(true);
      expect(service.load()).toBeNull();
    });
  });

  describe('getWordProgress', () => {
    it('should return undefined when word not found', () => {
      const result = service.getWordProgress('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return word progress when found', () => {
      const progress: WordProgress = {
        id: '2026-01-11_test',
        reviewStage: 2,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };
      service.updateWordProgress(progress.id, progress);

      const result = service.getWordProgress(progress.id);
      expect(result?.id).toBe(progress.id);
      expect(result?.reviewStage).toBe(2);
    });
  });

  describe('getAllProgress', () => {
    it('should return empty array when no data', () => {
      const result = service.getAllProgress();
      expect(result).toEqual([]);
    });

    it('should return all progress entries', () => {
      const progress1: WordProgress = {
        id: '2026-01-11_word1',
        reviewStage: 1,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };
      const progress2: WordProgress = {
        id: '2026-01-11_word2',
        reviewStage: 2,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };
      service.updateWordProgress(progress1.id, progress1);
      service.updateWordProgress(progress2.id, progress2);

      const result = service.getAllProgress();
      expect(result).toHaveLength(2);
    });
  });

  describe('getSettings', () => {
    it('should return default settings when no data', () => {
      const result = service.getSettings();
      expect(result.voiceType).toBe('en-US');
    });
  });

  describe('updateSettings', () => {
    it('should update settings correctly', () => {
      service.updateSettings({ voiceType: 'en-GB' });
      const result = service.getSettings();
      expect(result.voiceType).toBe('en-GB');
    });
  });

  describe('WordProgress round-trip serialization', () => {
    it('should serialize and deserialize WordProgress correctly', () => {
      const original: WordProgress = {
        id: '2026-01-11_ephemeral',
        reviewStage: 3,
        nextReviewAt: 1736640000000,
        memoryStatus: 'learning',
        lastReviewedAt: 1736553600000,
      };

      // Serialize
      const json = JSON.stringify(original);
      
      // Deserialize
      const parsed = JSON.parse(json) as WordProgress;

      expect(parsed).toEqual(original);
      expect(parsed.id).toBe(original.id);
      expect(parsed.reviewStage).toBe(original.reviewStage);
      expect(parsed.nextReviewAt).toBe(original.nextReviewAt);
      expect(parsed.memoryStatus).toBe(original.memoryStatus);
      expect(parsed.lastReviewedAt).toBe(original.lastReviewedAt);
    });
  });
});
