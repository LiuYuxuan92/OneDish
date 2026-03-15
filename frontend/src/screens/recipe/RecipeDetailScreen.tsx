// @ts-nocheck
import React, { useState } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RecipeStackParamList } from "../../types";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from "../../styles/theme";
import { useAddFavorite, useRemoveFavorite } from "../../hooks/useFavorites";
import { useAddRecipeToShoppingList } from "../../hooks/useShoppingLists";
import { useUserInfo } from "../../hooks/useUsers";
import { useBabyVersion } from "../../hooks/useRecipeTransform";
import {
  getBabyAgeInfo,
  formatBabyAge,
} from "../../components/common/BabyAgeCard";
import { Button } from "../../components/common/Button";
import {
  ChevronLeftIcon,
  ClockIcon,
  FlameIcon,
  BabyIcon,
  HeartIcon,
  ShareIcon,
  TimerIcon,
} from "../../components/common/Icons";
import { shareRecipe } from "../../utils/share";
import { NutritionInfoCard } from "../../components/common/NutritionInfo";
import { CookingTimerModal } from "../../components/common/CookingTimerModal";
import { ImageCarousel } from "../../components/common/ImageCarousel";
import { TimelineView } from "../../components/recipe/TimelineView";
import { useCreateFeedingFeedback } from "../../hooks/useFeedingFeedback";
import {
  RecipeHeroPanel,
  RecipeVersionPanel,
} from "../../components/ui-migration";
import { useRecipeDetailViewModel } from "../../viewmodels/useRecipeDetailViewModel";

type Props = NativeStackScreenProps<RecipeStackParamList, "RecipeDetail">;

const { width } = Dimensions.get("window");

// 宝宝月龄选项 (6-36个月)
const BABY_AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => 6 + i);

const navigateToFeedingFeedback = (navigation: any) => {
  const parent = navigation.getParent?.();
  const root = parent?.getParent?.();

  if (root?.navigate) {
    root.navigate("Profile", { screen: "FeedingFeedback" });
    return;
  }

  if (parent?.navigate) {
    parent.navigate("FeedingFeedback");
    return;
  }

  navigation.navigate("FeedingFeedback");
};

