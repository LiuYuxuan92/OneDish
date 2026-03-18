import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList } from '../../types';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { SearchIcon, XIcon, ClockIcon, ChefHatIcon, ChevronLeftIcon, FlameIcon, BabyIcon } from '../../components/common/Icons';
import { SearchResultCard } from '../../components/ui-migration/SearchResultCard';
import { useUnifiedSearch, useSourceSearch } from '../../hooks/useSearch';
import type { SearchResult } from '../../api/search';
import { recipesApi, type TransformResult } from '../../api/recipes';
import { useSaveSearchResult } from '../../hooks/useUserRecipes';
import { trackEvent } from '../../analytics/sdk';
import { useUserInfo } from '../../hooks/useUsers';
import { ingredientInventoryApi } from '../../api/ingredientInventory';
import { feedingFeedbackApi } from '../../api/feedingFeedback';
import { getSearchResultKey } from '../../mappers/searchMapper';
import { buildMockFeedingFeedback, buildMockInventory, shouldUseWebMockFallback } from '../../mock/webFallback';
import { useSearchPageViewModel } from '../../viewmodels/useSearchPageViewModel';
import { resolveMediaUrl, resolveRecipeImageUrl } from '../../utils/media';

type Props = NativeStackScreenProps<RecipeStackParamList, 'Search'>;
type SearchSource = 'all' | 'local' | 'tianxing' | 'ai';
type SearchTaskKey = 'keyword' | 'dual' | 'inventory' | 'scenario' | 'age';

const SOURCE_OPTIONS: Array<{ key: SearchSource; label: string; icon: string }> = [
  { key: 'all', label: '全部', icon: '🔎' },
  { key: 'local', label: '本地', icon: '🏠' },
  { key: 'tianxing', label: '联网', icon: '🌐' },
  { key: 'ai', label: 'AI 推荐', icon: '✨' },
];

const TASK_OPTIONS: Array<{ key: SearchTaskKey; label: string }> = [
  { key: 'keyword', label: '关键词' },
  { key: 'dual', label: '一菜两吃' },
  { key: 'inventory', label: '冰箱食材' },
  { key: 'scenario', label: '场景' },
  { key: 'age', label: '按月龄' },
];

const SCENARIO_OPTIONS = [
  { key: 'quick', label: '赶时间做饭', query: '快手 简单 家常' },
  { key: 'light', label: '想吃清淡些', query: '清淡 少油 适合宝宝' },
  { key: 'appetite', label: '宝宝胃口一般', query: '宝宝 开胃 易接受' },
  { key: 'fish', label: '想做鱼别太复杂', query: '鱼 简单 不复杂' },
];

const POPULAR_SEARCHES = ['番茄炒蛋', '三文鱼', '鸡肉', '快手晚餐'];
const AGE_FILTERS = ['6个月+', '9个月+', '12个月+', '18个月+'];
const BABY_AGE_OPTIONS = [6, 9, 12, 18, 24, 36];

const ROUTE_SOURCE_LABEL: Record<string, string> = {
  local: '本地库',
  web: '联网结果',
  cache: '缓存结果',
  ai: 'AI 推荐',
  tianxing: '联网结果',
};

