import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

interface GenerateOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  babyAge: number | null;
  onBabyAgeChange: (age: number | null) => void;
  exclude: string;
  onExcludeChange: (exclude: string) => void;
  onGenerate: () => void;
  // 智能模式相关
  isSmartMode?: boolean;
  onSmartModeChange?: (enabled: boolean) => void;
  smartPrompt?: string;
  onSmartPromptChange?: (prompt: string) => void;
}

export function GenerateOptionsModal({
  visible,
  onClose,
  babyAge,
  onBabyAgeChange,
  exclude,
  onExcludeChange,
  onGenerate,
  isSmartMode = false,
  onSmartModeChange,
  smartPrompt = '',
  onSmartPromptChange,
}: GenerateOptionsModalProps) {
  const babyAgeOptions = [null, 6, 8, 10, 12, 18, 24];

  const handleGenerate = () => {
    if (isSmartMode && onSmartModeChange) {
      // 智能模式：需要输入内容才能生成
      if (!smartPrompt.trim()) {
        return;
      }
    }
    onGenerate();
  };

  const canGenerate = !isSmartMode || smartPrompt.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.genModalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.genModalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.genModalTitle}>生成周计划</Text>
          <Text style={styles.genModalHint}>若不手动选择，将优先使用你已保存的默认月龄与饮食偏好。</Text>

          {/* 模式选择 */}
          {onSmartModeChange && (
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeOption, isSmartMode && styles.modeOptionSelected]}
                onPress={() => onSmartModeChange(true)}
              >
                <Text style={[styles.modeOptionText, isSmartMode && styles.modeOptionTextSelected]}>
                  ✨ 智能模式
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeOption, !isSmartMode && styles.modeOptionSelected]}
                onPress={() => onSmartModeChange(false)}
              >
                <Text style={[styles.modeOptionText, !isSmartMode && styles.modeOptionTextSelected]}>
                  📋 标准模式
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isSmartMode ? (
            // 智能模式：显示自然语言输入
            <View style={styles.smartModeContainer}>
              <Text style={styles.smartModeTitle}>← 返回 智能生成</Text>
              <TextInput
                style={styles.smartPromptInput}
                placeholder="这周多做鱼类的菜，宝宝挑食不喜欢胡萝卜，做饭时间控制在30分钟以内"
                value={smartPrompt}
                onChangeText={onSmartPromptChange}
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.smartModeHint}>
                用自然语言描述您的需求，AI 将为您智能生成周计划
              </Text>
            </View>
          ) : (
            // 标准模式：显示原有选项
            <>
              {/* 宝宝月龄 */}
              <View style={styles.genOptionRow}>
                <Text style={styles.genOptionLabel}>宝宝月龄（可选）</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genAgeOptions}>
                  {babyAgeOptions.map((age) => (
                    <TouchableOpacity
                      key={String(age)}
                      style={[styles.genAgeOption, babyAge === age && styles.genAgeOptionSelected]}
                      onPress={() => onBabyAgeChange(age)}
                    >
                      <Text style={[styles.genAgeOptionText, babyAge === age && styles.genAgeOptionTextSelected]}>
                        {age === null ? '不限' : `${age}月`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 排除食材 */}
              <View style={styles.genOptionRow}>
                <Text style={styles.genOptionLabel}>排除食材（用逗号分隔）</Text>
                <TextInput
                  style={styles.genExcludeInput}
                  placeholder="例如: 虾, 花生, 牛奶"
                  value={exclude}
                  onChangeText={onExcludeChange}
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
            </>
          )}

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[styles.genStartButton, !canGenerate && styles.genStartButtonDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate}
          >
            <Text style={[styles.genStartButtonText, !canGenerate && styles.genStartButtonTextDisabled]}>
              {isSmartMode ? '生成计划' : '开始生成'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  genModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  genModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  genModalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  genModalHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  modeOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  modeOptionSelected: {
    backgroundColor: Colors.background.primary,
    ...Shadows.sm,
  },
  modeOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  modeOptionTextSelected: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  smartModeContainer: {
    marginBottom: Spacing.lg,
  },
  smartModeTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  smartPromptInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    minHeight: 100,
    backgroundColor: Colors.neutral.gray50,
  },
  smartModeHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  genOptionRow: {
    marginBottom: Spacing.lg,
  },
  genOptionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  genAgeOptions: {
    gap: Spacing.sm,
  },
  genAgeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  genAgeOptionSelected: {
    backgroundColor: Colors.secondary.light,
    borderColor: Colors.secondary.main,
  },
  genAgeOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  genAgeOptionTextSelected: {
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  genExcludeInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  genStartButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  genStartButtonDisabled: {
    backgroundColor: Colors.neutral.gray200,
  },
  genStartButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  genStartButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
});
