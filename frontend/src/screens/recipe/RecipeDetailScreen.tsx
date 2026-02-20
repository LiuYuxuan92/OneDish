import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useRecipeDetail } from '../../hooks/useRecipes';
import { useAddFavorite, useRemoveFavorite } from '../../hooks/useFavorites';
import { useAddRecipeToShoppingList } from '../../hooks/useShoppingLists';
import { useUserInfo } from '../../hooks/useUsers';
import { useBabyVersion } from '../../hooks/useRecipeTransform';
import { getBabyAgeInfo, formatBabyAge } from '../../components/common/BabyAgeCard';
import { Button } from '../../components/common/Button';
import { 
  ChevronLeftIcon, 
  ClockIcon, 
  UsersIcon, 
  ChefHatIcon,
  FlameIcon,
  BabyIcon,
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  InfoIcon,
  TimerIcon
} from '../../components/common/Icons';
import { shareRecipe } from '../../utils/share';
import { NutritionInfoCard } from '../../components/common/NutritionInfo';
import { CookingTimerModal } from '../../components/common/CookingTimerModal';
import { ImageCarousel } from '../../components/common/ImageCarousel';
import { TimelineView } from '../../components/recipe/TimelineView';
import { useTimeline } from '../../hooks/useTimeline';

type Props = NativeStackScreenProps<RecipeStackParamList, 'RecipeDetail'>;

const { width } = Dimensions.get('window');

// 宝宝月龄选项 (6-36个月)
const BABY_AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => 6 + i);

