// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
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
  { id: '', label: '全部' },
  { id: 'breakfast', label: '早餐' },
  { id: 'lunch', label: '午餐' },
  { id: 'dinner', label: '晚餐' },
];

const DIFFICULTY_LEVELS = [
  { id: '', label: '全部难度' },
  { id: '简单', label: '简单' },
  { id: '中等', label: '中等' },
  { id: '困难', label: '困难' },
];

const FILTER_STORAGE_KEY = '@recipe_filter_prefs';

const filterStateRef = {
  searchQuery: '',
  selectedType: '',
  selectedDifficulty: '',
};

const loadSavedFilters = async (): Promise<{ type: string; difficulty: string } | null> => {
  try {
    const saved = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('load saved recipe filters failed:', error);
  }
  return null;
};

const saveFilters = async (type: string, difficulty: string) => {
  try {
    await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ type, difficulty }));
  } catch (error) {
    console.error('save recipe filters failed:', error);
  }
};

export function RecipeListScreen({ navigation, route }: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [isOnlineSearch, setIsOnlineSearch] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const navIngredientRef = useRef(route.params?.ingredient || '');

  useEffect(() => {
    if (navIngredientRef.current) {
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const ingredient = route.params?.ingredient || '';
    navIngredientRef.current = ingredient;
    if (ingredient) {
      setSearchQuery(ingredient);
      setDebouncedSearch(ingredient);
    }
  }, [route.params?.ingredient]);

  useFocusEffect(
    React.useCallback(() => {
      const state = navigation.getState();
      if (state && state.routes.length > 1) {
        navigation.popToTop();
      }
    }, [navigation]),
  );

  useEffect(() => {
    const initFilters = async () => {
      const params = route.params;

      if (params?.ingredient) {
        setSearchQuery(params.ingredient);
        setDebouncedSearch(params.ingredient);
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

      if (!params?.ingredient && !params?.type && !params?.difficulty) {
        const saved = await loadSavedFilters();
        if (saved) {
          setSelectedType(saved.type || '');
          setSelectedDifficulty(saved.difficulty || '');
          filterStateRef.selectedType = saved.type || '';
          filterStateRef.selectedDifficulty = saved.difficulty || '';
        }
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
  }, [isInitialized, route.params?.difficulty, route.params?.ingredient, route.params?.type]);

  useEffect(() => {
    filterStateRef.searchQuery = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    filterStateRef.selectedType = selectedType;
  }, [selectedType]);

  useEffect(() => {
    filterStateRef.selectedDifficulty = selectedDifficulty;
  }, [selectedDifficulty]);

  useEffect(() => {
    if (isInitialized && !route.params?.ingredient) {
      saveFilters(selectedType, selectedDifficulty);
    }
  }, [isInitialized, route.params, selectedDifficulty, selectedType]);

  const { data: allData, isLoading: isAllLoading, error: allError, refetch } = useAllRecipes();
  const { data: userInfo } = useUserInfo();
  const { data: searchData, isLoading: isSearchLoading, error: searchError } = useSearchRecipes({
    keyword: navIngredientRef.current || debouncedSearch,
    type: selectedType,
    difficulty: selectedDifficulty,
  });
  const { data: onlineSearchData, isLoading: isOnlineSearchLoading } = useUnifiedSearch(
    isOnlineSearch ? (navIngredientRef.current || debouncedSearch) : undefined,
  );

  const activeSearch = navIngredientRef.current || debouncedSearch;

  let recipes: RecipeSummary[] = [];
  let resultSource: 'local' | 'tianxing' | 'ai' | undefined;

  if (isOnlineSearch && activeSearch) {
    const onlineResults = onlineSearchData?.results || [];
    recipes = onlineResults.map(
      (item: SearchResult): RecipeSummary => ({
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        prep_time: item.prep_time || 0,
        source: item.source,
      }),
    );
    resultSource = onlineSearchData?.source;
  } else if (activeSearch || selectedType || selectedDifficulty) {
    recipes = searchData?.items || [];
  } else {
    recipes = allData?.items || [];
  }

  const isLoading =
    isAllLoading ||
    (isSearchLoading && (activeSearch || selectedType || selectedDifficulty)) ||
    (isOnlineSearch && isOnlineSearchLoading);
  const error = activeSearch || selectedType || selectedDifficulty ? searchError : allError;
  const hasActiveFilters = !!(searchQuery || selectedType || selectedDifficulty || (isOnlineSearch && activeSearch));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (refreshError) {
      console.error('refresh recipes failed:', refreshError);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedType('');
    setSelectedDifficulty('');
    setIsOnlineSearch(false);
    navIngredientRef.current = '';
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const sourceLabel =
    resultSource === 'local' ? '本地结果' : resultSource === 'tianxing' ? '网络菜谱' : resultSource === 'ai' ? 'AI 推荐' : '精选菜谱';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>RECIPE LIBRARY</Text>
            <Text style={styles.heroTitle}>先看清适合谁吃、多久能做，再决定今天做什么</Text>
            <Text style={styles.heroSubtitle}>把搜索、筛选和宝宝阶段入口收拢在一起，找菜更快，判断更轻松。</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{recipes.length}</Text>
                <Text style={styles.heroStatLabel}>当前结果</Text>
              </View>
              <View style={[styles.heroStatCard, styles.heroStatCardWarm]}>
                <Text style={styles.heroStatValue}>{isOnlineSearch ? '联网中' : '本地优先'}</Text>
                <Text style={styles.heroStatLabel}>{sourceLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.searchPanel}>
            <View style={styles.searchBar}>
              <SearchIcon size={18} color={Colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索菜名、食材或适龄阶段"
                value={navIngredientRef.current || searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.text.tertiary}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (searchQuery.trim()) {
                    setIsOnlineSearch(true);
                  }
                }}
              />

              {(navIngredientRef.current || searchQuery) ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                    navIngredientRef.current = '';
                    setIsOnlineSearch(false);
                  }}
                  style={styles.clearButton}
                >
                  <XIcon size={16} color={Colors.text.tertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>餐次</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {RECIPE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.filterChip, selectedType === type.id && styles.filterChipActive]}
                    onPress={() => setSelectedType(selectedType === type.id ? '' : type.id)}
                  >
                    <Text style={[styles.filterChipText, selectedType === type.id && styles.filterChipTextActive]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>难度</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {DIFFICULTY_LEVELS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.filterChip, selectedDifficulty === item.id && styles.filterChipActive]}
                    onPress={() => setSelectedDifficulty(selectedDifficulty === item.id ? '' : item.id)}
                  >
                    <Text style={[styles.filterChipText, selectedDifficulty === item.id && styles.filterChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.searchActions}>
              {activeSearch ? (
                <TouchableOpacity
                  style={[styles.inlineAction, isOnlineSearch && styles.inlineActionPrimary]}
                  onPress={() => setIsOnlineSearch(!isOnlineSearch)}
                >
                  <Text style={[styles.inlineActionText, isOnlineSearch && styles.inlineActionTextPrimary]}>
                    {isOnlineSearch ? '切回本地结果' : '联网补充搜索'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {hasActiveFilters ? (
                <TouchableOpacity style={styles.inlineAction} onPress={handleClearFilters}>
                  <Text style={styles.inlineActionText}>清空筛选</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity style={styles.babyBanner} onPress={() => navigation.navigate('BabyStages')} activeOpacity={0.88}>
            <View style={styles.babyBannerCopy}>
              <Text style={styles.babyBannerTitle}>辅食阶段指南</Text>
              <Text style={styles.babyBannerText}>按月龄看适合吃什么、怎么处理口感，再回到菜谱里继续挑。</Text>
            </View>
            <Text style={styles.babyBannerArrow}>查看</Text>
          </TouchableOpacity>

          <View style={styles.listSection}>
            <View style={styles.listSectionHeader}>
              <View>
                <Text style={styles.listTitle}>{hasActiveFilters ? '筛选结果' : '推荐菜谱'}</Text>
                <Text style={styles.listSubtitle}>
                  {hasActiveFilters ? '你当前的搜索和筛选结果在这里。' : '从适合家庭日常做饭的菜开始看。'}
                </Text>
              </View>
              <Text style={styles.listCount}>{recipes.length} 道</Text>
            </View>

            {isLoading ? (
              <View style={styles.skeletonContainer}>
                <SkeletonRecipeCard count={4} horizontal={false} />
              </View>
            ) : error ? (
              <EmptyState
                type="error"
                title="加载菜谱失败"
                description={String(error)}
                buttonText="重新加载"
                onButtonPress={() => refetch()}
              />
            ) : recipes.length === 0 ? (
              <EmptyState
                type={hasActiveFilters ? 'no-result' : 'no-data'}
                title={hasActiveFilters ? '没有找到匹配的菜谱' : '暂时还没有菜谱'}
                description={hasActiveFilters ? '换个关键词，或者放宽筛选条件再试一次。' : '下拉刷新或稍后再来看看。'}
                buttonText={hasActiveFilters ? '清空筛选' : '重新加载'}
                onButtonPress={hasActiveFilters ? handleClearFilters : () => refetch()}
              />
            ) : (
              <View style={styles.recipeGrid}>
                {recipes.map((recipe) => (
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  page: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? Spacing.lg : 0,
  },
  heroCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    ...Shadows.md,
  },
  heroKicker: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize['2xl'],
    lineHeight: 32,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    lineHeight: 21,
    color: Colors.text.secondary,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroStatCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  heroStatCardWarm: {
    backgroundColor: '#FBF1E6',
  },
  heroStatValue: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  heroStatLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  searchPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    ...Shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  filterGroup: {
    marginTop: Spacing.md,
  },
  filterLabel: {
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  filterRow: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  searchActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  inlineAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  inlineActionPrimary: {
    backgroundColor: Colors.primary.main,
  },
  inlineActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  inlineActionTextPrimary: {
    color: Colors.text.inverse,
  },
  babyBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.tertiary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  babyBannerCopy: {
    flex: 1,
  },
  babyBannerTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  babyBannerText: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  babyBannerArrow: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  listSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  listTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  listSubtitle: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  listCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  skeletonContainer: {
    paddingTop: Spacing.sm,
  },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    ...Platform.select({
      web: {
        display: 'grid' as any,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: `${Spacing.md}px`,
      },
    }),
  },
});
