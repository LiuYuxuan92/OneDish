// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import {
  useCreateShoppingListShare,
  useRegenerateShoppingListShareInvite,
  useRemoveShoppingListShareMember,
  useShoppingListDetail,
  useUpdateShoppingListItem,
} from '../../hooks/useShoppingLists';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { trackEvent } from '../../analytics/sdk';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingListDetail'>;

const AREA_META: Record<string, { label: string; icon: string }> = {
  produce: { label: '生鲜蔬果', icon: '🥬' },
  protein: { label: '肉蛋水产豆制品', icon: '🥩' },
  staple: { label: '主食干货', icon: '🍚' },
  seasoning: { label: '调味酱料', icon: '🧂' },
  snack_dairy: { label: '零食乳品', icon: '🥛' },
  household: { label: '日用清洁', icon: '🧻' },
  other: { label: '其他', icon: '📦' },
};

const AREA_ORDER = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other'];

const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
};

const getRoleLabel = (role?: string | null) => {
  if (role === 'owner') return '共享发起人';
  if (role === 'member') return '共享成员';
  return '个人清单';
};

const getSourceLabel = (item: any) => {
  if (item.source === 'meal_plan') return '来自周计划';
  if (item.source === 'recipe') return '来自菜谱';
  if (item.source === 'manual') return '手动添加';
  if (item.source === 'baby') return '宝宝专项';
  if (item.source === 'adult') return '成人餐';
  if (item.source === 'both') return '全家共用';
  return '';
};