export function SearchScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<SearchResult | null>(null);
  const [inventoryIngredients, setInventoryIngredients] = useState<string[]>([]);
  const [inventoryFirstEnabled, setInventoryFirstEnabled] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [activeTask, setActiveTask] = useState<SearchTaskKey>('keyword');
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

  const { data: unifiedData, isLoading: isUnifiedLoading } = useUnifiedSearch(searchSource === 'all' ? submittedKeyword : undefined, searchOptions);
  const { data: sourceData, isLoading: isSourceLoading } = useSourceSearch(searchSource !== 'all' ? submittedKeyword : undefined, searchSource !== 'all' ? searchSource : undefined, searchOptions);

  const hasSearched = submittedKeyword.trim().length > 0;
  const currentData = searchSource === 'all' ? unifiedData : sourceData;
  const searchResults = currentData?.results || [];
  const routeSource = currentData?.route_source || (searchSource === 'tianxing' ? 'web' : searchSource);
  const total = searchResults.length;
  const isLoading = hasSearched && (searchSource === 'all' ? isUnifiedLoading : isSourceLoading);

  const searchPageVm = useSearchPageViewModel({
    searchResults,
    total,
    routeSource,
    lovedRecipeNames,
    rejectedRecipeNames,
    selectedScenario,
    inventoryFirstEnabled,
    inventoryIngredients,
    preferences: {
      defaultBabyAge: userInfo?.preferences?.default_baby_age,
      preferIngredients: userInfo?.preferences?.prefer_ingredients,
      excludeIngredients: userInfo?.preferences?.exclude_ingredients,
      cookingTimeLimit: userInfo?.preferences?.cooking_time_limit ?? userInfo?.preferences?.max_prep_time,
      difficultyPreference: userInfo?.preferences?.difficulty_preference,
    },
  });

  const searchResultLookup = useMemo(() => new Map(searchResults.map((item) => [getSearchResultKey(item), item])), [searchResults]);

  const preferenceLeadText = useMemo(() => {
    const bits: string[] = [];
    const age = userInfo?.preferences?.default_baby_age;
    const time = userInfo?.preferences?.cooking_time_limit ?? userInfo?.preferences?.max_prep_time;
    const excludes = userInfo?.preferences?.exclude_ingredients;
    if (age) {
      bits.push(`${age}个月`);
    }
    if (time) {
      bits.push(`${time}分钟内`);
    }
    if (Array.isArray(excludes) && excludes.length > 0) {
      bits.push(`避开 ${excludes.slice(0, 2).join('、')}`);
    }
    return bits.length > 0 ? `当前会优先参考：${bits.join(' · ')}` : '可按月龄、场景和食材更快缩小范围。';
  }, [userInfo]);

  useEffect(() => {
    if (!hasSearched || isLoading) {
      return;
    }
    trackEvent('recipe_list_viewed', {
      page_id: 'search',
      list_type: searchSource === 'all' ? 'search_result' : `search_result_${searchSource}`,
      result_count: total,
      route_source: routeSource,
    });
  }, [hasSearched, isLoading, routeSource, searchSource, total]);

  const handleSearch = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    setSubmittedKeyword(trimmed);
    setSelectedRecipe(null);
    trackEvent('recipe_searched', {
      page_id: 'search',
      keyword: trimmed,
      search_mode: searchSource,
      inventory_first: inventoryFirstEnabled,
      scenario: selectedScenario || 'none',
    });
  }, [inputValue, inventoryFirstEnabled, searchSource, selectedScenario]);

  const applyQuickSearch = useCallback((value: string, nextTask?: SearchTaskKey) => {
    setInputValue(value);
    setSubmittedKeyword(value);
    if (nextTask) {
      setActiveTask(nextTask);
    }
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
      return;
    }
    setSelectedRecipe(recipe);
    setActiveDetailTab('adult');
    setBabyTransformResult(null);
    setTransformError(null);
  }, [navigation]);

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
      setTransformError(err?.message || '转换失败，请稍后重试。');
    } finally {
      setIsTransforming(false);
    }
  }, []);

  if (selectedRecipe) {
    const baby = babyTransformResult?.baby_version;
    const selectedRecipeImage = resolveRecipeImageUrl(selectedRecipe.id, selectedRecipe.image_url);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRecipe(null)}>
            <ChevronLeftIcon size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedRecipe.name}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailCard}>
            <Text style={styles.detailSource}>{selectedRecipe.source === 'tianxing' ? '联网菜谱' : 'AI 推荐'}</Text>
            <Text style={styles.detailTitle}>{selectedRecipe.name}</Text>
            <View style={styles.detailMetaRow}>
              {selectedRecipe.prep_time ? <View style={styles.detailMetaItem}><ClockIcon size={15} color={Colors.text.secondary} /><Text style={styles.detailMetaText}>{selectedRecipe.prep_time} 分钟</Text></View> : null}
              {selectedRecipe.difficulty ? <View style={styles.detailMetaItem}><ChefHatIcon size={15} color={Colors.text.secondary} /><Text style={styles.detailMetaText}>{selectedRecipe.difficulty}</Text></View> : null}
              {selectedRecipe.servings ? <View style={styles.detailMetaItem}><Text style={styles.detailMetaText}>{selectedRecipe.servings}</Text></View> : null}
              {selectedRecipe.stage ? <View style={styles.detailMetaItem}><Text style={styles.detailMetaHighlight}>{selectedRecipe.stage}</Text></View> : null}
            </View>
            {selectedRecipeImage ? <Image source={{ uri: selectedRecipeImage }} style={styles.detailImage} resizeMode="cover" /> : null}
            {!!selectedRecipe.recommendation_explain?.length && <View style={styles.detailReasonCard}><Text style={styles.detailCardTitle}>推荐理由</Text>{selectedRecipe.recommendation_explain.slice(0, 3).map((item, index) => <Text key={`${item}-${index}`} style={styles.detailListText}>• {item}</Text>)}</View>}
            {!!selectedRecipe.tags?.length && <View style={styles.detailTagRow}>{selectedRecipe.tags.slice(0, 4).map((tag) => <View key={tag} style={styles.detailTag}><Text style={styles.detailTagText}>{tag}</Text></View>)}</View>}
            {!!selectedRecipe.cooking_tips?.length && <View style={styles.detailInlineTips}><Text style={styles.detailInlineTipsText}>{selectedRecipe.cooking_tips.slice(0, 2).join(' · ')}</Text></View>}
          </View>
          <View style={styles.detailTabs}>
            <TouchableOpacity style={[styles.filterTab, activeDetailTab === 'adult' && styles.filterTabActive]} onPress={() => setActiveDetailTab('adult')}>
              <FlameIcon size={18} color={activeDetailTab === 'adult' ? Colors.primary.main : Colors.text.tertiary} />
              <Text style={[styles.filterTabText, activeDetailTab === 'adult' && styles.filterTabTextActive]}>大人版</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterTab, activeDetailTab === 'baby' && styles.quickTabActive]} onPress={() => { setActiveDetailTab('baby'); if (!babyTransformResult && !isTransforming) {handleTransformToBaby(selectedRecipe, selectedDetailBabyAge);} }}>
              <BabyIcon size={18} color={activeDetailTab === 'baby' ? Colors.secondary.main : Colors.text.tertiary} />
              <Text style={[styles.filterTabText, activeDetailTab === 'baby' && styles.quickTabTextActive]}>宝宝版</Text>
            </TouchableOpacity>
          </View>
          {activeDetailTab === 'baby' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {BABY_AGE_OPTIONS.map((months) => (
                <TouchableOpacity key={months} style={[styles.filterTab, selectedDetailBabyAge === months && styles.quickTabActive]} onPress={() => { setSelectedDetailBabyAge(months); handleTransformToBaby(selectedRecipe, months); }}>
                  <Text style={[styles.filterTabText, selectedDetailBabyAge === months && styles.quickTabTextActive]}>{months} 个月</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          {selectedRecipe.description ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>菜谱简介</Text><Text style={styles.detailText}>{selectedRecipe.description}</Text></View> : null}
          {activeDetailTab === 'adult' ? (
            <>
              <View style={styles.detailCard}><Text style={styles.detailCardTitle}>食材清单</Text>{selectedRecipe.ingredients?.length ? selectedRecipe.ingredients.map((item, index) => <Text key={`${item}-${index}`} style={styles.detailListText}>· {item}</Text>) : <Text style={styles.detailText}>暂时没有食材信息。</Text>}</View>
              <View style={styles.detailCard}><Text style={styles.detailCardTitle}>制作步骤</Text>{selectedRecipe.steps?.length ? selectedRecipe.steps.map((item, index) => <Text key={`${item}-${index}`} style={styles.detailListText}>{index + 1}. {item}</Text>) : <Text style={styles.detailText}>这个来源暂时没有完整步骤。</Text>}</View>
            </>
          ) : (
            <>
              {isTransforming ? <View style={styles.infoCard}><ActivityIndicator size="large" color={Colors.secondary.main} /><Text style={styles.infoTitle}>正在生成宝宝版做法...</Text><Text style={styles.infoText}>会根据月龄调整食材用量、质地和做法。</Text></View> : null}
              {transformError && !isTransforming ? <View style={styles.detailCard}><Text style={styles.errorText}>{transformError}</Text></View> : null}
              {baby && !isTransforming ? (
                <>
                  <View style={styles.infoCard}><Text style={styles.infoTitle}>当前适配</Text><Text style={styles.infoText}>{baby.age_range ? `适合 ${baby.age_range}` : '按当前月龄适配'}{baby.texture ? ` · ${baby.texture}` : ''}</Text></View>
                  {baby.preparation_notes ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>宝宝版处理要点</Text><Text style={styles.detailText}>{baby.preparation_notes}</Text></View> : null}
                  {baby.nutrition_tips ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>营养提示</Text><Text style={styles.detailText}>{baby.nutrition_tips}</Text></View> : null}
                  {baby.allergy_alert ? <View style={styles.detailCard}><Text style={styles.detailCardTitle}>过敏提醒</Text><Text style={styles.detailText}>{baby.allergy_alert}</Text></View> : null}
                  <View style={styles.detailCard}><Text style={styles.detailCardTitle}>宝宝版食材</Text>{baby.ingredients?.length ? baby.ingredients.map((item: any, index: number) => <Text key={`${item.name}-${index}`} style={styles.detailListText}>· {item.name} {item.amount}</Text>) : <Text style={styles.detailText}>暂时没有宝宝版食材信息。</Text>}</View>
                  <View style={styles.detailCard}><Text style={styles.detailCardTitle}>宝宝版步骤</Text>{baby.steps?.length ? baby.steps.map((item: any, index: number) => <Text key={`${item.action}-${index}`} style={styles.detailListText}>{item.step || index + 1}. {item.action}</Text>) : <Text style={styles.detailText}>暂时没有宝宝版步骤信息。</Text>}</View>
                </>
              ) : null}
            </>
          )}
          <TouchableOpacity style={[styles.searchButton, saveSearchResult.isPending && styles.searchButtonDisabled]} onPress={async () => {
            try {
              await saveSearchResult.mutateAsync(selectedRecipe);
              Alert.alert('已保存', '这道菜已经加入我的菜谱。');
            } catch (err: any) {
              Alert.alert('提示', err?.message || '保存失败，请稍后重试。');
            }
          }} disabled={saveSearchResult.isPending}>
            <Text style={styles.searchButtonText}>{saveSearchResult.isPending ? '保存中...' : '收藏到我的菜谱'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>SEARCH RECIPES</Text>
          <Text style={styles.heroTitle}>今天想做什么</Text>
          <Text style={styles.heroSubtitle}>先把想法搜出来，再决定今天最适合的一道。</Text>
          <View style={styles.searchBarRow}>
            <View style={styles.searchBar}>
              <SearchIcon size={20} color={Colors.primary.main} />
              <TextInput style={styles.searchInput} placeholder="搜菜名、食材、做法或场景" value={inputValue} onChangeText={setInputValue} placeholderTextColor={Colors.text.tertiary} autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={handleSearch} />
              {inputValue ? <TouchableOpacity style={styles.clearButton} onPress={() => { setInputValue(''); setSubmittedKeyword(''); setSelectedScenario(''); }}><XIcon size={18} color={Colors.text.secondary} /></TouchableOpacity> : null}
            </View>
            <TouchableOpacity style={[styles.searchButton, !inputValue.trim() && styles.searchButtonDisabled]} onPress={handleSearch} disabled={!inputValue.trim()}>
              <Text style={[styles.searchButtonText, !inputValue.trim() && styles.searchButtonTextDisabled]}>搜索</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {SOURCE_OPTIONS.map((option) => <TouchableOpacity key={option.key} style={[styles.filterTab, searchSource === option.key && styles.filterTabActive]} onPress={() => setSearchSource(option.key)}><Text style={[styles.filterTabText, searchSource === option.key && styles.filterTabTextActive]}>{`${option.icon} ${option.label}`}</Text></TouchableOpacity>)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TASK_OPTIONS.map((task) => <TouchableOpacity key={task.key} style={[styles.filterTab, activeTask === task.key && styles.quickTabActive]} onPress={() => { setActiveTask(task.key); if (task.key === 'dual') {applyQuickSearch('一菜两吃', 'dual');} if (task.key === 'inventory' && inventoryIngredients.length > 0) {applyQuickSearch(inventoryIngredients.slice(0, 2).join(' '), 'inventory');} if (task.key === 'age') {applyQuickSearch('12个月+', 'age');} }}><Text style={[styles.filterTabText, activeTask === task.key && styles.quickTabTextActive]}>{task.label}</Text></TouchableOpacity>)}
        </ScrollView>

        {hasSearched && !isLoading && total > 0 ? <View style={styles.summaryCard}><View style={styles.summaryTopRow}><Text style={styles.summaryTitle}>找到 {total} 个结果</Text><View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>{ROUTE_SOURCE_LABEL[routeSource || 'local'] || '结果'}</Text></View></View><Text style={styles.summaryText}>{preferenceLeadText}</Text></View> : null}

        {isLoading ? (
          <View style={styles.feedbackCard}><ActivityIndicator size="large" color={Colors.primary.main} /><Text style={styles.feedbackTitle}>正在搜索...</Text><Text style={styles.feedbackText}>会优先按你的来源和场景设置整理结果。</Text></View>
        ) : hasSearched ? (
          searchPageVm.cards.length > 0 ? <View>{searchPageVm.cards.map((item) => <SearchResultCard key={item.id} item={item} onPress={(resultKey) => { const recipe = searchResultLookup.get(resultKey); if (recipe) {handleRecipePress(recipe);} }} />)}</View> : <View style={styles.feedbackCard}><Text style={styles.feedbackIcon}>🔍</Text><Text style={styles.feedbackTitle}>没有找到合适结果</Text><Text style={styles.feedbackText}>试试换个关键词、场景，或者切换不同来源。</Text></View>
        ) : (
          <View style={styles.exploreWrap}>
            <View style={styles.exploreCard}>
              <Text style={styles.exploreTitle}>少一点犹豫，快一点开做</Text>
              <Text style={styles.exploreText}>按场景、月龄和常搜内容切入，更适合新手爸妈快速决定今天吃什么。</Text>
              <TouchableOpacity style={[styles.inventoryToggle, inventoryFirstEnabled && styles.inventoryToggleActive]} onPress={() => setInventoryFirstEnabled((value) => !value)}>
                <Text style={[styles.inventoryToggleText, inventoryFirstEnabled && styles.inventoryToggleTextActive]}>{inventoryFirstEnabled ? `优先参考库存 · ${inventoryIngredients.length} 项` : '暂不优先参考库存'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.exploreSection}><Text style={styles.exploreSectionTitle}>试试这些场景</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>{SCENARIO_OPTIONS.map((option) => { const active = selectedScenario === option.query; return <TouchableOpacity key={option.key} style={[styles.filterTab, active && styles.quickTabActive]} onPress={() => { const next = active ? '' : option.query; setSelectedScenario(next); if (next) {applyQuickSearch(next, 'scenario');} if (active) { setSubmittedKeyword(''); setInputValue(''); } }}><Text style={[styles.filterTabText, active && styles.quickTabTextActive]}>{option.label}</Text></TouchableOpacity>; })}</ScrollView></View>
            <View style={styles.exploreSection}><Text style={styles.exploreSectionTitle}>大家常搜</Text><View style={styles.wrapRow}>{POPULAR_SEARCHES.map((item) => <TouchableOpacity key={item} style={styles.pill} onPress={() => applyQuickSearch(item, 'keyword')}><Text style={styles.pillText}>{item}</Text></TouchableOpacity>)}</View></View>
            <View style={styles.exploreSection}><Text style={styles.exploreSectionTitle}>按月龄找</Text><View style={styles.wrapRow}>{AGE_FILTERS.map((item) => <TouchableOpacity key={item} style={styles.pill} onPress={() => applyQuickSearch(item, 'age')}><Text style={styles.pillText}>{item}</Text></TouchableOpacity>)}</View></View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  screen: { flex: 1 },
  screenContent: { padding: Spacing.md, paddingBottom: 96, gap: Spacing.md },
  heroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  heroEyebrow: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.8 },
  heroTitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xl + 2, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, lineHeight: 30 },
  heroSubtitle: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral.gray50, borderRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.md, height: 52, borderWidth: 1, borderColor: Colors.border.light },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: Typography.fontSize.base, color: Colors.text.primary },
  clearButton: { padding: Spacing.xs },
  searchButton: { backgroundColor: Colors.primary.main, paddingHorizontal: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius['2xl'], alignItems: 'center' },
  searchButtonDisabled: { backgroundColor: Colors.neutral.gray300 },
  searchButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  searchButtonTextDisabled: { color: Colors.text.tertiary },
  tabRow: { gap: Spacing.sm, paddingRight: Spacing.md },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.light, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  filterTabActive: { backgroundColor: Colors.primary[50], borderColor: Colors.primary[100] },
  filterTabText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  filterTabTextActive: { color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  quickTabActive: { backgroundColor: Colors.secondary[50], borderColor: Colors.secondary[100] },
  quickTabTextActive: { color: Colors.secondary.main, fontWeight: Typography.fontWeight.semibold },
  summaryCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.light },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  summaryTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summaryBadge: { backgroundColor: Colors.primary[50], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  summaryBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  summaryText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  feedbackCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.lg, paddingVertical: Spacing['2xl'], borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  feedbackIcon: { fontSize: 44 },
  feedbackTitle: { marginTop: Spacing.md, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  feedbackText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20, textAlign: 'center' },
  exploreWrap: { gap: Spacing.md },
  exploreCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  exploreTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  exploreText: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  inventoryToggle: { marginTop: Spacing.md, alignSelf: 'flex-start', backgroundColor: Colors.neutral.gray50, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border.light },
  inventoryToggleActive: { backgroundColor: Colors.primary[50], borderColor: Colors.primary[100] },
  inventoryToggleText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  inventoryToggleTextActive: { color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  exploreSection: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.light },
  exploreSectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: { backgroundColor: Colors.neutral.gray50, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border.light },
  pillText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  detailHeaderTitle: { flex: 1, textAlign: 'center', fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  backButton: { padding: Spacing.sm },
  headerPlaceholder: { width: 40 },
  detailContent: { padding: Spacing.md, paddingBottom: 96, gap: Spacing.md },
  detailCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  detailSource: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.4 },
  detailTitle: { marginTop: Spacing.md, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  detailMetaText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  detailMetaHighlight: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  detailImage: { width: '100%', height: 220, borderRadius: BorderRadius.xl, marginTop: Spacing.md },
  detailReasonCard: { marginTop: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.light },
  detailTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  detailTag: { backgroundColor: Colors.neutral.gray50, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border.light },
  detailTagText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  detailInlineTips: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: Colors.secondary[50], borderWidth: 1, borderColor: Colors.secondary[100] },
  detailInlineTipsText: { fontSize: Typography.fontSize.sm, color: Colors.secondary.dark, lineHeight: 20 },
  detailTabs: { flexDirection: 'row', gap: Spacing.sm },
  detailCardTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  detailText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  detailListText: { fontSize: Typography.fontSize.base, color: Colors.text.primary, lineHeight: 24, marginBottom: Spacing.sm },
  infoCard: { alignItems: 'center', backgroundColor: Colors.secondary[50], borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.secondary[100] },
  infoTitle: { marginTop: Spacing.md, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.secondary.main },
  infoText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.secondary.dark, textAlign: 'center', lineHeight: 20 },
  errorText: { fontSize: Typography.fontSize.sm, color: Colors.functional.error, lineHeight: 20 },
});

export default SearchScreen;
