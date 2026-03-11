import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { StatusTagType } from '../../viewmodels/uiMigration';

interface StatusTagProps {
  type: StatusTagType;
  detail?: string;
}

const CONFIG: Record<StatusTagType, { emoji: string; label: string; bg: string; text: string }> = {
  'in-plan': { emoji: '🗓️', label: '已加入计划', bg: Colors.secondary[50], text: Colors.secondary[700] },
  'on-shopping-list': { emoji: '🛒', label: '已进购物清单', bg: Colors.functional.warningLight, text: Colors.functional.warning },
  'needs-adaptation': { emoji: '⚠️', label: '需要改造', bg: Colors.functional.warningLight, text: Colors.functional.warning },
  'previously-rejected': { emoji: '⛔', label: '之前被拒绝', bg: Colors.functional.errorLight, text: Colors.functional.error },
  'retry-suggested': { emoji: '🔁', label: '建议再试', bg: Colors.functional.warningLight, text: Colors.functional.warning },
  'low-confidence': { emoji: '🕒', label: '数据还不够', bg: Colors.neutral.gray100, text: Colors.text.secondary },
  'pantry-covered': { emoji: '✅', label: '家里食材够用', bg: Colors.secondary[50], text: Colors.secondary[700] },
  'few-missing': { emoji: '🧺', label: '还差少量食材', bg: Colors.functional.warningLight, text: Colors.functional.warning },
  'updated-by-other': { emoji: '👨‍👩‍👧', label: '家人刚更新', bg: Colors.functional.infoLight, text: Colors.functional.info },
};

export const StatusTag: React.FC<StatusTagProps> = ({ type, detail }) => {
  const config = CONFIG[type];
  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}> 
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.text, { color: config.text }]}>{detail || config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    gap: Spacing[1],
  },
  emoji: {
    fontSize: Typography.fontSize['2xs'],
  },
  text: {
    fontSize: Typography.fontSize['2xs'],
    fontWeight: Typography.fontWeight.medium,
  },
});