export function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"adult" | "baby" | "timeline">(
    "adult",
  );
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
  const createFeedingFeedback = useCreateFeedingFeedback();

  // AI 宝宝版本生成相关状态
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [showAIResultModal, setShowAIResultModal] = useState(false);
  const [generateUseAI, setGenerateUseAI] = useState(true);

  // 统一宝宝版数据获取
  const { data: babyData, isLoading: isTransforming } = useBabyVersion(
    recipeId,
    selectedBabyAge,
    {
      enabled: activeTab === "baby",
      staticBabyVersion: undefined,
    },
  );

  const {
    data: recipeVm,
    isLoading,
    isTimelineLoading,
    error,
    aiActions: aiBabyVersion,
  } = useRecipeDetailViewModel(recipeId, {
    babyAgeMonths: selectedBabyAge,
    timelineEnabled: activeTab === "timeline",
    activeTab,
    babyVersionOverride: babyData?.baby_version,
  });
  const recipe = recipeVm.sourceRecipe;
  const pageVm = recipeVm.page;
  const timelineData = recipeVm.timeline;

  // 从后端返回的 is_favorited 初始化收藏状态
  React.useEffect(() => {
    if (recipe?.is_favorited !== undefined) {
      setIsFavorite(recipe.is_favorited);
    }
  }, [recipe?.is_favorited]);

  // 获取宝宝适龄信息
  const babyAgeInfo = user?.baby_age ? getBabyAgeInfo(user.baby_age) : null;

  const [shoppingListAdded, setShoppingListAdded] = useState(false);

  const handleAddToShoppingList = async () => {
    try {
      await addRecipeToShoppingList.mutateAsync({
        recipe_id: recipeId,
        servings: 2,
      });
      setShoppingListAdded(true);
      Alert.alert("成功", "已添加到购物清单");
    } catch (error: any) {
      console.error("[Frontend] 添加菜谱到购物清单失败:", error);
      // 显示更详细的错误信息
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "添加失败，请稍后重试。";
      const errorCode = error?.code || error?.response?.status;
      Alert.alert(
        "提示",
        `添加失败${errorCode ? ` (${errorCode})` : ""}: ${errorMessage}`,
      );
    }
  };

  const handleShoppingFabPress = async () => {
    if (shoppingListAdded) {
      navigation.getParent?.()?.navigate?.("Plan", { screen: "ShoppingList" });
      return;
    }

    await handleAddToShoppingList();
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
      Alert.alert(
        "提示",
        err?.message || (isFavorite ? "取消收藏失败" : "收藏失败"),
      );
    }
  };

  const handleSubmitFeedingFeedback = async (
    acceptedLevel: "like" | "ok" | "reject",
  ) => {
    try {
      await createFeedingFeedback.mutateAsync({
        recipe_id: recipeId,
        accepted_level: acceptedLevel,
        baby_age_at_that_time: user?.baby_age || null,
        allergy_flag: false,
        note: acceptedLevel === "reject" ? "最小版快捷反馈：本次未接受" : "",
      });
      Alert.alert(
        "已记录",
        acceptedLevel === "like"
          ? "已记录为喜欢"
          : acceptedLevel === "ok"
            ? "已记录为一般接受"
            : "已记录为暂时拒绝",
      );
    } catch (error: any) {
      Alert.alert("提示", error?.message || "提交反馈失败");
    }
  };

  const effectiveBaby = babyData?.baby_version || recipeVm.babyVersion || null;

  const handleShare = async () => {
    await shareRecipe({
      recipeName: recipe.name,
      description: recipe.description,
      adultTime: `${recipe.prep_time}分钟`,
      babyTime: effectiveBaby?.prep_time
        ? `${effectiveBaby.prep_time}分钟`
        : undefined,
    });
  };
  const timerSteps = pageVm?.timerSteps || [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载菜谱中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>
            {error ? "加载失败" : "菜谱不存在"}
          </Text>
          <Text style={styles.errorText}>
            {error ? String(error) : "该菜谱可能已被删除"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const syncCooking = effectiveBaby?.sync_cooking;
  const parsedTips = pageVm?.tips || [];
  const currentVersionSection = pageVm?.currentVersion;
  const shoppingFabLabel = addRecipeToShoppingList.isPending
    ? "添加中..."
    : shoppingListAdded
      ? "已加入 / 去查看"
      : "加入购物清单";
  const adultSummaryChips = [
    pageVm?.hero?.timeLabel || `${recipe.prep_time} 分钟`,
    pageVm?.hero?.difficultyLabel,
    recipeVm?.recipe?.nutrition_focus,
  ].filter(Boolean);
  const babySummaryChips = [
    effectiveBaby?.prep_time ? `${effectiveBaby.prep_time} 分钟` : undefined,
    formatBabyAge(selectedBabyAge),
    effectiveBaby?.texture,
  ].filter(Boolean);
  const adultHighlights = currentVersionSection?.highlights?.slice(0, 3) || [];
  const babyHighlights = currentVersionSection?.babyHighlights?.slice(0, 3) || [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeftIcon size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === "adult"
              ? "成人版做法"
              : activeTab === "baby"
                ? "宝宝版适配"
                : "同步烹饪"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={toggleFavorite}
          >
            <HeartIcon
              size={22}
              color={
                isFavorite ? Colors.functional.error : Colors.text.secondary
              }
              fill={isFavorite ? Colors.functional.error : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
            <ShareIcon size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 内容页首屏 */}
        <View style={styles.heroSection}>
          {pageVm?.hero.imageUrls?.length > 0 && (
            <View style={styles.imageSection}>
              <ImageCarousel
                images={pageVm.hero.imageUrls}
                height={220}
                autoPlay={true}
                autoPlayInterval={4000}
              />
            </View>
          )}

          {pageVm?.hero ? (
            <RecipeHeroPanel
              hero={pageVm.hero}
              recipe={recipeVm.recipe}
            />
          ) : null}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "adult" && styles.tabActive]}
            onPress={() => setActiveTab("adult")}
          >
            <FlameIcon
              size={18}
              color={
                activeTab === "adult"
                  ? Colors.primary.main
                  : Colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "adult" && styles.tabTextActive,
              ]}
            >
              大人版
            </Text>
            {activeTab === "adult" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "baby" && styles.tabActive]}
            onPress={() => setActiveTab("baby")}
          >
            <BabyIcon
              size={18}
              color={
                activeTab === "baby"
                  ? Colors.secondary[500]
                  : Colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "baby" && styles.tabTextActive,
              ]}
            >
              宝宝版 {pageVm?.isPaired ? "" : "(智能转换)"}
            </Text>
            {activeTab === "baby" && (
              <View style={[styles.tabIndicator, styles.tabIndicatorBaby]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
            onPress={() => setActiveTab("timeline")}
          >
            <ClockIcon
              size={18}
              color={
                activeTab === "timeline" ? "#00ACC1" : Colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "timeline" && styles.tabTextActive,
              ]}
            >
              同步烹饪
            </Text>
            {activeTab === "timeline" && (
              <View
                style={[styles.tabIndicator, styles.tabIndicatorTimeline]}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTightTop}>
          <View style={styles.versionShowcaseCard}>
            <View style={styles.versionShowcaseHeader}>
              <View style={styles.versionShowcaseHeaderCopy}>
                <Text style={styles.versionShowcaseEyebrow}>一菜两吃</Text>
                <Text style={styles.versionShowcaseTitle}>同一份底菜，切出两种吃法</Text>
                <Text style={styles.versionShowcaseSubtitle}>
                  先看差异，再决定今天做大人版、宝宝版，还是同步烹饪。
                </Text>
              </View>
              <View style={styles.versionShowcaseBadge}>
                <Text style={styles.versionShowcaseBadgeText}>
                  {pageVm?.isPaired ? '可同步出锅' : '支持智能转换'}
                </Text>
              </View>
            </View>

            <View style={styles.versionCompareDeck}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.versionSpotlightCard,
                  styles.versionSpotlightAdult,
                  activeTab === 'adult' && styles.versionSpotlightCardActive,
                ]}
                onPress={() => setActiveTab('adult')}
              >
                <View style={styles.versionSpotlightTopRow}>
                  <View style={styles.versionSpotlightTopCopy}>
                    <Text style={styles.versionSpotlightKicker}>成人版</Text>
                    <Text style={styles.versionSpotlightHeading}>共享底菜后再补风味</Text>
                  </View>
                  <Text style={styles.versionSpotlightIcon}>🍳</Text>
                </View>
                <Text style={styles.versionSpotlightBody}>
                  {currentVersionSection?.summary || recipe.description}
                </Text>
                <View style={styles.versionSpotlightChipRow}>
                  {adultSummaryChips.map((chip) => (
                    <View key={chip} style={styles.versionSpotlightChip}>
                      <Text style={styles.versionSpotlightChipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.versionSpotlightList}>
                  {adultHighlights.length > 0 ? (
                    adultHighlights.map((item) => (
                      <View key={item} style={styles.versionSpotlightListItem}>
                        <Text style={styles.versionSpotlightBullet}>•</Text>
                        <Text style={styles.versionSpotlightListText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.versionSpotlightListItem}>
                      <Text style={styles.versionSpotlightBullet}>•</Text>
                      <Text style={styles.versionSpotlightListText}>保留完整调味和口感层次。</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.versionSpotlightCta}>查看成人做法 →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.versionSpotlightCard,
                  styles.versionSpotlightBaby,
                  activeTab === 'baby' && styles.versionSpotlightCardActive,
                ]}
                onPress={() => setActiveTab('baby')}
              >
                <View style={styles.versionSpotlightTopRow}>
                  <View style={styles.versionSpotlightTopCopy}>
                    <Text style={styles.versionSpotlightKicker}>宝宝版</Text>
                    <Text style={styles.versionSpotlightHeading}>提前分出一份单独适配</Text>
                  </View>
                  <Text style={styles.versionSpotlightIcon}>🍼</Text>
                </View>
                <Text style={styles.versionSpotlightBody}>
                  {effectiveBaby?.texture
                    ? `当前建议质地：${effectiveBaby.texture}`
                    : '根据月龄自动调整颗粒度、质地和调味。'}
                </Text>
                <View style={styles.versionSpotlightChipRow}>
                  {babySummaryChips.map((chip) => (
                    <View
                      key={chip}
                      style={[
                        styles.versionSpotlightChip,
                        styles.versionSpotlightChipBaby,
                      ]}
                    >
                      <Text
                        style={[
                          styles.versionSpotlightChipText,
                          styles.versionSpotlightChipTextBaby,
                        ]}
                      >
                        {chip}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.versionSpotlightList}>
                  {babyHighlights.length > 0 ? (
                    babyHighlights.map((item) => (
                      <View key={item} style={styles.versionSpotlightListItem}>
                        <Text style={styles.versionSpotlightBullet}>•</Text>
                        <Text style={styles.versionSpotlightListText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.versionSpotlightListItem}>
                      <Text style={styles.versionSpotlightBullet}>•</Text>
                      <Text style={styles.versionSpotlightListText}>优先做无盐、细软、好吞咽的版本。</Text>
                    </View>
                  )}
                </View>
                <View style={styles.versionSpotlightFooterRow}>
                  <TouchableOpacity
                    style={styles.versionAgeButton}
                    onPress={() => setShowAgePicker(true)}
                  >
                    <Text style={styles.versionAgeButtonText}>
                      月龄 {formatBabyAge(selectedBabyAge)}
                    </Text>
                  </TouchableOpacity>
                  {isTransforming && (
                    <View style={styles.transformingIndicatorInline}>
                      <ActivityIndicator
                        size="small"
                        color={Colors.secondary[500]}
                      />
                      <Text style={styles.transformingInlineText}>适配中</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.versionSpotlightCta}>查看宝宝做法 →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.versionShowcaseFooter}>
              <View style={styles.versionShowcaseHintBlock}>
                <Text style={styles.versionShowcaseHintTitle}>怎么用最顺手</Text>
                <Text style={styles.versionShowcaseHintText}>
                  先看两张卡片确认差异，再切换下方详情；想要更省事，可直接开同步烹饪或 AI 生成宝宝版本。
                </Text>
              </View>
              <View style={styles.versionShowcaseActionRow}>
                <TouchableOpacity
                  style={styles.versionShowcasePrimaryAction}
                  onPress={() => setShowAIGenerateModal(true)}
                >
                  <Text style={styles.versionShowcasePrimaryActionText}>AI 生成宝宝版</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.versionShowcaseSecondaryAction}
                  onPress={() => setActiveTab('timeline')}
                >
                  <Text style={styles.versionShowcaseSecondaryActionText}>看同步时间线</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
                        item === selectedBabyAge &&
                          styles.ageOptionTextSelected,
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
        {activeTab === "baby" && babyAgeInfo && (
          <View style={styles.babyAgeTipSection}>
            <View style={styles.babyAgeTipCard}>
              <View style={styles.babyAgeTipHeader}>
                <BabyIcon size={18} color={Colors.secondary[500]} />
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
                    {babyAgeInfo.foods.slice(0, 3).join("、")}
                    {babyAgeInfo.foods.length > 3 && "..."}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 营养信息卡片 - 仅宝宝版显示 */}
        {activeTab === "baby" && babyData?.nutrition_info?.nutrients && (
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
          <View style={styles.section}>
            <View style={styles.syncCard}>
              <View style={styles.syncHeader}>
                <View style={styles.syncTitleRow}>
                  <Text style={styles.syncIcon}>⚡</Text>
                  <Text style={styles.syncTitle}>同步烹饪</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSyncTip(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.syncTimeSaving}>
                ⏱ {pageVm?.timelinePanel.savedTimeText || syncCooking.time_saving}
              </Text>
              <Text style={styles.syncTips}>
                {pageVm?.timelinePanel.syncTips || syncCooking.tips}
              </Text>
              {pageVm?.timelinePanel.sharedSteps?.length > 0 && (
                  <View style={styles.syncSteps}>
                    <Text style={styles.syncStepsTitle}>共用步骤：</Text>
                    <View style={styles.syncStepsList}>
                      {pageVm.timelinePanel.sharedSteps.map(
                        (step: string, index: number) => (
                          <View key={index} style={styles.syncStepItem}>
                            <Text style={styles.syncStepCheck}>✓</Text>
                            <Text style={styles.syncStepText}>{step}</Text>
                          </View>
                        ),
                      )}
                    </View>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* 主要食材 - 仅配对菜谱显示 */}
        {pageVm?.isPaired && pageVm.ingredientComparison.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🥬</Text>
              <Text style={styles.sectionTitle}>主要食材</Text>
            </View>
            <View style={styles.ingredientsCard}>
              {pageVm.ingredientComparison.map((item) => (
                <View key={`${item.name}-${item.adultAmount}`} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <View style={styles.amountCompare}>
                    <View style={styles.amountTag}>
                      <Text style={styles.amountTagLabel}>大人</Text>
                      <Text style={styles.amountTagValue}>{item.adultAmount}</Text>
                    </View>
                    {item.babyAmount && (
                      <>
                        <Text style={styles.amountArrow}>→</Text>
                        <View style={[styles.amountTag, styles.amountTagBaby]}>
                          <Text style={styles.amountTagLabel}>宝宝</Text>
                          <Text style={styles.amountTagValueBaby}>
                            {item.babyAmount}
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
          <RecipeVersionPanel section={pageVm?.currentVersion} />
        </View>

        {/* 时间线视图 */}
        {activeTab === "timeline" && (
          <>
            <View style={styles.sectionTightTop}>
              <View style={[styles.detailCard, styles.utilityCardMuted]}>
                <Text style={styles.utilityCardTitle}>同步烹饪时间线</Text>
                <Text style={styles.utilityCardCaption}>
                  {pageVm?.timelinePanel.summary}
                </Text>
                {!!pageVm?.timelinePanel.totalTimeText && (
                  <Text style={styles.utilityCardCaption}>
                    {pageVm.timelinePanel.totalTimeText}
                    {pageVm.timelinePanel.savedTimeText
                      ? ` · ${pageVm.timelinePanel.savedTimeText}`
                      : ""}
                  </Text>
                )}
                <View style={styles.inlineActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.inlineActionButton,
                      !pageVm?.timelinePanel.hasTimeline &&
                        styles.inlineActionButtonDisabled,
                    ]}
                    onPress={() => {
                      navigation.navigate("CookingMode", {
                        recipeId,
                        babyAgeMonths: selectedBabyAge ?? 12,
                      });
                    }}
                    disabled={!pageVm?.timelinePanel.hasTimeline}
                  >
                    <Text style={styles.inlineActionButtonText}>开始烹饪（同步模式）</Text>
                  </TouchableOpacity>
                  {timerSteps.length > 0 && (
                    <TouchableOpacity
                      style={styles.inlineActionButtonSecondary}
                      onPress={() => setShowTimer(true)}
                    >
                      <Text style={styles.inlineActionButtonSecondaryText}>打开烹饪计时</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            <TimelineView
              timeline={timelineData}
              isLoading={isTimelineLoading}
            />
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🍼</Text>
            <Text style={styles.sectionTitle}>喂养反馈</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.tipsText}>
              保留真实反馈接口：这里仍然直接提交喜欢 / 一般 /
              拒绝，并把结果回流到“喂养反馈 / 每周回顾”页面。
            </Text>
            {!!pageVm?.feedback.latestLabel && (
              <Text style={styles.feedbackRecentTitle}>{pageVm.feedback.latestLabel}</Text>
            )}
            <View style={styles.feedbackActionRow}>
              <TouchableOpacity
                style={styles.feedbackChipLike}
                onPress={() => handleSubmitFeedingFeedback("like")}
                disabled={createFeedingFeedback.isPending}
              >
                <Text style={styles.feedbackChipText}>喜欢</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackChipNeutral}
                onPress={() => handleSubmitFeedingFeedback("ok")}
                disabled={createFeedingFeedback.isPending}
              >
                <Text style={styles.feedbackChipText}>一般</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackChipReject}
                onPress={() => handleSubmitFeedingFeedback("reject")}
                disabled={createFeedingFeedback.isPending}
              >
                <Text style={styles.feedbackChipText}>拒绝</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.feedbackRecentTitle}>最近反馈</Text>
            {pageVm?.feedback.items.length ? (
              pageVm.feedback.items.map((item) => (
                <View key={item.id} style={styles.feedbackRecentItem}>
                  <Text style={styles.feedbackRecentText}>
                    • {item.label} · {item.dateText}
                  </Text>
                  {!!item.note && (
                    <Text style={styles.feedbackRecentNote}>{item.note}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.feedbackEmptyText}>
                还没有这道菜的反馈记录。
              </Text>
            )}
            <View style={styles.inlineActionRow}>
              <TouchableOpacity
                style={styles.inlineActionButton}
                onPress={() => navigateToFeedingFeedback(navigation)}
              >
                <Text style={styles.inlineActionButtonText}>
                  回个人页看反馈中心
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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

        {/* 悬浮按钮占位 */}
        <View style={styles.footerSpacer} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.shoppingFab,
          shoppingListAdded && styles.shoppingFabAdded,
          { bottom: Math.max(insets.bottom + 88, 104) },
        ]}
        onPress={handleShoppingFabPress}
        disabled={addRecipeToShoppingList.isPending}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={shoppingFabLabel}
      >
        <Text style={styles.shoppingFabIcon}>{shoppingListAdded ? "✅" : "🛒"}</Text>
        <View style={styles.shoppingFabContent}>
          <Text style={styles.shoppingFabLabel}>{shoppingFabLabel}</Text>
          <Text style={styles.shoppingFabHint}>
            {shoppingListAdded ? "已加入当前清单" : "一键添加当前菜谱食材"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 烹饪计时器弹窗 */}
      <CookingTimerModal
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        initialTimers={timerSteps}
      />

      {/* AI 生成宝宝版本弹窗 */}
      <Modal
        visible={showAIGenerateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIGenerateModal(false)}
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContainer}>
            <View style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>生成宝宝版本</Text>
              <TouchableOpacity onPress={() => setShowAIGenerateModal(false)}>
                <Text style={styles.aiModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aiModalContent}>
              {/* 宝宝月龄选择 */}
              <View style={styles.aiModalSection}>
                <Text style={styles.aiModalLabel}>宝宝月龄:</Text>
                <TouchableOpacity
                  style={styles.aiAgeSelector}
                  onPress={() => setShowAgePicker(true)}
                >
                  <Text style={styles.aiAgeSelectorText}>
                    {formatBabyAge(selectedBabyAge)}
                  </Text>
                  <Text style={styles.aiAgeSelectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* 生成方式选择 */}
              <View style={styles.aiModalSection}>
                <Text style={styles.aiModalLabel}>生成方式:</Text>
                <View style={styles.aiGenerateOptions}>
                  <TouchableOpacity
                    style={[
                      styles.aiGenerateOption,
                      generateUseAI && styles.aiGenerateOptionActive,
                    ]}
                    onPress={() => setGenerateUseAI(true)}
                  >
                    <View
                      style={[
                        styles.aiRadioCircle,
                        generateUseAI && styles.aiRadioCircleActive,
                      ]}
                    >
                      {generateUseAI && <View style={styles.aiRadioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.aiGenerateOptionText,
                        generateUseAI && styles.aiGenerateOptionTextActive,
                      ]}
                    >
                      ✨ AI 智能生成
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.aiGenerateOption,
                      !generateUseAI && styles.aiGenerateOptionActive,
                    ]}
                    onPress={() => setGenerateUseAI(false)}
                  >
                    <View
                      style={[
                        styles.aiRadioCircle,
                        !generateUseAI && styles.aiRadioCircleActive,
                      ]}
                    >
                      {!generateUseAI && <View style={styles.aiRadioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.aiGenerateOptionText,
                        !generateUseAI && styles.aiGenerateOptionTextActive,
                      ]}
                    >
                      📋 规则引擎
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.aiModalFooter}>
              <TouchableOpacity
                style={styles.aiModalCancelButton}
                onPress={() => setShowAIGenerateModal(false)}
              >
                <Text style={styles.aiModalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.aiModalConfirmButton,
                  aiBabyVersion.isLoading &&
                    styles.aiModalConfirmButtonDisabled,
                ]}
                onPress={async () => {
                  setShowAIGenerateModal(false);
                  const result = await aiBabyVersion.generateAIBabyVersion({
                    recipe_id: recipeId,
                    baby_age_months: selectedBabyAge,
                    use_ai: generateUseAI,
                  });
                  if (result) {
                    setShowAIResultModal(true);
                  } else if (aiBabyVersion.error) {
                    Alert.alert("生成失败", aiBabyVersion.error);
                  }
                }}
                disabled={aiBabyVersion.isLoading}
              >
                {aiBabyVersion.isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.aiModalConfirmText}>开始生成</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI 生成结果弹窗 */}
      <Modal
        visible={showAIResultModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIResultModal(false)}
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContainer}>
            <View style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>✅ AI 宝宝版本已生成</Text>
              <TouchableOpacity onPress={() => setShowAIResultModal(false)}>
                <Text style={styles.aiModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.aiResultScrollView}>
              {aiBabyVersion.lastResult && (
                <View style={styles.aiResultContent}>
                  {/* 配料替换 */}
                  {aiBabyVersion.lastResult.ingredient_replacements?.length >
                    0 && (
                    <View style={styles.aiResultSection}>
                      <Text style={styles.aiResultSectionTitle}>
                        🍚 配料替换
                      </Text>
                      {aiBabyVersion.lastResult.ingredient_replacements.map(
                        (item, index) => (
                          <View key={index} style={styles.aiResultItem}>
                            <Text style={styles.aiResultItemText}>
                              {item.original} → {item.replacement}
                            </Text>
                            <Text style={styles.aiResultItemReason}>
                              {item.reason}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  )}

                  {/* 质地调整 */}
                  {aiBabyVersion.lastResult.texture_adjustments?.length > 0 && (
                    <View style={styles.aiResultSection}>
                      <Text style={styles.aiResultSectionTitle}>
                        👶 质地调整
                      </Text>
                      {aiBabyVersion.lastResult.texture_adjustments.map(
                        (item, index) => (
                          <View key={index} style={styles.aiResultItem}>
                            <Text style={styles.aiResultItemText}>
                              {item.adjustment}
                            </Text>
                            <Text style={styles.aiResultItemReason}>
                              {item.reason}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  )}

                  {/* 过敏提醒 */}
                  {aiBabyVersion.lastResult.allergy_alerts?.length > 0 && (
                    <View style={styles.aiResultSection}>
                      <Text style={styles.aiResultSectionTitle}>
                        ⚠️ 过敏提醒
                      </Text>
                      {aiBabyVersion.lastResult.allergy_alerts.map(
                        (alert, index) => (
                          <View key={index} style={styles.aiResultAlert}>
                            <Text style={styles.aiResultAlertText}>
                              {alert}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  )}

                  {/* 营养提示 */}
                  {aiBabyVersion.lastResult.nutrition_tips && (
                    <View style={styles.aiResultSection}>
                      <Text style={styles.aiResultSectionTitle}>
                        💡 营养提示
                      </Text>
                      <Text style={styles.aiResultNutritionText}>
                        {aiBabyVersion.lastResult.nutrition_tips}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.aiModalFooter}>
              <TouchableOpacity
                style={styles.aiModalCopyButton}
                onPress={() => {
                  // 复制做法
                  if (aiBabyVersion.lastResult) {
                    const text = `宝宝版本做法\n\n${
                      aiBabyVersion.lastResult.adjusted_steps
                        ?.map((s) => `${s.step}. ${s.action}`)
                        .join("\n") || ""
                    }`;
                    // 这里可以添加复制到剪贴板的逻辑
                    Alert.alert("已复制", "做法已复制到剪贴板");
                  }
                }}
              >
                <Text style={styles.aiModalCopyText}>📋 复制做法</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiModalShareButton}
                onPress={() => {
                  // 分享功能
                  setShowAIResultModal(false);
                  handleShare();
                }}
              >
                <Text style={styles.aiModalShareText}>📤 分享</Text>
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
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.secondary,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    maxWidth: "100%",
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.secondary,
  },

  // 滚动区域
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "web" ? 160 : 140,
    flexGrow: 1,
  },

  // 标题区
  heroSection: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.lg,
  },
  titleSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    alignItems: "center",
  },
  pairBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    lineHeight: 32,
  },
  heroSummary: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
    lineHeight: 24,
    color: Colors.text.secondary,
    textAlign: "center",
    maxWidth: 520,
  },
  heroCardsSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  detailCardEmphasis: {
    borderWidth: 1,
    borderColor: Colors.primary.light,
  },
  detailCardSoft: {
    backgroundColor: Colors.background.secondary,
  },
  versionCompareRow: {
    flexDirection: width > 420 ? "row" : "column",
    gap: Spacing.sm,
  },
  versionCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 148,
  },
  versionCardActive: {
    backgroundColor: Colors.primary.light,
    borderColor: Colors.primary.main,
  },
  versionCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  versionCardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  versionCardDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  versionCardCta: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionCardCtaActive: {
    color: Colors.text.primary,
  },
  miniNarrativeBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
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
    borderLeftColor: Colors.secondary[500],
  },
  babyAgeTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  babyAgeTipTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary[500],
    marginLeft: Spacing.xs,
  },
  babyAgeTipText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  babyAgeTipFoods: {
    flexDirection: "row",
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
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.xs,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  sectionTightTop: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  versionShowcaseCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0DDC8',
    ...Shadows.md,
  },
  versionShowcaseHeader: {
    gap: Spacing.sm,
  },
  versionShowcaseHeaderCopy: {
    gap: Spacing.xs,
  },
  versionShowcaseEyebrow: {
    fontSize: Typography.fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
  versionShowcaseTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  versionShowcaseSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  versionShowcaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1E2',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  versionShowcaseBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionCompareDeck: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  versionSpotlightCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    minHeight: 228,
  },
  versionSpotlightAdult: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F3D8B7',
  },
  versionSpotlightBaby: {
    backgroundColor: '#F6FBF8',
    borderColor: '#CFE7D7',
  },
  versionSpotlightCardActive: {
    transform: [{ scale: 1.01 }],
    ...Shadows.sm,
  },
  versionSpotlightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  versionSpotlightTopCopy: {
    flex: 1,
    gap: 4,
  },
  versionSpotlightKicker: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionSpotlightHeading: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  versionSpotlightIcon: {
    fontSize: 24,
  },
  versionSpotlightBody: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    lineHeight: 21,
    color: Colors.text.secondary,
  },
  versionSpotlightChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  versionSpotlightChip: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  versionSpotlightChipBaby: {
    backgroundColor: '#E6F4EC',
  },
  versionSpotlightChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  versionSpotlightChipTextBaby: {
    color: Colors.secondary.dark,
  },
  versionSpotlightList: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  versionSpotlightListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  versionSpotlightBullet: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary.main,
    lineHeight: 20,
  },
  versionSpotlightListText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  versionSpotlightFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  versionAgeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#D8E9DE',
  },
  versionAgeButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary.dark,
  },
  transformingIndicatorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  transformingInlineText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  versionSpotlightCta: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionShowcaseFooter: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: Spacing.md,
  },
  versionShowcaseHintBlock: {
    gap: 4,
  },
  versionShowcaseHintTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  versionShowcaseHintText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  versionShowcaseActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  versionShowcasePrimaryAction: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  versionShowcasePrimaryActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionShowcaseSecondaryAction: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  versionShowcaseSecondaryActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    backgroundColor: "transparent",
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    position: "relative",
  },
  tabActive: {
    backgroundColor: Colors.background.secondary,
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
    position: "absolute",
    bottom: 6,
    left: "28%",
    right: "28%",
    height: 2,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
  },
  tabIndicatorBaby: {
    backgroundColor: Colors.secondary[500],
  },
  tabIndicatorTimeline: {
    backgroundColor: "#00ACC1",
  },

  // AI 生成宝宝版本按钮
  aiGenerateSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  aiGenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  utilityCardMuted: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  utilityCardHeader: {
    marginBottom: Spacing.md,
  },
  utilityCardTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  utilityCardCaption: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  aiGenerateButtonMuted: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  aiGenerateButtonMutedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  aiGenerateIcon: {
    fontSize: 18,
  },
  aiGenerateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: "#FFFFFF",
  },

  // AI 生成弹窗
  aiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  aiModalContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
    ...Shadows.lg,
  },
  aiModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  aiModalTitle: {
    ...Typography.heading.h5,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  aiModalClose: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.tertiary,
    padding: Spacing.xs,
  },
  aiModalContent: {
    padding: Spacing.lg,
  },
  aiModalSection: {
    marginBottom: Spacing.lg,
  },
  aiModalLabel: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  aiAgeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  aiAgeSelectorText: {
    ...Typography.body.regular,
    color: Colors.text.primary,
  },
  aiAgeSelectorArrow: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  aiGenerateOptions: {
    gap: Spacing.sm,
  },
  aiGenerateOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
  },
  aiGenerateOptionActive: {
    backgroundColor: Colors.secondary[50],
    borderColor: Colors.secondary[500],
  },
  aiRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  aiRadioCircleActive: {
    borderColor: Colors.secondary[500],
  },
  aiRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary[500],
  },
  aiGenerateOptionText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  aiGenerateOptionTextActive: {
    color: Colors.secondary[500],
    fontWeight: Typography.fontWeight.semibold,
  },
  aiModalFooter: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  aiModalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  aiModalCancelText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  aiModalConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondary[500],
  },
  aiModalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  aiModalConfirmText: {
    ...Typography.body.regular,
    color: "#FFFFFF",
    fontWeight: Typography.fontWeight.semibold,
  },

  // AI 结果弹窗
  aiResultScrollView: {
    maxHeight: 400,
  },
  aiResultContent: {
    padding: Spacing.lg,
  },
  aiResultSection: {
    marginBottom: Spacing.lg,
  },
  aiResultSectionTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.lg,
  },
  aiResultItem: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.secondary.light,
    marginBottom: Spacing.xs,
  },
  aiResultItemText: {
    ...Typography.body.regular,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  aiResultItemReason: {
    ...Typography.body.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  aiResultAlert: {
    backgroundColor: Colors.functional.errorLight || "#FFEBEE",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  aiResultAlertText: {
    ...Typography.body.regular,
    color: Colors.functional.error,
  },
  aiResultNutritionText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  aiModalCopyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  aiModalCopyText: {
    ...Typography.body.regular,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  aiModalShareButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary.main,
  },
  aiModalShareText: {
    ...Typography.body.regular,
    color: "#FFFFFF",
    fontWeight: Typography.fontWeight.medium,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
  },
  ageSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  ageSelectorLabel: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  ageSelectorValue: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondary[500],
  },
  ageSelectorArrow: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  transformingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  transformingText: {
    ...Typography.body.caption,
    color: Colors.secondary[500],
  },

  // 月龄选择器弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  agePickerContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    width: "80%",
    maxHeight: "60%",
    overflow: "hidden",
    ...Shadows.lg,
  },
  agePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: Colors.secondary[500],
    fontWeight: Typography.fontWeight.semibold,
  },
  ageOptionCheck: {
    color: Colors.secondary[500],
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.lg,
  },

  // 同步烹饪
  syncCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.food.fruit,
  },
  syncHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  syncTitleRow: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  amountTag: {
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 70,
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  seasoningTag: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.main,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stepMetaItem: {
    flexDirection: "row",
    alignItems: "center",
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
    fontStyle: "italic",
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  allergyIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.functional.error,
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
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

  // 悬浮购物按钮
  footerSpacer: {
    height: 140,
  },
  shoppingFab: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: width - Spacing.lg * 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
    ...Shadows.lg,
  },
  shoppingFabAdded: {
    backgroundColor: Colors.secondary[500],
  },
  shoppingFabIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  shoppingFabContent: {
    flexShrink: 1,
  },
  shoppingFabLabel: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  shoppingFabHint: {
    marginTop: 2,
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    opacity: 0.9,
  },
  startCookingButton: {
    backgroundColor: "#FF7043",
    borderRadius: BorderRadius.lg,
    margin: 16,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  startCookingButtonDisabled: {
    opacity: 0.5,
  },
  startCookingButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  feedbackActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  feedbackChipLike: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  feedbackChipNeutral: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  feedbackChipReject: {
    flex: 1,
    backgroundColor: "#FFEBEE",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  feedbackChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  feedbackRecentTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  feedbackRecentItem: {
    marginBottom: Spacing.xs,
  },
  feedbackRecentText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  feedbackRecentNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm,
  },
  feedbackEmptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  statusTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusTag: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  statusTagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  inlineActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  inlineActionButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inlineActionButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  inlineActionButtonSecondary: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  inlineActionButtonDisabled: {
    opacity: 0.45,
  },
  inlineActionButtonSecondaryText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
