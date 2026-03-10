// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import {
  useLatestShoppingList,
  useGenerateShoppingList,
  useUpdateShoppingListItem,
  useMarkShoppingListComplete,
  useRemoveShoppingListItem,
  useAddShoppingListItem,
  useToggleAllShoppingListItems,
} from '../../hooks/useShoppingLists';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { trackEvent } from '../../analytics/sdk';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingList'>;

// 存储区域显示标签
const AREA_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  produce: { label: '生鲜蔬果', icon: '🥬', color: Colors.functional.success },
  protein: { label: '肉蛋水产豆制品', icon: '🥩', color: Colors.primary.main },
  staple: { label: '主食干货', icon: '🍚', color: Colors.secondary.main },
  seasoning: { label: '调味酱料', icon: '🧂', color: Colors.functional.warning },
  snack_dairy: { label: '零食乳品', icon: '🥛', color: '#A78BFA' },
  household: { label: '日用清洁', icon: '🧻', color: '#14B8A6' },
  other: { label: '其他', icon: '📦', color: Colors.text.secondary },
};

const AREA_ORDER = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other'];

// 筛选类型
type FilterType = 'all' | 'meal_plan' | 'recipe' | 'manual';

export function ShoppingListScreen({ navigation }: Props) {
  // 状态管理
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(AREA_ORDER));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [selectedArea, setSelectedArea] = useState('other');
  const [refreshing, setRefreshing] = useState(false);

  // 新增筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<FilterType>('all');
  const [mergeEnabled, setMergeEnabled] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: shoppingList, isLoading, error, refetch } = useLatestShoppingList();
  const generateMutation = useGenerateShoppingList();
  const updateMutation = useUpdateShoppingListItem(shoppingList?.id || '');
  const markCompleteMutation = useMarkShoppingListComplete();
  const removeMutation = useRemoveShoppingListItem(shoppingList?.id || '');
  const addMutation = useAddShoppingListItem(shoppingList?.id || '');
  const toggleAllMutation = useToggleAllShoppingListItems(shoppingList?.id || '');

  // 提取所有菜谱名称（用于筛选）
  const allRecipes = useMemo(() => {
    if (!shoppingList?.items) {return [];}
    const recipeSet = new Set<string>();
    Object.values(shoppingList.items).forEach((items: any[]) => {
      items.forEach((item: any) => {
        item.recipes?.forEach((recipe: string) => recipeSet.add(recipe));
      });
    });
    return Array.from(recipeSet).sort();
  }, [shoppingList]);

  const summaryChips = useMemo(() => {
    if (!shoppingList?.items) return [];
    const allItems = Object.values(shoppingList.items).flat();
    const babySpecific = allItems.filter((item: any) => item.source === 'baby').length;
    const sharedAcrossMeals = allItems.filter((item: any) => item.is_merged || (item.from_recipes?.length || 0) > 1).length;
    const pantryCovered = shoppingList?.inventory_summary?.covered_count || 0;
    const lowStock = shoppingList?.inventory_summary?.missing_count || 0;
    return [
      pantryCovered > 0 ? `库存覆盖 ${pantryCovered}` : null,
      lowStock > 0 ? `仍需采购 ${lowStock}` : null,
      babySpecific > 0 ? `宝宝专项 ${babySpecific}` : null,
      sharedAcrossMeals > 0 ? `跨餐复用 ${sharedAcrossMeals}` : null,
    ].filter(Boolean);
  }, [shoppingList]);

  // 筛选后的食材数据
  const filteredItems = useMemo(() => {
    if (!shoppingList?.items) {return {};}

    const result: Record<string, any[]> = {};

    AREA_ORDER.forEach(area => {
      const items = shoppingList.items[area] || [];

      result[area] = items.filter((item: any) => {
        // 按食材名称搜索
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // 按来源筛选（共用/大人/宝宝）
        if (sourceFilter !== 'all') {
          if (item.source !== sourceFilter) {return false;}
        }

        // 按菜谱筛选
        if (selectedRecipe !== 'all') {
          if (!item.recipes?.includes(selectedRecipe)) {return false;}
        }

        return true;
      });
    });

    return result;
  }, [shoppingList, searchQuery, sourceFilter, selectedRecipe]);

  // 生成今日购物清单
  const handleGenerate = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await generateMutation.mutateAsync({
        date: today,
        meal_types: ['breakfast', 'lunch', 'dinner'],
        servings: 2,
        merge: mergeEnabled,
      });
      trackEvent('shopping_list_created', {
        page_id: 'shopping_list',
        source: 'meal_plan',
        merge: mergeEnabled,
      });
    } catch (err) {
      console.error('生成购物清单失败:', err);
      Alert.alert('生成失败', '请确保今日有餐食计划');
    }
  };

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

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

  // 展开/折叠所有区域
  const expandAll = () => setExpandedAreas(new Set(AREA_ORDER));
  const collapseAll = () => setExpandedAreas(new Set());

  // 切换项目勾选状态
  const handleToggleItem = async (area: string, ingredientId: string, checked: boolean) => {
    if (!shoppingList?.id) {return;}

    try {
      await updateMutation.mutateAsync({
        area,
        ingredient_id: ingredientId,
        checked: !checked,
      });
      trackEvent('shopping_item_checked', {
        page_id: 'shopping_list',
        list_id: shoppingList?.id,
        item_id: ingredientId,
        checked: !checked,
      });
    } catch (err) {
      console.error('更新失败:', error);
      Alert.alert('更新失败', '请稍后重试');
    }
  };

  // 删除购物清单项
  const handleRemoveItem = async (area: string, itemName: string) => {
    if (!shoppingList?.id) {return;}

    try {
      await removeMutation.mutateAsync({ area, item_name: itemName });
    } catch (err) {
      console.error('删除失败:', err);
      Alert.alert('删除失败', '请稍后重试');
    }
  };

  // 手动添加购物清单项
  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('提示', '请输入物品名称');
      return;
    }

    if (!newItemAmount.trim()) {
      Alert.alert('提示', '请输入数量');
      return;
    }

    try {
      await addMutation.mutateAsync({
        item_name: newItemName.trim(),
        amount: newItemAmount.trim(),
        area: selectedArea,
      });
      trackEvent('shopping_item_added', {
        page_id: 'shopping_list',
        list_id: shoppingList?.id,
        item_name: newItemName.trim(),
        source: 'manual',
      });
      setShowAddModal(false);
      setNewItemName('');
      setNewItemAmount('');
    } catch (err) {
      console.error('添加失败:', error);
      Alert.alert('添加失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  // 全选/取消全选
  const handleToggleAll = async (checked: boolean) => {
    if (!shoppingList?.id) {return;}

    try {
      await toggleAllMutation.mutateAsync(checked);
    } catch (err) {
      console.error('操作失败:', error);
      Alert.alert('操作失败', '请稍后重试');
    }
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setSelectedRecipe('all');
  };

  // 渲染购物清单项
  const ListItem = ({ item, area }: { item: any; area: string }) => {
    const isChecked = item.checked || false;

    return (
      <View style={styles.listItemContainer} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [
            styles.listItem,
            isChecked && styles.listItemChecked,
            pressed && styles.listItemPressed,
          ]}
          onPress={() => handleToggleItem(area, item.ingredient_id || item.name, isChecked)}
          android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
        >
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemNameRow}>
              <Text style={[styles.itemName, isChecked && styles.itemNameChecked]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.source && (
                <View style={[
                  styles.sourceBadge,
                  item.source === 'both' && styles.sourceBadgeBoth,
                  item.source === 'adult' && styles.sourceBadgeAdult,
                  item.source === 'baby' && styles.sourceBadgeBaby,
                ]}>
                  <Text style={styles.sourceBadgeText}>
                    {item.source === 'both' ? '👨‍👶' : item.source === 'adult' ? '👨' : '👶'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.itemAmount}>{item.amount}</Text>
            {/* 显示食材来源：合并显示"来自: 菜谱1、菜谱2"，普通显示"用于: 菜谱1" */}
            {item.is_merged && item.from_recipes && item.from_recipes.length > 1 && (
              <Text style={styles.itemRecipes} numberOfLines={1}>
                来自: {item.from_recipes.join('、')}
              </Text>
            )}
            {!item.is_merged && item.recipes && item.recipes.length > 0 && (
              <Text style={styles.itemRecipes} numberOfLines={1}>
                用于: {item.recipes.join(', ')}
              </Text>
            )}
          </View>
          {item.estimated_price > 0 && (
            <Text style={styles.itemPrice}>¥{item.estimated_price.toFixed(0)}</Text>
          )}
        </Pressable>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveItem(area, item.name)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染存储区域分组
  const AreaSection = ({ area, items }: { area: string; items: any[] }) => {
    if (!items || items.length === 0) {return null;}

    const isExpanded = expandedAreas.has(area);
    const checkedCount = items.filter((i) => i.checked).length;
    const allChecked = checkedCount === items.length;
    const areaInfo = AREA_LABELS[area];

    return (
      <View style={styles.areaSection}>
        <TouchableOpacity
          style={[styles.areaHeader, { borderLeftColor: areaInfo.color }]}
          onPress={() => toggleArea(area)}
        >
          <View style={styles.areaHeaderLeft}>
            <Text style={styles.areaHeaderIcon}>{areaInfo.icon}</Text>
            <Text style={styles.areaHeaderText}>{areaInfo.label}</Text>
            <Text style={styles.areaItemCount}>({checkedCount}/{items.length})</Text>
          </View>
          <View style={styles.areaHeaderRight}>
            {allChecked && <Text style={styles.areaCompletedBadge}>✓</Text>}
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
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

  // 渲染筛选栏
  const FilterBar = () => (
    <View style={styles.filterContainer}>
      {/* 搜索框 */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索食材..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.text.tertiary}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 筛选按钮 */}
      <TouchableOpacity
        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterButtonText}>筛选 ▼</Text>
      </TouchableOpacity>
    </View>
  );

  // 渲染筛选面板
  const FilterPanel = () => {
    if (!showFilters) {return null;}

    return (
      <View style={styles.filterPanel}>
        {/* 按来源筛选 */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>按来源筛选</Text>
          <View style={styles.filterOptions}>
            {[
              { key: 'all', label: '全部', icon: '🍽️' },
              { key: 'meal_plan', label: '周计划', icon: '🗓️' },
              { key: 'recipe', label: '菜谱加入', icon: '📖' },
              { key: 'manual', label: '手动添加', icon: '✍️' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  sourceFilter === option.key && styles.filterChipActive,
                ]}
                onPress={() => setSourceFilter(option.key as FilterType)}
              >
                <Text style={styles.filterChipIcon}>{option.icon}</Text>
                <Text style={[
                  styles.filterChipText,
                  sourceFilter === option.key && styles.filterChipTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 按菜谱筛选 */}
        {allRecipes.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>按菜谱筛选</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedRecipe === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedRecipe('all')}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedRecipe === 'all' && styles.filterChipTextActive,
                  ]}>
                    全部菜谱
                  </Text>
                </TouchableOpacity>
                {allRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe}
                    style={[
                      styles.filterChip,
                      selectedRecipe === recipe && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedRecipe(recipe)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedRecipe === recipe && styles.filterChipTextActive,
                    ]} numberOfLines={1}>
                      {recipe}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 清除筛选 */}
        {(searchQuery || sourceFilter !== 'all' || selectedRecipe !== 'all') && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>清除所有筛选</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 加载状态
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载购物清单...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 错误状态
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
  const allCompleted = hasList && totalUnchecked === 0;
  const totalItems = shoppingList?.total_items || 0;
  const checkedCount = totalItems - totalUnchecked;
  const progress = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;
  const mealReadinessReady = shoppingList?.inventory_summary?.covered_count || 0;
  const mealReadinessTotal = (shoppingList?.inventory_summary?.covered_count || 0) + (shoppingList?.inventory_summary?.missing_count || 0);

  // 计算筛选后的统计数据
  const filteredTotal = Object.values(filteredItems).reduce((sum, items) => sum + items.length, 0);
  const filteredChecked = Object.values(filteredItems).reduce(
    (sum, items) => sum + items.filter((i: any) => i.checked).length, 0
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerEyebrow}>Shopping</Text>
            <Text style={styles.title}>今日购物清单</Text>
            {shoppingList && (
              <Text style={styles.dateText}>
                {new Date(shoppingList.list_date).toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('ShoppingListHistory')}
          >
            <Text style={styles.historyButtonText}>📋 历史</Text>
          </TouchableOpacity>
        </View>
        {hasList && (
          <>
            <View style={styles.progressSummaryBlock}>
              <View style={styles.progressSummaryHeader}>
                <Text style={styles.progressSummaryTitle}>采购进度</Text>
                <Text style={styles.progressSummaryValue}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.readinessGrid}>
                <TouchableOpacity style={styles.readinessCard} onPress={() => navigation.navigate('WeeklyPlan')}>
                  <Text style={styles.readinessLabel}>Meal readiness</Text>
                  <Text style={styles.readinessValue}>{mealReadinessReady}/{mealReadinessTotal || mealReadinessReady}</Text>
                  <Text style={styles.readinessCaption}>已覆盖餐次</Text>
                </TouchableOpacity>
                <View style={styles.readinessCard}>
                  <Text style={styles.readinessLabel}>Still needed</Text>
                  <Text style={styles.readinessValue}>{totalUnchecked}</Text>
                  <Text style={styles.readinessCaption}>{totalUnchecked <= 3 ? '快完成了' : '继续补齐缺口'}</Text>
                </View>
              </View>
              {summaryChips.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryChipRow}>
                  {summaryChips.map((chip) => (
                    <View key={chip as string} style={styles.summaryChip}>
                      <Text style={styles.summaryChipText}>{chip}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.backToPlanButton} onPress={() => navigation.navigate('WeeklyPlan')}>
                <Text style={styles.backToPlanButtonText}>← 回到周计划</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
        {!hasList ? (
          // 空状态
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>还没有购物清单</Text>
            <Text style={styles.emptyText}>根据今日餐食计划生成清单</Text>
            
            {/* 智能合并开关 */}
            <View style={styles.mergeToggle}>
              <TouchableOpacity 
                style={styles.mergeToggleOption}
                onPress={() => setMergeEnabled(false)}
              >
                <View style={[styles.mergeRadio, !mergeEnabled && styles.mergeRadioActive]} />
                <Text style={[styles.mergeToggleText, !mergeEnabled && styles.mergeToggleTextActive]}>
                  保持原样
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mergeToggleOption}
                onPress={() => setMergeEnabled(true)}
              >
                <View style={[styles.mergeRadio, mergeEnabled && styles.mergeRadioActive]} />
                <Text style={[styles.mergeToggleText, mergeEnabled && styles.mergeToggleTextActive]}>
                  🔗 智能合并相同食材
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.emptyActionText}>
                  {mergeEnabled ? '🧩 生成合并清单' : '🛒 生成今日清单'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 统计信息 */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{shoppingList.total_items || 0}</Text>
                <Text style={styles.statLabel}>食材总数</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.functional.success }]}>
                  {shoppingList.total_items - totalUnchecked}
                </Text>
                <Text style={styles.statLabel}>已购买</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: totalUnchecked > 0 ? Colors.functional.warning : Colors.functional.success }]}>
                  {totalUnchecked}
                </Text>
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

            {/* 闭环摘要 */}
            {!!shoppingList?.inventory_summary && (
              <View style={styles.pairedStatsCard}>
                <View style={styles.pairedStatsHeader}>
                  <Text style={styles.pairedStatsIcon}>🔄</Text>
                  <Text style={styles.pairedStatsTitle}>本周计划闭环摘要</Text>
                </View>
                <View style={styles.pairedStatsRow}>
                  <View style={[styles.pairedStatItem, styles.pairedStatBoth]}>
                    <Text style={styles.pairedStatValue}>{shoppingList.inventory_summary.covered_count || 0}</Text>
                    <Text style={styles.pairedStatLabel}>库存已覆盖</Text>
                  </View>
                  <View style={[styles.pairedStatItem, styles.pairedStatAdult]}>
                    <Text style={styles.pairedStatValue}>{shoppingList.inventory_summary.missing_count || 0}</Text>
                    <Text style={styles.pairedStatLabel}>仍需采购</Text>
                  </View>
                  <View style={[styles.pairedStatItem, styles.pairedStatBaby]}>
                    <Text style={styles.pairedStatValue}>{shoppingList.inventory_summary.expiring_items?.length || 0}</Text>
                    <Text style={styles.pairedStatLabel}>临期优先消耗</Text>
                  </View>
                </View>
                <Text style={styles.pairedStatsTip}>
                  💡 先用库存覆盖，再补缺口；做菜完成会优先扣减最早过期库存。
                </Text>
              </View>
            )}

            {/* 缺口 / 覆盖 */}
            {!!shoppingList?.inventory_summary && (
              <View style={styles.coverageCard}>
                {(shoppingList.inventory_summary.missing_items || []).length > 0 && (
                  <View style={styles.coverageSection}>
                    <Text style={styles.coverageTitle}>🛒 本周缺口</Text>
                    {(shoppingList.inventory_summary.missing_items || []).slice(0, 5).map((item: any) => (
                      <Text key={`${item.name}-${item.source_recipe_id || item.source_date || ''}`} style={styles.coverageText}>
                        • {item.name} {item.missing_amount || item.required_amount}
                      </Text>
                    ))}
                  </View>
                )}
                {(shoppingList.inventory_summary.covered_items || []).length > 0 && (
                  <View style={styles.coverageSection}>
                    <Text style={styles.coverageTitle}>✅ 已被库存覆盖</Text>
                    {(shoppingList.inventory_summary.covered_items || []).slice(0, 5).map((item: any) => (
                      <Text key={`${item.name}-${item.source_recipe_id || item.source_date || ''}-covered`} style={styles.coverageText}>
                        • {item.name} {item.covered_amount || item.required_amount}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 筛选栏 */}
            <FilterBar />
            <FilterPanel />

            {/* 筛选结果提示 */}
            {(searchQuery || sourceFilter !== 'all' || selectedRecipe !== 'all') && (
              <View style={styles.filterResultBar}>
                <Text style={styles.filterResultText}>
                  筛选结果: {filteredChecked}/{filteredTotal} 项
                </Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearFilterLink}>清除</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 展开/折叠全部按钮 */}
            <View style={styles.expandButtons}>
              <TouchableOpacity style={styles.expandButton} onPress={expandAll}>
                <Text style={styles.expandButtonText}>📂 展开全部</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.expandButton} onPress={collapseAll}>
                <Text style={styles.expandButtonText}>📁 折叠全部</Text>
              </TouchableOpacity>
            </View>

            {/* 按区域分组的清单项 */}
            {AREA_ORDER.map(area => {
              const items = filteredItems[area] || [];
              if (!items || items.length === 0) {return null;}
              return <AreaSection key={area} area={area} items={items} />;
            }).filter(Boolean)}

            {/* 无筛选结果提示 */}
            {filteredTotal === 0 && (
              <View style={styles.noFilterResult}>
                <Text style={styles.noFilterResultIcon}>🔍</Text>
                <Text style={styles.noFilterResultText}>没有找到匹配的食材</Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.noFilterResultLink}>清除筛选条件</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* 底部占位 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部操作按钮 */}
      {hasList && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.toggleAllButton]}
            onPress={() => handleToggleAll(totalUnchecked > 0)}
            disabled={toggleAllMutation.isPending}
          >
            <Text style={styles.actionButtonText}>
              {totalUnchecked > 0 ? '☑️ 全部标记为已购' : '☐ 取消全部标记'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.actionButtonText}>➕ 添加物品</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 添加物品弹窗 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加物品</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="物品名称"
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="数量（如：500g、2个）"
              value={newItemAmount}
              onChangeText={setNewItemAmount}
            />

            <Text style={styles.modalLabel}>存储区域</Text>
            <View style={styles.areaSelector}>
              {AREA_ORDER.map(area => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.areaOption,
                    selectedArea === area && styles.areaOptionActive,
                  ]}
                  onPress={() => setSelectedArea(area)}
                >
                  <Text style={[
                    styles.areaOptionText,
                    selectedArea === area && styles.areaOptionTextActive,
                  ]}>
                    {AREA_LABELS[area].icon} {AREA_LABELS[area].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddItem}
              >
                <Text style={styles.modalButtonConfirmText}>添加</Text>
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
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 头部
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  dateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  historyButton: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  historyButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  progressSummaryBlock: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  progressSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressSummaryTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
  },
  progressSummaryValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.main,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
  },
  readinessGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  readinessCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  readinessLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  readinessValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  readinessCaption: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  summaryChipRow: {
    paddingTop: Spacing.md,
    paddingRight: Spacing.md,
  },
  summaryChip: {
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  summaryChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
  },
  backToPlanButton: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.light,
  },
  backToPlanButtonText: {
    color: Colors.primary.dark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 内容区
  content: {
    flex: 1,
  },

  // 空状态
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 2,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 智能合并开关
  mergeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  mergeToggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  mergeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    marginRight: Spacing.xs,
  },
  mergeRadioActive: {
    backgroundColor: Colors.primary.main,
  },
  mergeToggleText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  mergeToggleTextActive: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },

  // 统计卡片
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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

  // 一菜两吃统计
  pairedStatsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pairedStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pairedStatsIcon: {
    fontSize: 24,
    marginRight: Spacing.xs,
  },
  pairedStatsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary.dark,
  },
  pairedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  pairedStatItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 80,
  },
  pairedStatBoth: {
    backgroundColor: Colors.secondary.light,
  },
  pairedStatAdult: {
    backgroundColor: Colors.primary.light,
  },
  pairedStatBaby: {
    backgroundColor: '#FFF3E0',
  },
  pairedStatValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  pairedStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  pairedStatsTip: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  coverageCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
  },
  coverageSection: {
    marginBottom: Spacing.sm,
  },
  coverageTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  coverageText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // 筛选栏
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  clearSearch: {
    fontSize: 16,
    color: Colors.text.tertiary,
    padding: Spacing.xs,
  },
  filterButton: {
    backgroundColor: Colors.background.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    height: 44,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary.light,
  },
  filterButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },

  // 筛选面板
  filterPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.full,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
  clearFiltersButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  clearFiltersText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
  },

  // 筛选结果提示
  filterResultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
  },
  filterResultText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
  },
  clearFilterLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },

  // 展开/折叠按钮
  expandButtons: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  expandButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  // 区域分组
  areaSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray50,
    borderLeftWidth: 4,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaHeaderIcon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  areaHeaderText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  areaItemCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  areaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaCompletedBadge: {
    fontSize: 14,
    color: Colors.functional.success,
    marginRight: Spacing.sm,
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  areaItems: {
    padding: Spacing.sm,
  },

  // 列表项
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  listItemChecked: {
    backgroundColor: Colors.neutral.gray50,
    opacity: 0.7,
  },
  listItemPressed: {
    opacity: 0.8,
  },
  checkboxContainer: {
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary.main,
  },
  checkmark: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  itemName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.text.secondary,
  },
  sourceBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  sourceBadgeBoth: {
    backgroundColor: Colors.secondary.light,
    borderColor: Colors.secondary.main,
  },
  sourceBadgeAdult: {
    backgroundColor: Colors.primary.light,
    borderColor: Colors.primary.main,
  },
  sourceBadgeBaby: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  sourceBadgeText: {
    fontSize: 10,
  },
  itemAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  itemRecipes: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  deleteButtonText: {
    fontSize: 18,
    color: Colors.functional.error,
  },

  // 无筛选结果
  noFilterResult: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noFilterResultIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  noFilterResultText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  noFilterResultLink: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary.main,
  },

  // 底部操作
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  toggleAllButton: {
    backgroundColor: Colors.primary.main,
  },
  addButton: {
    backgroundColor: Colors.functional.secondary || '#f59e0b',
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },

  // 弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  areaSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  areaOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
  },
  areaOptionActive: {
    backgroundColor: Colors.primary.main,
  },
  areaOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  areaOptionTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.neutral.gray100,
  },
  modalButtonCancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary.main,
  },
  modalButtonConfirmText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
});
