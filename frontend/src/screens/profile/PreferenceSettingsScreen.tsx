import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { usePreferenceInfo, useUpdatePreferences, useUserInfo } from '../../hooks/useUsers';
import type { UserPreferences } from '../../api/users';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PreferenceSettings'>;

type DifficultyOption = 'easy' | 'medium' | 'hard';

const difficultyOptions: Array<{ label: string; value: DifficultyOption }> = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' },
];

const parseIngredientInput = (value: string): string[] =>
  value
    .split(/[、,，/\n\r;]/)
    .map((item) => item.trim())
    .filter(Boolean);

const stringifyIngredients = (value?: string[] | string): string => {
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'string') return value;
  return '';
};

const getBabyStageLabel = (months?: number | null): string => {
  if (months == null || !Number.isFinite(months)) return '沿用个人资料';
  if (months <= 8) return '辅食初步建立';
  if (months <= 12) return '手指食物练习';
  if (months <= 24) return '家庭共食过渡';
  return '按家庭口味协同';
};

const getDifficultyLabel = (value: DifficultyOption | ''): string => {
  if (value === 'easy') return '偏简单';
  if (value === 'medium') return '难度适中';
  if (value === 'hard') return '可以挑战';
  return '按菜谱实际难度';
};

export function PreferenceSettingsScreen({ navigation }: Props) {
  const { data: preferenceData, isLoading, refetch } = usePreferenceInfo();
  const { data: user } = useUserInfo();
  const updateMutation = useUpdatePreferences();

  const [defaultBabyAge, setDefaultBabyAge] = useState('');
  const [preferIngredients, setPreferIngredients] = useState('');
  const [excludeIngredients, setExcludeIngredients] = useState('');
  const [cookingTimeLimit, setCookingTimeLimit] = useState('');
  const [difficultyPreference, setDifficultyPreference] = useState<DifficultyOption | ''>('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showQuickPresets, setShowQuickPresets] = useState(false);

  const preferences = useMemo(
    () => preferenceData?.preferences || user?.preferences || {},
    [preferenceData?.preferences, user?.preferences]
  );

  const effectiveBabyAge = defaultBabyAge ? Number(defaultBabyAge) : user?.baby_age;
  const summaryCards = useMemo(
    () => [
      {
        label: '默认月龄',
        value: defaultBabyAge ? `${defaultBabyAge} 个月` : '沿用资料',
        helper: getBabyStageLabel(effectiveBabyAge),
      },
      {
        label: '做饭节奏',
        value: cookingTimeLimit ? `${cookingTimeLimit} 分钟内` : '不限时长',
        helper: '给推荐和周计划一个时间边界',
      },
      {
        label: '难度偏好',
        value: getDifficultyLabel(difficultyPreference),
        helper: '影响默认排序与替换建议',
      },
    ],
    [defaultBabyAge, effectiveBabyAge, cookingTimeLimit, difficultyPreference]
  );

  const filledPreferenceCount = useMemo(() => {
    return [
      defaultBabyAge,
      cookingTimeLimit,
      difficultyPreference,
      preferIngredients.trim(),
      excludeIngredients.trim(),
    ].filter(Boolean).length;
  }, [defaultBabyAge, cookingTimeLimit, difficultyPreference, preferIngredients, excludeIngredients]);

  const recommendationTargets = useMemo(
    () => [
      '首页推荐',
      '周计划生成',
      preferIngredients.trim() || excludeIngredients.trim() ? '换菜建议' : '购物清单联动',
    ],
    [preferIngredients, excludeIngredients]
  );

  useEffect(() => {
    setDefaultBabyAge(
      preferences?.default_baby_age?.toString() || user?.baby_age?.toString() || ''
    );
    setPreferIngredients(stringifyIngredients(preferences?.prefer_ingredients));
    setExcludeIngredients(stringifyIngredients(preferences?.exclude_ingredients));
    setCookingTimeLimit(preferences?.cooking_time_limit?.toString() || '');
    setDifficultyPreference(
      preferences?.difficulty_preference === 'easy' ||
      preferences?.difficulty_preference === 'medium' ||
      preferences?.difficulty_preference === 'hard'
        ? preferences.difficulty_preference
        : ''
    );
  }, [preferences, user?.baby_age]);

  const handleSave = async () => {
    const defaultBabyAgeNum = defaultBabyAge ? Number(defaultBabyAge) : null;
    const cookingTimeLimitNum = cookingTimeLimit ? Number(cookingTimeLimit) : null;

    if (defaultBabyAge && (defaultBabyAgeNum === null || !Number.isFinite(defaultBabyAgeNum) || defaultBabyAgeNum < 0)) {
      Alert.alert('提示', '默认宝宝月龄不能小于 0');
      return;
    }

    if (cookingTimeLimit && (cookingTimeLimitNum === null || !Number.isFinite(cookingTimeLimitNum) || cookingTimeLimitNum <= 0)) {
      Alert.alert('提示', '烹饪时间上限必须大于 0');
      return;
    }

    const payload: UserPreferences = {
      default_baby_age: defaultBabyAgeNum ?? undefined,
      prefer_ingredients: parseIngredientInput(preferIngredients),
      exclude_ingredients: parseIngredientInput(excludeIngredients),
      cooking_time_limit: cookingTimeLimitNum ?? undefined,
      difficulty_preference: difficultyPreference || undefined,
    };

    try {
      await updateMutation.mutateAsync(payload);
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      Alert.alert('保存成功', '你的饮食偏好已更新');
      await refetch();
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请稍后重试');
    }
  };

  if (isLoading && !preferenceData) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在加载偏好...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroEyebrow}>Preference settings</Text>
                <Text style={styles.heroTitle}>先把默认偏好设好，后面的推荐会轻很多</Text>
                <Text style={styles.pageHint}>用于推荐菜谱、智能周计划和替换建议。</Text>
              </View>
              <TouchableOpacity style={styles.heroActionButton} onPress={() => setShowQuickPresets((prev) => !prev)}>
                <Text style={styles.heroActionButtonText}>{showQuickPresets ? '收起' : '快捷设置'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>已设置 {filledPreferenceCount} / 5 项</Text>
              </View>
              <View style={[styles.statusBadge, styles.statusBadgeMuted]}>
                <Text style={styles.statusBadgeMutedText}>{getBabyStageLabel(effectiveBabyAge)}</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              {summaryCards.map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryHelper}>{item.helper}</Text>
                </View>
              ))}
            </View>
            {showQuickPresets && (
              <View style={styles.quickPresetSection}>
                <Text style={styles.quickPresetTitle}>常用快捷设置</Text>
                <View style={styles.quickPresetRow}>
                  <TouchableOpacity style={styles.quickPresetChip} onPress={() => setCookingTimeLimit('20')}>
                    <Text style={styles.quickPresetChipText}>20 分钟内</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickPresetChip} onPress={() => setDifficultyPreference('easy')}>
                    <Text style={styles.quickPresetChipText}>偏简单</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickPresetChip} onPress={() => setDefaultBabyAge(user?.baby_age?.toString() || '')}>
                    <Text style={styles.quickPresetChipText}>沿用宝宝月龄</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.quickPresetHint}>适合先快速设边界，再补充偏好的食材与忌口。</Text>
              </View>
            )}
          </View>

          <View style={styles.impactCard}>
            <Text style={styles.impactTitle}>保存后会直接影响</Text>
            <View style={styles.impactChipRow}>
              {recommendationTargets.map((item) => (
                <View key={item} style={styles.impactChip}>
                  <Text style={styles.impactChipText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.impactDescription}>推荐理由、换菜建议和周计划生成会优先参考这里的默认设定。</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>宝宝与做饭偏好</Text>
            <Text style={styles.sectionDescription}>先约束默认月龄、可接受时长和做饭复杂度，让推荐更接近你们家的真实节奏。</Text>

            <View style={styles.field}>
              <Text style={styles.label}>默认宝宝月龄</Text>
              <TextInput
                style={styles.input}
                value={defaultBabyAge}
                onChangeText={setDefaultBabyAge}
                placeholder="例如 12"
                keyboardType="number-pad"
                placeholderTextColor={Colors.text.disabled}
              />
              <Text style={styles.hint}>为空时将尽量沿用个人资料里的宝宝月龄</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>烹饪时间上限（分钟）</Text>
              <TextInput
                style={styles.input}
                value={cookingTimeLimit}
                onChangeText={setCookingTimeLimit}
                placeholder="例如 30"
                keyboardType="number-pad"
                placeholderTextColor={Colors.text.disabled}
              />
              <Text style={styles.hint}>用于优先推荐更省时的菜谱</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>难度偏好</Text>
              <View style={styles.chipGroup}>
                {difficultyOptions.map((option) => {
                  const selected = difficultyPreference === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setDifficultyPreference(selected ? '' : option.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>食材偏好</Text>
            <Text style={styles.sectionDescription}>这里的食材会参与推荐排序、替换建议和购物清单生成。</Text>

            <View style={styles.field}>
              <Text style={styles.label}>想多吃的食材</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={preferIngredients}
                onChangeText={setPreferIngredients}
                placeholder="例如 鱼、鸡蛋、牛肉"
                placeholderTextColor={Colors.text.disabled}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>支持用顿号、逗号、分号或换行分隔</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>不吃/排除的食材</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={excludeIngredients}
                onChangeText={setExcludeIngredients}
                placeholder="例如 香菜、辣椒、海鲜"
                placeholderTextColor={Colors.text.disabled}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>周计划和推荐会尽量避开这些食材</Text>
            </View>
          </View>

          <View style={styles.feedbackRow}>
            {updateMutation.isPending ? (
              <Text style={styles.savingText}>保存中...</Text>
            ) : updateMutation.isError ? (
              <Text style={styles.errorText}>保存失败，请重试</Text>
            ) : lastSavedAt ? (
              <Text style={styles.successText}>已于 {lastSavedAt} 保存</Text>
            ) : (
              <Text style={styles.hint}>修改后点击下方按钮保存</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.saveBar}>
          <View style={styles.saveBarTextBlock}>
            <Text style={styles.saveBarTitle}>保存后，后续推荐会立即刷新</Text>
            <Text style={styles.saveBarSubtitle}>建议先保存默认边界，再回到首页或周计划看变化。</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>返回</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, updateMutation.isPending && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.saveButtonText}>
                {updateMutation.isPending ? '保存中...' : '保存偏好'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 180,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  heroActionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  heroActionButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.light,
  },
  statusBadgeMuted: {
    backgroundColor: Colors.background.secondary,
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusBadgeMutedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  summaryHelper: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  quickPresetSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  quickPresetTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickPresetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.light,
  },
  quickPresetChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  quickPresetHint: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  pageHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  impactCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  impactTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  impactChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  impactChip: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  impactChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  impactDescription: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    color: Colors.text.secondary,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionDescription: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  multilineInput: {
    minHeight: 96,
  },
  hint: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  chipSelected: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  chipText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  chipTextSelected: {
    color: Colors.text.inverse,
  },
  feedbackRow: {
    minHeight: 24,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  savingText: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.sm,
  },
  successText: {
    color: Colors.functional.success,
    fontSize: Typography.fontSize.sm,
  },
  errorText: {
    color: Colors.functional.error,
    fontSize: Typography.fontSize.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary.main,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelButton: {
    backgroundColor: Colors.neutral.gray200,
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  saveBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  saveBarTextBlock: {
    marginBottom: Spacing.md,
  },
  saveBarTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  saveBarSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
