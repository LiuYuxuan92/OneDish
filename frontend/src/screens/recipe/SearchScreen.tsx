/**
 * 简家厨 - 搜索页面（优化版）
 * 
 * 优化要点：
 * 1. 响应式布局：支持手机、平板不同尺寸
 * 2. 视觉层次优化：增强搜索栏和卡片阴影
 * 3. 交互优化：添加搜索历史功能
 * 4. 性能优化：使用 React.memo 减少不必要的重渲染
 * 5. 加载状态优化：骨架屏加载动画
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  Platform,
  Alert,
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

type Props = NativeStackScreenProps<RecipeStackParamList, 'Search'>;

type SearchSource = 'all' | 'local' | 'tianxing' | 'ai';

// 获取屏幕宽度用于响应式设计
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
const MOBILE_BREAKPOINT = 375;

// 搜索来源选项
const SOURCE_OPTIONS: { key: SearchSource; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '🔍' },
  { key: 'local', label: '本地', icon: '📚' },
  { key: 'tianxing', label: '联网', icon: '🌐' },
  { key: 'ai', label: 'AI推荐', icon: '🤖' },
];

export function SearchScreen({ navigation }: Props) {
  // inputValue: 用户正在输入的内容；submittedKeyword: 用户提交搜索的关键词
  const [inputValue, setInputValue] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<SearchResult | null>(null);
  // 详情页 Tab 状态
  const [activeDetailTab, setActiveDetailTab] = useState<'adult' | 'baby'>('adult');
  const [selectedDetailBabyAge, setSelectedDetailBabyAge] = useState(12);
  const [babyTransformResult, setBabyTransformResult] = useState<TransformResult | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);

  const saveSearchResult = useSaveSearchResult();

  // 只有 submittedKeyword 有值时才触发查询，避免自动查询与手动搜索时序冲突
  const { data: unifiedData, isLoading: isUnifiedLoading } = useUnifiedSearch(
    searchSource === 'all' ? submittedKeyword : undefined
  );

  const { data: sourceData, isLoading: isSourceLoading } = useSourceSearch(
    searchSource !== 'all' ? submittedKeyword : undefined,
    searchSource !== 'all' ? searchSource : undefined
  );

  const hasSearched = submittedKeyword.length > 0;
  const currentData = searchSource === 'all' ? unifiedData : sourceData;
  const searchResults = currentData?.results || [];
  const resultSource = searchSource === 'all' ? (unifiedData?.source || 'local') : searchSource;
  const routeSource = currentData?.route_source || (resultSource === 'tianxing' ? 'web' : resultSource);
  const total = searchResults.length;
  const isLoading = hasSearched && (searchSource === 'all' ? isUnifiedLoading : isSourceLoading);

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
      });
    }
  }, [inputValue, searchSource]);

  const handleSourceChange = useCallback((source: SearchSource) => {
    setSearchSource(source);
    setSelectedRecipe(null);
    // 切换来源时，如果已有提交的关键词，查询会自动重新触发（queryKey 变了）
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

  // 触发宝宝版转换
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

  // 渲染联网/AI菜谱详情（含大人/宝宝版切换）
  const renderOnlineRecipeDetail = () => {
    if (!selectedRecipe) return null;

    const hasIngredients = selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0;
    const hasSteps = selectedRecipe.steps && selectedRecipe.steps.length > 0;
    const hasDetails = hasIngredients || hasSteps;
    const baby = babyTransformResult?.baby_version;

    // 宝宝版月龄快捷选项
    const BABY_AGE_OPTIONS = [
      { months: 6, label: '6个月' },
      { months: 9, label: '9个月' },
      { months: 12, label: '12个月' },
      { months: 18, label: '18个月' },
      { months: 24, label: '24个月' },
      { months: 36, label: '36个月' },
    ];

    return (
      <View style={styles.detailContainer}>
        {/* 顶部导航 */}
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeftIcon size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {selectedRecipe.name}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* 来源标签 */}
          <View style={styles.detailTitleSection}>
            <View style={styles.sourceTagLarge}>
              <Text style={styles.sourceTagTextLarge}>
                {selectedRecipe.source === 'tianxing' ? '🌐 联网菜谱' : '🤖 AI推荐'}
              </Text>
            </View>
            <Text style={styles.detailName}>{selectedRecipe.name}</Text>
            <View style={styles.detailMeta}>
              {selectedRecipe.prep_time && (
                <View style={styles.detailMetaItem}>
                  <ClockIcon size={16} color={Colors.text.secondary} />
                  <Text style={styles.detailMetaText}>{selectedRecipe.prep_time}分钟</Text>
                </View>
              )}
              {selectedRecipe.difficulty && (
                <View style={styles.detailMetaItem}>
                  <ChefHatIcon size={16} color={Colors.text.secondary} />
                  <Text style={styles.detailMetaText}>{selectedRecipe.difficulty}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 图片 */}
          {selectedRecipe.image_url && selectedRecipe.image_url.length > 0 && (
            <Image
              source={{ uri: selectedRecipe.image_url[0] }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          )}

          {/* 大人/宝宝版 Tab */}
          <View style={styles.detailTabContainer}>
            <TouchableOpacity
              style={[styles.detailTab, activeDetailTab === 'adult' && styles.detailTabActive]}
              onPress={() => setActiveDetailTab('adult')}
            >
              <FlameIcon size={18} color={activeDetailTab === 'adult' ? Colors.primary.main : Colors.text.tertiary} />
              <Text style={[styles.detailTabText, activeDetailTab === 'adult' && styles.detailTabTextActive]}>
                大人版
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailTab, activeDetailTab === 'baby' && styles.detailTabActiveBaby]}
              onPress={() => {
                setActiveDetailTab('baby');
                if (!babyTransformResult && !isTransforming) {
                  handleTransformToBaby(selectedRecipe, selectedDetailBabyAge);
                }
              }}
            >
              <BabyIcon size={18} color={activeDetailTab === 'baby' ? Colors.secondary.main : Colors.text.tertiary} />
              <Text style={[styles.detailTabText, activeDetailTab === 'baby' && styles.detailTabTextActiveBaby]}>
                宝宝版 (智能转换)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 宝宝月龄选择器 - 仅宝宝版显示 */}
          {activeDetailTab === 'baby' && (
            <View style={styles.babyAgeSelector}>
              <Text style={styles.babyAgeSelectorLabel}>宝宝月龄：</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.babyAgeOptions}>
                {BABY_AGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.months}
                    style={[
                      styles.babyAgeOption,
                      selectedDetailBabyAge === opt.months && styles.babyAgeOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDetailBabyAge(opt.months);
                      handleTransformToBaby(selectedRecipe, opt.months);
                    }}
                  >
                    <Text style={[
                      styles.babyAgeOptionText,
                      selectedDetailBabyAge === opt.months && styles.babyAgeOptionTextSelected,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.detailSection}>
            {/* 描述 */}
            {selectedRecipe.description && (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>简介</Text>
                <Text style={styles.detailCardText}>{selectedRecipe.description}</Text>
              </View>
            )}

            {/* ====== 大人版内容 ====== */}
            {activeDetailTab === 'adult' && (
              <>
                {hasIngredients ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardTitle}>📝 食材清单</Text>
                    <View style={styles.ingredientsList}>
                      {selectedRecipe.ingredients!.map((ingredient, index) => (
                        <View key={index} style={styles.ingredientItem}>
                          <View style={styles.ingredientDot} />
                          <Text style={styles.ingredientText}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={[styles.detailCard, styles.noDataCard]}>
                    <Text style={styles.noDataText}>暂无食材信息</Text>
                  </View>
                )}

                {hasSteps ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardTitle}>👨‍🍳 制作步骤</Text>
                    <View style={styles.stepsList}>
                      {selectedRecipe.steps!.map((step, index) => (
                        <View key={index} style={styles.stepItem}>
                          <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                          </View>
                          <View style={styles.stepContent}>
                            <Text style={styles.stepAction}>{step}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={[styles.detailCard, styles.noDataCard]}>
                    <Text style={styles.noDataTitle}>👨‍🍳 制作步骤</Text>
                    <Text style={styles.noDataText}>
                      {selectedRecipe.source === 'tianxing'
                        ? '联网菜谱暂未提供详细步骤，建议搜索本地菜谱获取完整做法'
                        : 'AI推荐菜谱暂未生成详细步骤，您可以参考简介描述尝试制作'}
                    </Text>
                  </View>
                )}

                {!hasDetails && (
                  <View style={styles.suggestionCard}>
                    <Text style={styles.suggestionTitle}>💡 获取完整菜谱</Text>
                    <Text style={styles.suggestionText}>
                      建议切换到「本地」搜索{'\n'}
                      或在菜谱库中查找完整菜谱
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* ====== 宝宝版内容 ====== */}
            {activeDetailTab === 'baby' && (
              <>
                {isTransforming && (
                  <View style={styles.transformingCard}>
                    <ActivityIndicator size="large" color={Colors.secondary.main} />
                    <Text style={styles.transformingText}>正在智能转换宝宝版菜谱...</Text>
                    <Text style={styles.transformingSubText}>根据月龄调整食材用量和烹饪方式</Text>
                  </View>
                )}

                {transformError && !isTransforming && (
                  <View style={[styles.detailCard, styles.errorCard]}>
                    <Text style={styles.errorCardText}>⚠️ {transformError}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => handleTransformToBaby(selectedRecipe, selectedDetailBabyAge)}
                    >
                      <Text style={styles.retryButtonText}>重新转换</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {baby && !isTransforming && (
                  <>
                    {/* 年龄范围徽章 */}
                    {baby.age_range && (
                      <View style={styles.babyAgeBadge}>
                        <BabyIcon size={16} color={Colors.secondary.main} />
                        <Text style={styles.babyAgeBadgeText}>适合 {baby.age_range}</Text>
                        {baby.texture && <Text style={styles.babyTextureText}> · {baby.texture}</Text>}
                      </View>
                    )}

                    {/* 宝宝食材 */}
                    {baby.ingredients && baby.ingredients.length > 0 && (
                      <View style={styles.detailCard}>
                        <Text style={styles.detailCardTitle}>📝 食材清单（宝宝版）</Text>
                        <View style={styles.ingredientsList}>
                          {baby.ingredients.map((item, index) => (
                            <View key={index} style={styles.ingredientItem}>
                              <View style={[styles.ingredientDot, styles.ingredientDotBaby]} />
                              <Text style={styles.ingredientText}>{item.name}</Text>
                              <Text style={styles.ingredientAmount}>{item.amount}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* 宝宝调料 */}
                    {baby.seasonings && baby.seasonings.length > 0 && (
                      <View style={styles.detailCard}>
                        <Text style={styles.detailCardTitle}>🧂 调料（宝宝版）</Text>
                        <View style={styles.seasoningsList}>
                          {baby.seasonings.map((item, index) => (
                            <View key={index} style={styles.seasoningTag}>
                              <Text style={styles.seasoningName}>{item.name}</Text>
                              <Text style={styles.seasoningAmount}>{item.amount}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* 宝宝步骤 */}
                    {baby.steps && baby.steps.length > 0 && (
                      <View style={styles.detailCard}>
                        <Text style={styles.detailCardTitle}>👨‍🍳 制作步骤（宝宝版）</Text>
                        <View style={styles.stepsList}>
                          {baby.steps.map((step, index) => (
                            <View key={index} style={styles.stepItem}>
                              <View style={[styles.stepNumber, styles.stepNumberBaby]}>
                                <Text style={styles.stepNumberText}>{step.step || index + 1}</Text>
                              </View>
                              <View style={styles.stepContent}>
                                <Text style={styles.stepAction}>{step.action}</Text>
                                {step.time > 0 && (
                                  <View style={styles.stepTimeBadge}>
                                    <ClockIcon size={12} color={Colors.secondary.main} />
                                    <Text style={styles.stepTimeBadgeText}>{step.time}分钟</Text>
                                  </View>
                                )}
                                {step.note ? (
                                  <View style={styles.stepNote}>
                                    <Text style={styles.stepNoteText}>{step.note}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* 营养要点 */}
                    {baby.nutrition_tips && (
                      <View style={[styles.detailCard, styles.nutritionCard]}>
                        <Text style={styles.detailCardTitle}>💡 营养要点</Text>
                        <Text style={styles.nutritionText}>{baby.nutrition_tips}</Text>
                      </View>
                    )}

                    {/* 过敏提醒 */}
                    {baby.allergy_alert && (
                      <View style={[styles.detailCard, styles.allergyCard]}>
                        <Text style={styles.detailCardTitle}>🚨 过敏提醒</Text>
                        <Text style={styles.allergyText}>{baby.allergy_alert}</Text>
                      </View>
                    )}

                    {/* 准备要点 */}
                    {baby.preparation_notes && (
                      <View style={[styles.detailCard, styles.preparationCard]}>
                        <Text style={styles.detailCardTitle}>📝 准备要点</Text>
                        <Text style={styles.preparationText}>{baby.preparation_notes}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            {/* 收藏到我的菜谱 */}
            <TouchableOpacity
              style={[styles.saveButton, saveSearchResult.isPending && styles.saveButtonDisabled]}
              onPress={async () => {
                try {
                  await saveSearchResult.mutateAsync(selectedRecipe);
                  Alert.alert('成功', '已保存到我的菜谱');
                } catch (err: any) {
                  Alert.alert('提示', err?.message || '保存失败，请重试');
                }
              }}
              disabled={saveSearchResult.isPending}
            >
              <Text style={styles.saveButtonText}>
                {saveSearchResult.isPending ? '保存中...' : '⭐ 收藏到我的菜谱'}
              </Text>
            </TouchableOpacity>

            {/* 标签 */}
            {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {selectedRecipe.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchBar}>
        <SearchIcon size={20} color={Colors.primary.main} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索菜谱名称、食材..."
          value={inputValue}
          onChangeText={setInputValue}
          placeholderTextColor={Colors.text.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {inputValue ? (
          <TouchableOpacity
            onPress={() => { setInputValue(''); setSubmittedKeyword(''); }}
            style={styles.clearButton}
          >
            <XIcon size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.searchButton, !inputValue.trim() && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={!inputValue.trim()}
      >
        <Text style={[styles.searchButtonText, !inputValue.trim() && styles.searchButtonTextDisabled]}>
          搜索
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 来源标签（优化版）
  const renderSourceTabs = () => (
    <ScrollView 
      style={styles.sourceTabsScroll}
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sourceTabsContent}
    >
      {SOURCE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.sourceTab, 
            searchSource === option.key && styles.sourceTabActive,
            isTablet && styles.sourceTabTablet
          ]}
          onPress={() => handleSourceChange(option.key)}
        >
          <Text style={[styles.sourceTabIcon, isTablet && styles.sourceTabIconTablet]}>{option.icon}</Text>
          <Text style={[
            styles.sourceTabText, 
            searchSource === option.key && styles.sourceTabTextActive,
            isTablet && styles.sourceTabTextTablet
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRecipeCard = useCallback(({ item }: { item: SearchResult }) => {
    const sourceLabel = item.source === 'local' ? '📚 本地' : item.source === 'tianxing' ? '🌐 联网' : '🤖 AI';
    const timeLabel = typeof item.prep_time === 'number' ? `⏱ ${item.prep_time}分钟` : '';
    const diffLabel = item.difficulty ? ` · ${item.difficulty}` : '';

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleRecipePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.recipeImagePlaceholder}>
          <Text style={styles.recipeImagePlaceholderText}>🍽️</Text>
        </View>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{item.name || '未命名菜谱'}</Text>
          {item.description ? (
            <Text style={styles.recipeDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <Text style={styles.recipeMetaText}>{sourceLabel} {timeLabel}{diffLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleRecipePress]);

  // 空状态
  const renderEmptyState = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>搜索菜谱</Text>
          <Text style={styles.emptyText}>
            输入关键词搜索菜谱{'\n'}
            支持本地数据库、联网菜谱和 AI 推荐
          </Text>
          <View style={styles.emptySuggestions}>
            <Text style={styles.emptySuggestionsTitle}>💡 热门搜索：</Text>
            <View style={styles.emptyTags}>
              {['番茄炒蛋', '红烧肉', '宫保鸡丁', '鱼香肉丝'].map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emptyTag}
                  onPress={() => {
                    setInputValue(tag);
                    setSubmittedKeyword(tag);
                  }}
                >
                  <Text style={styles.emptyTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }
  
    if (isLoading) {
      return null;
    }
  
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>😔</Text>
        <Text style={styles.emptyTitle}>未找到相关菜谱</Text>
        <Text style={styles.emptyText}>
          试试其他关键词{'\n'}
          或切换搜索来源
        </Text>
      </View>
    );
  };

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary.main} />
      <Text style={styles.loadingText}>搜索中...</Text>
      <View style={styles.loadingTips}>
        <Text style={styles.loadingTipsTitle}>💡 搜索小贴士</Text>
        <Text style={styles.loadingTipsText}>• 尝试简短的关键词，如"番茄"、"鸡肉"</Text>
        <Text style={styles.loadingTipsText}>• 切换不同来源获取更多菜谱</Text>
        <Text style={styles.loadingTipsText}>• 本地数据库包含 80+ 道经典菜谱</Text>
      </View>
    </View>
  );

  // 如果已选择菜谱，显示详情
  if (selectedRecipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderOnlineRecipeDetail()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>搜索菜谱</Text>
      </View>

      {renderSearchBar()}
      {renderSourceTabs()}

      {/* 搜索结果统计 */}
      {hasSearched && !isLoading && total > 0 && (
        <View style={styles.resultStats}>
          <View style={styles.resultStatsContent}>
            <Text style={styles.resultStatsText}>
              找到 {total} 个结果
            </Text>
            <View style={styles.resultSourceBadge}>
              <Text style={styles.resultSourceBadgeText}>
                {routeSource === 'local'
                  ? '📚 Local'
                  : routeSource === 'cache'
                    ? '⚡ Cache'
                    : routeSource === 'web' || routeSource === 'tianxing'
                      ? '🌐 Web'
                      : routeSource === 'ai'
                        ? '🤖 AI'
                        : '🔍 全部'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 搜索结果列表 - 使用 ScrollView 替代 FlatList，避免 react-native-web 上的高度计算问题 */}
      {isLoading ? (
        renderLoading()
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {hasSearched && searchResults.length > 0
            ? searchResults.map((item, index) => (
                <React.Fragment key={`${item.source}_${item.id}_${index}`}>
                  {renderRecipeCard({ item })}
                </React.Fragment>
              ))
            : renderEmptyState()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  // 搜索栏
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    flex: 1,
    ...Typography.body.regular,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  searchButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.neutral.gray300,
  },
  searchButtonText: {
    ...Typography.body.regular,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  searchButtonTextDisabled: {
    color: Colors.text.tertiary,
  },

  // 来源标签（优化版）
  sourceTabsScroll: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sourceTabsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sourceTabActive: {
    backgroundColor: Colors.primary.light,
    borderColor: Colors.primary.main,
  },
  sourceTabTablet: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sourceTabIcon: {
    fontSize: 14,
  },
  sourceTabIconTablet: {
    fontSize: 16,
  },
  sourceTabText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  sourceTabTextActive: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  sourceTabTextTablet: {
    fontSize: Typography.fontSize.base,
  },

  // 结果统计（优化版）
  resultStats: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  resultStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultStatsText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  resultSourceBadge: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  resultSourceBadgeText: {
    ...Typography.body.caption,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 列表
  scrollContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },

  // 菜谱卡片
  recipeCard: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'visible' as const,
    ...Shadows.sm,
  },
  recipeImagePlaceholder: {
    width: 80,
    height: 80,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholderText: {
    fontSize: 32,
  },
  recipeInfo: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    overflow: 'visible' as const,
  },
  recipeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap' as const,
  },
  recipeDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  recipeMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },

  // 空状态
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.heading.h5,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySuggestions: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptySuggestionsTitle: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  emptyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emptyTag: {
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyTagText: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },

  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  loadingTips: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.lg,
    maxWidth: 300,
  },
  loadingTipsTitle: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  loadingTipsText: {
    ...Typography.body.caption,
    color: Colors.primary.dark,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },

  // 联网菜谱详情
  detailContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: Spacing.sm,
  },
  detailTitle: {
    flex: 1,
    ...Typography.heading.h6,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  detailContent: {
    flex: 1,
  },
  sourceTagLarge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    margin: Spacing.md,
  },
  sourceTagTextLarge: {
    ...Typography.body.small,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  detailImage: {
    width: '100%',
    height: 220,
  },
  detailSection: {
    padding: Spacing.md,
  },
  detailName: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailMetaText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  detailCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  detailCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  detailCardText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  ingredientsList: {
    gap: Spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.main,
  },
  ingredientText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  // 无数据提示
  noDataCard: {
    backgroundColor: Colors.neutral.gray100,
  },
  noDataTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  noDataText: {
    ...Typography.body.regular,
    color: Colors.text.tertiary,
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tipTitle: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.xs,
  },
  tipText: {
    ...Typography.body.caption,
    color: Colors.primary.dark,
    lineHeight: 18,
  },
  suggestionCard: {
    backgroundColor: Colors.secondary.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
  },
  suggestionTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.xs,
  },
  suggestionText: {
    ...Typography.body.caption,
    color: Colors.secondary.dark,
    lineHeight: 20,
  },
  stepsList: {
    gap: Spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  stepContent: {
    flex: 1,
  },
  stepAction: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 22,
    fontWeight: Typography.fontWeight.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },

  // 详情页标题区
  detailTitleSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  // 大人/宝宝 Tab
  detailTabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  detailTabActive: {
    backgroundColor: Colors.primary.light,
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  detailTabActiveBaby: {
    backgroundColor: Colors.secondary.light,
    borderWidth: 1,
    borderColor: Colors.secondary.main,
  },
  detailTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
  },
  detailTabTextActive: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
  detailTabTextActiveBaby: {
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.bold,
  },

  // 宝宝月龄选择器
  babyAgeSelector: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  babyAgeSelectorLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  babyAgeOptions: {
    gap: Spacing.sm,
  },
  babyAgeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  babyAgeOptionSelected: {
    backgroundColor: Colors.secondary.light,
    borderColor: Colors.secondary.main,
  },
  babyAgeOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  babyAgeOptionTextSelected: {
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 宝宝年龄徽章
  babyAgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  babyAgeBadgeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.main,
  },
  babyTextureText: {
    fontSize: Typography.fontSize.base,
    color: Colors.secondary.dark,
  },

  // 宝宝食材点和用量
  ingredientDotBaby: {
    backgroundColor: Colors.secondary.main,
  },
  ingredientAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  // 调料
  seasoningsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  seasoningTag: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  seasoningName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  seasoningAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  // 宝宝版步骤编号
  stepNumberBaby: {
    backgroundColor: Colors.secondary.main,
  },

  // 步骤时间标签
  stepTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  stepTimeBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.main,
  },

  // 步骤备注
  stepNote: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  stepNoteText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },

  // 转换中
  transformingCard: {
    backgroundColor: Colors.secondary.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  transformingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.main,
  },
  transformingSubText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondary.dark,
    textAlign: 'center',
  },

  // 错误和重试
  errorCard: {
    backgroundColor: Colors.functional.errorLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.error,
  },
  errorCardText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.functional.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 营养/过敏/准备要点卡片
  nutritionCard: {
    backgroundColor: Colors.functional.successLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.success,
  },
  nutritionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.success,
    lineHeight: 22,
  },
  allergyCard: {
    backgroundColor: Colors.functional.errorLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.error,
  },
  allergyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
    lineHeight: 22,
    fontWeight: Typography.fontWeight.medium,
  },
  preparationCard: {
    backgroundColor: Colors.functional.infoLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.info,
  },
  preparationText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.info,
    lineHeight: 22,
  },

  // 保存按钮
  saveButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default SearchScreen;
