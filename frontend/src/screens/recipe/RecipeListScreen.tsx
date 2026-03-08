// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useAllRecipes, useSearchRecipes } from '../../hooks/useRecipes';
import { useUnifiedSearch } from '../../hooks/useSearch';
import { useUserInfo } from '../../hooks/useUsers';
import { SearchResult } from '../../api/search';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { RecipeSummary } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList } from '../../types';
import { SearchIcon, XIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRecipeCard } from '../../components/common/Skeleton';

type Props = NativeStackScreenProps<RecipeStackParamList, 'RecipeList'>;

const RECIPE_TYPES = [
  { id: '', label: '全部', icon: '🍽️' },
  { id: 'breakfast', label: '早餐', icon: '🌅' },
  { id: 'lunch', label: '午餐', icon: '☀️' },
  { id: 'dinner', label: '晚餐', icon: '🌙' },
];

const DIFFICULTY_LEVELS = [
  { id: '', label: '全部难度', icon: '⚪' },
  { id: '简单', label: '简单', icon: '🟢' },
  { id: '中等', label: '中等', icon: '🟡' },
  { id: '困难', label: '困难', icon: '🔴' },
];

// 存储键名
const FILTER_STORAGE_KEY = '@recipe_filter_prefs';

// 用于存储筛选状态的引用（不触发重新渲染）
const filterStateRef = {
  searchQuery: '',
  selectedType: '',
  selectedDifficulty: '',
};

// 加载保存的筛选偏好
const loadSavedFilters = async (): Promise<{ type: string; difficulty: string } | null> => {
  try {
    const saved = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('加载筛选偏好失败:', error);
  }
  return null;
};

// 保存筛选偏好
const saveFilters = async (type: string, difficulty: string) => {
  try {
    await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ type, difficulty }));
  } catch (error) {
    console.error('保存筛选偏好失败:', error);
  }
};

