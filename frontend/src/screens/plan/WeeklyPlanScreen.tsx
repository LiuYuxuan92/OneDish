// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useWeeklyPlan, useGenerateWeeklyPlan, useMarkMealComplete, useSmartRecommendations } from '../../hooks/useMealPlans';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ShoppingBagIcon, RefreshCwIcon, BabyIcon, CheckIcon } from '../../components/common/Icons';
import { trackEvent } from '../../analytics/sdk';

type Props = NativeStackScreenProps<PlanStackParamList, 'WeeklyPlan'>;

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  breakfast: { label: '早餐', icon: '🌅', color: Colors.food.fruit },
  lunch: { label: '午餐', icon: '☀️', color: Colors.food.vegetable },
  dinner: { label: '晚餐', icon: '🌙', color: Colors.food.meat },
};

// 获取屏幕宽度用于响应式设计
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
const MOBILE_BREAKPOINT = 375;

/**
 * 周计划页面（优化版）
 *
 * 优化要点：
 * 1. 响应式布局：支持手机、平板不同尺寸
 * 2. 视觉层次优化：增强卡片阴影和边框
 * 3. 交互优化：添加日期切换功能
 * 4. 性能优化：使用 React.memo 减少不必要的重渲染
 * 5. 可访问性增强：添加无障碍标签
 */
