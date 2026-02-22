// @ts-nocheck
/**
 * Emoji 到 图标/文字 的映射组件
 * 用于逐步替换项目中的emoji为矢量图标或纯文字
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../../styles/theme';

// 图标映射表
const ICON_MAP: Record<string, { text: string; color?: string }> = {
  // 页面标题类
  '🍽️': { text: '' }, // 食物相关，直接使用文字
  '👶': { text: '宝宝' },
  '👤': { text: '我的' },
  
  // 时间类
  '⏱': { text: '' }, // 时间，使用纯数字
  
  // 功能类
  '📝': { text: '食材' },
  '🧂': { text: '调料' },
  '👨‍🍳': { text: '步骤' },
  '💡': { text: '提示' },
  '⚠️': { text: '注意' },
  '✅': { text: '完成' },
  '☑️': { text: '[√]' },
  '☐': { text: '[ ]' },
  '➕': { text: '+' },
  '✕': { text: '×' },
  '🔄': { text: '刷新' },
  '🎲': { text: '随机' },
  '📋': { text: '清单' },
  
  // 时间段
  '🌞': { text: '早' },
  '🌤': { text: '午' },
  '🌙': { text: '晚' },
  
  // 设置类
  '🔔': { text: '通知' },
  '🌙': { text: '夜间' },
  '⚙️': { text: '设置' },
  '❤️': { text: '收藏' },
  '⭐': { text: '星级' },
  '🔍': { text: '搜索' },
  '🗑️': { text: '删除' },
  '✏️': { text: '编辑' },
  '↩️': { text: '返回' },
  '🍳': { text: '烹饪' },
  
  // 空状态
  '🛒': { text: '购物车' },
  '📅': { text: '日历' },
  
  // 区域标签
  '🏪': { text: '' }, // 超市，使用文字
  '🥬': { text: '' }, // 蔬菜，使用文字
  '📦': { text: '' }, // 包裹，使用文字
};

interface EmojiToTextProps {
  emoji: string;
  style?: any;
  fallback?: string;
}

/**
 * 将emoji转换为文字
 * 用于逐步迁移emoji到文字标签
 */
export function EmojiToText({ emoji, style, fallback }: EmojiToTextProps) {
  const mapping = ICON_MAP[emoji];
  const text = mapping?.text || fallback || emoji;
  
  return (
    <Text style={[styles.text, style]}>
      {text}
    </Text>
  );
}

/**
 * 获取emoji对应的文字（用于Text组件外部）
 */
export function getEmojiText(emoji: string, fallback?: string): string {
  return ICON_MAP[emoji]?.text || fallback || emoji;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: Colors.text.primary,
  },
});

// 导出映射表供其他组件使用
export { ICON_MAP };
