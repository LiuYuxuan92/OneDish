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

  const preferences = useMemo(
    () => preferenceData?.preferences || user?.preferences || {},
    [preferenceData?.preferences, user?.preferences]
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
          <Text style={styles.pageHint}>用于推荐菜谱、智能周计划和替换建议。</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>宝宝与做饭偏好</Text>

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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, updateMutation.isPending && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.saveButtonText}>
                {updateMutation.isPending ? '保存中...' : '保存偏好'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>返回</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingBottom: Spacing.xl,
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
  pageHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
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
    marginBottom: Spacing.md,
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
    gap: Spacing.sm,
  },
  button: {
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
});
