import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { SearchIcon, XIcon, ClockIcon, ChefHatIcon, ChevronLeftIcon, FlameIcon, BabyIcon } from '../../components/common/Icons';
import { useUnifiedSearch, useSourceSearch } from '../../hooks/useSearch';
import type { SearchResult } from '../../api/search';
import { recipesApi, TransformResult } from '../../api/recipes';
import { useSaveSearchResult } from '../../hooks/useUserRecipes';
import { trackEvent } from '../../analytics/sdk';
import { useUserInfo } from '../../hooks/useUsers';
import { buildSearchPreferenceHint, buildPreferenceLeadText } from '../../utils/preferenceCopy';
import { ingredientInventoryApi } from '../../api/ingredientInventory';
import { feedingFeedbackApi } from '../../api/feedingFeedback';
import { useSearchExperienceViewModel, SearchTaskTab } from './useSearchExperienceViewModel';
import { buildMockFeedingFeedback, buildMockInventory, shouldUseWebMockFallback } from '../../mock/webFallback';

type Props = NativeStackScreenProps<RecipeStackParamList, 'Search'>;

type SearchSource = 'all' | 'local' | 'tianxing' | 'ai';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const SOURCE_OPTIONS: { key: SearchSource; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '🔍' },
  { key: 'local', label: '本地', icon: '📚' },
  { key: 'tianxing', label: '联网', icon: '🌐' },
  { key: 'ai', label: 'AI推荐', icon: '🤖' },
];

const SCENARIO_OPTIONS = [
  { key: 'quick', label: '赶时间', query: '赶时间 快手 简单点' },
  { key: 'light', label: '清淡点', query: '清淡 少油' },
  { key: 'appetite', label: '宝宝没胃口', query: '宝宝没胃口 开胃' },
  { key: 'fish', label: '想吃鱼但别太复杂', query: '想吃鱼 但别太复杂' },
];

