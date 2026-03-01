// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAllRecipes, useDailyRecipe } from '../../hooks/useRecipes';
import { useBabyStageByAge } from '../../hooks/useBabyStages';
import { useFavorites } from '../../hooks/useFavorites';
import { useUserInfo } from '../../hooks/useUsers';
import { buildPreferredCategories, getSwapCandidate, normalizeCategories } from './swapStrategy';
import {
  getSwapWeightsConfig,
  resetSwapRemoteConfigControls,
  setSwapRemoteConfigControls,
  SWAP_REMOTE_CONFIG_ENABLED_KEY,
  SWAP_REMOTE_CONFIG_URL_KEY,
} from './swapWeightsConfig';
import {
  buildRecommendationReasons,
  scoreRecommendationQuality,
} from './recommendationInsights';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { SkeletonCard } from '../../components/common/Skeleton';
import { trackMainFlowEvent } from '../../analytics/mainFlow';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const SWAP_DEBOUNCE_MS = 1000;
const SWAP_PREFERENCE_KEY = 'home:last_preferred_category';
const SWAP_TIME_WINDOW_MINUTES = 10;

type PendingSwapSuccess = {
  prevRecipeId: string | null;
  nextRecipeId: string;
  clickedAtIso: string;
};

export function HomeScreen({ navigation }: Props) {
  // 获取今日推荐（一菜两吃配对）
  const { data: dailyData, isLoading, error, refetch } = useDailyRecipe({ type: 'dinner' });
  const { data: allRecipesData } = useAllRecipes();
  const { data: favoritesData } = useFavorites({ page: 1, limit: 20 });
  const { data: userInfo } = useUserInfo();
  // 获取宝宝阶段信息（默认9个月）
  const { data: currentStage } = useBabyStageByAge(9);

  const [refreshing, setRefreshing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<any>(null);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [localPreferredCategories, setLocalPreferredCategories] = useState<string[]>([]);
  const [swapScoringWeights, setSwapScoringWeights] = useState<any>(null);
  const [swapExperimentBucket, setSwapExperimentBucket] = useState<'A' | 'B'>('A');
  const [swapConfigSource, setSwapConfigSource] = useState<'default' | 'remote' | 'local'>('default');
  const [remoteEnabledDraft, setRemoteEnabledDraft] = useState(false);
  const [remoteUrlDraft, setRemoteUrlDraft] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const pendingSwapSuccessRef = useRef<PendingSwapSuccess | null>(null);
  const lastSwapAtRef = useRef(0);
  const hasTrackedHomeViewRef = useRef(false);
  const lastRecommendationSourceRef = useRef<'daily' | 'swap'>('daily');
  const lastQualityTrackedRecipeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (dailyData?.recipe) {
      lastRecommendationSourceRef.current = 'daily';
    }
    setCurrentRecipe(dailyData?.recipe || null);
  }, [dailyData?.recipe?.id]);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(SWAP_PREFERENCE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
          setLocalPreferredCategories(normalized);
        }
      } catch (err) {
        console.error('读取换菜偏好失败:', err);
      }
    };
    loadPreference();
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const loadDebugControls = async () => {
      const [enabledRaw, urlRaw] = await Promise.all([
        AsyncStorage.getItem(SWAP_REMOTE_CONFIG_ENABLED_KEY),
        AsyncStorage.getItem(SWAP_REMOTE_CONFIG_URL_KEY),
      ]);
      setRemoteEnabledDraft(enabledRaw === '1' || enabledRaw === 'true');
      setRemoteUrlDraft(urlRaw || '');
    };

    loadDebugControls().catch((err) => {
      console.error('读取换菜远端配置调试项失败:', err);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSwapWeightsConfig = async () => {
      try {
        const config = await getSwapWeightsConfig({
          // 分桶优先级：真实登录 userId > 匿名稳定 bucket（本地缓存）。
          userId: userInfo?.id || null,
        });
        if (!mounted) {
          return;
        }
        setSwapScoringWeights(config.weights);
        setSwapExperimentBucket(config.bucket);
        setSwapConfigSource(config.source);
      } catch (err) {
        console.error('读取换菜权重配置失败:', err);
      }
    };

    loadSwapWeightsConfig();
    return () => {
      mounted = false;
    };
  }, [userInfo?.id]);

  useEffect(() => {
    const nextPreferred = buildPreferredCategories({
      // 优先使用真实偏好源（收藏）提取分类；不可用时回退到本地记忆。
      favoritesItems: favoritesData?.items,
      allRecipes: allRecipesData?.items,
      localMemory: localPreferredCategories,
      limit: 3,
    });

    if (nextPreferred.join('|') !== preferredCategories.join('|')) {
      setPreferredCategories(nextPreferred);
    }
  }, [favoritesData?.items, allRecipesData?.items, localPreferredCategories]);

  useEffect(() => {
    if (!currentRecipe) {
      return;
    }
    const categories = normalizeCategories(currentRecipe.category);
    if (categories.length === 0) {
      return;
    }

    const nextPreference = [...new Set([...categories, ...localPreferredCategories])].slice(0, 3);
    if (nextPreference.join('|') === localPreferredCategories.join('|')) {
      return;
    }

    setLocalPreferredCategories(nextPreference);
    AsyncStorage.setItem(SWAP_PREFERENCE_KEY, JSON.stringify(nextPreference)).catch((err) => {
      console.error('保存换菜偏好失败:', err);
    });
  }, [currentRecipe?.id, localPreferredCategories]);

  useEffect(() => {
    if (hasTrackedHomeViewRef.current) {
      return;
    }
    trackMainFlowEvent('home_view', {
      source: 'home',
      screen: 'HomeScreen',
      recipeId: dailyData?.recipe?.id || null,
    });
    hasTrackedHomeViewRef.current = true;
  }, [dailyData?.recipe?.id]);

  const recommendationReasons = useMemo(
    () =>
      buildRecommendationReasons({
        recipe: currentRecipe,
        currentStage,
        preferredCategories,
        limit: 3,
      }),
    [currentRecipe, currentStage, preferredCategories],
  );

  useEffect(() => {
    if (!currentRecipe?.id) {
      return;
    }
    if (lastQualityTrackedRecipeIdRef.current === currentRecipe.id) {
      return;
    }

    const scored = scoreRecommendationQuality({
      recipe: currentRecipe,
      currentRecipe: dailyData?.recipe,
      currentStage,
      preferredCategories,
      timeWindowMinutes: SWAP_TIME_WINDOW_MINUTES,
    });

    trackMainFlowEvent('recommend_quality_scored', {
      source: 'home',
      screen: 'HomeScreen',
      recipeId: currentRecipe.id,
      recommendationSource: lastRecommendationSourceRef.current,
      experimentBucket: swapExperimentBucket,
      swapConfigSource: swapConfigSource,
      qualityScore: scored.total,
      scoreBreakdown: scored.dimensions,
      ...scored.dimensions,
    });

    lastQualityTrackedRecipeIdRef.current = currentRecipe.id;
  }, [
    currentRecipe?.id,
    dailyData?.recipe?.id,
    currentStage,
    preferredCategories,
    swapExperimentBucket,
    swapConfigSource,
  ]);

  useEffect(() => {
    const pending = pendingSwapSuccessRef.current;
    if (!pending || !currentRecipe?.id) {
      return;
    }
    if (currentRecipe.id !== pending.nextRecipeId) {
      return;
    }

    trackMainFlowEvent('swap_success', {
      timestamp: new Date().toISOString(),
      userId: userInfo?.id || null,
      source: 'home',
      screen: 'HomeScreen',
      recipeId: currentRecipe.id,
      prevRecipeId: pending.prevRecipeId,
      nextRecipeId: pending.nextRecipeId,
      experimentBucket: swapExperimentBucket,
      swapConfigSource: swapConfigSource,
      clickedAt: pending.clickedAtIso,
    });

    pendingSwapSuccessRef.current = null;
  }, [currentRecipe?.id, swapConfigSource, swapExperimentBucket, userInfo?.id]);

  const onSwapRecipe = async () => {
    const now = Date.now();
    if (swapping || now - lastSwapAtRef.current < SWAP_DEBOUNCE_MS) {
      return;
    }

    const nextRecipe = getSwapCandidate({
      currentRecipe,
      allRecipesItems: allRecipesData?.items,
      preferredCategories,
      currentStage,
      timeWindowMinutes: SWAP_TIME_WINDOW_MINUTES,
      weights: swapScoringWeights,
    });
    if (!nextRecipe) {
      return;
    }

    lastSwapAtRef.current = now;
    setSwapping(true);

    try {
      trackMainFlowEvent('recommend_swap_click', {
        source: 'home',
        screen: 'HomeScreen',
        recipeId: currentRecipe?.id || null,
        nextRecipeId: nextRecipe.id,
        experimentBucket: swapExperimentBucket,
        swapConfigSource: swapConfigSource,
      });

      // 轻量加载态，避免连续触发
      await new Promise((resolve) => setTimeout(resolve, 250));
      pendingSwapSuccessRef.current = {
        prevRecipeId: currentRecipe?.id || null,
        nextRecipeId: nextRecipe.id,
        clickedAtIso: new Date(now).toISOString(),
      };
      lastRecommendationSourceRef.current = 'swap';
      setCurrentRecipe(nextRecipe);
    } finally {
      setSwapping(false);
    }
  };

  const onApplyRemoteConfigDebug = async () => {
    try {
      await setSwapRemoteConfigControls({
        enabled: remoteEnabledDraft,
        url: remoteUrlDraft,
      });
      const config = await getSwapWeightsConfig({ userId: userInfo?.id || null });
      setSwapScoringWeights(config.weights);
      setSwapExperimentBucket(config.bucket);
      setSwapConfigSource(config.source);
    } catch (err) {
      console.error('更新远端配置调试项失败:', err);
    }
  };

  const onResetRemoteConfigDebug = async () => {
    try {
      await resetSwapRemoteConfigControls();
      setRemoteEnabledDraft(false);
      setRemoteUrlDraft('');
      const config = await getSwapWeightsConfig({ userId: userInfo?.id || null });
      setSwapScoringWeights(config.weights);
      setSwapExperimentBucket(config.bucket);
      setSwapConfigSource(config.source);
    } catch (err) {
      console.error('重置远端配置调试项失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const recipe = currentRecipe;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {/* 头部标题 */}
        <View style={styles.header}>
          <Text style={styles.logo}>简家厨</Text>
          <Text style={styles.tagline}>一菜两吃，全家共享</Text>
        </View>

        {/* 今日配对推荐 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日推荐</Text>
            <View style={styles.pairBadge}>
              <Text style={styles.pairBadgeText}>一屏决策</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonCard showImage showFooter />
            </View>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>加载失败，请稍后重试</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>点击重试</Text>
              </TouchableOpacity>
            </View>
          ) : recipe ? (
            <View style={styles.pairingCard}>
              {/* 配对卡片头部 */}
              <TouchableOpacity
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                activeOpacity={0.9}
                style={styles.pairingHeader}
              >
                <Text style={styles.pairingTitle}>{recipe.name}</Text>
                <Text style={styles.pairingSubtitle}>成人 + 宝宝今日推荐，一次备菜两份餐</Text>
              </TouchableOpacity>

              {/* 双版本展示 */}
              <View style={styles.versionsContainer}>
                {/* 大人版 */}
                <View style={[styles.versionBox, styles.adultVersion]}>
                  <View style={styles.versionTag}>
                    <Text style={styles.versionTagText}>大人版</Text>
                  </View>
                  <Text style={styles.versionName}>{recipe.name || '大人餐食'}</Text>
                  <View style={styles.versionMeta}>
                    <Text style={styles.versionTime}>{recipe.prep_time}分钟</Text>
                    <Text style={styles.versionFeature}>口味浓郁</Text>
                  </View>
                </View>

                {/* 分隔线 */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <View style={styles.syncIcon}>
                    <Text style={styles.syncIconText}>同步</Text>
                  </View>
                  <View style={styles.dividerLine} />
                </View>

                {/* 宝宝版 */}
                <View style={[styles.versionBox, styles.babyVersion]}>
                  <View style={[styles.versionTag, styles.babyTag]}>
                    <Text style={styles.versionTagText}>宝宝版</Text>
                  </View>
                  <Text style={styles.versionName}>宝宝版</Text>
                  <View style={styles.versionMeta}>
                    <Text style={styles.versionTime}>{recipe.prep_time}分钟</Text>
                    <Text style={styles.versionFeature}>细腻易消化</Text>
                  </View>
                </View>
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonTitle}>推荐理由</Text>
                {recommendationReasons.map((reason) => (
                  <View key={reason.key} style={styles.reasonItem}>
                    <View style={[styles.reasonStrengthBadge, styles[`reasonStrength_${reason.strength}`]]}>
                      <Text style={styles.reasonStrengthText}>{reason.strength.toUpperCase()}</Text>
                    </View>
                    <View style={styles.reasonContent}>
                      <Text style={styles.reasonItemTitle}>{reason.title}</Text>
                      <Text style={styles.reasonText}>{reason.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.decisionActions}>
                <TouchableOpacity
                  style={[styles.primaryCTA, styles.shoppingCTA]}
                  onPress={() => {
                    trackMainFlowEvent('shopping_list_generate_click', {
                      source: 'home',
                      screen: 'HomeScreen',
                      recipeId: recipe.id,
                    });
                    const parentNav = navigation.getParent() as any;
                    parentNav?.navigate('Plan', { screen: 'ShoppingList' });
                  }}
                >
                  <Text style={styles.primaryCTAText}>去购物清单</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryCTA, styles.cookingCTA]}
                  onPress={() => {
                    trackMainFlowEvent('cooking_start_click', {
                      source: 'home',
                      screen: 'HomeScreen',
                      recipeId: recipe.id,
                    });
                    navigation.navigate('CookingMode', {
                      recipeId: recipe.id,
                      babyAgeMonths: currentStage?.age_min || 9,
                    });
                  }}
                >
                  <Text style={styles.primaryCTAText}>开始烹饪</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.swapButton, swapping && styles.swapButtonDisabled]}
                onPress={onSwapRecipe}
                disabled={swapping}
              >
                <Text style={styles.swapButtonText}>{swapping ? '换菜中...' : '换一道'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>暂无推荐</Text>
            </View>
          )}
        </View>

        {/* 今日辅食建议 */}
        {currentStage && (
          <View style={styles.babySection}>
            <View style={styles.babySectionHeader}>
              <Text style={styles.babySectionTitle}>🍼 今日辅食建议</Text>
            </View>
            <TouchableOpacity
              style={styles.babyCard}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Recipes', { screen: 'BabyStages' });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.babyCardLeft}>
                <Text style={styles.babyCardStage}>{currentStage.name} · {currentStage.age_range}</Text>
                <Text style={styles.babyCardNutrients}>
                  重点营养：{currentStage.key_nutrients.slice(0, 3).join(' · ')}
                </Text>
                <Text style={styles.babyCardHint}>点击查看适合的食谱 ›</Text>
              </View>
              <Text style={styles.babyCardArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 核心食材快速入口 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>按食材选菜</Text>
          <View style={styles.ingredientGrid}>
            {[
              { name: '鸡肉', icon: '🍗', color: '#FFE4C4' },
              { name: '猪肉', icon: '🥩', color: '#FFB6C1' },
              { name: '鱼肉', icon: '🐟', color: '#87CEEB' },
              { name: '蔬菜', icon: '🥬', color: '#98FB98' },
            ].map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.ingredientItem, { backgroundColor: item.color }]}
                onPress={() => {
                  const parentNav = navigation.getParent() as any;
                  parentNav?.navigate('Recipes', {
                    screen: 'RecipeList',
                    params: { ingredient: item.name },
                  });
                }}
              >
                <Text style={styles.ingredientIcon}>{item.icon}</Text>
                <Text style={styles.ingredientName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 功能入口 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                trackMainFlowEvent('shopping_list_generate_click', {
                  source: 'home',
                  screen: 'HomeScreen',
                  recipeId: recipe?.id || null,
                  from: 'quick_action',
                });
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Plan', { screen: 'ShoppingList' });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary.light }]}>
                <Text style={styles.actionIconText}>🛒</Text>
              </View>
              <Text style={styles.actionText}>购物清单</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Plan', { screen: 'WeeklyPlan' });
              }}
            >
              <View style={[styles.actionIcon, styles.actionIconBlue]}>
                <Text style={styles.actionIconText}>📅</Text>
              </View>
              <Text style={styles.actionText}>一周计划</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                // 先返回Recipes标签页，然后导航到RecipeList（会重置栈）
                parentNav?.navigate('Recipes', {
                  screen: 'RecipeList',
                });
              }}
            >
              <View style={[styles.actionIcon, styles.actionIconPurple]}>
                <Text style={styles.actionIconText}>📖</Text>
              </View>
              <Text style={styles.actionText}>菜谱大全</Text>
            </TouchableOpacity>
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.debugToggleButton}
              onPress={() => setShowDebugPanel((prev) => !prev)}
            >
              <Text style={styles.debugToggleButtonText}>
                {showDebugPanel ? '收起' : '展开'}换菜配置调试面板（开发态）
              </Text>
            </TouchableOpacity>

            {showDebugPanel && (
              <View style={styles.debugPanel}>
                <TouchableOpacity
                  style={styles.debugRow}
                  onPress={() => setRemoteEnabledDraft((prev) => !prev)}
                >
                  <Text style={styles.debugLabel}>启用远端配置</Text>
                  <Text style={styles.debugValue}>{remoteEnabledDraft ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>

                <Text style={styles.debugLabel}>远端 URL（可选）</Text>
                <TextInput
                  value={remoteUrlDraft}
                  onChangeText={setRemoteUrlDraft}
                  placeholder="https://example.com/swap-weights.json"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.debugInput}
                />

                <View style={styles.debugActions}>
                  <TouchableOpacity style={styles.debugActionBtn} onPress={onApplyRemoteConfigDebug}>
                    <Text style={styles.debugActionBtnText}>应用</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.debugActionBtn, styles.debugActionBtnGhost]}
                    onPress={onResetRemoteConfigDebug}
                  >
                    <Text style={styles.debugActionBtnGhostText}>恢复默认</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 一菜两吃理念说明 */}
        <View style={styles.conceptSection}>
          <Text style={styles.conceptTitle}>💡 什么是一菜两吃？</Text>
          <Text style={styles.conceptText}>
            同样的食材，一锅出两餐。大人吃香，宝宝吃健康。 省去重复备菜的烦恼，让做饭变得更简单！
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  logo: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  tagline: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    marginTop: Spacing.xs,
    opacity: 0.9,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  pairBadge: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  pairBadgeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  skeletonContainer: {
    padding: Spacing.md,
  },
  pairingCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  pairingHeader: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pairingTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  pairingSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  versionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  versionBox: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  adultVersion: {
    marginRight: Spacing.sm,
  },
  babyVersion: {
    marginLeft: Spacing.sm,
  },
  versionTag: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  babyTag: {
    backgroundColor: '#4CAF50',
  },
  versionTagText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  versionMeta: {
    alignItems: 'center',
  },
  versionTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  versionFeature: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.medium,
  },
  syncIcon: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  syncIconText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
  },
  reasonBox: {
    marginTop: Spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reasonTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: '#F57C00',
    marginBottom: Spacing.xs,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  reasonStrengthBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: Spacing.xs,
    marginTop: 1,
  },
  reasonStrength_high: {
    backgroundColor: '#FFB74D',
  },
  reasonStrength_medium: {
    backgroundColor: '#FFD54F',
  },
  reasonStrength_low: {
    backgroundColor: '#FFE082',
  },
  reasonStrengthText: {
    fontSize: 10,
    color: '#7A4B00',
    fontWeight: Typography.fontWeight.bold,
  },
  reasonContent: {
    flex: 1,
  },
  reasonItemTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  decisionActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  primaryCTA: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  shoppingCTA: {
    backgroundColor: Colors.primary.light,
    marginRight: Spacing.sm,
  },
  cookingCTA: {
    backgroundColor: Colors.primary.main,
  },
  primaryCTAText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  swapButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  swapButtonDisabled: {
    opacity: 0.6,
  },
  swapButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  ingredientItem: {
    width: (width - Spacing.lg * 2 - Spacing.md * 4) / 4,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.xs,
  },
  ingredientIcon: {
    fontSize: 28,
  },
  ingredientName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBlue: {
    backgroundColor: '#E3F2FD',
  },
  actionIconPurple: {
    backgroundColor: '#F3E5F5',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  conceptSection: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
  },
  conceptTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: '#2E7D32',
    marginBottom: Spacing.sm,
  },
  conceptText: {
    fontSize: Typography.fontSize.sm,
    color: '#388E3C',
    lineHeight: 20,
  },
  debugToggleButton: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background.card,
  },
  debugToggleButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  debugPanel: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background.card,
    gap: Spacing.sm,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  debugValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  debugInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.text.primary,
  },
  debugActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  debugActionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  debugActionBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  debugActionBtnGhost: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  debugActionBtnGhostText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
  },
  retryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.tertiary,
  },
  babySection: { marginTop: 8, marginBottom: 8 },
  babySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  babySectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  babyCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF7043',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  babyCardLeft: { flex: 1 },
  babyCardStage: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  babyCardNutrients: { fontSize: 13, color: '#FF9800', marginBottom: 4 },
  babyCardHint: { fontSize: 12, color: '#888' },
  babyCardArrow: { fontSize: 22, color: '#CCC', marginLeft: 8 },
});
