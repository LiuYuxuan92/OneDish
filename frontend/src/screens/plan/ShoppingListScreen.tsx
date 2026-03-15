// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import { trackEvent } from '../../analytics/sdk';
import {
  useAddShoppingListItem,
  useGenerateShoppingList,
  useLatestShoppingList,
  useRemoveShoppingListItem,
  useToggleAllShoppingListItems,
  useUpdateShoppingListItem,
} from '../../hooks/useShoppingLists';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  TrashIcon,
} from '../../components/common/Icons';

type Props = NativeStackScreenProps<PlanStackParamList, 'ShoppingList'>;
type FilterType = 'all' | 'meal_plan' | 'recipe' | 'manual' | 'adult' | 'baby' | 'both';

const AREA_ORDER = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other'];
const SOURCE_OPTIONS: Array<{ key: FilterType; label: string }> = [
  { key: 'all', label: '全部来源' },
  { key: 'meal_plan', label: '周计划' },
  { key: 'recipe', label: '菜谱加入' },
  { key: 'manual', label: '手动补充' },
  { key: 'adult', label: '成人版' },
  { key: 'baby', label: '宝宝版' },
  { key: 'both', label: '共食' },
];

const AREA_META: Record<string, { label: string; shortLabel: string; color: string; hint: string }> = {
  produce: { label: '蔬果生鲜', shortLabel: '生鲜', color: '#6E8C62', hint: '优先买新鲜、当天容易用掉的食材' },
  protein: { label: '肉蛋豆奶', shortLabel: '蛋白', color: '#B57363', hint: '优先确认主菜和宝宝蛋白来源' },
  staple: { label: '主食干货', shortLabel: '主食', color: '#C49A58', hint: '适合囤一点，减少每天临时决策' },
  seasoning: { label: '调味辅料', shortLabel: '调味', color: '#8C6A54', hint: '做家庭共食时控制盐糖和刺激性调味' },
  snack_dairy: { label: '奶制品零食', shortLabel: '零食', color: '#8A97B3', hint: '补充早餐和加餐位的安全选择' },
  household: { label: '厨房日用', shortLabel: '日用', color: '#6B9C92', hint: '顺手补齐保鲜袋、纸巾等消耗品' },
  other: { label: '其他补充', shortLabel: '其他', color: Colors.text.tertiary, hint: '把零散需求收口，避免重复跑超市' },
};