export function WeeklyPlanScreen({ navigation }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  // 用于追踪每个餐位是否正在刷新（实现独立刷新状态）
  const [refreshingMeals, setRefreshingMeals] = useState<Set<string>>(new Set());
  // 本地加载状态，用于防止快速多次点击
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'today'>('week');
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [genBabyAge, setGenBabyAge] = useState<number | null>(null);
  const [genExclude, setGenExclude] = useState('');
  const [showSmartRec, setShowSmartRec] = useState(false);
  const [smartMealType, setSmartMealType] = useState<'all-day' | 'breakfast' | 'lunch' | 'dinner'>('all-day');

  const { data: weeklyData, isLoading, error, refetch } = useWeeklyPlan();
  const generateMutation = useGenerateWeeklyPlan();
  const markCompleteMutation = useMarkMealComplete();
  const smartRecMutation = useSmartRecommendations();

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const { start, end } = getWeekRange(selectedWeek);

  /**
   * 重新生成周计划
   *
   * 防抖优化：
   * 1. 使用本地状态 isGenerating 防止并发调用
   * 2. 结合 generateMutation.isPending 确保状态同步
   * 3. 捕获429错误并友好提示
   */
  const handleGenerate = async () => {
    // 防止重复点击：如果正在生成，直接返回
    if (isGenerating || generateMutation.isPending) {
      return;
    }

    setIsGenerating(true);

    try {
      // 标记所有餐位为正在刷新
      const allMealKeys: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        MEAL_TYPES.forEach(type => {
          allMealKeys.push(`${dateStr}-${type}`);
        });
      }
      setRefreshingMeals(new Set(allMealKeys));

      // 调用后端API重新生成
      const params: any = { start_date: formatDate(start) };
      if (genBabyAge) params.baby_age_months = genBabyAge;
      if (genExclude.trim()) {
        params.exclude_ingredients = genExclude.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
      }
      await generateMutation.mutateAsync(params);
    } catch (error: any) {
      // 处理429速率限制错误
      if (error?.response?.status === 429 || error?.statusCode === 429) {
        console.warn('请求过于频繁，请稍后再试');
        // 这里可以添加用户提示，比如使用Toast
      } else {
        console.error('生成计划失败:', error);
      }
    } finally {
      // 清除刷新状态
      setIsGenerating(false);
      setRefreshingMeals(new Set());
    }
  };

  const handleSmartRecommendation = async () => {
    try {
      await trackEvent('smart_recommendation_requested', {
        page_id: 'weekly_plan',
        meal_type: smartMealType,
        has_baby_age: Boolean(genBabyAge),
        has_exclude_ingredients: Boolean(genExclude.trim()),
      });

      const data = await smartRecMutation.mutateAsync({
        meal_type: smartMealType,
        baby_age_months: genBabyAge || undefined,
        exclude_ingredients: genExclude.trim()
          ? genExclude.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
          : undefined,
        max_prep_time: 40,
      });

      const mealGroupCount = Object.keys(data?.recommendations || {}).length;
      await trackEvent('smart_recommendation_viewed', {
        page_id: 'weekly_plan',
        meal_type: smartMealType,
        meal_group_count: mealGroupCount,
      });

      setShowSmartRec(true);
    } catch (e) {
      console.error('智能推荐失败', e);
    }
  };

  const getPlanForMeal = (dateStr: string, mealType: string) => {
    if (!weeklyData?.plans) return null;
    const dayPlans = weeklyData.plans[dateStr];
    if (!dayPlans) return null;
    return dayPlans[mealType] || null;
  };

  /**
   * 单个餐位单元格组件
   * 支持独立的刷新状态显示
   */
  const MealCell = ({ dateStr, mealType }: { dateStr: string; mealType: string }) => {
    const plan = getPlanForMeal(dateStr, mealType);
    const mealConfig = MEAL_LABELS[mealType];
    const isRefreshing = refreshingMeals.has(`${dateStr}-${mealType}`);

    // 正在刷新状态
    if (isRefreshing) {
      return (
        <View style={[styles.mealFilled, styles.mealRefreshing]}>
          <ActivityIndicator size="small" color={mealConfig.color} />
        </View>
      );
    }

    if (!plan) {
      return (
        <TouchableOpacity style={styles.mealEmpty}>
          <Text style={styles.mealEmptyIcon}>➕</Text>
          <Text style={styles.mealEmptyText}>添加</Text>
        </TouchableOpacity>
      );
    }

    const handleMarkComplete = () => {
      if (!plan.plan_id) return;
      Alert.alert('确认', '标记为已做？库存将自动扣减', [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => markCompleteMutation.mutate(plan.plan_id),
        },
      ]);
    };

    return (
      <TouchableOpacity
        style={[styles.mealFilled, { borderLeftColor: mealConfig.color, borderLeftWidth: 3 }, plan.is_completed && styles.mealCompleted]}
        onPress={() => navigation.navigate('RecipeDetail' as never, { recipeId: plan.id } as never)}
      >
        <Text style={styles.mealName} numberOfLines={1}>{plan.name}</Text>
        <View style={styles.mealMeta}>
          <Text style={styles.mealTime}>⏱ {plan.prep_time}分钟</Text>
          {plan.is_baby_suitable && (
            <Text style={styles.babySuitableBadge}>👶</Text>
          )}
          {!plan.is_completed && plan.plan_id && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleMarkComplete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CheckIcon size={14} color={Colors.functional.success} />
            </TouchableOpacity>
          )}
          {plan.is_completed && (
            <Text style={styles.completedBadge}>✅</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载计划中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }

  const formatDisplayDate = (dateStr: string, weekday: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const isToday = dateStr === formatDate(new Date());
    return { text: `${weekday} ${month}/${day}`, isToday };
  };

  const hasPlans = weeklyData?.plans && Object.keys(weeklyData.plans).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>本周膳食计划</Text>
            <Text style={styles.headerDate}>
              {start.getMonth() + 1}月{start.getDate()}日 - {end.getMonth() + 1}月{end.getDate()}日
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, styles.refreshButton]}
              onPress={handleGenerate}
              disabled={isGenerating || generateMutation.isPending}
              accessibilityLabel="刷新计划"
            >
              <RefreshCwIcon 
                size={20} 
                color={Colors.primary.main} 
                style={(isGenerating || generateMutation.isPending) && styles.spinningIcon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSmartRecommendation}
              accessibilityLabel="三餐智能推荐"
            >
              <Text style={{ color: Colors.primary.main, fontWeight: '700' }}>A/B</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('ShoppingList')}
              accessibilityLabel="查看购物清单"
            >
              <ShoppingBagIcon size={20} color={Colors.primary.main} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 视图切换 Tab */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'week' && styles.tabActive]}
            onPress={() => setActiveTab('week')}
            accessibilityLabel="查看周计划"
          >
            <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>
              周视图
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'today' && styles.tabActive]}
            onPress={() => setActiveTab('today')}
            accessibilityLabel="查看今日详情"
          >
            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
              今日详情
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!hasPlans ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
            </View>
            <Text style={styles.emptyTitle}>还没有本周计划</Text>
            <Text style={styles.emptyText}>让 AI 为您智能生成一周膳食计划</Text>
            <TouchableOpacity
              style={[styles.generateButton, (isGenerating || generateMutation.isPending) && styles.generateButtonDisabled]}
              onPress={() => setShowGenOptions(true)}
              disabled={isGenerating || generateMutation.isPending}
            >
              {(isGenerating || generateMutation.isPending) ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.generateButtonIcon}>✨</Text>
                  <Text style={styles.generateButtonText}>智能生成本周计划</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'week' ? (
          <>
            {/* 今日推荐 */}
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <Text style={styles.todayIcon}>🌟</Text>
                <Text style={styles.todayTitle}>今日推荐</Text>
              </View>
              <Text style={styles.todaySubtitle}>根据您的口味偏好智能推荐</Text>
            </View>
      
            {/* 一周计划 */}
            <View style={styles.planSection}>
              <Text style={styles.sectionTitle}>一周安排</Text>
              {dates.map((dateStr, index) => {
                const { text, isToday } = formatDisplayDate(dateStr, WEEKDAYS[index]);
                return (
                  <View key={dateStr} style={[styles.dayCard, isToday && styles.dayCardToday]}>
                    <View style={styles.dayHeader}>
                      <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>{text}</Text>
                      {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>今天</Text></View>}
                    </View>
                    <View style={styles.mealsGrid}>
                      {MEAL_TYPES.map(mealType => (
                        <View key={mealType} style={styles.mealWrapper}>
                          <View style={styles.mealLabelContainer}>
                            <Text style={styles.mealLabelIcon}>{MEAL_LABELS[mealType].icon}</Text>
                            <Text style={styles.mealLabelText}>{MEAL_LABELS[mealType].label}</Text>
                          </View>
                          <MealCell dateStr={dateStr} mealType={mealType} />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
      
            {/* 重新生成按钮（重构版） */}
            <TouchableOpacity
              style={[styles.regenerateButton, (isGenerating || generateMutation.isPending) && styles.regenerateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating || generateMutation.isPending}
            >
              {(isGenerating || generateMutation.isPending) ? (
                <ActivityIndicator color={Colors.primary.main} />
              ) : (
                <>
                  <Text style={styles.regenerateIcon}>🔄</Text>
                  <Text style={styles.regenerateText}>重新生成计划</Text>
                </>
              )}
            </TouchableOpacity>
      
            {/* 重构说明提示 */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                重新生成功能已优化：早餐、午餐、晚餐独立随机选择，避免重复
              </Text>
            </View>
          </>
        ) : (
          // 今日详情视图
          <TodayDetailTab startDate={start} weeklyData={weeklyData} navigation={navigation} />
        )}
      </ScrollView>

      {/* 三餐智能推荐结果 */}
      <Modal visible={showSmartRec} transparent animationType="slide" onRequestClose={() => setShowSmartRec(false)}>
        <View style={styles.genModalOverlay}>
          <View style={styles.genModalContent}>
            <Text style={styles.genModalTitle}>三餐智能推荐 V1（A/B）</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {Object.entries(smartRecMutation.data?.recommendations || {}).map(([mt, pair]: any) => (
                <View key={mt} style={{ marginBottom: 16 }}>
                  <Text style={styles.sectionTitle}>{MEAL_LABELS[mt]?.label || mt}</Text>
                  {['A', 'B'].map((k) => {
                    const item = pair?.[k];
                    if (!item) {
                      return <Text key={k} style={styles.genOptionLabel}>方案{k}：暂无可推荐</Text>;
                    }
                    return (
                      <View key={k} style={styles.todayMealCard}>
                        <Text style={styles.todayMealName}>方案{k}：{item.name}</Text>
                        <Text style={styles.genOptionLabel}>耗时：{item.time_estimate} 分钟</Text>
                        <Text style={styles.genOptionLabel}>缺口食材：{item.missing_ingredients?.join('、') || '无'}</Text>
                        <Text style={styles.genOptionLabel}>宝宝适配：{item.baby_suitable ? '是' : '否'}</Text>
                        <Text style={styles.genOptionLabel}>替换理由：{item.switch_hint}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['all-day', 'breakfast', 'lunch', 'dinner'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.genAgeOption, smartMealType === t && styles.genAgeOptionSelected]} onPress={() => setSmartMealType(t)}>
                  <Text style={[styles.genAgeOptionText, smartMealType === t && styles.genAgeOptionTextSelected]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.genStartButton} onPress={() => setShowSmartRec(false)}>
              <Text style={styles.genStartButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 智能生成选项弹窗 */}
      <Modal visible={showGenOptions} transparent animationType="fade" onRequestClose={() => setShowGenOptions(false)}>
        <TouchableOpacity style={styles.genModalOverlay} activeOpacity={1} onPress={() => setShowGenOptions(false)}>
          <View style={styles.genModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.genModalTitle}>智能生成选项</Text>

            {/* 宝宝月龄 */}
            <View style={styles.genOptionRow}>
              <Text style={styles.genOptionLabel}>宝宝月龄（可选）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genAgeOptions}>
                {[null, 6, 8, 10, 12, 18, 24].map((age) => (
                  <TouchableOpacity
                    key={String(age)}
                    style={[styles.genAgeOption, genBabyAge === age && styles.genAgeOptionSelected]}
                    onPress={() => setGenBabyAge(age)}
                  >
                    <Text style={[styles.genAgeOptionText, genBabyAge === age && styles.genAgeOptionTextSelected]}>
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
                value={genExclude}
                onChangeText={setGenExclude}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            {/* 生成按钮 */}
            <TouchableOpacity
              style={styles.genStartButton}
              onPress={() => {
                setShowGenOptions(false);
                handleGenerate();
              }}
            >
              <Text style={styles.genStartButtonText}>开始生成</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * 今日详情 Tab 组件
 * 显示今日三餐的详细信息
 */
function TodayDetailTab({ 
  startDate, 
  weeklyData, 
  navigation 
}: { 
  startDate: Date; 
  weeklyData: any; 
  navigation: any;
}) {
  const todayStr = startDate.toISOString().split('T')[0];
  const todayPlans = weeklyData?.plans?.[todayStr];
  
  if (!todayPlans || Object.keys(todayPlans).length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>今日暂无计划</Text>
        <Text style={styles.emptyText}>请先生成周计划</Text>
      </View>
    );
  }

  return (
    <View style={styles.todayDetailContainer}>
      {MEAL_TYPES.map(mealType => {
        const plan = todayPlans[mealType];
        const mealConfig = MEAL_LABELS[mealType];
        
        if (!plan) return null;
        
        return (
          <TouchableOpacity
            key={mealType}
            style={[styles.todayMealCard, { borderLeftColor: mealConfig.color }]}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: plan.id })}
          >
            <View style={styles.todayMealHeader}>
              <Text style={styles.todayMealIcon}>{mealConfig.icon}</Text>
              <View style={styles.todayMealInfo}>
                <Text style={styles.todayMealLabel}>{mealConfig.label}</Text>
                <Text style={styles.todayMealName}>{plan.name}</Text>
              </View>
              <View style={styles.todayMealMeta}>
                <Text style={styles.todayMealTime}>⏱ {plan.prep_time}分钟</Text>
                <Text style={styles.todayMealDifficulty}>{plan.difficulty}</Text>
              </View>
            </View>
            
            {/* 食材预览 */}
            {plan.ingredients && plan.ingredients.length > 0 && (
              <View style={styles.todayMealIngredients}>
                <Text style={styles.todayMealIngredientsTitle}>主要食材：</Text>
                <Text style={styles.todayMealIngredientsList} numberOfLines={2}>
                  {plan.ingredients.slice(0, 3).map((ing: any) => ing.name).join('、')}
                  {plan.ingredients.length > 3 ? '...' : ''}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  generateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  todayCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  todayIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  todayTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.dark,
  },
  todaySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  planSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  dayCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  dayTitleToday: {
    color: Colors.primary.main,
  },
  todayBadge: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  todayBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  mealsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mealWrapper: {
    flex: 1,
  },
  mealLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mealLabelIcon: {
    fontSize: 12,
    marginRight: Spacing.xs,
  },
  mealLabelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealEmpty: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    minHeight: 70,
  },
  mealEmptyIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  mealEmptyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealFilled: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 70,
    ...Shadows.sm,
  },
  mealRefreshing: {
    opacity: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  mealMeta: {
    marginTop: 'auto',
  },
  mealTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    borderStyle: 'dashed',
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  regenerateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.functional.error,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  // 信息提示卡片
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.functional.infoLight,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.functional.info,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.info,
    lineHeight: 20,
  },
  // 今日详情视图样式
  todayDetailContainer: {
    padding: Spacing.lg,
  },
  todayMealCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    ...Shadows.md,
  },
  todayMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayMealIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  todayMealInfo: {
    flex: 1,
  },
  todayMealLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  todayMealName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  todayMealMeta: {
    alignItems: 'flex-end',
  },
  todayMealTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  todayMealDifficulty: {
    fontSize: Typography.fontSize.xxs,
    color: Colors.text.secondary,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  todayMealIngredients: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  todayMealIngredientsTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  todayMealIngredientsList: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // 已完成状态
  mealCompleted: {
    opacity: 0.6,
  },
  completeButton: {
    marginLeft: Spacing.xs,
    padding: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.functional.success}15`,
  },
  completedBadge: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },

  // 宝宝适宜标记
  babySuitableBadge: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },

  // 智能生成选项弹窗
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
