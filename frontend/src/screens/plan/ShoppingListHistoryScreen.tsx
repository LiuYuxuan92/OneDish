import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { useShoppingLists } from '../../hooks/useShoppingLists';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingListHistory'>;

// 存储区域显示标签
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

export function ShoppingListHistoryScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  // 获取过去30天的购物清单
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: shoppingListsData, isLoading, error, refetch } = useShoppingLists({
    start_date: startDate,
    end_date: endDate,
  });

  const shoppingLists = shoppingListsData?.items || [];

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 判断是否是今天
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    }
    // 判断是否是昨天
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    // 其他情况显示月/日
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 格式化完整日期
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  // 渲染购物清单卡片
  const ListCard = ({ list }: { list: any }) => {
    const totalItems = list.total_items || 0;
    const uncheckedItems = list.unchecked_items || 0;
    const isCompleted = list.is_completed;
    const estimatedCost = list.total_estimated_cost || 0;

    // 计算各个区域的数量
    const areaCounts = AREA_ORDER.map(area => ({
      area,
      count: list.items?.[area]?.length || 0,
    })).filter(item => item.count > 0);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.listCard,
          pressed && styles.listCardPressed,
          isCompleted && styles.listCardCompleted,
        ]}
        onPress={() => navigation.navigate('ShoppingListDetail', { listId: list.id })}
        accessibilityLabel={`${formatFullDate(list.list_date)}的购物清单，共${totalItems}项${isCompleted ? '，已完成' : ''}`}
        accessibilityRole="button"
      >
        <View style={styles.listCardHeader}>
          <View style={styles.listCardHeaderLeft}>
            <Text style={styles.listCardDate}>{formatDate(list.list_date)}</Text>
            <Text style={styles.listCardFullDate}>{formatFullDate(list.list_date)}</Text>
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ 已完成</Text>
            </View>
          )}
        </View>

        <View style={styles.listCardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🛒</Text>
            <Text style={styles.statText}>{totalItems}项</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statText}>¥{estimatedCost.toFixed(0)}</Text>
          </View>
          {!isCompleted && (
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⏳</Text>
              <Text style={styles.statText}>{uncheckedItems}待购</Text>
            </View>
          )}
        </View>

        {areaCounts.length > 0 && (
          <View style={styles.areaTags}>
            {areaCounts.map(({ area, count }) => (
              <View key={area} style={styles.areaTag}>
                <Text style={styles.areaTagIcon}>{AREA_LABELS[area]}</Text>
                <Text style={styles.areaTagText}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>历史清单</Text>
        <Text style={styles.subtitle}>最近30天的购物清单</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {shoppingLists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>还没有购物清单</Text>
            <Text style={styles.emptyText}>生成您的第一个购物清单</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('ShoppingList')}
            >
              <Text style={styles.createButtonText}>去创建</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {shoppingLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
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
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
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
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  createButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  createButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  listCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  listCardPressed: {
    backgroundColor: Colors.neutral.gray50,
  },
  listCardCompleted: {
    opacity: 0.7,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listCardHeaderLeft: {
    flex: 1,
  },
  listCardDate: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  listCardFullDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: Colors.functional.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  completedBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  listCardStats: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  statIcon: {
    fontSize: Typography.fontSize.sm,
    marginRight: 2,
  },
  statText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  areaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -Spacing.xs,
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  areaTagIcon: {
    fontSize: Typography.fontSize.xs,
  },
  areaTagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
});
