// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../styles/theme';
import { useWeeklyPlan, useGenerateWeeklyPlan, useMarkMealComplete, useSmartRecommendations, useSubmitRecommendationFeedback, useCreateWeeklyShare, useJoinWeeklyShare, useSharedWeeklyPlan, useMarkSharedMealComplete, useRegenerateWeeklyShareInvite, useRemoveWeeklyShareMember } from '../../hooks/useMealPlans';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { ShoppingBagIcon, RefreshCwIcon } from '../../components/common/Icons';
import { trackEvent } from '../../analytics/sdk';
import { useWeeklyPlanState, WEEKDAYS, MEAL_LABELS, MEAL_TYPES } from '../../hooks/useWeeklyPlanState';
import { WeekDayCard } from '../../components/plan/WeekDayCard';
import { SmartRecommendationModal } from '../../components/plan/SmartRecommendationModal';
import { GenerateOptionsModal } from '../../components/plan/GenerateOptionsModal';
import { WeeklyShareModal } from '../../components/plan/WeeklyShareModal';
import { ShareTemplateModal } from '../../components/plan/ShareTemplateModal';
import { TodayDetailTab } from '../../components/plan/TodayDetailTab';
import { weeklyPlanStyles as styles } from './weeklyPlanStyles';
import { useUserInfo } from '../../hooks/useUsers';
import { useCreateFamily, useJoinFamily, useMyFamily, useRegenerateFamilyInvite, useRemoveFamilyMember } from '../../hooks/useFamilies';

type Props = NativeStackScreenProps<PlanStackParamList, 'WeeklyPlan'>;

