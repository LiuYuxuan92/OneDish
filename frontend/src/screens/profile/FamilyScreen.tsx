import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import type { ProfileStackParamList } from '../../types';
import { useUserInfo } from '../../hooks/useUsers';
import { useMyFamily, useCreateFamily, useJoinFamily, useRegenerateFamilyInvite, useRemoveFamilyMember } from '../../hooks/useFamilies';
import { isWebLocalGuestMode } from '../../mock/webFallback';
import { useWeeklyPlan } from '../../hooks/useMealPlans';
import { useLatestShoppingList } from '../../hooks/useShoppingLists';
import type { FamilyContext, FamilyMember } from '../../api/families';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Family'>;

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

const activityEmoji: Record<string, string> = {
  plan: '📅',
  shopping: '🛒',
  family: '👨‍👩‍👧',
};

export function FamilyScreen({ navigation }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSpaceTools, setShowSpaceTools] = useState(false);
  const [familyName, setFamilyName] = useState('我的家庭');
  const [inviteCode, setInviteCode] = useState('');

  const { data: userInfo } = useUserInfo();
  const { data: myFamilyResponse, isLoading, error, refetch } = useMyFamily();
  const { data: weeklyDataResponse } = useWeeklyPlan();
  const { data: shoppingList } = useLatestShoppingList();

  const myFamily = (myFamilyResponse as any)?.data ?? (myFamilyResponse as unknown as FamilyContext | null);
  const weeklyData = (weeklyDataResponse as any)?.data ?? (weeklyDataResponse as any);
  const createFamilyMutation = useCreateFamily();
  const joinFamilyMutation = useJoinFamily();
  const regenerateInviteMutation = useRegenerateFamilyInvite(myFamily?.family_id);
  const removeMemberMutation = useRemoveFamilyMember(myFamily?.family_id);

  const babyAge = userInfo?.preferences?.default_baby_age ?? userInfo?.baby_age;
  const babyStage = useMemo(() => {
    if (!babyAge) return '未设置月龄';
    if (babyAge < 8) return '辅食初期';
    if (babyAge < 10) return '辅食早期';
    if (babyAge < 12) return '辅食中期';
    if (babyAge < 18) return '辅食后期';
    if (babyAge < 24) return '幼儿早期';
    return '幼儿期';
  }, [babyAge]);

  const familyStats = useMemo(() => {
    const summary = {
      plannedMeals: 0,
      dualMeals: 0,
      completedMeals: 0,
    };

    Object.values(weeklyData?.plans || {}).forEach((day: any) => {
      MEAL_TYPES.forEach((mealType) => {
        const meal = day?.[mealType];
        if (!meal) return;
        summary.plannedMeals += 1;
        if (meal.is_completed) summary.completedMeals += 1;
        if (meal.is_baby_suitable || meal.baby_version_exists || meal.has_baby_version) {
          summary.dualMeals += 1;
        }
      });
    });

    return summary;
  }, [weeklyData]);

  const shoppingStats = useMemo(() => ({
    total: shoppingList?.total_items || 0,
    unchecked: shoppingList?.unchecked_items || 0,
    covered: shoppingList?.inventory_summary?.covered_count || 0,
  }), [shoppingList]);

  const memberCards = useMemo(() => {
    const ownerId = myFamily?.owner_id;
    return (myFamily?.members || []).map((member: FamilyMember, index: number) => ({
      ...member,
      isOwner: member.user_id === ownerId,
      accent: index % 3 === 0 ? Colors.primary.light : index % 3 === 1 ? Colors.secondary.light : Colors.functional.warningLight,
    }));
  }, [myFamily]);

  const activityFeed = useMemo(() => {
    const items: Array<{ key: string; type: 'plan' | 'shopping' | 'family'; title: string; detail: string; time: string }> = [];

    const planEntries = Object.entries(weeklyData?.plans || {}).slice(0, 3);
    planEntries.forEach(([date, day]: any, index) => {
      const mealCount = MEAL_TYPES.filter((mealType) => day?.[mealType]).length;
      if (!mealCount) return;
      const d = new Date(date);
      items.push({
        key: `plan-${date}`,
        type: 'plan',
        title: `更新了 ${mealCount} 个餐次安排`,
        detail: `${WEEKDAY_LABELS[d.getDay()]} · ${date}`,
        time: index === 0 ? '本周' : '最近',
      });
    });

    if (shoppingList) {
      items.push({
        key: 'shopping-latest',
        type: 'shopping',
        title: '购物清单保持同步',
        detail: `待采购 ${shoppingStats.unchecked} 项，库存已覆盖 ${shoppingStats.covered} 项`,
        time: '当前',
      });
    }

    if (myFamily) {
      items.push({
        key: 'family-current',
        type: 'family',
        title: '家庭协作已开启',
        detail: `${memberCards.length} 位成员可共享计划与清单`,
        time: '当前',
      });
    }

    return items.slice(0, 5);
  }, [weeklyData, shoppingList, shoppingStats.unchecked, shoppingStats.covered, myFamily, memberCards.length]);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('请输入家庭名称');
      return;
    }
    try {
      await createFamilyMutation.mutateAsync(familyName.trim());
      setShowCreateModal(false);
    } catch (e: any) {
      Alert.alert('创建失败', e?.message || '请稍后重试');
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('请输入邀请码');
      return;
    }
    try {
      await joinFamilyMutation.mutateAsync(inviteCode.trim());
      setShowJoinModal(false);
      setInviteCode('');
    } catch (e: any) {
      Alert.alert('加入失败', e?.message || '邀请码无效或已失效');
    }
  };

  const handleRegenerateInvite = async () => {
    try {
      const result = await regenerateInviteMutation.mutateAsync();
      const nextInviteCode = (result as any)?.data?.invite_code || (result as any)?.invite_code || myFamily?.invite_code || '';
      Alert.alert('邀请码已更新', `新邀请码：${nextInviteCode}`);
    } catch (e: any) {
      Alert.alert('更新失败', e?.message || '请稍后重试');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveMember = (memberId: string, displayName?: string) => {
    Alert.alert('移除成员', `确认移除 ${displayName || '该成员'} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMemberMutation.mutateAsync(memberId);
          } catch (e: any) {
            Alert.alert('移除失败', e?.message || '请稍后重试');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载家庭空间...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>家庭信息加载失败</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.headerEyebrow}>Family space</Text>
              <Text style={styles.headerTitle}>{myFamily?.name || '家庭协作'}</Text>
              <Text style={styles.headerSubtitle}>
                把周计划、购物清单和宝宝喂养入口收拢到一个共享空间。
              </Text>
            </View>
            <TouchableOpacity style={styles.heroActionButton} onPress={() => setShowSpaceTools((prev) => !prev)}>
              <Text style={styles.heroActionButtonText}>{showSpaceTools ? '收起' : '更多'}</Text>
            </TouchableOpacity>
          </View>

          {isWebLocalGuestMode() && (
            <Text style={styles.previewHint}>
              当前是 web 本地未登录预览：家庭空间已切到稳定 guest/mock 数据，不再继续请求失败后刷 401 噪音。
            </Text>
          )}

          <View style={styles.heroSummaryCard}>
            <View style={styles.heroSummaryRow}>
              <Text style={styles.heroSummaryLabel}>本周家庭节奏</Text>
              <Text style={styles.heroSummaryValue}>{familyStats.plannedMeals} 餐已排</Text>
            </View>
            <Text style={styles.heroSummaryText}>
              {memberCards.length > 0
                ? `${memberCards.length} 位照护者正在共享计划；其中 ${familyStats.dualMeals} 餐已经支持一菜两吃。`
                : '先创建或加入家庭后，就能把计划、采购和宝宝适配信息同步给所有照护者。'}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{memberCards.length || 0}</Text>
                <Text style={styles.statLabel}>成员</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{familyStats.dualMeals}</Text>
                <Text style={styles.statLabel}>双版本餐次</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{shoppingStats.unchecked}</Text>
                <Text style={styles.statLabel}>待采购</Text>
              </View>
            </View>
          </View>

          {!myFamily ? (
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.primaryButtonText}>创建家庭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowJoinModal(true)}>
                <Text style={styles.secondaryButtonText}>加入家庭</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inviteCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteLabel}>当前邀请码</Text>
                <Text style={styles.inviteCode}>{myFamily.invite_code}</Text>
              </View>
              <TouchableOpacity style={styles.inviteButton} onPress={handleRegenerateInvite}>
                <Text style={styles.inviteButtonText}>刷新</Text>
              </TouchableOpacity>
            </View>
          )}

          {showSpaceTools && myFamily && (
            <View style={styles.spaceToolsRow}>
              <TouchableOpacity style={styles.toolChip} onPress={() => navigation.navigate('FamilyWeeklyPlan')}>
                <Text style={styles.toolChipText}>本周计划</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => navigation.navigate('FamilyShoppingList')}>
                <Text style={styles.toolChipText}>购物清单</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={() => navigation.navigate('PreferenceSettings')}>
                <Text style={styles.toolChipText}>宝宝偏好</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>成员</Text>
          {memberCards.length > 0 ? memberCards.map((member: any) => (
            <View key={member.user_id} style={styles.memberCard}>
              <View style={[styles.memberAvatar, { backgroundColor: member.accent }]}>
                <Text style={styles.memberAvatarText}>{(member.display_name || '家').slice(0, 1)}</Text>
              </View>
              <View style={styles.memberBody}>
                <View style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.display_name || '未命名成员'}</Text>
                  <View style={[styles.roleChip, member.isOwner ? styles.roleChipOwner : styles.roleChipMember]}>
                    <Text style={[styles.roleChipText, member.isOwner ? styles.roleChipTextOwner : styles.roleChipTextMember]}>
                      {member.isOwner ? '组织者' : '成员'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.memberMeta}>可协作周计划、购物清单与家庭入口</Text>
              </View>
              {myFamily?.role === 'owner' && !member.isOwner && (
                <TouchableOpacity onPress={() => handleRemoveMember(member.user_id, member.display_name)}>
                  <Text style={styles.removeText}>移除</Text>
                </TouchableOpacity>
              )}
            </View>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>还没有家庭成员，先创建或加入一个共享家庭。</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>宝宝档案</Text>
          <View style={styles.babyCard}>
            <View style={styles.babyHeader}>
              <Text style={styles.babyName}>{userInfo?.username || '宝宝档案'}</Text>
              <View style={styles.babyAgeChip}>
                <Text style={styles.babyAgeChipText}>{babyAge ? `${babyAge} 个月` : '待完善'}</Text>
              </View>
            </View>
            <Text style={styles.babyStage}>{babyStage}</Text>
            <Text style={styles.babyDescription}>
              {babyAge ? `当前协作会优先围绕 ${babyAge} 个月月龄的宝宝适配、购物与计划推荐展开。` : '去编辑资料补充宝宝月龄后，家庭页面会展示更准确的共享适配信息。'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>共享空间</Text>
          <TouchableOpacity style={styles.spaceCard} onPress={() => navigation.navigate('FamilyWeeklyPlan')}>
            <Text style={styles.spaceIcon}>📅</Text>
            <View style={styles.spaceBody}>
              <Text style={styles.spaceTitle}>Weekly Plan</Text>
              <Text style={styles.spaceDescription}>本周 {familyStats.plannedMeals} 个餐次，双版本餐次 {familyStats.dualMeals} 个</Text>
            </View>
            <Text style={styles.spaceLink}>进入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.spaceCard} onPress={() => navigation.navigate('FamilyShoppingList')}>
            <Text style={styles.spaceIcon}>🛒</Text>
            <View style={styles.spaceBody}>
              <Text style={styles.spaceTitle}>Shopping List</Text>
              <Text style={styles.spaceDescription}>待采购 {shoppingStats.unchecked} 项，库存已覆盖 {shoppingStats.covered} 项</Text>
            </View>
            <Text style={styles.spaceLink}>进入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.spaceCard} onPress={() => navigation.navigate('PreferenceSettings')}>
            <Text style={styles.spaceIcon}>👶</Text>
            <View style={styles.spaceBody}>
              <Text style={styles.spaceTitle}>Baby profile</Text>
              <Text style={styles.spaceDescription}>调整月龄、偏好和忌口，让家庭协作更贴近真实宝宝阶段</Text>
            </View>
            <Text style={styles.spaceLink}>设置</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近动态</Text>
          <View style={styles.feedCard}>
            {activityFeed.length > 0 ? activityFeed.map((item, index) => (
              <View key={item.key} style={[styles.feedRow, index !== activityFeed.length - 1 && styles.feedRowBorder]}>
                <Text style={styles.feedEmoji}>{activityEmoji[item.type]}</Text>
                <View style={styles.feedBody}>
                  <Text style={styles.feedTitle}>{item.title}</Text>
                  <Text style={styles.feedDetail}>{item.detail}</Text>
                </View>
                <Text style={styles.feedTime}>{item.time}</Text>
              </View>
            )) : (
              <Text style={styles.emptyCardText}>等你开始计划与采购后，这里会自动汇总家庭协作动态。</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本周概览</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewValue}>{familyStats.plannedMeals}</Text>
              <Text style={styles.overviewLabel}>Meals planned</Text>
            </View>
            <View style={[styles.overviewCard, styles.overviewCardWarm]}>
              <Text style={styles.overviewValue}>{familyStats.dualMeals}</Text>
              <Text style={styles.overviewLabel}>Dual meals</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewValue}>{familyStats.completedMeals}</Text>
              <Text style={styles.overviewLabel}>已完成</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewValue}>{memberCards.length || 0}</Text>
              <Text style={styles.overviewLabel}>Caregivers active</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>创建家庭</Text>
            <TextInput style={styles.input} value={familyName} onChangeText={setFamilyName} placeholder="家庭名称" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalSecondaryButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleCreateFamily}>
                <Text style={styles.modalPrimaryButtonText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoinModal} transparent animationType="slide" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>加入家庭</Text>
            <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder="输入邀请码" autoCapitalize="characters" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowJoinModal(false)}>
                <Text style={styles.modalSecondaryButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleJoinFamily}>
                <Text style={styles.modalPrimaryButtonText}>加入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.functional.error,
    marginBottom: Spacing.md,
  },
  headerCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.card,
    ...Shadows.md,
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
  headerEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  previewHint: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    color: Colors.primary.dark,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  heroSummaryCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  heroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  heroSummaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroSummaryValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
  heroSummaryText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.primary.light,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary.dark,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  inviteCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  spaceToolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  toolChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.light,
  },
  toolChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  inviteLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  inviteButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
  },
  inviteButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  memberBody: {
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  memberMeta: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  roleChip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  roleChipOwner: {
    backgroundColor: Colors.primary.light,
  },
  roleChipMember: {
    backgroundColor: Colors.neutral.gray100,
  },
  roleChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  roleChipTextOwner: {
    color: Colors.primary.dark,
  },
  roleChipTextMember: {
    color: Colors.text.secondary,
  },
  removeText: {
    color: Colors.functional.error,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.card,
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  babyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary.light,
  },
  babyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  babyName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  babyAgeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.full,
  },
  babyAgeChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  babyStage: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.dark,
    marginBottom: Spacing.xs,
  },
  babyDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.card,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  spaceIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  spaceBody: {
    flex: 1,
  },
  spaceTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  spaceDescription: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  spaceLink: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  feedCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  feedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  feedEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  feedBody: {
    flex: 1,
  },
  feedTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  feedDetail: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  feedTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  overviewCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.card,
    ...Shadows.sm,
  },
  overviewCardWarm: {
    backgroundColor: Colors.primary.light,
  },
  overviewValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  overviewLabel: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
});