export function ShoppingListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(AREA_ORDER));

  const { data: shoppingList, isLoading, error, refetch } = useShoppingListDetail(listId);
  const updateMutation = useUpdateShoppingListItem(listId);
  const shareMutation = useCreateShoppingListShare(listId);
  const regenerateInviteMutation = useRegenerateShoppingListShareInvite(listId);
  const removeMemberMutation = useRemoveShoppingListShareMember(listId);

  const hasList = !!shoppingList?.items && Object.values(shoppingList.items).some((items: any) => items?.length > 0);
  const totalUnchecked = shoppingList?.unchecked_items || 0;
  const totalItems = shoppingList?.total_items || 0;
  const completedCount = Math.max(totalItems - totalUnchecked, 0);
  const shareMembers = shoppingList?.share?.members || [];
  const areaSummaries = useMemo(
    () =>
      AREA_ORDER.map((area) => {
        const items = shoppingList?.items?.[area] || [];
        const checkedCount = items.filter((item: any) => item.checked).length;
        return {
          area,
          count: items.length,
          checkedCount,
          pendingCount: Math.max(items.length - checkedCount, 0),
        };
      }).filter((item) => item.count > 0),
    [shoppingList?.items]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: '待购买',
        value: `${totalUnchecked}`,
        helper: totalUnchecked === 0 ? '这一单已经收口' : '按区域逐项勾选即可',
      },
      {
        label: '已完成',
        value: `${completedCount}`,
        helper: totalItems > 0 ? `共 ${totalItems} 项` : '还没有采购项',
      },
      {
        label: '预计花费',
        value: `¥${(shoppingList?.total_estimated_cost || 0).toFixed(0)}`,
        helper: shoppingList?.share ? '共享成员看到同一份预算' : '方便买菜前心里有数',
      },
    ],
    [completedCount, shoppingList?.share, shoppingList?.total_estimated_cost, totalItems, totalUnchecked]
  );

  const insightChips = useMemo(() => {
    const chips = [
      `${areaSummaries.length} 个分区`,
      getRoleLabel(shoppingList?.share?.role),
      shoppingList?.is_completed ? '整单已完成' : `${totalUnchecked} 项待购`,
    ];

    if (shoppingList?.inventory_summary?.covered_count) {
      chips.push(`库存已覆盖 ${shoppingList.inventory_summary.covered_count}`);
    }

    if (shoppingList?.inventory_summary?.missing_count) {
      chips.push(`仍需采购 ${shoppingList.inventory_summary.missing_count}`);
    }

    return chips;
  }, [areaSummaries.length, shoppingList?.inventory_summary, shoppingList?.is_completed, shoppingList?.share?.role, totalUnchecked]);

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.add(area);
      }
      return next;
    });
  };

  const handleToggleItem = async (area: string, ingredientId: string, checked: boolean) => {
    try {
      await updateMutation.mutateAsync({
        area,
        ingredient_id: ingredientId,
        checked: !checked,
      });
      await trackEvent('shared_list_item_toggled', {
        timestamp: new Date().toISOString(),
        screen: 'ShoppingListDetail',
        source: 'shopping_list_detail',
        listId,
        checked: !checked,
        ingredient_id: ingredientId,
      });
    } catch (mutationError) {
      console.error('更新失败:', mutationError);
      Alert.alert('更新失败', '请稍后重试');
    }
  };

  const handleCreateShare = async () => {
    if (shoppingList?.share?.invite_code) {
      Alert.alert(
        '共享清单',
        `邀请码：${shoppingList.share.invite_code}\n链接：${shoppingList.share.share_link}`
      );
      return;
    }

    try {
      const share = await shareMutation.mutateAsync();
      await trackEvent('share_link_created', {
        timestamp: new Date().toISOString(),
        screen: 'ShoppingListDetail',
        source: 'shopping_list_detail',
        listId,
        shareId: share?.id,
      });
      Alert.alert('共享链接已生成', `邀请码：${share.invite_code}\n链接：${share.share_link}`);
    } catch {
      Alert.alert('生成失败', '请稍后重试');
    }
  };

  const handleRegenerateInvite = async () => {
    try {
      const share = await regenerateInviteMutation.mutateAsync();
      await trackEvent('share_invite_revoked', {
        timestamp: new Date().toISOString(),
        userId: null,
        shareId: share?.id,
        targetMemberId: null,
        screen: 'ShoppingListDetail',
        source: 'shopping_list_detail',
      });
      await trackEvent('share_invite_regenerated', {
        timestamp: new Date().toISOString(),
        userId: null,
        shareId: share?.id,
        targetMemberId: null,
        screen: 'ShoppingListDetail',
        source: 'shopping_list_detail',
      });
      Alert.alert('邀请码已更新', `新邀请码：${share.invite_code}`);
    } catch (mutationError: any) {
      Alert.alert('操作失败', mutationError?.message || '请稍后重试');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMemberMutation.mutateAsync(memberId);
      await trackEvent('share_member_removed', {
        timestamp: new Date().toISOString(),
        userId: null,
        shareId: shoppingList?.share?.share_id || null,
        targetMemberId: memberId,
        screen: 'ShoppingListDetail',
        source: 'shopping_list_detail',
      });
      Alert.alert('已移除成员');
    } catch (mutationError: any) {
      Alert.alert('移除失败', mutationError?.message || '请稍后重试');
    }
  };

  const ListItem = ({ item, area }: { item: any; area: string }) => {
    const isChecked = item.checked || false;
    const sourceLabel = getSourceLabel(item);
    const recipeCount = item.recipes?.length || item.from_recipes?.length || 0;
    const helperText = [
      sourceLabel,
      recipeCount > 0 ? `关联 ${recipeCount} 道菜` : '',
      item.note || '',
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <Pressable
        style={({ pressed }) => [
          styles.listItem,
          pressed && styles.listItemPressed,
          isChecked && styles.listItemChecked,
        ]}
        onPress={() => handleToggleItem(area, item.ingredient_id || item.name, isChecked)}
        accessibilityLabel={`${item.name} ${item.amount}${isChecked ? '，已购买' : ''}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
      >
        <View style={styles.checkboxWrap}>
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        </View>
        <View style={styles.itemMain}>
          <View style={styles.itemHeaderRow}>
            <Text style={[styles.itemName, isChecked && styles.itemNameChecked]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemAmount}>{item.amount}</Text>
          </View>
          {helperText ? <Text style={styles.itemMeta}>{helperText}</Text> : null}
        </View>
      </Pressable>
    );
  };

  const AreaSection = ({ area, items }: { area: string; items: any[] }) => {
    const summary = areaSummaries.find((item) => item.area === area);
    const expanded = expandedAreas.has(area);
    const checkedCount = summary?.checkedCount || 0;
    const pendingCount = summary?.pendingCount || 0;
    const meta = AREA_META[area] || AREA_META.other;

    return (
      <View style={styles.areaSection}>
        <TouchableOpacity style={styles.areaHeader} onPress={() => toggleArea(area)} activeOpacity={0.85}>
          <View style={styles.areaHeaderLeft}>
            <View style={styles.areaIconBubble}>
              <Text style={styles.areaIcon}>{meta.icon}</Text>
            </View>
            <View style={styles.areaHeaderTextWrap}>
              <Text style={styles.areaTitle}>{meta.label}</Text>
              <Text style={styles.areaSubtitle}>
                已勾选 {checkedCount}/{items.length} · {pendingCount === 0 ? '这一组已买齐' : `还差 ${pendingCount} 项`}
              </Text>
            </View>
          </View>
          <View style={styles.areaHeaderRight}>
            <View style={[styles.areaBadge, pendingCount === 0 && styles.areaBadgeDone]}>
              <Text style={[styles.areaBadgeText, pendingCount === 0 && styles.areaBadgeTextDone]}>
                {pendingCount === 0 ? '已收口' : `${pendingCount} 待购`}
              </Text>
            </View>
            <Text style={styles.areaChevron}>{expanded ? '收起' : '展开'}</Text>
          </View>
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.areaItems}>
            {items.map((item) => (
              <ListItem key={item.ingredient_id || `${area}-${item.name}`} item={item} area={area} />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理购物清单...</Text>
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
          <Text style={styles.errorText}>这张清单暂时没有拉回来，重新试一次就好。</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.eyebrow}>Shopping list detail</Text>
              <Text style={styles.heroTitle}>这张清单已经按采购顺序拆好，买菜时直接勾就行</Text>
              <Text style={styles.heroSubtitle}>
                {shoppingList?.list_date ? formatFullDate(shoppingList.list_date) : '当前购物清单'}
              </Text>
            </View>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('ShoppingListHistory')}>
              <Text style={styles.secondaryActionText}>历史清单</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {insightChips.map((chip) => (
              <View key={chip} style={styles.insightChip}>
                <Text style={styles.insightChipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryAction} onPress={handleCreateShare} disabled={shareMutation.isPending}>
              <Text style={styles.primaryActionText}>
                {shareMutation.isPending ? '处理中...' : shoppingList?.share ? '查看共享' : '共享清单'}
              </Text>
            </TouchableOpacity>
            {!!shoppingList?.share?.role && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{getRoleLabel(shoppingList.share.role)}</Text>
              </View>
            )}
          </View>
        </View>

        {shoppingList?.inventory_summary ? (
          <View style={styles.inventoryCard}>
            <Text style={styles.cardTitle}>和库存的联动结果</Text>
            <Text style={styles.cardDescription}>先消耗家里已有食材，再把确实缺的项目带去超市。</Text>
            <View style={styles.inventoryStatsRow}>
              <View style={styles.inventoryStatCard}>
                <Text style={styles.inventoryStatValue}>{shoppingList.inventory_summary.covered_count || 0}</Text>
                <Text style={styles.inventoryStatLabel}>库存已覆盖</Text>
              </View>
              <View style={styles.inventoryStatCard}>
                <Text style={styles.inventoryStatValue}>{shoppingList.inventory_summary.missing_count || 0}</Text>
                <Text style={styles.inventoryStatLabel}>仍需采购</Text>
              </View>
              <View style={styles.inventoryStatCard}>
                <Text style={styles.inventoryStatValue}>{shoppingList.inventory_summary.expiring_items?.length || 0}</Text>
                <Text style={styles.inventoryStatLabel}>临期提醒</Text>
              </View>
            </View>
          </View>
        ) : null}

        {shoppingList?.share ? (
          <View style={styles.shareCard}>
            <Text style={styles.cardTitle}>共享状态</Text>
            <Text style={styles.cardDescription}>
              邀请码 {shoppingList.share.invite_code}，共享后成员会看到同一份勾选进度和预算。
            </Text>
            {shoppingList.share.role === 'owner' ? (
              <TouchableOpacity
                style={styles.tertiaryAction}
                onPress={handleRegenerateInvite}
                disabled={regenerateInviteMutation.isPending}
              >
                <Text style={styles.tertiaryActionText}>
                  {regenerateInviteMutation.isPending ? '重置中...' : '重置邀请码'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {shoppingList?.share?.role === 'owner' ? (
          <View style={styles.memberCard}>
            <Text style={styles.cardTitle}>共享成员</Text>
            <Text style={styles.cardDescription}>发起人可以在这里管理谁能一起勾选、一起买菜。</Text>
            {shareMembers.length === 0 ? (
              <Text style={styles.emptyMemberText}>还没有成员加入，先把邀请码发给家人吧。</Text>
            ) : (
              shareMembers.map((member: any) => {
                const displayName = member.display_name || member.user_id;
                const avatarText = (displayName || '?').trim().charAt(0).toUpperCase() || '?';

                return (
                  <View key={member.user_id} style={styles.memberRow}>
                    <View style={styles.memberLeft}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{avatarText}</Text>
                      </View>
                      <Text style={styles.memberName}>{displayName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveMember(member.user_id)}>
                      <Text style={styles.memberRemove}>移除</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {!hasList ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>这张清单还是空的</Text>
            <Text style={styles.emptyText}>回到购物清单首页生成采购项，或者从历史清单里切换一张已有的。</Text>
            <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('ShoppingList')}>
              <Text style={styles.primaryActionText}>回到清单首页</Text>
            </TouchableOpacity>
          </View>
        ) : (
          areaSummaries.map(({ area }) => {
            const items = (shoppingList?.items?.[area] as any[]) || [];
            if (!items.length) return null;
            return <AreaSection key={area} area={area} items={items} />;
          })
        )}
      </ScrollView>
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
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  errorText: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroTextBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  secondaryAction: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secondaryActionText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  insightChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  insightChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  summaryHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryAction: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primaryActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  rolePill: {
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rolePillText: {
    color: Colors.primary.dark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  inventoryCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  shareCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  memberCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  cardDescription: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  inventoryStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  inventoryStatCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  inventoryStatValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  inventoryStatLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  tertiaryAction: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: Colors.functional.warningLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tertiaryActionText: {
    color: Colors.functional.warning,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyMemberText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  memberRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  memberName: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  memberRemove: {
    color: Colors.functional.error,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyState: {
    marginTop: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    ...Shadows.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  emptyText: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  areaSection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  areaIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaIcon: {
    fontSize: Typography.fontSize.base,
  },
  areaHeaderTextWrap: {
    flex: 1,
  },
  areaTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  areaSubtitle: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  areaHeaderRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  areaBadge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  areaBadgeDone: {
    backgroundColor: Colors.functional.successLight,
  },
  areaBadgeText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  areaBadgeTextDone: {
    color: Colors.functional.success,
  },
  areaChevron: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  areaItems: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  listItemPressed: {
    opacity: 0.85,
  },
  listItemChecked: {
    backgroundColor: Colors.neutral.gray100,
  },
  checkboxWrap: {
    marginRight: Spacing.sm,
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  checkmark: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  itemMain: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.text.secondary,
  },
  itemAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemMeta: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