export function WeeklyPlanScreen({ navigation }: Props) {
  const {
    start, end, dates, activeTab, setActiveTab,
    refreshingMeals, setRefreshingMeals,
    isGenerating, setIsGenerating,
    showGenOptions, setShowGenOptions,
    genBabyAge, setGenBabyAge,
    genExclude, setGenExclude,
    showSmartRec, setShowSmartRec,
    smartMealType, setSmartMealType,
    rejectReason, setRejectReason,
    weeklyInviteCode, setWeeklyInviteCode,
    activeShareId, setActiveShareId,
    formatDate,
  } = useWeeklyPlanState();

  const [showShareTemplate, setShowShareTemplate] = useState(false);

  const { data: userInfo } = useUserInfo();
  const { data: myFamily } = useMyFamily();
  const createFamilyMutation = useCreateFamily();
  const joinFamilyMutation = useJoinFamily();
  const regenerateFamilyInviteMutation = useRegenerateFamilyInvite(myFamily?.family_id);
  const removeFamilyMemberMutation = useRemoveFamilyMember(myFamily?.family_id);
  const preferredBabyAge = userInfo?.preferences?.default_baby_age ?? userInfo?.baby_age;
  const preferredExcludeIngredients = Array.isArray(userInfo?.preferences?.exclude_ingredients)
    ? userInfo.preferences.exclude_ingredients
    : [];
  const preferredCookingTimeLimit = userInfo?.preferences?.cooking_time_limit ?? userInfo?.preferences?.max_prep_time;

  const { data: weeklyData, isLoading, error, refetch } = useWeeklyPlan();
  const generateMutation = useGenerateWeeklyPlan();
  const markCompleteMutation = useMarkMealComplete();
  const smartRecMutation = useSmartRecommendations();
  const feedbackMutation = useSubmitRecommendationFeedback();
  const createWeeklyShareMutation = useCreateWeeklyShare();
  const joinWeeklyShareMutation = useJoinWeeklyShare();
  const { data: sharedWeeklyData } = useSharedWeeklyPlan(activeShareId || undefined);
  const markSharedCompleteMutation = useMarkSharedMealComplete(activeShareId || undefined);
  const regenerateInviteMutation = useRegenerateWeeklyShareInvite(activeShareId || undefined);
  const removeMemberMutation = useRemoveWeeklyShareMember(activeShareId || undefined);

  useEffect(() => {
    if (!activeShareId || !sharedWeeklyData) return;
    trackEvent('shared_plan_viewed', { timestamp: new Date().toISOString(), screen: 'WeeklyPlan', source: 'weekly_plan', shareId: activeShareId, planId: null });
  }, [activeShareId, sharedWeeklyData]);

  const handleGenerate = async () => {
    if (isGenerating || generateMutation.isPending) return;
    setIsGenerating(true);
    try {
      const allMealKeys: string[] = [];
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); const dateStr = d.toISOString().split('T')[0]; MEAL_TYPES.forEach(type => allMealKeys.push(dateStr + '-' + type)); }
      setRefreshingMeals(new Set(allMealKeys));
      const params: Record<string, unknown> = { start_date: formatDate(start) };
      const effectiveBabyAge = genBabyAge ?? preferredBabyAge;
      const effectiveExcludeIngredients = [
        ...preferredExcludeIngredients,
        ...genExclude.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
      ].filter((value, index, arr) => value && arr.indexOf(value) === index);
      if (effectiveBabyAge) params.baby_age_months = effectiveBabyAge;
      if (effectiveExcludeIngredients.length > 0) params.exclude_ingredients = effectiveExcludeIngredients;
      await generateMutation.mutateAsync(params);
    } catch (genErr: unknown) {
      const err = genErr as { response?: { status: number }; statusCode?: number };
      if (err?.response?.status === 429 || err?.statusCode === 429) console.warn('请求过于频繁，请稍后再试');
      else console.error('生成计划失败:', genErr);
    } finally { setIsGenerating(false); setRefreshingMeals(new Set()); }
  };

  const handleSmartRecommendation = async () => {
    try {
      const effectiveBabyAge = genBabyAge ?? preferredBabyAge;
      const effectiveExcludeIngredients = [
        ...preferredExcludeIngredients,
        ...genExclude.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
      ].filter((value, index, arr) => value && arr.indexOf(value) === index);
      await trackEvent('smart_recommendation_requested', { page_id: 'weekly_plan', meal_type: smartMealType, has_baby_age: Boolean(effectiveBabyAge), has_exclude_ingredients: Boolean(effectiveExcludeIngredients.length), preference_time_limit: preferredCookingTimeLimit || null });
      const data = await smartRecMutation.mutateAsync({ meal_type: smartMealType, baby_age_months: effectiveBabyAge || undefined, exclude_ingredients: effectiveExcludeIngredients.length ? effectiveExcludeIngredients : undefined, max_prep_time: preferredCookingTimeLimit || 40 });
      const mealGroupCount = Object.keys(data?.recommendations || {}).length;
      await trackEvent('smart_recommendation_viewed', { page_id: 'weekly_plan', meal_type: smartMealType, meal_group_count: mealGroupCount });
      setShowSmartRec(true);
    } catch (e) { console.error('智能推荐失败', e); }
  };

  const handleSubmitFeedback = async (selectedOption: 'A' | 'B' | 'NONE') => {
    try {
      await feedbackMutation.mutateAsync({ meal_type: smartMealType, selected_option: selectedOption, reject_reason: selectedOption === 'NONE' ? rejectReason.trim() : undefined, event_time: new Date().toISOString() });
      Alert.alert('反馈已记录', '感谢反馈，推荐将持续优化');
      setRejectReason(''); setShowSmartRec(false);
    } catch { Alert.alert('提交失败', '请稍后重试'); }
  };

  const handleCreateWeeklyShare = async () => {
    try {
      if (!myFamily) {
        await createFamilyMutation.mutateAsync('我的家庭');
      }
      const share = await createWeeklyShareMutation.mutateAsync();
      setActiveShareId(share.id);
      await trackEvent('share_link_created', { timestamp: new Date().toISOString(), screen: 'WeeklyPlan', source: 'weekly_plan', shareId: share.id });
      Alert.alert('家庭邀请码', '邀请码：' + share.invite_code + '\n链接：' + share.share_link);
    } catch { Alert.alert('生成失败', '请稍后重试'); }
  };

  const handleJoinWeeklyShare = async () => {
    if (!weeklyInviteCode.trim()) { Alert.alert('请输入邀请码'); return; }
    try {
      const joinedFamily = await joinFamilyMutation.mutateAsync(weeklyInviteCode.trim());
      const joined = await joinWeeklyShareMutation.mutateAsync(weeklyInviteCode.trim());
      setActiveShareId(joined.share_id || joinedFamily.family_id);
      await trackEvent('share_join_success', { timestamp: new Date().toISOString(), screen: 'WeeklyPlan', source: 'weekly_plan', shareId: joined.share_id || joinedFamily.family_id });
      await trackEvent('shared_plan_viewed', { timestamp: new Date().toISOString(), screen: 'WeeklyPlan', source: 'weekly_plan', shareId: joined.share_id || joinedFamily.family_id });
    } catch { Alert.alert('加入失败', '邀请码无效或已失效'); }
  };

  const handleRegenerateWeeklyInvite = async () => {
    try {
      const familyInvite = myFamily ? await regenerateFamilyInviteMutation.mutateAsync() : null;
      const share = await regenerateInviteMutation.mutateAsync();
      await trackEvent('share_invite_revoked', { timestamp: new Date().toISOString(), userId: undefined, shareId: share?.id || activeShareId, targetMemberId: undefined, screen: 'WeeklyPlan', source: 'weekly_plan' });
      await trackEvent('share_invite_regenerated', { timestamp: new Date().toISOString(), userId: undefined, shareId: share?.id || activeShareId, targetMemberId: undefined, screen: 'WeeklyPlan', source: 'weekly_plan' });
      Alert.alert('邀请码已更新', '新邀请码：' + (familyInvite?.invite_code || share.invite_code));
    } catch (e: unknown) { const err = e as { message?: string }; Alert.alert('操作失败', err?.message || '请稍后重试'); }
  };

  const handleRemoveWeeklyMember = async (memberId: string) => {
    try {
      if (myFamily?.family_id) {
        await removeFamilyMemberMutation.mutateAsync(memberId);
      }
      await removeMemberMutation.mutateAsync(memberId);
      await trackEvent('share_member_removed', { timestamp: new Date().toISOString(), userId: undefined, shareId: activeShareId, targetMemberId: memberId, screen: 'WeeklyPlan', source: 'weekly_plan' });
      Alert.alert('成员已移除');
    } catch (e: unknown) { const err = e as { message?: string }; Alert.alert('移除失败', err?.message || '请稍后重试'); }
  };

  const handleMarkComplete = (planId: string) => { Alert.alert('确认', '标记为已做？库存将自动扣减', [{ text: '取消', style: 'cancel' }, { text: '确认', onPress: () => markCompleteMutation.mutate(planId) }]); };
  const handleMealPress = (recipeId: string) => { navigation.navigate('RecipeDetail', { recipeId }); };
  const handleAddMeal = (dateStr: string, mealType: string) => { console.log('Add meal:', dateStr, mealType); };
  const handleMarkSharedMealComplete = (planId: string) => { markSharedCompleteMutation.mutate(planId); };
  const handleOpenShareTemplate = () => {
    trackEvent('share_template_modal_opened', { timestamp: new Date().toISOString(), screen: 'WeeklyPlan', source: 'weekly_plan' });
    setShowShareTemplate(true);
  };

  if (isLoading) return <SafeAreaView style={styles.container} edges={['bottom']}><View style={styles.centerContent}><ActivityIndicator size="large" color={Colors.primary.main} /><Text style={styles.loadingText}>加载计划中...</Text></View></SafeAreaView>;
  if (error) return <SafeAreaView style={styles.container} edges={['bottom']}><View style={styles.centerContent}><Text style={styles.errorIcon}>⚠️</Text><Text style={styles.errorTitle}>加载失败</Text><TouchableOpacity style={styles.retryButton} onPress={() => refetch()}><Text style={styles.retryButtonText}>重试</Text></TouchableOpacity></View></SafeAreaView>;

  const hasPlans = weeklyData?.plans && Object.keys(weeklyData.plans).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View><Text style={styles.headerTitle}>本周膳食计划</Text><Text style={styles.headerDate}>{start.getMonth() + 1}月{start.getDate()}日 - {end.getMonth() + 1}月{end.getDate()}日</Text></View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleGenerate} disabled={isGenerating || generateMutation.isPending} accessibilityLabel="刷新计划"><RefreshCwIcon size={20} color={Colors.primary.main} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleSmartRecommendation} accessibilityLabel="三餐智能推荐"><Text style={{ color: Colors.primary.main, fontWeight: '700' }}>A/B</Text></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ShoppingList')} accessibilityLabel="查看购物清单"><ShoppingBagIcon size={20} color={Colors.primary.main} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('TemplateDiscovery')} accessibilityLabel="浏览模板"><Text style={{ fontSize: 16 }}>📚</Text></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleOpenShareTemplate} disabled={!hasPlans} accessibilityLabel="保存为模板"><Text style={{ fontSize: 16 }}>💾</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'week' && styles.tabActive]} onPress={() => setActiveTab('week')}><Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>周视图</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'today' && styles.tabActive]} onPress={() => setActiveTab('today')}><Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>今日详情</Text></TouchableOpacity>
        </View>
        <WeeklyShareModal sharedData={sharedWeeklyData as Parameters<typeof WeeklyShareModal>[0]['sharedData']} inviteCode={weeklyInviteCode} onInviteCodeChange={setWeeklyInviteCode} onCreateShare={handleCreateWeeklyShare} onJoinShare={handleJoinWeeklyShare} onRegenerateInvite={handleRegenerateWeeklyInvite} onRemoveMember={handleRemoveWeeklyMember} onMarkSharedMealComplete={handleMarkSharedMealComplete} isCreating={createWeeklyShareMutation.isPending} isJoining={joinWeeklyShareMutation.isPending} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!hasPlans ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}><Text style={styles.emptyIcon}>📅</Text></View>
            <Text style={styles.emptyTitle}>还没有本周计划</Text>
            <Text style={styles.emptyText}>让 AI 为您智能生成一周膳食计划</Text>
            <TouchableOpacity style={[styles.generateButton, (isGenerating || generateMutation.isPending) && styles.generateButtonDisabled]} onPress={() => setShowGenOptions(true)} disabled={isGenerating || generateMutation.isPending}>
              {(isGenerating || generateMutation.isPending) ? <ActivityIndicator color={Colors.text.inverse} /> : <><Text style={styles.generateButtonIcon}>✨</Text><Text style={styles.generateButtonText}>智能生成本周计划</Text></>}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'week' ? (
          <>
            <View style={styles.todayCard}><View style={styles.todayHeader}><Text style={styles.todayIcon}>🌟</Text><Text style={styles.todayTitle}>今日推荐</Text></View><Text style={styles.todaySubtitle}>根据您的口味偏好智能推荐</Text></View>
            <View style={styles.planSection}>
              <Text style={styles.sectionTitle}>一周安排</Text>
              {dates.map((dateStr, index) => <WeekDayCard key={dateStr} dateStr={dateStr} weekday={WEEKDAYS[index]} isToday={dateStr === formatDate(new Date())} dayPlans={weeklyData?.plans?.[dateStr] as unknown as Parameters<typeof WeekDayCard>[0]['dayPlans']} refreshingMeals={refreshingMeals} onRefreshMeal={() => {}} onMarkComplete={handleMarkComplete} onMealPress={handleMealPress} onAddMeal={handleAddMeal} />)}
            </View>
            <TouchableOpacity style={[styles.regenerateButton, (isGenerating || generateMutation.isPending) && styles.regenerateButtonDisabled]} onPress={handleGenerate} disabled={isGenerating || generateMutation.isPending}>
              {(isGenerating || generateMutation.isPending) ? <ActivityIndicator color={Colors.primary.main} /> : <><Text style={styles.regenerateIcon}>🔄</Text><Text style={styles.regenerateText}>重新生成计划</Text></>}
            </TouchableOpacity>
            <View style={styles.infoCard}><Text style={styles.infoIcon}>💡</Text><Text style={styles.infoText}>重新生成功能已优化：早餐、午餐、晚餐独立随机选择，避免重复</Text></View>
          </>
        ) : (<TodayDetailTab startDate={start} weeklyData={weeklyData} navigation={navigation} />)}
      </ScrollView>
      <SmartRecommendationModal visible={showSmartRec} onClose={() => setShowSmartRec(false)} data={smartRecMutation.data as Parameters<typeof SmartRecommendationModal>[0]['data']} mealType={smartMealType} onMealTypeChange={setSmartMealType} isPending={smartRecMutation.isPending} rejectReason={rejectReason} onRejectReasonChange={setRejectReason} onSubmitFeedback={handleSubmitFeedback} />
      <GenerateOptionsModal visible={showGenOptions} onClose={() => setShowGenOptions(false)} babyAge={genBabyAge} onBabyAgeChange={setGenBabyAge} exclude={genExclude} onExcludeChange={setGenExclude} onGenerate={handleGenerate} />
      <ShareTemplateModal visible={showShareTemplate} onClose={() => setShowShareTemplate(false)} weeklyData={weeklyData} />
    </SafeAreaView>
  );
}
