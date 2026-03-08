import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { MEAL_LABELS } from '../../hooks/useWeeklyPlanState';
import { buildProductizedReasonText } from '../../utils/preferenceCopy';

interface SmartRecommendation {
  name: string;
  time_estimate: number;
  missing_ingredients?: string[];
  baby_suitable: boolean;
  switch_hint: string;
  explain?: string[];
  ranking_reasons?: Array<{ code?: string; label?: string; detail?: string; contribution?: number }>;
  vs_last?: string;
}

interface SmartRecommendationsData {
  recommendations: {
    [key: string]: {
      A?: SmartRecommendation;
      B?: SmartRecommendation;
    };
  };
}

interface SmartRecommendationModalProps {
  visible: boolean;
  onClose: () => void;
  data?: SmartRecommendationsData;
  mealType: 'all-day' | 'breakfast' | 'lunch' | 'dinner';
  onMealTypeChange: (type: 'all-day' | 'breakfast' | 'lunch' | 'dinner') => void;
  isPending: boolean;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onSubmitFeedback: (option: 'A' | 'B' | 'NONE') => void;
}

export function SmartRecommendationModal({
  visible,
  onClose,
  data,
  mealType,
  onMealTypeChange,
  isPending,
  rejectReason,
  onRejectReasonChange,
  onSubmitFeedback,
}: SmartRecommendationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.genModalOverlay}>
        <View style={styles.genModalContent}>
          <Text style={styles.genModalTitle}>三餐智能推荐 V1（A/B）</Text>
          
          {isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
              <Text style={styles.loadingText}>推荐中...</Text>
            </View>
          ) : (
            <ScrollView style={styles.smartRecScroll}>
              {Object.entries(data?.recommendations || {}).map(([mt, pair]) => (
                <View key={mt} style={styles.smartRecSection}>
                  <Text style={styles.sectionTitle}>{MEAL_LABELS[mt]?.label || mt}</Text>
                  {['A', 'B'].map((k) => {
                    const item = pair?.[k as 'A' | 'B'];
                    if (!item) {
                      return <Text key={k} style={styles.genOptionLabel}>方案{k}：暂无可推荐</Text>;
                    }
                    const polishedReasons = buildProductizedReasonText({
                      backendExplain: item.explain,
                      backendReasons: item.ranking_reasons,
                      maxItems: 2,
                    });
                    return (
                      <View key={k} style={styles.todayMealCard}>
                        <Text style={styles.todayMealName}>方案{k}：{item.name}</Text>
                        <Text style={styles.planReasonLead}>这份方案更适合现在的你</Text>
                        {polishedReasons.length > 0 ? polishedReasons.map((reason, index) => (
                          <View key={`${k}-${index}`} style={styles.planReasonRow}>
                            <View style={styles.planReasonDot} />
                            <Text style={styles.planReasonText}>{reason}</Text>
                          </View>
                        )) : (
                          <Text style={styles.genOptionLabel}>已综合你家的做饭时长、宝宝适配和现有食材来排序</Text>
                        )}
                        <Text style={styles.genOptionLabel}>准备时长：约 {item.time_estimate} 分钟</Text>
                        <Text style={styles.genOptionLabel}>家里还差：{item.missing_ingredients?.join('、') || '基本不用再补食材'}</Text>
                        <Text style={styles.genOptionLabel}>宝宝适配：{item.baby_suitable ? '更安心，适合当前阶段' : '建议先看看月龄和口感再决定'}</Text>
                        <Text style={styles.genOptionLabel}>和当前方案相比：{item.vs_last || item.switch_hint || '整体更顺手一些'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.smartRecMealTypeRow}>
            {(['all-day', 'breakfast', 'lunch', 'dinner'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.genAgeOption, mealType === t && styles.genAgeOptionSelected]}
                onPress={() => onMealTypeChange(t)}
              >
                <Text style={[styles.genAgeOptionText, mealType === t && styles.genAgeOptionTextSelected]}>
                  {t === 'all-day' ? '全天' : t === 'breakfast' ? '早餐' : t === 'lunch' ? '午餐' : '晚餐'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.smartRecFeedbackBlock}>
            <View style={styles.smartRecFeedbackRow}>
              <TouchableOpacity
                style={[styles.genStartButton, styles.flex1]}
                disabled={isPending}
                onPress={() => onSubmitFeedback('A')}
              >
                <Text style={styles.genStartButtonText}>采纳A</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genStartButton, styles.flex1, styles.smartRecSelectB]}
                disabled={isPending}
                onPress={() => onSubmitFeedback('B')}
              >
                <Text style={styles.genStartButtonText}>采纳B</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.genExcludeInput}
              placeholder="不采纳原因（可选）"
              value={rejectReason}
              onChangeText={onRejectReasonChange}
              placeholderTextColor={Colors.text.tertiary}
            />
            <TouchableOpacity
              style={[styles.genStartButton, styles.smartRecReject]}
              disabled={isPending}
              onPress={() => onSubmitFeedback('NONE')}
            >
              <Text style={styles.genStartButtonText}>不采纳（提交原因）</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.genStartButton} onPress={onClose}>
            <Text style={styles.genStartButtonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  smartRecScroll: {
    maxHeight: 420,
  },
  smartRecSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  todayMealCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.main,
  },
  todayMealName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  planReasonLead: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  planReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  planReasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary.main,
    marginTop: 6,
    marginRight: 8,
  },
  planReasonText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  genOptionLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  smartRecMealTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  genAgeOption: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
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
  smartRecFeedbackBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  smartRecFeedbackRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  flex1: {
    flex: 1,
  },
  smartRecSelectB: {
    backgroundColor: Colors.secondary.main,
  },
  smartRecReject: {
    backgroundColor: Colors.neutral.gray500,
  },
});
