// @ts-nocheck
import React, { useState } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { useCreateShoppingListShare, useRegenerateShoppingListShareInvite, useRemoveShoppingListShareMember, useShoppingListDetail, useUpdateShoppingListItem } from '../../hooks/useShoppingLists';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { trackEvent } from '../../analytics/sdk';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingListDetail'>;

// 存储区域显示标签
const AREA_LABELS: Record<string, string> = {
  produce: '🥬 生鲜蔬果',
  protein: '🥩 肉蛋水产豆制品',
  staple: '🍚 主食干货',
  seasoning: '🧂 调味酱料',
  snack_dairy: '🥛 零食乳品',
  household: '🧻 日用清洁',
  other: '📦 其他',
};

const AREA_ORDER = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other'];

export function ShoppingListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(AREA_ORDER));

  const { data: shoppingList, isLoading, error, refetch } = useShoppingListDetail(listId);
  const updateMutation = useUpdateShoppingListItem(listId);
  const shareMutation = useCreateShoppingListShare(listId);
  const regenerateInviteMutation = useRegenerateShoppingListShareInvite(listId);
  const removeMemberMutation = useRemoveShoppingListShareMember(listId);

  // 切换区域展开/折叠
  const toggleArea = (area: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(area)) {
        newSet.delete(area);
      } else {
        newSet.add(area);
      }
      return newSet;
    });
  };

  // 切换项目勾选状态
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
    } catch (error) {
      console.error('更新失败:', error);
      Alert.alert('更新失败', '请稍后重试');
    }
  };

  const handleCreateShare = async () => {
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
    } catch (e: any) {
      Alert.alert('操作失败', e?.message || '请稍后重试');
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
    } catch (e: any) {
      Alert.alert('移除失败', e?.message || '请稍后重试');
    }
  };

  // 渲染购物清单项
  const ListItem = ({ item, area }: { item: any; area: string }) => {
    const isChecked = item.checked || false;

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
        accessibilityHint="点击切换购买状态"
      >
        <View style={styles.listItemContent}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, isChecked && styles.itemNameChecked]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemAmount}>{item.amount}</Text>
            {item.recipes && item.recipes.length > 0 && (
              <Text style={styles.itemRecipes}>用于: {item.recipes.join(', ')}</Text>
            )}
          </View>
          {item.estimated_price && (
            <Text style={styles.itemPrice}>¥{item.estimated_price.toFixed(2)}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  // 渲染存储区域分组
  const AreaSection = ({ area, items }: { area: string; items: any[] }) => {
    if (!items || items.length === 0) return <></>;

    const isExpanded = expandedAreas.has(area);
    const checkedCount = items.filter((i) => i.checked).length;
    const allChecked = checkedCount === items.length;

    return (
      <View style={styles.areaSection}>
        <TouchableOpacity
          style={styles.areaHeader}
          onPress={() => toggleArea(area)}
          accessibilityLabel={`${AREA_LABELS[area]}，${checkedCount}/${items.length}已购买`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.areaHeaderLeft}>
            <Text style={styles.areaHeaderIcon}>
              {isExpanded ? '▼' : '▶'}
            </Text>
            <Text style={styles.areaHeaderText}>{AREA_LABELS[area]}</Text>
            <Text style={styles.areaItemCount}>({checkedCount}/{items.length})</Text>
          </View>
          {allChecked && <Text style={styles.areaCompletedBadge}>✓</Text>}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.areaItems}>
            {items.map((item, index) => (
              <ListItem key={`${item.name}-${index}`} item={item} area={area} />
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasList = shoppingList && shoppingList.items && Object.keys(shoppingList.items).length > 0;
  const totalUnchecked = shoppingList?.unchecked_items || 0;

  // 格式化日期显示
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>购物清单</Text>
        {shoppingList && (
          <Text style={styles.dateText}>
            {formatFullDate(shoppingList.list_date)}
          </Text>
        )}
        <TouchableOpacity style={styles.shareButton} onPress={handleCreateShare}>
          <Text style={styles.shareButtonText}>共享清单</Text>
        </TouchableOpacity>
        {!!shoppingList?.share?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>当前身份：{shoppingList.share.role}</Text>
          </View>
        )}
        {shoppingList?.is_completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ 已完成</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {shoppingList?.share?.role === 'owner' && (
          <View style={styles.ownerPanel}>
            <TouchableOpacity style={styles.ownerActionBtn} onPress={handleRegenerateInvite}>
              <Text style={styles.ownerActionBtnText}>失效当前邀请码并重置</Text>
            </TouchableOpacity>
            <Text style={styles.memberTitle}>成员列表（最小可用）</Text>
            {(shoppingList?.share?.members || []).length === 0 ? (
              <Text style={styles.memberItem}>暂无成员</Text>
            ) : (
              (shoppingList?.share?.members || []).map((m: any) => {
                const displayName = m.display_name || m.user_id;
                const avatarText = (displayName || '?').trim().charAt(0).toUpperCase() || '?';

                return (
                  <View key={m.user_id} style={styles.memberRow}>
                    <View style={styles.memberIdentity}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{avatarText}</Text>
                      </View>
                      <Text style={styles.memberItem}>{displayName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveMember(m.user_id)}>
                      <Text style={styles.memberRemove}>移除</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
        {!hasList ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>清单为空</Text>
          </View>
        ) : (
          <>
            {/* 统计信息 */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{shoppingList.total_items || 0}</Text>
                <Text style={styles.statLabel}>项目总数</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalUnchecked}</Text>
                <Text style={styles.statLabel}>待购买</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ¥{(shoppingList.total_estimated_cost || 0).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>预计花费</Text>
              </View>
            </View>

            {/* 按区域分组的清单项 */}
            {AREA_ORDER.map(area => {
              const items = (shoppingList.items?.[area] as any[]) || [];
              if (!items || items.length === 0) return null;
              return <AreaSection key={area} area={area} items={items} />;
            }).filter((item): item is React.ReactElement => item !== null)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 简化的阴影引用
const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
};

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
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  dateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  completedBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: Colors.functional.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  shareButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  shareButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  completedBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  ownerPanel: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  ownerActionBtn: {
    backgroundColor: Colors.functional.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  ownerActionBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  memberTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  memberRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  memberItem: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  memberRemove: {
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.main,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral.gray200,
  },
  areaSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray50,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaHeaderIcon: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginRight: Spacing.sm,
  },
  areaHeaderText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  areaItemCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
  areaCompletedBadge: {
    fontSize: Typography.fontSize.lg,
    color: Colors.functional.success,
  },
  areaItems: {
    paddingVertical: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
  },
  listItemPressed: {
    backgroundColor: Colors.neutral.gray50,
  },
  listItemChecked: {
    backgroundColor: Colors.neutral.gray100,
    opacity: 0.7,
  },
  listItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.neutral.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  checkmark: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.text.secondary,
  },
  itemAmount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  itemRecipes: {
    fontSize: 10,
    color: Colors.functional.primary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
    marginLeft: Spacing.sm,
  },
});
