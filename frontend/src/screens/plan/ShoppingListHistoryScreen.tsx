import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useJoinShoppingListShare, useShoppingLists } from '../../hooks/useShoppingLists';
import { useJoinFamily } from '../../hooks/useFamilies';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { trackEvent } from '../../analytics/sdk';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingListHistory'>;

const AREA_LABELS: Record<string, string> = {
  produce: '🥬',
  protein: '🥩',
  staple: '🍚',
  seasoning: '🧂',
  snack_dairy: '🥛',
  household: '🧻',
  other: '📦',
};

const AREA_ORDER = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other'];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
};

export function ShoppingListHistoryScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const joinShareMutation = useJoinShoppingListShare();
  const joinFamilyMutation = useJoinFamily();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: shoppingListsData, isLoading, error, refetch } = useShoppingLists({
    start_date: startDate,
    end_date: endDate,
  });

  const shoppingLists = shoppingListsData?.items || [];

  const summaryCards = useMemo(
    () => [
      {
        label: '历史清单',
        value: `${shoppingLists.length}`,
        helper: '最近 30 天都留在这里',
      },
      {
        label: '已完成',
        value: `${shoppingLists.filter((item) => item.is_completed).length}`,
        helper: '买完后可以回看采购节奏',
      },
      {
        label: '待购累计',
        value: `${shoppingLists.reduce((sum, item) => sum + (item.unchecked_items || 0), 0)}`,
        helper: '适合快速找回未收口的旧单',
      },
    ],
    [shoppingLists]
  );

  const insightChips = useMemo(() => {
    const chips = [`${shoppingLists.length} 张清单`];
    const latestPending = shoppingLists.find((item) => !item.is_completed);
    if (latestPending) {
      chips.push(`最近待购 ${latestPending.unchecked_items || 0} 项`);
    }
    if (shoppingLists.some((item) => item.is_completed)) {
      chips.push('可回看已完成采购单');
    }
    chips.push('支持邀请码加入共享');
    return chips;
  }, [shoppingLists]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinShare = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('请输入邀请码');
      return;
    }

    try {
      await joinFamilyMutation.mutateAsync(inviteCode.trim());
      const joined = await joinShareMutation.mutateAsync(inviteCode.trim());
      await trackEvent('share_join_success', {
        timestamp: new Date().toISOString(),
        screen: 'ShoppingListHistory',
        source: 'shopping_list_history',
        shareId: joined.share_id,
        listId: joined.list_id,
      });
      navigation.navigate('ShoppingListDetail', { listId: joined.list_id });
    } catch {
      Alert.alert('加入失败', '邀请码无效或已失效');
    }
  };

  const ListCard = ({ list }: { list: any }) => {
    const totalItems = list.total_items || 0;
    const uncheckedItems = list.unchecked_items || 0;
    const estimatedCost = list.total_estimated_cost || 0;
    const areaCounts = AREA_ORDER.map((area) => ({
      area,
      count: list.items?.[area]?.length || 0,
    })).filter((item) => item.count > 0);

    return (
      <Pressable
        style={({ pressed }) => [styles.listCard, pressed && styles.listCardPressed, list.is_completed && styles.listCardCompleted]}
        onPress={() => navigation.navigate('ShoppingListDetail', { listId: list.id })}
        accessibilityRole="button"
        accessibilityLabel={`${formatFullDate(list.list_date)} 的购物清单`}
      >
        <View style={styles.listCardTopRow}>
          <View>
            <Text style={styles.listDateLabel}>{formatDate(list.list_date)}</Text>
            <Text style={styles.listFullDate}>{formatFullDate(list.list_date)}</Text>
          </View>
          <View style={[styles.statusPill, list.is_completed ? styles.statusPillDone : styles.statusPillPending]}>
            <Text style={[styles.statusPillText, list.is_completed ? styles.statusPillTextDone : styles.statusPillTextPending]}>
              {list.is_completed ? '已完成' : `${uncheckedItems} 项待购`}
            </Text>
          </View>
        </View>

        <View style={styles.listStatsRow}>
          <View style={styles.listStatBox}>
            <Text style={styles.listStatValue}>{totalItems}</Text>
            <Text style={styles.listStatLabel}>总项数</Text>
          </View>
          <View style={styles.listStatBox}>
            <Text style={styles.listStatValue}>¥{estimatedCost.toFixed(0)}</Text>
            <Text style={styles.listStatLabel}>预计花费</Text>
          </View>
          <View style={styles.listStatBox}>
            <Text style={styles.listStatValue}>{areaCounts.length}</Text>
            <Text style={styles.listStatLabel}>采购分区</Text>
          </View>
        </View>

        {areaCounts.length > 0 ? (
          <View style={styles.areaTags}>
            {areaCounts.map(({ area, count }) => (
              <View key={area} style={styles.areaTag}>
                <Text style={styles.areaTagIcon}>{AREA_LABELS[area]}</Text>
                <Text style={styles.areaTagText}>{count}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理历史清单...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>历史清单暂时没拉回来</Text>
          <Text style={styles.errorText}>重新试一次就好。</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>历史清单</Text>
          <Text style={styles.heroTitle}>把历史采购、共享入口和回看操作收在一起</Text>
          <Text style={styles.heroSubtitle}>最近 30 天的购物清单会保留在这里，也可以通过邀请码直接加入共享清单。</Text>

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

          <View style={styles.joinPanel}>
            <Text style={styles.joinTitle}>加入共享清单</Text>
            <Text style={styles.joinHint}>输入家人发来的邀请码，直接接手同一张采购单。</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                placeholder="输入共享邀请码"
                placeholderTextColor={Colors.text.tertiary}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.joinButton} onPress={handleJoinShare}>
                <Text style={styles.joinButtonText}>加入共享</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {shoppingLists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧺</Text>
            <Text style={styles.emptyTitle}>最近还没有历史清单</Text>
            <Text style={styles.emptyText}>先去当前购物清单生成一张，之后这里就能回看采购记录。</Text>
            <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('ShoppingList')}>
              <Text style={styles.primaryActionText}>去清单首页</Text>
            </TouchableOpacity>
          </View>
        ) : (
          shoppingLists.map((list) => <ListCard key={list.id} list={list} />)
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
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
    lineHeight: 20,
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
  joinPanel: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  joinTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  joinHint: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  joinRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  joinInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
  },
  joinButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: Colors.text.inverse,
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
  listCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  listCardPressed: {
    opacity: 0.9,
  },
  listCardCompleted: {
    opacity: 0.82,
  },
  listCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  listDateLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  listFullDate: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillPending: {
    backgroundColor: Colors.functional.warningLight,
  },
  statusPillDone: {
    backgroundColor: Colors.functional.successLight,
  },
  statusPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusPillTextPending: {
    color: Colors.functional.warning,
  },
  statusPillTextDone: {
    color: Colors.functional.success,
  },
  listStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  listStatBox: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  listStatValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  listStatLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  areaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  areaTagIcon: {
    fontSize: Typography.fontSize.xs,
  },
  areaTagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
});