export function ShoppingListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(AREA_ORDER));
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<FilterType>('all');
  const [selectedRecipe, setSelectedRecipe] = useState('all');
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);
  const [mergeEnabled, setMergeEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [selectedArea, setSelectedArea] = useState('other');

  const { data: shoppingList, isLoading, error, refetch } = useLatestShoppingList();
  const generateMutation = useGenerateShoppingList();
  const updateMutation = useUpdateShoppingListItem(shoppingList?.id || '');
  const removeMutation = useRemoveShoppingListItem(shoppingList?.id || '');
  const addMutation = useAddShoppingListItem(shoppingList?.id || '');
  const toggleAllMutation = useToggleAllShoppingListItems(shoppingList?.id || '');

  const allItems = useMemo(() => Object.values(shoppingList?.items || {}).flat(), [shoppingList]);

  const allRecipes = useMemo(() => {
    const names = new Set<string>();
    allItems.forEach((item: any) => {
      (item.recipes || item.from_recipes || []).forEach((recipe: string) => {
        if (recipe) {
          names.add(recipe);
        }
      });
    });
    return Array.from(names).sort();
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const result: Record<string, any[]> = {};

    AREA_ORDER.forEach((area) => {
      const areaItems = shoppingList?.items?.[area] || [];
      result[area] = areaItems.filter((item: any) => {
        if (showOnlyUnchecked && item.checked) {
          return false;
        }

        if (searchQuery.trim()) {
          const keyword = searchQuery.trim().toLowerCase();
          const haystack = [item.name, item.amount, ...(item.recipes || []), ...(item.from_recipes || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(keyword)) {
            return false;
          }
        }

        if (sourceFilter !== 'all' && item.source !== sourceFilter) {
          return false;
        }

        if (selectedRecipe !== 'all') {
          const recipes = [...(item.recipes || []), ...(item.from_recipes || [])];
          if (!recipes.includes(selectedRecipe)) {
            return false;
          }
        }

        return true;
      });
    });

    return result;
  }, [searchQuery, selectedRecipe, shoppingList, showOnlyUnchecked, sourceFilter]);

  const hasList = allItems.length > 0;
  const totalItems = shoppingList?.total_items ?? allItems.length;
  const uncheckedItems = shoppingList?.unchecked_items ?? allItems.filter((item: any) => !item.checked).length;
  const checkedItems = Math.max(totalItems - uncheckedItems, 0);
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const coveredCount = shoppingList?.inventory_summary?.covered_count || 0;
  const missingCount = shoppingList?.inventory_summary?.missing_count || 0;
  const expiringCount = shoppingList?.inventory_summary?.expiring_items?.length || 0;
  const mergedCount = allItems.filter((item: any) => item.is_merged || (item.from_recipes?.length || 0) > 1).length;
  const filteredTotal = Object.values(filteredItems).reduce((sum, items) => sum + items.length, 0);
  const visibleAreas = AREA_ORDER.filter((area) => (filteredItems[area] || []).length > 0);
  const activeFiltersCount = [
    searchQuery.trim() ? 'q' : '',
    sourceFilter !== 'all' ? 'source' : '',
    selectedRecipe !== 'all' ? 'recipe' : '',
    showOnlyUnchecked ? 'unchecked' : '',
  ].filter(Boolean).length;

  const summaryChips = [
    coveredCount > 0 ? `库存已覆盖 ${coveredCount} 项` : null,
    missingCount > 0 ? `仍需采购 ${missingCount} 项` : null,
    mergedCount > 0 ? `可复用食材 ${mergedCount} 项` : null,
    expiringCount > 0 ? `有 ${expiringCount} 项快到期` : null,
  ].filter(Boolean) as string[];

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
      Alert.alert('生成失败', '请先确认今天已有可用的周计划。');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

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

  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setSelectedRecipe('all');
    setShowOnlyUnchecked(false);
  };

  const handleToggleItem = async (area: string, item: any) => {
    if (!shoppingList?.id) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        area,
        ingredient_id: item.ingredient_id || item.name,
        checked: !item.checked,
      });
      trackEvent('shopping_item_checked', {
        page_id: 'shopping_list',
        list_id: shoppingList.id,
        item_id: item.ingredient_id || item.name,
        checked: !item.checked,
      });
    } catch (err) {
      Alert.alert('更新失败', '稍后再试一次。');
    }
  };

  const handleRemoveItem = async (area: string, itemName: string) => {
    if (!shoppingList?.id) {
      return;
    }

    try {
      await removeMutation.mutateAsync({ area, item_name: itemName });
    } catch (err) {
      Alert.alert('删除失败', '稍后再试一次。');
    }
  };

  const handleAddItem = async () => {
    if (!shoppingList?.id) {
      Alert.alert('还没有清单', '先生成今日购物清单，再补充手动条目。');
      return;
    }

    if (!newItemName.trim()) {
      Alert.alert('请输入名称', '建议直接写食材名，后面更容易搜索。');
      return;
    }

    if (!newItemAmount.trim()) {
      Alert.alert('请输入数量', '例如 2 个、300g、1 盒。');
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
        list_id: shoppingList.id,
        item_name: newItemName.trim(),
        source: 'manual',
      });
      setShowAddModal(false);
      setNewItemName('');
      setNewItemAmount('');
      setSelectedArea('other');
    } catch (err: any) {
      Alert.alert('添加失败', err?.message || '稍后再试一次。');
    }
  };

  const handleToggleAll = async (nextChecked: boolean) => {
    if (!shoppingList?.id) {
      return;
    }

    try {
      await toggleAllMutation.mutateAsync(nextChecked);
    } catch (err) {
      Alert.alert('操作失败', '稍后再试一次。');
    }
  };

  const renderItem = (area: string, item: any, index: number) => {
    const sourceLabelMap: Record<string, string> = {
      meal_plan: '周计划',
      recipe: '菜谱',
      manual: '手动',
      adult: '成人',
      baby: '宝宝',
      both: '共食',
    };
    const sourceToneMap: Record<string, any> = {
      meal_plan: styles.sourceBadgePlan,
      recipe: styles.sourceBadgeRecipe,
      manual: styles.sourceBadgeManual,
      adult: styles.sourceBadgeAdult,
      baby: styles.sourceBadgeBaby,
      both: styles.sourceBadgeBoth,
    };
    const recipes = item.is_merged ? item.from_recipes : item.recipes;

    return (
      <View key={`${item.name}-${index}`} style={styles.itemCard}>
        <Pressable
          style={({ pressed }) => [
            styles.itemMain,
            item.checked && styles.itemMainChecked,
            pressed && styles.itemMainPressed,
          ]}
          onPress={() => handleToggleItem(area, item)}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked ? <CheckIcon size={16} color={Colors.text.inverse} /> : null}
          </View>

          <View style={styles.itemBody}>
            <View style={styles.itemTopRow}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.estimated_price ? (
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>¥{Number(item.estimated_price).toFixed(0)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.itemMetaRow}>
              <Text style={[styles.itemAmount, item.checked && styles.itemMuted]}>{item.amount || '待补充'}</Text>
              {item.source ? (
                <View style={[styles.sourceBadge, sourceToneMap[item.source]]}>
                  <Text style={styles.sourceBadgeText}>{sourceLabelMap[item.source] || item.source}</Text>
                </View>
              ) : null}
            </View>

            {recipes?.length ? (
              <Text style={[styles.itemRecipes, item.checked && styles.itemMuted]} numberOfLines={1}>
                {item.is_merged ? '复用自' : '用于'} {recipes.join('、')}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveItem(area, item.name)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <TrashIcon size={18} color={Colors.functional.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.stateTitle}>正在整理购物清单</Text>
          <Text style={styles.stateText}>把今天真正要买的内容先归拢清楚。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>购物清单加载失败</Text>
          <Text style={styles.stateText}>网络或服务暂时不可用，重新拉一次即可。</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 104 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>购物清单</Text>
              <Text style={styles.heroTitle}>今天买什么，一眼做决定</Text>
              <Text style={styles.heroSubtitle}>
                {shoppingList?.list_date
                  ? `${new Date(shoppingList.list_date).toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })} · 按宝宝和大人共食需求整理`
                  : '围绕今天的家庭用餐，把真正需要的东西集中列清楚'}
              </Text>
            </View>

            <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('ShoppingListHistory')}>
              <Text style={styles.historyButtonText}>历史</Text>
            </TouchableOpacity>
          </View>

          {hasList ? (
            <>
              <View style={styles.progressRow}>
                <View>
                  <Text style={styles.progressValue}>{progress}%</Text>
                  <Text style={styles.progressLabel}>{uncheckedItems > 0 ? `还差 ${uncheckedItems} 项` : '今天已经买齐了'}</Text>
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressMetaValue}>{checkedItems}/{totalItems}</Text>
                  <Text style={styles.progressMetaLabel}>已勾选</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>库存可覆盖</Text>
                  <Text style={styles.metricValue}>{coveredCount}</Text>
                  <Text style={styles.metricHint}>能直接消化家里现有食材</Text>
                </View>
                <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('WeeklyPlan')}>
                  <Text style={styles.metricLabel}>仍需采购</Text>
                  <Text style={styles.metricValue}>{missingCount || uncheckedItems}</Text>
                  <View style={styles.inlineLink}>
                    <Text style={styles.metricHint}>回看周计划</Text>
                    <ChevronRightIcon size={16} color={Colors.text.secondary} />
                  </View>
                </TouchableOpacity>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>预估花费</Text>
                  <Text style={styles.metricValue}>¥{Math.round(shoppingList?.total_estimated_cost || 0)}</Text>
                  <Text style={styles.metricHint}>只是估算，方便先心里有数</Text>
                </View>
              </View>

              {summaryChips.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryChipRow}>
                  {summaryChips.map((chip) => (
                    <View key={chip} style={styles.summaryChip}>
                      <Text style={styles.summaryChipText}>{chip}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </>
          ) : null}
        </View>

        {!hasList ? (
          <View style={styles.emptyHero}>
            <View style={styles.emptyIconWrap}>
              <ShoppingBagIcon size={24} color={Colors.primary.main} />
            </View>
            <Text style={styles.emptyTitle}>先生成一份今天可执行的购物清单</Text>
            <Text style={styles.emptyText}>
              结合今天的餐单，把真正要买的食材按区域归好，临出门前不用再临时想。
            </Text>

            <View style={styles.generateModeRow}>
              <TouchableOpacity
                style={[styles.generateModeCard, !mergeEnabled && styles.generateModeCardActive]}
                onPress={() => setMergeEnabled(false)}
              >
                <Text style={styles.generateModeTitle}>保持原样</Text>
                <Text style={styles.generateModeText}>按每道菜展开，适合第一次检查食材缺口。</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateModeCard, mergeEnabled && styles.generateModeCardActive]}
                onPress={() => setMergeEnabled(true)}
              >
                <Text style={styles.generateModeTitle}>自动合并</Text>
                <Text style={styles.generateModeText}>把重复食材合并成一项，买菜时更省脑力。</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, generateMutation.isPending && styles.primaryButtonDisabled]}
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {generateMutation.isPending ? '生成中...' : mergeEnabled ? '生成合并清单' : '生成今日清单'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLinkButton} onPress={() => navigation.navigate('WeeklyPlan')}>
              <Text style={styles.secondaryLinkText}>先去看看周计划</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.toolbarCard}>
              <View style={styles.searchBox}>
                <SearchIcon size={18} color={Colors.text.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="搜食材、数量或菜谱名"
                  placeholderTextColor={Colors.text.tertiary}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <CloseIcon size={18} color={Colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.toolbarActionRow}>
                <TouchableOpacity
                  style={[styles.toggleChip, showOnlyUnchecked && styles.toggleChipActive]}
                  onPress={() => setShowOnlyUnchecked((prev) => !prev)}
                >
                  <Text style={[styles.toggleChipText, showOnlyUnchecked && styles.toggleChipTextActive]}>只看未买</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionChip} onPress={() => handleToggleAll(uncheckedItems > 0)}>
                  <Text style={styles.quickActionChipText}>{uncheckedItems > 0 ? '全部勾选' : '全部恢复'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionChip} onPress={() => setExpandedAreas(new Set(AREA_ORDER))}>
                  <Text style={styles.quickActionChipText}>展开全部</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {SOURCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, sourceFilter === option.key && styles.filterChipActive]}
                    onPress={() => setSourceFilter(option.key)}
                  >
                    <Text style={[styles.filterChipText, sourceFilter === option.key && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {allRecipes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipeChipRow}>
                  <TouchableOpacity
                    style={[styles.recipeChip, selectedRecipe === 'all' && styles.recipeChipActive]}
                    onPress={() => setSelectedRecipe('all')}
                  >
                    <Text style={[styles.recipeChipText, selectedRecipe === 'all' && styles.recipeChipTextActive]}>
                      全部菜谱
                    </Text>
                  </TouchableOpacity>
                  {allRecipes.map((recipe) => (
                    <TouchableOpacity
                      key={recipe}
                      style={[styles.recipeChip, selectedRecipe === recipe && styles.recipeChipActive]}
                      onPress={() => setSelectedRecipe(recipe)}
                    >
                      <Text
                        style={[styles.recipeChipText, selectedRecipe === recipe && styles.recipeChipTextActive]}
                        numberOfLines={1}
                      >
                        {recipe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {activeFiltersCount > 0 ? (
                <View style={styles.filterSummaryRow}>
                  <Text style={styles.filterSummaryText}>
                    当前筛出 {filteredTotal} 项，覆盖 {visibleAreas.length} 个采购区域
                  </Text>
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.filterSummaryAction}>清空筛选</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {filteredTotal === 0 ? (
              <View style={styles.emptyFilterCard}>
                <Text style={styles.emptyFilterTitle}>没有匹配到条目</Text>
                <Text style={styles.emptyFilterText}>换个关键词，或者先清掉筛选条件。</Text>
                <TouchableOpacity style={styles.inlineButton} onPress={clearFilters}>
                  <Text style={styles.inlineButtonText}>恢复全部清单</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visibleAreas.map((area) => {
                const items = filteredItems[area] || [];
                const meta = AREA_META[area];
                const checkedCountByArea = items.filter((item: any) => item.checked).length;
                const isExpanded = expandedAreas.has(area);

                return (
                  <View key={area} style={styles.sectionCard}>
                    <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleArea(area)}>
                      <View style={styles.sectionHeaderLeft}>
                        <View style={[styles.sectionAccent, { backgroundColor: meta.color }]} />
                        <View>
                          <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>{meta.label}</Text>
                            <View style={styles.sectionCountPill}>
                              <Text style={styles.sectionCountText}>{checkedCountByArea}/{items.length}</Text>
                            </View>
                          </View>
                          <Text style={styles.sectionHint}>{meta.hint}</Text>
                        </View>
                      </View>
                      <Text style={styles.sectionAction}>{isExpanded ? '收起' : '展开'}</Text>
                    </TouchableOpacity>

                    {isExpanded ? <View style={styles.sectionList}>{items.map((item: any, index: number) => renderItem(area, item, index))}</View> : null}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.9}
      >
        <PlusIcon size={20} color={Colors.text.inverse} />
        <Text style={styles.fabText}>手动补一项</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>补充清单条目</Text>
                <Text style={styles.modalSubtitle}>临时想到的食材，顺手记进今天这份清单。</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddModal(false)}>
                <CloseIcon size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>名称</Text>
              <TextInput
                style={styles.fieldInput}
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="例如 西兰花、宝宝酸奶、保鲜袋"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>数量</Text>
              <TextInput
                style={styles.fieldInput}
                value={newItemAmount}
                onChangeText={setNewItemAmount}
                placeholder="例如 1 份、300g、2 盒"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>归到哪个区域</Text>
              <View style={styles.areaChipWrap}>
                {AREA_ORDER.map((area) => {
                  const meta = AREA_META[area];
                  const active = selectedArea === area;

                  return (
                    <TouchableOpacity
                      key={area}
                      style={[styles.areaChip, active && styles.areaChipActive]}
                      onPress={() => setSelectedArea(area)}
                    >
                      <Text style={[styles.areaChipText, active && styles.areaChipTextActive]}>{meta.shortLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhostButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalGhostButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, addMutation.isPending && styles.modalPrimaryButtonDisabled]}
                onPress={handleAddItem}
                disabled={addMutation.isPending}
              >
                <Text style={styles.modalPrimaryButtonText}>{addMutation.isPending ? '添加中...' : '加入清单'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    gap: Spacing[4],
  },
  heroCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  heroCopy: {
    flex: 1,
    gap: Spacing[1.5],
  },
  eyebrow: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  heroSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  historyButton: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  historyButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  progressRow: {
    marginTop: Spacing[5],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressValue: {
    color: Colors.text.primary,
    fontSize: 34,
    fontWeight: Typography.fontWeight.bold,
  },
  progressLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing[1],
  },
  progressMeta: {
    alignItems: 'flex-end',
  },
  progressMetaValue: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressMetaLabel: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing[1],
  },
  progressTrack: {
    marginTop: Spacing[3],
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
  },
  metricGrid: {
    marginTop: Spacing[4],
    gap: Spacing[3],
  },
  metricCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    gap: Spacing[1],
  },
  metricLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
  },
  metricValue: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  metricHint: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  summaryChipRow: {
    paddingTop: Spacing[4],
    gap: Spacing[2],
  },
  summaryChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
  },
  summaryChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyHero: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing[4],
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.tertiary,
  },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 28,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  generateModeRow: {
    gap: Spacing[3],
  },
  generateModeCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing[4],
    backgroundColor: Colors.background.elevated,
    gap: Spacing[1.5],
  },
  generateModeCardActive: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.background.tertiary,
  },
  generateModeTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  generateModeText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: Spacing[1],
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.main,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondaryLinkButton: {
    alignSelf: 'flex-start',
  },
  secondaryLinkText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  toolbarCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing[3],
  },
  searchBox: {
    minHeight: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    paddingVertical: Spacing[2],
  },
  toolbarActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  toggleChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.elevated,
  },
  toggleChipActive: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  toggleChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  toggleChipTextActive: {
    color: Colors.text.inverse,
  },
  quickActionChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  quickActionChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  filterRow: {
    gap: Spacing[2],
  },
  filterChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
  },
  filterChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
  },
  recipeChipRow: {
    gap: Spacing[2],
  },
  recipeChip: {
    maxWidth: 180,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.elevated,
  },
  recipeChipActive: {
    backgroundColor: Colors.background.tertiary,
    borderColor: Colors.primary.main,
  },
  recipeChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  recipeChipTextActive: {
    color: Colors.primary.main,
  },
  filterSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  filterSummaryText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
  },
  filterSummaryAction: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyFilterCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing[2],
  },
  emptyFilterTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyFilterText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  inlineButton: {
    marginTop: Spacing[2],
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.tertiary,
  },
  inlineButtonText: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  sectionAccent: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCountPill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  sectionCountText: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: Typography.fontWeight.medium,
  },
  sectionHint: {
    marginTop: Spacing[1],
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  sectionAction: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  sectionList: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  itemMainChecked: {
    opacity: 0.72,
  },
  itemMainPressed: {
    opacity: 0.88,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border.dark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.elevated,
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.main,
  },
  itemBody: {
    flex: 1,
    gap: Spacing[1.5],
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  itemName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 22,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  itemAmount: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  itemMuted: {
    color: Colors.text.tertiary,
  },
  itemRecipes: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  pricePill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.elevated,
  },
  priceText: {
    color: Colors.secondary.main,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  sourceBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.elevated,
  },
  sourceBadgeText: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: Typography.fontWeight.medium,
  },
  sourceBadgePlan: {
    backgroundColor: Colors.background.tertiary,
  },
  sourceBadgeRecipe: {
    backgroundColor: Colors.functional.infoLight,
  },
  sourceBadgeManual: {
    backgroundColor: Colors.functional.warningLight,
  },
  sourceBadgeAdult: {
    backgroundColor: '#F5EEE8',
  },
  sourceBadgeBaby: {
    backgroundColor: '#EEF3F8',
  },
  sourceBadgeBoth: {
    backgroundColor: '#EDF4EE',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.functional.errorLight,
  },
  fab: {
    position: 'absolute',
    right: Spacing[4],
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    ...Shadows.lg,
  },
  fabText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.background.scrim,
    justifyContent: 'center',
    padding: Spacing[4],
  },
  modalCard: {
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    padding: Spacing[5],
    gap: Spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  modalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  modalSubtitle: {
    marginTop: Spacing[1],
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  fieldGroup: {
    gap: Spacing[2],
  },
  fieldLabel: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  fieldInput: {
    minHeight: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing[3],
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
  },
  areaChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  areaChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  areaChipActive: {
    backgroundColor: Colors.primary.main,
  },
  areaChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  areaChipTextActive: {
    color: Colors.text.inverse,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  modalGhostButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  modalGhostButtonText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  modalPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.main,
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.6,
  },
  modalPrimaryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
  },
  stateTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  stateText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
});