export function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const { data: recipe, isLoading, error } = useRecipeDetail(recipeId);
  const [activeTab, setActiveTab] = useState<'adult' | 'baby' | 'timeline'>('adult');
  const [showSyncTip, setShowSyncTip] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const [showTimer, setShowTimer] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [selectedBabyAge, setSelectedBabyAge] = useState<number>(12);
  const addRecipeToShoppingList = useAddRecipeToShoppingList();
  const { data: user } = useUserInfo();

  // 从后端返回的 is_favorited 初始化收藏状态
  React.useEffect(() => {
    if (recipe?.is_favorited !== undefined) {
      setIsFavorite(recipe.is_favorited);
    }
  }, [recipe?.is_favorited]);

  // 统一宝宝版数据获取
  const { data: babyData, isLoading: isTransforming } = useBabyVersion(
    recipeId,
    selectedBabyAge,
    {
      enabled: activeTab === 'baby',
      staticBabyVersion: recipe?.baby_version,
    }
  );

  // 获取同步烹饪时间线
  const { data: timelineData, isLoading: isTimelineLoading } = useTimeline(
    recipeId,
    selectedBabyAge,
    activeTab === 'timeline'
  );

  // 获取宝宝适龄信息
  const babyAgeInfo = user?.baby_age ? getBabyAgeInfo(user.baby_age) : null;

  const handleAddToShoppingList = async () => {
    try {
      await addRecipeToShoppingList.mutateAsync({
        recipe_id: recipeId,
        servings: 2,
      });
      Alert.alert('成功', '已添加到购物清单');
    } catch (error: any) {
      console.error('[Frontend] 添加菜谱到购物清单失败:', error);
      // 显示更详细的错误信息
      const errorMessage = error?.message || error?.response?.data?.message || '添加失败，请稍后重试。';
      const errorCode = error?.code || error?.response?.status;
      Alert.alert('提示', `添加失败${errorCode ? ` (${errorCode})` : ''}: ${errorMessage}`);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(recipeId);
      } else {
        await addFavoriteMutation.mutateAsync(recipeId);
      }
      setIsFavorite(!isFavorite);
    } catch (err: any) {
      Alert.alert('提示', err?.message || (isFavorite ? '取消收藏失败' : '收藏失败'));
    }
  };

  const handleShare = async () => {
    await shareRecipe({
      recipeName: recipe.name,
      description: recipe.description,
      adultTime: `${recipe.prep_time}分钟`,
      babyTime: effectiveBaby?.prep_time ? `${effectiveBaby.prep_time}分钟` : undefined,
    });
  };

  // 从步骤中提取需要计时的步骤
  const timerSteps = parsedCurrent?.steps
    ?.filter((step: any) => step.time > 0)
    .map((step: any, index: number) => ({
      id: `step_${index}`,
      name: `步骤${step.step || index + 1}`,
      minutes: step.time,
    })) || [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载菜谱中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{error ? '加载失败' : '菜谱不存在'}</Text>
          <Text style={styles.errorText}>{error ? String(error) : '该菜谱可能已被删除'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 判断是否为配对菜谱
  const isPaired = recipe.name && recipe.name.includes('/');

  // 安全解析数据
  const parseJSON = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };

  const parsedAdult = parseJSON(recipe.adult_version);
  const parsedTips = parseJSON(recipe.cooking_tips);

  // 宝宝版数据统一从 useBabyVersion hook 获取
  const effectiveBaby = babyData?.baby_version || null;
  const parsedCurrent = activeTab === 'adult' ? parsedAdult : effectiveBaby;

  // 获取同步烹饪信息
  const syncCooking = effectiveBaby?.sync_cooking;

  // 获取主食材列表
  const mainIngredients = parsedAdult?.main_ingredients || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeftIcon size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={toggleFavorite}>
            <HeartIcon 
              size={22} 
              color={isFavorite ? Colors.functional.error : Colors.text.secondary}
              fill={isFavorite ? Colors.functional.error : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
            <ShareIcon size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 菜谱标题区 */}
        <View style={styles.titleSection}>
          {isPaired && (
            <View style={styles.pairBadge}>
              <Text style={styles.pairBadgeIcon}>👨‍🍳👶</Text>
              <Text style={styles.pairBadgeText}>一菜两吃</Text>
            </View>
          )}
          <Text style={styles.recipeName}>{recipe.name}</Text>
          
          {/* 元信息 */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <ClockIcon size={16} color={Colors.text.secondary} />
              <Text style={styles.metaText}>{recipe.prep_time}分钟</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <ChefHatIcon size={16} color={Colors.text.secondary} />
              <Text style={styles.metaText}>{recipe.difficulty}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <UsersIcon size={16} color={Colors.text.secondary} />
              <Text style={styles.metaText}>{recipe.servings}</Text>
            </View>
          </View>
        </View>

        {/* 图片轮播 - 如果有图片 */}
        {recipe.image_url && recipe.image_url.length > 0 && (
          <View style={styles.imageSection}>
            <ImageCarousel
              images={recipe.image_url}
              height={220}
              autoPlay={true}
              autoPlayInterval={4000}
            />
          </View>
        )}

        {/* 版本切换 Tab - 所有菜谱都可以转换为宝宝版 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'adult' && styles.tabActive]}
            onPress={() => setActiveTab('adult')}
          >
            <FlameIcon
              size={18}
              color={activeTab === 'adult' ? Colors.primary.main : Colors.text.tertiary}
            />
            <Text style={[styles.tabText, activeTab === 'adult' && styles.tabTextActive]}>
              大人版
            </Text>
            {activeTab === 'adult' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'baby' && styles.tabActive]}
            onPress={() => setActiveTab('baby')}
          >
            <BabyIcon
              size={18}
              color={activeTab === 'baby' ? Colors.secondary.main : Colors.text.tertiary}
            />
            <Text style={[styles.tabText, activeTab === 'baby' && styles.tabTextActive]}>
              宝宝版 {isPaired ? '' : '(智能转换)'}
            </Text>
            {activeTab === 'baby' && (
              <View style={[styles.tabIndicator, styles.tabIndicatorBaby]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
            onPress={() => setActiveTab('timeline')}
          >
            <ClockIcon
              size={18}
              color={activeTab === 'timeline' ? '#00ACC1' : Colors.text.tertiary}
            />
            <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
              同步烹饪
            </Text>
            {activeTab === 'timeline' && (
              <View style={[styles.tabIndicator, styles.tabIndicatorTimeline]} />
            )}
          </TouchableOpacity>
        </View>

        {/* 宝宝月龄选择器 - 仅宝宝版显示 */}
        {activeTab === 'baby' && (
          <View style={styles.ageSelectorSection}>
            <TouchableOpacity
              style={styles.ageSelectorButton}
              onPress={() => setShowAgePicker(true)}
            >
              <View style={styles.ageSelectorContent}>
                <BabyIcon size={18} color={Colors.secondary.main} />
                <Text style={styles.ageSelectorLabel}>宝宝月龄:</Text>
                <Text style={styles.ageSelectorValue}>{formatBabyAge(selectedBabyAge)}</Text>
              </View>
              <Text style={styles.ageSelectorArrow}>▼</Text>
            </TouchableOpacity>
            {isTransforming && (
              <View style={styles.transformingIndicator}>
                <ActivityIndicator size="small" color={Colors.secondary.main} />
                <Text style={styles.transformingText}>转换食谱中...</Text>
              </View>
            )}
          </View>
        )}

        {/* 月龄选择器弹窗 */}
        <Modal
          visible={showAgePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAgePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAgePicker(false)}
          >
            <View style={styles.agePickerContainer}>
              <View style={styles.agePickerHeader}>
                <Text style={styles.agePickerTitle}>选择宝宝月龄</Text>
                <TouchableOpacity onPress={() => setShowAgePicker(false)}>
                  <Text style={styles.agePickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={BABY_AGE_OPTIONS}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.ageOptionItem,
                      item === selectedBabyAge && styles.ageOptionItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedBabyAge(item);
                      setShowAgePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.ageOptionText,
                        item === selectedBabyAge && styles.ageOptionTextSelected,
                      ]}
                    >
                      {formatBabyAge(item)}
                    </Text>
                    {item === selectedBabyAge && (
                      <Text style={styles.ageOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 宝宝适龄提示 - 仅宝宝版显示 */}
        {activeTab === 'baby' && babyAgeInfo && (
          <View style={styles.babyAgeTipSection}>
            <View style={styles.babyAgeTipCard}>
              <View style={styles.babyAgeTipHeader}>
                <BabyIcon size={18} color={Colors.secondary.main} />
                <Text style={styles.babyAgeTipTitle}>
                  适合 {babyAgeInfo.stageName}
                </Text>
              </View>
              <Text style={styles.babyAgeTipText}>
                {babyAgeInfo.description}
              </Text>
              {babyAgeInfo.foods && babyAgeInfo.foods.length > 0 && (
                <View style={styles.babyAgeTipFoods}>
                  <Text style={styles.babyAgeTipFoodsLabel}>推荐食材：</Text>
                  <Text style={styles.babyAgeTipFoodsText}>
                    {babyAgeInfo.foods.slice(0, 3).join('、')}
                    {babyAgeInfo.foods.length > 3 && '...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 营养信息卡片 - 仅宝宝版显示 */}
        {activeTab === 'baby' && babyData?.nutrition_info?.nutrients && (
          <View style={styles.section}>
            <NutritionInfoCard
              nutrition={{
                calories: babyData.nutrition_info.nutrients.calories,
                protein: babyData.nutrition_info.nutrients.protein,
                carbs: babyData.nutrition_info.nutrients.carbs,
                fat: babyData.nutrition_info.nutrients.fat,
                fiber: babyData.nutrition_info.nutrients.fiber,
                vitaminA: babyData.nutrition_info.nutrients.vitamin_a,
                vitaminC: babyData.nutrition_info.nutrients.vitamin_c,
                calcium: babyData.nutrition_info.nutrients.calcium,
                iron: babyData.nutrition_info.nutrients.iron,
                zinc: babyData.nutrition_info.nutrients.zinc,
              }}
              isBaby={true}
              expanded={showNutrition}
              onToggleExpand={() => setShowNutrition(!showNutrition)}
              servingSize="每份"
            />
          </View>
        )}

        {/* 同步烹饪提示 - 当有同步烹饪信息时显示 */}
        {showSyncTip && syncCooking && (
          <View style={styles.syncSection}>
            <View style={styles.syncCard}>
              <View style={styles.syncHeader}>
                <View style={styles.syncTitleRow}>
                  <Text style={styles.syncIcon}>⚡</Text>
                  <Text style={styles.syncTitle}>同步 Cooking</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSyncTip(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.syncTimeSaving}>⏱ {syncCooking.time_saving}</Text>
              <Text style={styles.syncTips}>{syncCooking.tips}</Text>
              {syncCooking.shared_steps && syncCooking.shared_steps.length > 0 && (
                <View style={styles.syncSteps}>
                  <Text style={styles.syncStepsTitle}>共用步骤:</Text>
                  <View style={styles.syncStepsList}>
                    {syncCooking.shared_steps.map((step: string, index: number) => (
                      <View key={index} style={styles.syncStepItem}>
                        <Text style={styles.syncStepCheck}>✓</Text>
                        <Text style={styles.syncStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 主要食材 - 仅配对菜谱显示 */}
        {isPaired && mainIngredients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🥬</Text>
              <Text style={styles.sectionTitle}>主要食材</Text>
            </View>
            <View style={styles.ingredientsCard}>
              {mainIngredients.map((item: any, index: number) => (
                <View key={index} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <View style={styles.amountCompare}>
                    <View style={styles.amountTag}>
                      <Text style={styles.amountTagLabel}>大人</Text>
                      <Text style={styles.amountTagValue}>{item.amount}</Text>
                    </View>
                    {effectiveBaby?.main_ingredients?.[index] && (
                      <>
                        <Text style={styles.amountArrow}>→</Text>
                        <View style={[styles.amountTag, styles.amountTagBaby]}>
                          <Text style={styles.amountTagLabel}>宝宝</Text>
                          <Text style={styles.amountTagValueBaby}>
                            {effectiveBaby.main_ingredients[index].amount}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 版本详情 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>
              {activeTab === 'adult' ? '🍽️' : '👶'}
            </Text>
            <Text style={styles.sectionTitle}>
              {activeTab === 'adult' ? '大人版详情' : '宝宝版详情'}
            </Text>
            {activeTab === 'baby' && effectiveBaby?.age_range && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>{effectiveBaby.age_range}</Text>
              </View>
            )}
          </View>

          {/* 食材清单 */}
          {parsedCurrent?.ingredients && parsedCurrent.ingredients.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>📝 食材清单</Text>
              <View style={styles.ingredientsList}>
                {parsedCurrent.ingredients.map((item: any, index: number) => (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={styles.ingredientDot} />
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientItemName}>{item.name}</Text>
                      <Text style={styles.ingredientItemAmount}>{item.amount}</Text>
                    </View>
                    {item.note && (
                      <View style={styles.ingredientNoteBadge}>
                        <InfoIcon size={12} color={Colors.primary.main} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 调料 */}
          {parsedCurrent?.seasonings && parsedCurrent.seasonings.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>🧂 调料</Text>
              <View style={styles.seasoningsList}>
                {parsedCurrent.seasonings.map((item: any, index: number) => (
                  <View key={index} style={styles.seasoningTag}>
                    <Text style={styles.seasoningName}>{item.name}</Text>
                    <Text style={styles.seasoningAmount}>{item.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 制作步骤 */}
          {parsedCurrent?.steps && parsedCurrent.steps.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>👨‍🍳 制作步骤</Text>
              <View style={styles.stepsList}>
                {parsedCurrent.steps.map((step: any, index: number) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{step.step || index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepAction}>{step.action}</Text>
                      <View style={styles.stepMeta}>
                        {step.time > 0 && (
                          <View style={styles.stepMetaItem}>
                            <ClockIcon size={12} color={Colors.primary.main} />
                            <Text style={styles.stepMetaText}>{step.time}分钟</Text>
                          </View>
                        )}
                        {step.tools && step.tools.length > 0 && (
                          <View style={styles.stepMetaItem}>
                            <ChefHatIcon size={12} color={Colors.text.tertiary} />
                            <Text style={styles.stepMetaText}>{step.tools.join(', ')}</Text>
                          </View>
                        )}
                      </View>
                      {step.note && (
                        <View style={[
                          styles.stepNote,
                          step.note.includes('🔥') && styles.stepNoteHighlight
                        ]}>
                          <Text style={[
                            styles.stepNoteText,
                            step.note.includes('🔥') && styles.stepNoteTextHighlight
                          ]}>
                            {step.note}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 宝宝版专属信息 */}
          {activeTab === 'baby' && effectiveBaby && (
            <>
              {/* 营养要点 */}
              {effectiveBaby.nutrition_tips && (
                <View style={[styles.detailCard, styles.nutritionCard]}>
                  <Text style={styles.detailCardTitle}>💡 营养要点</Text>
                  <Text style={styles.nutritionText}>{effectiveBaby.nutrition_tips}</Text>
                </View>
              )}

              {/* 过敏提醒 - 增强样式 */}
              {effectiveBaby.allergy_alert && (
                <View style={[styles.detailCard, styles.allergyCard]}>
                  <View style={styles.allergyHeader}>
                    <View style={styles.allergyIconBadge}>
                      <Text style={styles.allergyIcon}>🚨</Text>
                    </View>
                    <Text style={styles.detailCardTitle}>过敏提醒</Text>
                  </View>
                  <View style={styles.allergyContent}>
                    <Text style={styles.allergyText}>{effectiveBaby.allergy_alert}</Text>
                  </View>
                  <View style={styles.allergyWarning}>
                    <Text style={styles.allergyWarningText}>
                      首次添加辅食请遵循"3天观察期"原则，观察无过敏反应后再继续添加新食材
                    </Text>
                  </View>
                </View>
              )}

              {/* 准备要点 */}
              {effectiveBaby.preparation_notes && (
                <View style={[styles.detailCard, styles.tipsCard]}>
                  <Text style={styles.detailCardTitle}>📝 准备要点</Text>
                  <Text style={styles.tipsText}>{effectiveBaby.preparation_notes}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 时间线视图 */}
        {activeTab === 'timeline' && (
          <>
            <TimelineView
              timeline={timelineData}
              isLoading={isTimelineLoading}
            />
            <TouchableOpacity
              style={[
                styles.startCookingButton,
                !timelineData && styles.startCookingButtonDisabled,
              ]}
              onPress={() => {
                navigation.navigate('CookingMode', {
                  recipeId,
                  babyAgeMonths: selectedBabyAge ?? 12,
                });
              }}
              disabled={!timelineData}
            >
              <Text style={styles.startCookingButtonText}>🍳 开始烹饪（同步模式）</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 烹饪小贴士 */}
        {parsedTips && Array.isArray(parsedTips) && parsedTips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💡</Text>
              <Text style={styles.sectionTitle}>烹饪小贴士</Text>
            </View>
            <View style={styles.tipsCard}>
              {parsedTips.map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 底部占位 */}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.footer}>
        {timerSteps.length > 0 && (
          <TouchableOpacity 
            style={styles.timerButton}
            onPress={() => setShowTimer(true)}
          >
            <TimerIcon size={18} color={Colors.primary.main} />
            <Text style={styles.timerButtonText}>烹饪计时</Text>
          </TouchableOpacity>
        )}
        <Button
          title={addRecipeToShoppingList.isPending ? '添加中...' : '🛒 加入购物清单'}
          onPress={handleAddToShoppingList}
          disabled={addRecipeToShoppingList.isPending}
          style={styles.footerButton}
          textStyle={styles.footerButtonText}
        />
      </View>

      {/* 烹饪计时器弹窗 */}
      <CookingTimerModal
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        initialTimers={timerSteps}
      />
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
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.functional.error,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
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
  
  // 头部导航
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerAction: {
    padding: Spacing.sm,
  },
  
  // 滚动区域
  scrollView: {
    flex: 1,
  },
  
  // 标题区
  titleSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  pairBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  pairBadgeIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  pairBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
  },
  recipeName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.tertiary,
  },
  
  // 图片轮播
  imageSection: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
  },
  
  // 宝宝适龄提示
  babyAgeTipSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  babyAgeTipCard: {
    backgroundColor: Colors.secondary.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
  },
  babyAgeTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  babyAgeTipTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.main,
    marginLeft: Spacing.xs,
  },
  babyAgeTipText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  babyAgeTipFoods: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  babyAgeTipFoodsLabel: {
    ...Typography.body.small,
    color: Colors.text.tertiary,
  },
  babyAgeTipFoodsText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  
  // Tab切换
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: Colors.background.card,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -Spacing.sm,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
  },
  tabIndicatorBaby: {
    backgroundColor: Colors.secondary.main,
  },
  tabIndicatorTimeline: {
    backgroundColor: '#00ACC1',
  },

  // 宝宝月龄选择器
  ageSelectorSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  ageSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
  },
  ageSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ageSelectorLabel: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  ageSelectorValue: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.main,
  },
  ageSelectorArrow: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  transformingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  transformingText: {
    ...Typography.body.caption,
    color: Colors.secondary.main,
  },

  // 月龄选择器弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  agePickerContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  agePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  agePickerTitle: {
    ...Typography.heading.h5,
    color: Colors.text.primary,
  },
  agePickerClose: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.tertiary,
    padding: Spacing.xs,
  },
  ageOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  ageOptionItemSelected: {
    backgroundColor: Colors.secondary[50],
  },
  ageOptionText: {
    ...Typography.body.regular,
    color: Colors.text.primary,
  },
  ageOptionTextSelected: {
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  ageOptionCheck: {
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.lg,
  },

  // 同步烹饪
  syncSection: {
    padding: Spacing.lg,
  },
  syncCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.food.fruit,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  syncTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncIcon: {
    fontSize: 20,
  },
  syncTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.food.fruit,
  },
  closeButton: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.tertiary,
    padding: Spacing.xs,
  },
  syncTimeSaving: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  syncTips: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  syncSteps: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  syncStepsTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  syncStepsList: {
    gap: Spacing.xs,
  },
  syncStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncStepCheck: {
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.success,
    fontWeight: Typography.fontWeight.bold,
  },
  syncStepText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  // 区块
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  
  // 食材卡片
  ingredientsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  ingredientName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    flex: 1,
  },
  amountCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountTag: {
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 70,
    alignItems: 'center',
  },
  amountTagBaby: {
    backgroundColor: Colors.secondary.light,
  },
  amountTagLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  amountTagValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.dark,
  },
  amountTagValueBaby: {
    color: Colors.secondary.dark,
  },
  amountArrow: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.tertiary,
  },
  
  // 详情卡片
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
  
  // 食材列表
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
  ingredientInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientItemName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  ingredientItemAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  ingredientNoteBadge: {
    padding: Spacing.xs,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.sm,
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
  
  // 步骤
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
  stepMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stepMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  stepNote: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  stepNoteHighlight: {
    backgroundColor: Colors.primary.light,
  },
  stepNoteText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  stepNoteTextHighlight: {
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  
  // 特殊卡片
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
  allergyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  allergyIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.functional.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allergyIcon: {
    fontSize: 16,
  },
  allergyContent: {
    marginBottom: Spacing.sm,
  },
  allergyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
    lineHeight: 22,
    fontWeight: Typography.fontWeight.medium,
  },
  allergyWarning: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.functional.warning,
  },
  allergyWarningText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.warning,
    lineHeight: 18,
  },
  tipsCard: {
    backgroundColor: Colors.functional.infoLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.info,
  },
  tipsText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.info,
    lineHeight: 22,
  },
  
  // 小贴士
  tipItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tipBullet: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  
  // 年龄标签
  ageBadge: {
    backgroundColor: Colors.secondary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  ageBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.dark,
  },
  
  // 底部
  footerSpacer: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.lg,
  },
  footerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral.gray300,
  },
  footerDotActive: {
    backgroundColor: Colors.primary.main,
  },
  footerDotActiveBaby: {
    backgroundColor: Colors.secondary.main,
  },
  footerIndicatorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  footerButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    flex: 1,
  },
  footerButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  startCookingButton: {
    backgroundColor: '#FF7043',
    borderRadius: BorderRadius.lg,
    margin: 16,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCookingButtonDisabled: {
    opacity: 0.5,
  },
  startCookingButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
  },
  timerButtonText: {
    ...Typography.body.small,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.xs,
  },
});