export function SearchScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<SearchResult | null>(null);
  const [inventoryIngredients, setInventoryIngredients] = useState<string[]>([]);
  const [inventoryFirstEnabled, setInventoryFirstEnabled] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [taskTab, setTaskTab] = useState<SearchTaskTab>('keyword');
  const [activeDetailTab, setActiveDetailTab] = useState<'adult' | 'baby'>('adult');
  const [selectedDetailBabyAge, setSelectedDetailBabyAge] = useState(12);
  const [babyTransformResult, setBabyTransformResult] = useState<TransformResult | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [lovedRecipeNames, setLovedRecipeNames] = useState<Set<string>>(new Set());
  const [rejectedRecipeNames, setRejectedRecipeNames] = useState<Set<string>>(new Set());

  const saveSearchResult = useSaveSearchResult();
  const { data: userInfo } = useUserInfo();

  useEffect(() => {
    ingredientInventoryApi.getInventory().then((res: any) => {
      const payload = res?.data || res;
      const names = Array.isArray(payload?.inventory)
        ? payload.inventory.map((item: any) => String(item?.ingredient_name || '').trim()).filter(Boolean)
        : [];
      setInventoryIngredients(names.slice(0, 20));
    }).catch((error) => {
      if (shouldUseWebMockFallback(error)) {
        const payload = buildMockInventory();
        const names = payload.inventory.map((item) => String(item.ingredient_name || '').trim()).filter(Boolean);
        setInventoryIngredients(names.slice(0, 20));
      }
    });

    feedingFeedbackApi.recent({ limit: 50 }).then((res: any) => {
      const payload = res?.data || res;
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setLovedRecipeNames(new Set(items.filter((item: any) => item.accepted_level === 'like' && item.recipe_name).map((item: any) => item.recipe_name)));
      setRejectedRecipeNames(new Set(items.filter((item: any) => item.accepted_level === 'reject' && item.recipe_name).map((item: any) => item.recipe_name)));
    }).catch((error) => {
      if (shouldUseWebMockFallback(error)) {
        const payload = buildMockFeedingFeedback();
        const items = payload.items;
        setLovedRecipeNames(new Set(items.filter((item) => item.accepted_level === 'like' && item.recipe_name).map((item) => item.recipe_name as string)));
        setRejectedRecipeNames(new Set(items.filter((item) => item.accepted_level === 'reject' && item.recipe_name).map((item) => item.recipe_name as string)));
      }
    });
  }, []);

  const searchOptions = useMemo(() => ({
    inventoryIngredients: inventoryFirstEnabled ? inventoryIngredients : [],
    scenario: selectedScenario || undefined,
  }), [inventoryFirstEnabled, inventoryIngredients, selectedScenario]);

  const { data: unifiedData, isLoading: isUnifiedLoading } = useUnifiedSearch(
    searchSource === 'all' ? submittedKeyword : undefined,
    searchOptions
  );

  const { data: sourceData, isLoading: isSourceLoading } = useSourceSearch(
    searchSource !== 'all' ? submittedKeyword : undefined,
    searchSource !== 'all' ? searchSource : undefined,
    searchOptions
  );

  const hasSearched = submittedKeyword.length > 0;
  const currentData = searchSource === 'all' ? unifiedData : sourceData;
  const searchResults = currentData?.results || [];
  const resultSource = searchSource === 'all' ? (unifiedData?.source || 'local') : searchSource;
  const routeSource = currentData?.route_source || (resultSource === 'tianxing' ? 'web' : resultSource);
  const total = searchResults.length;
  const isLoading = hasSearched && (searchSource === 'all' ? isUnifiedLoading : isSourceLoading);

  const experienceVm = useSearchExperienceViewModel({
    searchResults,
    lovedRecipeNames,
    rejectedRecipeNames,
    selectedScenario,
    inventoryFirstEnabled,
    inventoryIngredients,
  });

  useEffect(() => {
    if (!hasSearched || isLoading) return;
    trackEvent('recipe_list_viewed', {
      page_id: 'search',
      list_type: searchSource === 'all' ? 'search_result' : `search_result_${searchSource}`,
      result_count: total,
      route_source: routeSource,
    });
  }, [hasSearched, isLoading, searchSource, total, routeSource]);

  const handleSearch = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSubmittedKeyword(trimmed);
      setSelectedRecipe(null);
      trackEvent('recipe_searched', {
        page_id: 'search',
        keyword: trimmed,
        search_mode: searchSource,
        inventory_first: inventoryFirstEnabled,
        scenario: selectedScenario || 'none',
      });
    }
  }, [inputValue, searchSource, inventoryFirstEnabled, selectedScenario]);

  const applyQuickSearch = useCallback((value: string, nextTaskTab?: SearchTaskTab) => {
    setInputValue(value);
    setSubmittedKeyword(value);
    if (nextTaskTab) setTaskTab(nextTaskTab);
    setSelectedRecipe(null);
  }, []);

  const handleSourceChange = useCallback((source: SearchSource) => {
    setSearchSource(source);
    setSelectedRecipe(null);
  }, []);

  const handleRecipePress = useCallback((recipe: SearchResult) => {
    trackEvent('recipe_detail_viewed', {
      page_id: 'search',
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      route_source: recipe.source === 'tianxing' ? 'web' : recipe.source,
    });

    if (recipe.source === 'local') {
      navigation.navigate('RecipeDetail', { recipeId: recipe.id });
    } else {
      setSelectedRecipe(recipe);
      setActiveDetailTab('adult');
      setBabyTransformResult(null);
      setTransformError(null);
    }
  }, [navigation]);

  const handleBack = useCallback(() => {
    setSelectedRecipe(null);
    setActiveDetailTab('adult');
    setBabyTransformResult(null);
    setTransformError(null);
  }, []);

  const handleTransformToBaby = useCallback(async (recipe: SearchResult, babyAge: number) => {
    setIsTransforming(true);
    setTransformError(null);
    setBabyTransformResult(null);
    try {
      const res = await recipesApi.transformRaw({
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        baby_age_months: babyAge,
      });
      const data = (res as any)?.data ?? res;
      setBabyTransformResult(data);
    } catch (err: any) {
      setTransformError(err?.message || '转换失败，请重试');
    } finally {
      setIsTransforming(false);
    }
  }, []);

  const renderOnlineRecipeDetail = () => {
    if (!selectedRecipe) return null;
    const hasIngredients = selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0;
    const hasSteps = selectedRecipe.steps && selectedRecipe.steps.length > 0;
    const baby = babyTransformResult?.baby_version;
    const BABY_AGE_OPTIONS = [6, 9, 12, 18, 24, 36];

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeftIcon size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>{selectedRecipe.name}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.detailContent} contentContainerStyle={styles.detailContentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.detailTitleSection}>
            <View style={styles.sourceTagLarge}><Text style={styles.sourceTagTextLarge}>{selectedRecipe.source === 'tianxing' ? '🌐 联网菜谱' : '🤖 AI推荐'}</Text></View>
            <Text style={styles.detailName}>{selectedRecipe.name}</Text>
            <View style={styles.detailMeta}>
              {selectedRecipe.prep_time && <View style={styles.detailMetaItem}><ClockIcon size={16} color={Colors.text.secondary} /><Text style={styles.detailMetaText}>{selectedRecipe.prep_time}分钟</Text></View>}
              {selectedRecipe.difficulty && <View style={styles.detailMetaItem}><ChefHatIcon size={16} color={Colors.text.secondary} /><Text style={styles.detailMetaText}>{selectedRecipe.difficulty}</Text></View>}
            </View>
          </View>
          {selectedRecipe.image_url && selectedRecipe.image_url.length > 0 && <Image source={{ uri: selectedRecipe.image_url[0] }} style={styles.detailImage} resizeMode="cover" />}

          <View style={styles.detailTabContainer}>
            <TouchableOpacity style={[styles.detailTab, activeDetailTab === 'adult' && styles.detailTabActive]} onPress={() => setActiveDetailTab('adult')}>
              <FlameIcon size={18} color={activeDetailTab === 'adult' ? Colors.primary.main : Colors.text.tertiary} />
              <Text style={[styles.detailTabText, activeDetailTab === 'adult' && styles.detailTabTextActive]}>大人版</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailTab, activeDetailTab === 'baby' && styles.detailTabActiveBaby]} onPress={() => { setActiveDetailTab('baby'); if (!babyTransformResult && !isTransforming) handleTransformToBaby(selectedRecipe, selectedDetailBabyAge); }}>
              <BabyIcon size={18} color={activeDetailTab === 'baby' ? Colors.secondary.main : Colors.text.tertiary} />
              <Text style={[styles.detailTabText, activeDetailTab === 'baby' && styles.detailTabTextActiveBaby]}>宝宝版</Text>
            </TouchableOpacity>
          </View>

          {activeDetailTab === 'baby' && (
            <View style={styles.babyAgeSelector}>
              <Text style={styles.babyAgeSelectorLabel}>宝宝月龄：</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.babyAgeOptions}>
                {BABY_AGE_OPTIONS.map((months) => (
                  <TouchableOpacity key={months} style={[styles.babyAgeOption, selectedDetailBabyAge === months && styles.babyAgeOptionSelected]} onPress={() => { setSelectedDetailBabyAge(months); handleTransformToBaby(selectedRecipe, months); }}>
                    <Text style={[styles.babyAgeOptionText, selectedDetailBabyAge === months && styles.babyAgeOptionTextSelected]}>{months}个月</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.detailSection}>
            {selectedRecipe.description && <View style={styles.detailCard}><Text style={styles.detailCardTitle}>简介</Text><Text style={styles.detailCardText}>{selectedRecipe.description}</Text></View>}
            {activeDetailTab === 'adult' && (
              <>
                {hasIngredients ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>📝 食材清单</Text><View style={styles.ingredientsList}>{selectedRecipe.ingredients!.map((ingredient, index) => <View key={index} style={styles.ingredientItem}><View style={styles.ingredientDot} /><Text style={styles.ingredientText}>{ingredient}</Text></View>)}</View></View> : <View style={[styles.detailCard, styles.noDataCard]}><Text style={styles.noDataText}>暂无食材信息</Text></View>}
                {hasSteps ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>👨‍🍳 制作步骤</Text><View style={styles.stepsList}>{selectedRecipe.steps!.map((step, index) => <View key={index} style={styles.stepItem}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><View style={styles.stepContent}><Text style={styles.stepAction}>{step}</Text></View></View>)}</View></View> : <View style={[styles.detailCard, styles.noDataCard]}><Text style={styles.noDataText}>此来源暂未提供完整步骤，可先收藏或回到本地结果继续补全。</Text></View>}
              </>
            )}
            {activeDetailTab === 'baby' && (
              <>
                {isTransforming && <View style={styles.transformingCard}><ActivityIndicator size="large" color={Colors.secondary.main} /><Text style={styles.transformingText}>正在智能转换宝宝版菜谱...</Text><Text style={styles.transformingSubText}>根据月龄调整食材用量和烹饪方式</Text></View>}
                {transformError && !isTransforming && <View style={[styles.detailCard, styles.errorCard]}><Text style={styles.errorCardText}>⚠️ {transformError}</Text><TouchableOpacity style={styles.retryButton} onPress={() => handleTransformToBaby(selectedRecipe, selectedDetailBabyAge)}><Text style={styles.retryButtonText}>重新转换</Text></TouchableOpacity></View>}
                {baby && !isTransforming && <>
                  {baby.age_range && <View style={styles.babyAgeBadge}><BabyIcon size={16} color={Colors.secondary.main} /><Text style={styles.babyAgeBadgeText}>适合 {baby.age_range}</Text>{baby.texture && <Text style={styles.babyTextureText}> · {baby.texture}</Text>}</View>}
                  {baby.ingredients && baby.ingredients.length > 0 && <View style={styles.detailCard}><Text style={styles.detailCardTitle}>📝 食材清单（宝宝版）</Text><View style={styles.ingredientsList}>{baby.ingredients.map((item: any, index: number) => <View key={index} style={styles.ingredientItem}><View style={[styles.ingredientDot, styles.ingredientDotBaby]} /><Text style={styles.ingredientText}>{item.name}</Text><Text style={styles.ingredientAmount}>{item.amount}</Text></View>)}</View></View>}
                  {baby.steps && baby.steps.length > 0 && <View style={styles.detailCard}><Text style={styles.detailCardTitle}>👨‍🍳 制作步骤（宝宝版）</Text><View style={styles.stepsList}>{baby.steps.map((step: any, index: number) => <View key={index} style={styles.stepItem}><View style={[styles.stepNumber, styles.stepNumberBaby]}><Text style={styles.stepNumberText}>{step.step || index + 1}</Text></View><View style={styles.stepContent}><Text style={styles.stepAction}>{step.action}</Text></View></View>)}</View></View>}
                </>}
              </>
            )}

            <TouchableOpacity style={[styles.saveButton, saveSearchResult.isPending && styles.saveButtonDisabled]} onPress={async () => {
              try {
                await saveSearchResult.mutateAsync(selectedRecipe);
                Alert.alert('成功', '已保存到我的菜谱');
              } catch (err: any) {
                Alert.alert('提示', err?.message || '保存失败，请重试');
              }
            }} disabled={saveSearchResult.isPending}>
              <Text style={styles.saveButtonText}>{saveSearchResult.isPending ? '保存中...' : '⭐ 收藏到我的菜谱'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchHeaderCard}>
      <View style={styles.searchHeaderCopy}>
        <Text style={styles.pageTitle}>今天想做点什么？</Text>
        <Text style={styles.pageSubtitle}>先搜一下，结果会更早出来。</Text>
      </View>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={Colors.primary.main} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜菜名、食材、做法场景"
            value={inputValue}
            onChangeText={setInputValue}
            placeholderTextColor={Colors.text.tertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {inputValue ? <TouchableOpacity onPress={() => { setInputValue(''); setSubmittedKeyword(''); setSelectedScenario(''); }} style={styles.clearButton}><XIcon size={18} color={Colors.text.secondary} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={[styles.searchButton, !inputValue.trim() && styles.searchButtonDisabled]} onPress={handleSearch} disabled={!inputValue.trim()}>
          <Text style={[styles.searchButtonText, !inputValue.trim() && styles.searchButtonTextDisabled]}>搜索</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSourceTabs = () => (
    <View style={styles.sourceTabsSection}>
      <View style={styles.sourceTabsShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceTabsContent}>
          {SOURCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sourceTab,
                searchSource === option.key && styles.sourceTabActive,
                isTablet && styles.sourceTabTablet,
              ]}
              onPress={() => handleSourceChange(option.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.sourceTabText, searchSource === option.key && styles.sourceTabTextActive, isTablet && styles.sourceTabTextTablet]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderTaskRow = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskRow}>
      {experienceVm.taskTabs.slice(0, 3).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.taskChip, taskTab === tab.key && styles.taskChipActive]}
          onPress={() => {
            setTaskTab(tab.key);
            if (tab.key === 'dual') applyQuickSearch('一菜两吃', 'dual');
            if (tab.key === 'inventory' && inventoryIngredients.length > 0) applyQuickSearch(inventoryIngredients.slice(0, 2).join(' '), 'inventory');
            if (tab.key === 'age') applyQuickSearch('12个月+', 'age');
          }}
        >
          <Text style={[styles.taskChipText, taskTab === tab.key && styles.taskChipTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderExplore = () => (
    <View style={styles.exploreContainer}>
      <View style={styles.exploreQuickSection}>
        <Text style={styles.exploreSectionTitle}>试试这些任务</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenarioRow}>
          {SCENARIO_OPTIONS.map((option) => {
            const active = selectedScenario === option.query;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.scenarioChip, active && styles.scenarioChipActive]}
                onPress={() => {
                  const nextValue = active ? '' : option.query;
                  setSelectedScenario(nextValue);
                  setTaskTab('scenario');
                  if (nextValue) applyQuickSearch(nextValue, 'scenario');
                  if (active) {
                    setSubmittedKeyword('');
                    setInputValue('');
                  }
                }}
              >
                <Text style={[styles.scenarioChipText, active && styles.scenarioChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.exploreSection}>
        <Text style={styles.exploreSectionTitle}>大家常搜</Text>
        <View style={styles.exploreTagWrap}>{experienceVm.explore.popularSearches.slice(0, 4).map((item) => <TouchableOpacity key={item} style={styles.exploreTag} onPress={() => applyQuickSearch(item, 'keyword')}><Text style={styles.exploreTagText}>{item}</Text></TouchableOpacity>)}</View>
      </View>

      <View style={styles.exploreSection}>
        <Text style={styles.exploreSectionTitle}>按月龄找</Text>
        <View style={styles.exploreTagWrap}>{experienceVm.explore.ageFilters.slice(0, 4).map((item) => <TouchableOpacity key={item} style={styles.exploreTag} onPress={() => applyQuickSearch(item, 'age')}><Text style={styles.exploreTagText}>{item}</Text></TouchableOpacity>)}</View>
      </View>
    </View>
  );

  const renderRecipeCard = useCallback(({ item }: { item: SearchResult }) => {
    const card = experienceVm.cards.find((entry) => entry.item === item);
    const sourceLabel = item.source === 'local' ? '📚 本地' : item.source === 'tianxing' ? '🌐 联网' : '🤖 AI';
    const timeLabel = typeof item.prep_time === 'number' ? `⏱ ${item.prep_time}分钟` : '';
    const diffLabel = item.difficulty ? ` · ${item.difficulty}` : '';
    const preferenceHint = buildSearchPreferenceHint({
      recipe: item,
      preferenceSummary: {
        defaultBabyAge: userInfo?.preferences?.default_baby_age,
        preferIngredients: Array.isArray(userInfo?.preferences?.prefer_ingredients)
          ? userInfo?.preferences?.prefer_ingredients
          : typeof userInfo?.preferences?.prefer_ingredients === 'string'
            ? userInfo.preferences.prefer_ingredients.split(/[,，、]/).map((token) => token.trim()).filter(Boolean)
            : [],
        excludeIngredients: userInfo?.preferences?.exclude_ingredients,
        cookingTimeLimit: userInfo?.preferences?.cooking_time_limit ?? userInfo?.preferences?.max_prep_time,
        difficultyPreference: userInfo?.preferences?.difficulty_preference,
      },
    });

    return (
      <TouchableOpacity style={styles.recipeCard} onPress={() => handleRecipePress(item)} activeOpacity={0.7}>
        <View style={styles.recipeImagePlaceholder}><Text style={styles.recipeImagePlaceholderText}>🍽️</Text></View>
        <View style={styles.recipeInfo}>
          <View style={styles.recipeTopRow}>
            <Text style={styles.recipeName}>{item.name || '未命名菜谱'}</Text>
            <Text style={styles.recipeSourceText}>{sourceLabel}</Text>
          </View>
          {item.description ? <Text style={styles.recipeDescription} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={styles.recipeMetaText}>{timeLabel}{diffLabel}</Text>
          {!!card?.labels?.length && <View style={styles.labelRow}>{card.labels.slice(0, 3).map((label) => <View key={label} style={styles.contextPill}><Text style={styles.contextPillText}>{label}</Text></View>)}</View>}
          {!!card?.whyItFits && <Text style={styles.whyItFitsText} numberOfLines={2}>{card.whyItFits}</Text>}
          {!!preferenceHint && <View style={styles.preferenceHintBadge}><Text style={styles.preferenceHintBadgeText} numberOfLines={2}>{preferenceHint}</Text></View>}
        </View>
      </TouchableOpacity>
    );
  }, [experienceVm.cards, handleRecipePress, userInfo?.preferences]);

  const renderEmptyState = () => {
    if (!hasSearched) return renderExplore();
    if (isLoading) return null;
    return <View style={styles.emptyContainer}><Text style={styles.emptyIcon}>😔</Text><Text style={styles.emptyTitle}>未找到相关菜谱</Text><Text style={styles.emptyText}>试试其他关键词、场景或来源切换</Text></View>;
  };

  const renderLoading = () => (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary.main} /><Text style={styles.loadingText}>搜索中...</Text></View>
  );

  if (selectedRecipe) {
    return <SafeAreaView style={styles.container} edges={['top']}>{renderOnlineRecipeDetail()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderSearchBar()}
      {renderSourceTabs()}
      {renderTaskRow()}

      {hasSearched && !isLoading && total > 0 && (
        <View style={styles.resultStats}>
          <View style={styles.resultStatsContent}>
            <Text style={styles.resultStatsText}>找到 {total} 个结果</Text>
            <View style={styles.resultSourceBadge}><Text style={styles.resultSourceBadgeText}>{routeSource === 'local' ? '📚 Local' : routeSource === 'cache' ? '⚡ Cache' : routeSource === 'web' || routeSource === 'tianxing' ? '🌐 Web' : routeSource === 'ai' ? '🤖 AI' : '🔍 全部'}</Text></View>
          </View>
          <Text style={styles.preferenceLeadText} numberOfLines={1}>{buildPreferenceLeadText({
            defaultBabyAge: userInfo?.preferences?.default_baby_age,
            preferIngredients: Array.isArray(userInfo?.preferences?.prefer_ingredients)
              ? userInfo?.preferences?.prefer_ingredients
              : typeof userInfo?.preferences?.prefer_ingredients === 'string'
                ? userInfo.preferences.prefer_ingredients.split(/[,，、]/).map((token) => token.trim()).filter(Boolean)
                : [],
            excludeIngredients: userInfo?.preferences?.exclude_ingredients,
            cookingTimeLimit: userInfo?.preferences?.cooking_time_limit ?? userInfo?.preferences?.max_prep_time,
            difficultyPreference: userInfo?.preferences?.difficulty_preference,
          })}</Text>
        </View>
      )}

      {isLoading ? renderLoading() : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {hasSearched && searchResults.length > 0 ? searchResults.map((item, index) => <React.Fragment key={`${item.source}_${item.id}_${index}`}>{renderRecipeCard({ item })}</React.Fragment>) : renderEmptyState()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F4EF' },
  searchHeaderCard: { backgroundColor: 'transparent', marginHorizontal: Spacing.lg, marginTop: Spacing.xs, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  searchHeaderCopy: { flex: 1, marginBottom: Spacing.sm },
  pageEyebrow: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  pageTitle: { fontSize: Typography.fontSize.xl + 2, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  pageSubtitle: { marginTop: 4, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.md, height: 52, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...Shadows.sm },
  searchInput: { flex: 1, color: Colors.text.primary, marginLeft: Spacing.sm, fontSize: Typography.fontSize.base },
  clearButton: { padding: Spacing.xs },
  searchButton: { backgroundColor: Colors.primary.main, paddingHorizontal: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius['2xl'] },
  searchButtonDisabled: { backgroundColor: Colors.neutral.gray300 },
  searchButtonText: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.semibold, fontSize: Typography.fontSize.base },
  searchButtonTextDisabled: { color: Colors.text.tertiary },
  sourceTabsSection: { paddingHorizontal: Spacing.lg, paddingTop: 2, paddingBottom: 4 },
  sourceTabsShell: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: BorderRadius.full, padding: 4 },
  sourceTabsContent: { gap: 6, paddingRight: Spacing.md },
  sourceTab: { minHeight: 26, justifyContent: 'center', paddingHorizontal: Spacing.sm + 1, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent' },
  sourceTabActive: { backgroundColor: Colors.background.primary, borderColor: 'rgba(0,0,0,0.06)' },
  sourceTabTablet: { minHeight: 30, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  sourceTabText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  sourceTabTextActive: { color: Colors.text.primary, fontWeight: Typography.fontWeight.semibold },
  sourceTabTextTablet: { fontSize: Typography.fontSize.sm },
  taskRow: { paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: Spacing.xs, gap: 8 },
  taskChip: { paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  taskChipActive: { backgroundColor: '#E8F0FF', borderColor: 'rgba(58,124,255,0.16)' },
  taskChipText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  taskChipTextActive: { color: Colors.primary.main },
  resultStats: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.xs },
  resultStatsContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultStatsText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  resultSourceBadge: { backgroundColor: Colors.primary.light, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  resultSourceBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  preferenceLeadText: { marginTop: 4, fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 16 },
  scrollContainer: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
    flexGrow: 1,
  },
  recipeCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  recipeImagePlaceholder: { width: 80, height: 80, margin: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary.light, justifyContent: 'center', alignItems: 'center' },
  recipeImagePlaceholderText: { fontSize: 32 },
  recipeInfo: { flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.md },
  recipeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  recipeName: { flex: 1, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold as any, color: Colors.text.primary, marginBottom: Spacing.xs },
  recipeSourceText: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  recipeDescription: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs },
  recipeMetaText: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  contextPill: { backgroundColor: Colors.neutral.gray100, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  contextPillText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  whyItFitsText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  preferenceHintBadge: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.secondary.light, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  preferenceHintBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.secondary.dark, lineHeight: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['3xl'] },
  loadingText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary, marginTop: Spacing.md },
  exploreContainer: { paddingBottom: Spacing.lg },
  exploreHeroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, ...Shadows.sm },
  exploreHeroTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  exploreHeroText: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  exploreQuickSection: { marginTop: 2 },
  exploreSection: { marginTop: Spacing.md },
  exploreSectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, marginBottom: Spacing.sm },
  exploreTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exploreTag: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border.light },
  exploreTagText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  scenarioRow: { gap: 8, marginTop: Spacing.xs },
  scenarioChip: { paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  scenarioChipActive: { backgroundColor: '#E8F0FF', borderColor: 'rgba(58,124,255,0.16)' },
  scenarioChipText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  scenarioChipTextActive: { color: Colors.primary.main },
  detailContainer: { flex: 1, backgroundColor: Colors.background.secondary },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  backButton: { padding: Spacing.sm },
  detailTitle: { flex: 1, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, textAlign: 'center' },
  placeholder: { width: 40 },
  detailContent: { flex: 1 },
  detailContentContainer: {
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
    flexGrow: 1,
  },
  sourceTagLarge: { alignSelf: 'flex-start', backgroundColor: Colors.primary.light, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
  sourceTagTextLarge: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  detailImage: { width: '100%', height: 220 },
  detailSection: { padding: Spacing.md },
  detailName: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  detailMeta: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  detailMetaText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary },
  detailCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  detailCardTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  detailCardText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  ingredientsList: { gap: Spacing.sm },
  ingredientItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary.main },
  ingredientText: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.text.primary },
  noDataCard: { backgroundColor: Colors.neutral.gray100 },
  noDataText: { fontSize: Typography.fontSize.base, color: Colors.text.tertiary, lineHeight: 22 },
  stepsList: { gap: Spacing.lg },
  stepItem: { flexDirection: 'row', gap: Spacing.md },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary.main, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: Colors.text.inverse, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  stepContent: { flex: 1 },
  stepAction: { fontSize: Typography.fontSize.base, color: Colors.text.primary, lineHeight: 22, fontWeight: Typography.fontWeight.medium },
  detailTitleSection: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  detailTabContainer: { flexDirection: 'row', backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  detailTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, gap: Spacing.xs },
  detailTabActive: { backgroundColor: Colors.primary.light, borderWidth: 1, borderColor: Colors.primary.main },
  detailTabActiveBaby: { backgroundColor: Colors.secondary.light, borderWidth: 1, borderColor: Colors.secondary.main },
  detailTabText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.text.secondary },
  detailTabTextActive: { color: Colors.primary.main, fontWeight: Typography.fontWeight.bold },
  detailTabTextActiveBaby: { color: Colors.secondary.main, fontWeight: Typography.fontWeight.bold },
  babyAgeSelector: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  babyAgeSelectorLabel: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs },
  babyAgeOptions: { gap: Spacing.sm },
  babyAgeOption: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.neutral.gray100, borderWidth: 1, borderColor: Colors.border.light },
  babyAgeOptionSelected: { backgroundColor: Colors.secondary.light, borderColor: Colors.secondary.main },
  babyAgeOptionText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  babyAgeOptionTextSelected: { color: Colors.secondary.main, fontWeight: Typography.fontWeight.semibold },
  babyAgeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary.light, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.xs },
  babyAgeBadgeText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.secondary.main },
  babyTextureText: { fontSize: Typography.fontSize.base, color: Colors.secondary.dark },
  ingredientDotBaby: { backgroundColor: Colors.secondary.main },
  ingredientAmount: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  stepNumberBaby: { backgroundColor: Colors.secondary.main },
  transformingCard: { backgroundColor: Colors.secondary.light, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  transformingText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.secondary.main },
  transformingSubText: { fontSize: Typography.fontSize.sm, color: Colors.secondary.dark, textAlign: 'center' },
  errorCard: { backgroundColor: Colors.functional.errorLight, borderLeftWidth: 4, borderLeftColor: Colors.functional.error },
  errorCardText: { fontSize: Typography.fontSize.base, color: Colors.functional.error, marginBottom: Spacing.md },
  retryButton: { backgroundColor: Colors.functional.error, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
  retryButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  saveButton: { backgroundColor: Colors.primary.main, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});

export default SearchScreen;
