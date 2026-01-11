/**
 * SchedulerService 单元测试
 * 验证核心服务功能正确性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulerService, getStartOfDay, getEndOfDay, parseDateString } from './scheduler';
import type { WordEntry, ReviewStage } from '../types';
import { REVIEW_INTERVALS } from '../types';

describe('SchedulerService', () => {
  let scheduler: SchedulerService;

  beforeEach(() => {
    scheduler = new SchedulerService();
  });

  describe('calculateNextReview', () => {
    it('should calculate correct interval for each stage', () => {
      const baseTime = new Date('2026-01-11T10:00:00').getTime();
      const DAY_MS = 24 * 60 * 60 * 1000;

      for (let stage = 0; stage <= 6; stage++) {
        const nextReview = scheduler.calculateNextReview(stage as ReviewStage, baseTime);
        const expectedDays = REVIEW_INTERVALS[stage as ReviewStage];
        const startOfBase = getStartOfDay(baseTime);
        const expected = startOfBase + expectedDays * DAY_MS;
        expect(nextReview).toBe(expected);
      }
    });
  });

  describe('handleRemember', () => {
    it('should advance review stage when not at stage 6', () => {
      const word: WordEntry = {
        id: '2026-01-11_test',
        word: 'test',
        meaning: '测试',
        addedDate: '2026-01-11',
        reviewStage: 2,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };

      const result = scheduler.handleRemember(word);
      expect(result.reviewStage).toBe(3);
      expect(result.memoryStatus).toBe('learning');
    });

    it('should mark as mastered when at stage 6', () => {
      const word: WordEntry = {
        id: '2026-01-11_test',
        word: 'test',
        meaning: '测试',
        addedDate: '2026-01-11',
        reviewStage: 6,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };

      const result = scheduler.handleRemember(word);
      expect(result.reviewStage).toBe(6);
      expect(result.memoryStatus).toBe('mastered');
    });
  });

  describe('handleForget', () => {
    it('should reset to stage 1', () => {
      const word: WordEntry = {
        id: '2026-01-11_test',
        word: 'test',
        meaning: '测试',
        addedDate: '2026-01-11',
        reviewStage: 4,
        nextReviewAt: Date.now(),
        memoryStatus: 'learning',
      };

      const result = scheduler.handleForget(word);
      expect(result.reviewStage).toBe(1);
      expect(result.memoryStatus).toBe('learning');
    });
  });

  describe('getTodayReviewWords', () => {
    it('should return words due for review today', () => {
      const now = Date.now();
      const todayEnd = getEndOfDay(now);
      
      const words: WordEntry[] = [
        {
          id: '2026-01-10_due',
          word: 'due',
          meaning: '到期的',
          addedDate: '2026-01-10',
          reviewStage: 1,
          nextReviewAt: now - 1000, // 已过期
          memoryStatus: 'learning',
        },
        {
          id: '2026-01-11_today',
          word: 'today',
          meaning: '今天',
          addedDate: '2026-01-11',
          reviewStage: 1,
          nextReviewAt: todayEnd - 1000, // 今天到期
          memoryStatus: 'learning',
        },
        {
          id: '2026-01-11_future',
          word: 'future',
          meaning: '未来',
          addedDate: '2026-01-11',
          reviewStage: 1,
          nextReviewAt: todayEnd + 86400000, // 明天到期
          memoryStatus: 'learning',
        },
        {
          id: '2026-01-11_mastered',
          word: 'mastered',
          meaning: '已掌握',
          addedDate: '2026-01-11',
          reviewStage: 6,
          nextReviewAt: now - 1000,
          memoryStatus: 'mastered', // 已掌握，不应返回
        },
      ];

      const result = scheduler.getTodayReviewWords(words);
      expect(result).toHaveLength(2);
      expect(result.map(w => w.word)).toContain('due');
      expect(result.map(w => w.word)).toContain('today');
      expect(result.map(w => w.word)).not.toContain('future');
      expect(result.map(w => w.word)).not.toContain('mastered');
    });
  });

  describe('sortByUrgency', () => {
    it('should sort words by urgency: overdue > today > future', () => {
      const now = Date.now();
      const todayStart = getStartOfDay(now);
      const todayEnd = getEndOfDay(now);
      
      const words: WordEntry[] = [
        {
          id: '3',
          word: 'future',
          meaning: '未来',
          addedDate: '2026-01-11',
          reviewStage: 0,
          nextReviewAt: todayEnd + 86400000, // 明天
          memoryStatus: 'new',
        },
        {
          id: '1',
          word: 'overdue',
          meaning: '逾期',
          addedDate: '2026-01-09',
          reviewStage: 1,
          nextReviewAt: todayStart - 86400000, // 昨天
          memoryStatus: 'learning',
        },
        {
          id: '2',
          word: 'today',
          meaning: '今天',
          addedDate: '2026-01-10',
          reviewStage: 1,
          nextReviewAt: todayStart + 1000, // 今天
          memoryStatus: 'learning',
        },
      ];

      const sorted = scheduler.sortByUrgency(words);
      expect(sorted[0].word).toBe('overdue');
      expect(sorted[1].word).toBe('today');
      expect(sorted[2].word).toBe('future');
    });
  });

  describe('calculateInitialReview', () => {
    it('should return addedDate + 1 day', () => {
      const addedDate = '2026-01-11';
      const result = scheduler.calculateInitialReview(addedDate);
      const expected = parseDateString(addedDate) + 24 * 60 * 60 * 1000;
      expect(result).toBe(expected);
    });
  });
});

describe('Helper Functions', () => {
  describe('getStartOfDay', () => {
    it('should return start of day timestamp', () => {
      const timestamp = new Date('2026-01-11T15:30:45.123').getTime();
      const result = getStartOfDay(timestamp);
      const date = new Date(result);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day timestamp', () => {
      const timestamp = new Date('2026-01-11T15:30:45.123').getTime();
      const result = getEndOfDay(timestamp);
      const date = new Date(result);
      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
    });
  });

  describe('parseDateString', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const result = parseDateString('2026-01-11');
      const date = new Date(result);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(11);
    });
  });
});
