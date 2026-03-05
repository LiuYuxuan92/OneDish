import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trackMainFlowEvent } from '../../analytics/mainFlow';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { SkeletonCard } from '../../components/common/Skeleton';

import { useHomeRecommendation } from './useHomeRecommendation';
import { useHomeAnalytics } from './useHomeAnalytics';
import { RecipeCard } from './RecipeCard';
import { HomeDebugPanel } from './HomeDebugPanel';
import { BabySection } from './BabySection';
import { IngredientGrid } from './IngredientGrid';
import { ActionGrid } from './ActionGrid';
import { ConceptSection } from './ConceptSection';
import { Header } from './Header';
import { ExpiryNotificationBanner } from './ExpiryNotificationBanner';
import { useExpiringItems } from '../../hooks/useIngredientInventory';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { recipe, swapping, recommendationReasons, isLoading, error, currentStage, onRefresh } = useHomeRecommendation();
  const { trackHomeView, trackQualityScore } = useHomeAnalytics();
  const { data: expiringData } = useExpiringItems(3);

  useEffect(() => { trackHomeView(recipe?.id || null); }, [recipe?.id]);
  useEffect(() => {
    trackQualityScore({ recipe, currentRecipe: recipe, currentStage, preferredCategories: [], experimentBucket: 'A', swapConfigSource: 'default' });
  }, [recipe?.id]);

  const nav = {
    shopping: () => {
      trackMainFlowEvent('shopping_list_generate_click', { source: 'home', screen: 'HomeScreen', recipeId: recipe?.id || null });
      (navigation.getParent() as any)?.navigate('Plan', { screen: 'ShoppingList' });
    },
    cooking: () => {
      if (!recipe?.id) return;
      trackMainFlowEvent('cooking_start_click', { source: 'home', screen: 'HomeScreen', recipeId: recipe.id });
      navigation.navigate('CookingMode', { recipeId: recipe.id, babyAgeMonths: currentStage?.age_min || 9 });
    },
    baby: () => (navigation.getParent() as any)?.navigate('Recipes', { screen: 'BabyStages' }),
    ingredient: (name: string) => (navigation.getParent() as any)?.navigate('Recipes', { screen: 'RecipeList', params: { ingredient: name } }),
    plan: () => (navigation.getParent() as any)?.navigate('Plan', { screen: 'WeeklyPlan' }),
    list: () => (navigation.getParent() as any)?.navigate('Recipes', { screen: 'RecipeList' }),
    inventory: () => (navigation.getParent() as any)?.navigate('Plan', { screen: 'IngredientInventory' }),
  };

  const expiringItems = expiringData?.items || [];
  const recommendedRecipes = expiringData?.recommended_recipes || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />}>
        <Header />
        <ExpiryNotificationBanner
          expiringItems={expiringItems}
          recommendedRecipes={recommendedRecipes}
          onPress={nav.inventory}
          onRecipePress={(recipeId: string) => navigation.navigate('RecipeDetail', { recipeId })}
        />
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日推荐</Text>
            <View style={styles.pairBadge}><Text style={styles.pairBadgeText}>一屏决策</Text></View>
          </View>
          {isLoading ? <View style={styles.skeletonContainer}><SkeletonCard showImage showFooter /></View>
          : error ? <View style={styles.card}><Text style={styles.errorText}>加载失败，请稍后重试</Text><TouchableOpacity style={styles.retryButton} onPress={onRefresh}><Text style={styles.retryButtonText}>点击重试</Text></TouchableOpacity></View>
          : recipe ? <RecipeCard recipe={recipe} currentStage={currentStage} recommendationReasons={recommendationReasons} swapping={swapping} onSwap={onRefresh} onShoppingList={nav.shopping} onCookingStart={nav.cooking} onRecipePress={() => recipe.id && navigation.navigate('RecipeDetail', { recipeId: recipe.id })} />
          : <View style={styles.card}><Text style={styles.emptyText}>暂无推荐</Text></View>}
        </View>
        {currentStage && <BabySection currentStage={currentStage} onNavigate={nav.baby} />}
        <IngredientGrid onSelectIngredient={nav.ingredient} />
        <ActionGrid actions={[
          { icon: '🛒', text: '购物清单', iconBg: Colors.primary.light, onPress: nav.shopping },
          { icon: '📅', text: '一周计划', iconBg: '#E3F2FD', onPress: nav.plan },
          { icon: '📖', text: '菜谱大全', iconBg: '#F3E5F5', onPress: nav.list },
        ]} />
        <HomeDebugPanel />
        <ConceptSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { flex: 1 },
  section: { padding: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  pairBadge: { backgroundColor: Colors.primary.light, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  pairBadgeText: { fontSize: Typography.fontSize.sm, color: Colors.primary.dark, fontWeight: Typography.fontWeight.medium },
  skeletonContainer: { padding: Spacing.md },
  card: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
  errorText: { fontSize: Typography.fontSize.base, color: Colors.functional.error },
  retryButton: { marginTop: Spacing.md, backgroundColor: Colors.primary.main, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  retryButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  emptyText: { fontSize: Typography.fontSize.base, color: Colors.text.tertiary },
});