export function RecipeListScreen({ navigation, route }: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [isOnlineSearch, setIsOnlineSearch] = useState(false); // 是否启用联网搜索
  const scrollViewRef = useRef<ScrollView>(null);

  // 从导航参数获取初始搜索词（首页点击食材筛选）
  // 使用 useRef 记录导航参数，避免重渲染问题
  const navIngredientRef = React.useRef(route.params?.ingredient || '');

  // 防抖搜索 - 延迟500ms更新搜索词（仅用于手动输入）
  useEffect(() => {
    // 如果是从导航参数来的搜索，直接使用，不经过防抖
    if (navIngredientRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 当导航参数变化时，同步搜索词
  useEffect(() => {
    const ingredient = route.params?.ingredient || '';
    navIngredientRef.current = ingredient;
    if (ingredient) {
      setSearchQuery(ingredient);
      setDebouncedSearch(ingredient);
    }
  }, [route.params?.ingredient]);

  // 每次屏幕获得焦点时，确保导航栈回到列表页面
  useFocusEffect(
    React.useCallback(() => {
      // 如果当前不是根页面，弹出到根页面
      const state = navigation.getState();
      if (state && state.routes.length > 1) {
        navigation.popToTop();
      }
    }, [navigation])
  );

  // 初始化：加载保存的筛选偏好或从导航参数获取
  useEffect(() => {
    const initFilters = async () => {
      const params = route.params;

      // 优先使用导航参数（从首页点击食材筛选而来）
      // 有导航参数时，先清空之前的搜索状态，再设置新的搜索词
      if (params?.ingredient) {
        setSearchQuery(params.ingredient);
        setDebouncedSearch(params.ingredient); // 立即更新防抖搜索词
        filterStateRef.searchQuery = params.ingredient;
      }
      if (params?.type) {
        setSelectedType(params.type);
        filterStateRef.selectedType = params.type;
      }
      if (params?.difficulty) {
        setSelectedDifficulty(params.difficulty);
        filterStateRef.selectedDifficulty = params.difficulty;
      }
      // 如果没有导航参数，加载保存的偏好
      if (!params?.ingredient && !params?.type && !params?.difficulty) {
        const saved = await loadSavedFilters();
        if (saved) {
          setSelectedType(saved.type || '');
          setSelectedDifficulty(saved.difficulty || '');
          filterStateRef.selectedType = saved.type || '';
          filterStateRef.selectedDifficulty = saved.difficulty || '';
        }
        // 没有导航参数时，也清空搜索词
        if (isInitialized) {
          setSearchQuery('');
          setDebouncedSearch('');
          navIngredientRef.current = '';
        }
      }

      if (!isInitialized) {
        setIsInitialized(true);
      }
    };
    initFilters();
  }, [route.params?.ingredient, route.params?.type, route.params?.difficulty]);

  // 更新引用状态
  useEffect(() => {
    filterStateRef.searchQuery = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    filterStateRef.selectedType = selectedType;
  }, [selectedType]);

  useEffect(() => {
    filterStateRef.selectedDifficulty = selectedDifficulty;
  }, [selectedDifficulty]);

  // 保存筛选偏好（当用户手动选择时）
  useEffect(() => {
    if (isInitialized && !route.params?.ingredient) {
      saveFilters(selectedType, selectedDifficulty);
    }
  }, [selectedType, selectedDifficulty, isInitialized, route.params]);

  const { data: allData, isLoading: isAllLoading, error: allError, refetch } = useAllRecipes();
  const { data: userInfo } = useUserInfo();
  const { data: searchData, isLoading: isSearchLoading, error: searchError } = useSearchRecipes({
    keyword: navIngredientRef.current || debouncedSearch,
    type: selectedType,
    difficulty: selectedDifficulty,
  });

  // 联网搜索
  const { data: onlineSearchData, isLoading: isOnlineSearchLoading, refetch: refetchOnlineSearch } = useUnifiedSearch(
    isOnlineSearch ? (navIngredientRef.current || debouncedSearch) : undefined
  );

  const activeSearch = navIngredientRef.current || debouncedSearch;

  // 根据是否启用联网搜索选择显示的数据
  let recipes: RecipeSummary[] = [];
  let resultSource: 'local' | 'tianxing' | 'ai' | undefined;

  if (isOnlineSearch && activeSearch) {
    // 联网搜索结果 - 将SearchResult转换为RecipeSummary格式
    const onlineResults = onlineSearchData?.results || [];
    recipes = onlineResults.map((item: SearchResult): RecipeSummary => ({
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      prep_time: item.prep_time || 0,
      source: item.source,
    }));
    resultSource = onlineSearchData?.source;
  } else if (activeSearch || selectedType || selectedDifficulty) {
    // 本地搜索结果
    recipes = searchData?.items || [];
  } else {
    // 全部菜谱
    recipes = allData?.items || [];
  }

  const isLoading = isAllLoading || (isSearchLoading && (activeSearch || selectedType || selectedDifficulty)) || (isOnlineSearch && isOnlineSearchLoading);
  const error = (activeSearch || selectedType || selectedDifficulty) ? searchError : allError;

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

  // error and loading states are now handled inline below

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedDifficulty('');
    setIsOnlineSearch(false);
    // 清除导航参数引用
    navIngredientRef.current = '';
    // 滚动到顶部
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBrowseRecipes = () => {
    handleClearFilters();
  };

  const hasActiveFilters = searchQuery || selectedType || selectedDifficulty || (isOnlineSearch && activeSearch);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>菜谱大全</Text>
        <Text style={styles.headerSubtitle}>共 {recipes.length} 道精选菜谱</Text>
      </View>

      {/* 搜索区域 */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索菜谱名称..."
            value={navIngredientRef.current || searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.text.tertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              // 当有搜索词时，自动启用联网搜索
              if (searchQuery.trim()) {
                setIsOnlineSearch(true);
              }
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); navIngredientRef.current = ''; }} style={styles.clearButton}>
              <XIcon size={18} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
          {activeSearch && (
            <TouchableOpacity
              style={[styles.onlineSearchButton, isOnlineSearch && styles.onlineSearchButtonActive]}
              onPress={() => setIsOnlineSearch(!isOnlineSearch)}
            >
              <Text style={[styles.onlineSearchButtonText, isOnlineSearch && styles.onlineSearchButtonTextActive]}>
                🌐 {isOnlineSearch ? '联网中' : '联网搜索'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 搜索来源提示 */}
        {isOnlineSearch && activeSearch && (
          <View style={styles.sourceHint}>
            <Text style={styles.sourceHintText}>
              结果来源: {resultSource === 'local' ? '本地数据库' : resultSource === 'tianxing' ? '网络菜谱' : 'AI推荐'}
            </Text>
          </View>
        )}

        {/* 餐次筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {RECIPE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterChip,
                selectedType === type.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(selectedType === type.id ? '' : type.id)}
            >
              <Text style={styles.filterChipIcon}>{type.icon}</Text>
              <Text style={[
                styles.filterChipText,
                selectedType === type.id && styles.filterChipTextActive,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 难度筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {DIFFICULTY_LEVELS.map((diff) => (
            <TouchableOpacity
              key={diff.id}
              style={[
                styles.filterChip,
                selectedDifficulty === diff.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDifficulty(selectedDifficulty === diff.id ? '' : diff.id)}
            >
              <Text style={styles.filterChipIcon}>{diff.icon}</Text>
              <Text style={[
                styles.filterChipText,
                selectedDifficulty === diff.id && styles.filterChipTextActive,
              ]}>
                {diff.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
            <XIcon size={14} color={Colors.primary.main} />
            <Text style={styles.clearFiltersText}>清除筛选</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 辅食体系入口 Banner */}
      <TouchableOpacity
        style={styles.babyBanner}
        onPress={() => navigation.navigate('BabyStages')}
      >
        <View style={styles.babyBannerContent}>
          <Text style={styles.babyBannerText}>🍼 辅食体系</Text>
          <Text style={styles.babyBannerSub}>按月龄浏览，找到最适合的食谱</Text>
        </View>
        <Text style={styles.babyBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* 菜谱列表 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonRecipeCard count={4} horizontal={false} />
          </View>
        ) : error ? (
          <EmptyState
            type="error"
            title="加载失败"
            description={String(error)}
            buttonText="重试"
            onButtonPress={() => refetch()}
          />
        ) : recipes.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              type="no-result"
              title="未找到相关菜谱"
              description="试试其他关键词或筛选条件"
              buttonText="清除搜索"
              onButtonPress={handleClearFilters}
            />
          ) : (
            <EmptyState
              type="no-data"
              title="暂无菜谱"
              description="下拉刷新或稍后再试"
              buttonText="浏览菜谱"
              onButtonPress={handleBrowseRecipes}
            />
          )
        ) : (
          <View style={styles.recipeGrid}>
            {recipes.map((recipe: RecipeSummary) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                showSource={isOnlineSearch}
                preferenceSummary={userInfo?.preferences}
              />
            ))}
          </View>
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
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  searchSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  onlineSearchButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary.main,
    backgroundColor: 'transparent',
  },
  onlineSearchButtonActive: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  onlineSearchButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
  },
  onlineSearchButtonTextActive: {
    color: Colors.text.inverse,
  },
  sourceHint: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sourceHintText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterScroll: {
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  clearFiltersText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    marginLeft: Spacing.xs,
  },
  clearFiltersButtonEmpty: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.md,
  },
  clearFiltersTextEmpty: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  skeletonContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
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
  },
  babyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FF7043',
  },
  babyBannerContent: { flex: 1 },
  babyBannerText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  babyBannerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  babyBannerArrow: { fontSize: 20, color: '#CCC', marginLeft: 8 },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Platform.select({
      web: {
        display: 'grid' as any,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: `${Spacing.md}px`,
      },
    }),
  },
});
