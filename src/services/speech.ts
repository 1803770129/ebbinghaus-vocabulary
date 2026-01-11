/**
 * 发音服务 - 使用Web Speech API实现单词发音
 * Requirements: 7.1, 7.3, 7.4
 */

import type { VoiceType } from '../types';

/**
 * SpeechService - 发音服务
 * 使用Web Speech API播放单词发音，支持英式/美式发音切换
 */
export class SpeechService {
  private synthesis: SpeechSynthesis | null = null;

  constructor() {
    // 检查浏览器是否支持Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * 检查浏览器是否支持Web Speech API
   * Requirements: 7.3
   * @returns 是否支持发音功能
   */
  isSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * 播放单词发音
   * Requirements: 7.1, 7.4
   * @param word 要发音的单词
   * @param voiceType 发音类型（英式/美式）
   */
  speak(word: string, voiceType: VoiceType = 'en-US'): void {
    if (!this.isSupported() || !this.synthesis) {
      return;
    }

    // 停止当前正在播放的发音
    this.stop();

    // 创建新的发音实例
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = voiceType;
    utterance.rate = 0.9; // 稍慢一点，便于学习
    utterance.pitch = 1;
    utterance.volume = 1;

    // 尝试获取对应语言的声音
    const voices = this.synthesis.getVoices();
    const targetVoice = voices.find(voice => voice.lang.startsWith(voiceType));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    // 播放发音（静默失败，不显示错误）
    try {
      this.synthesis.speak(utterance);
    } catch {
      // 发音失败时静默处理
    }
  }

  /**
   * 停止当前播放
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * 获取可用的声音列表
   * @returns 可用声音列表
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }
    return this.synthesis.getVoices();
  }

  /**
   * 获取指定语言的可用声音
   * @param voiceType 发音类型
   * @returns 匹配的声音列表
   */
  getVoicesForType(voiceType: VoiceType): SpeechSynthesisVoice[] {
    return this.getVoices().filter(voice => voice.lang.startsWith(voiceType));
  }
}

// 导出单例实例
export const speechService = new SpeechService();
