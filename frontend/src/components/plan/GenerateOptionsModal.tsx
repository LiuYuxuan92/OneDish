import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

interface GenerateOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  babyAge: number | null;
  onBabyAgeChange: (age: number | null) => void;
  exclude: string;
  onExcludeChange: (exclude: string) => void;
  onGenerate: () => void;
}

export function GenerateOptionsModal({
  visible,
  onClose,
  babyAge,
  onBabyAgeChange,
  exclude,
  onExcludeChange,
  onGenerate,
}: GenerateOptionsModalProps) {
  const babyAgeOptions = [null, 6, 8, 10, 12, 18, 24];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.genModalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.genModalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.genModalTitle}>智能生成选项</Text>

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

          {/* 生成按钮 */}
          <TouchableOpacity
            style={styles.genStartButton}
            onPress={() => {
              onClose();
              onGenerate();
            }}
          >
            <Text style={styles.genStartButtonText}>开始生成</Text>
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
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
  genStartButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
