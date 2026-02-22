// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { RecipeStackParamList } from '../../types';
import { babyStagesApi } from '../../api/babyStages';
import { useStageRecipes } from '../../hooks/useBabyStages';
import { StageGuideCard } from '../../components/recipe/StageGuideCard';
import { RecipeCard } from '../../components/recipe/RecipeCard';

type Props = NativeStackScreenProps<RecipeStackParamList, 'StageDetail'>;

const SCENE_FILTERS = [
  { id: '', label: '全部' },
  { id: 'first_intro', label: '首次引入' },
  { id: '快手', label: '⚡ 快手' },
  { id: '生病', label: '🤒 生病' },
  { id: '日常', label: '🌿 日常' },
  { id: '补铁', label: '🔴 补铁' },
  { id: '补钙', label: '🦴 补钙' },
];

export function StageDetailScreen({ route, navigation }: Props) {
  const { stage } = route.params;
  const [activeFilter, setActiveFilter] = useState('');

  const { data: stageData, isLoading: stageLoading } = useQuery({
    queryKey: ['babyStage', stage],
    queryFn: async () => {
      const res = await babyStagesApi.getByStage(stage);
      return res.data.data;
    },
  });

  const filters =
    activeFilter === 'first_intro'
      ? { first_intro: true }
      : activeFilter
      ? { scene_tag: activeFilter }
      : {};

  const { data: recipes, isLoading: recipesLoading } = useStageRecipes(stage, filters);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 阶段指南卡 */}
        {stageLoading ? (
          <ActivityIndicator style={{ margin: 20 }} color="#FF7043" />
        ) : stageData ? (
          <StageGuideCard stage={stageData} defaultExpanded={false} />
        ) : null}

        {/* 筛选器 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {SCENE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                activeFilter === f.id && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f.id && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 食谱列表 */}
        <View style={styles.recipesSection}>
          <Text style={styles.recipesTitle}>
            {recipesLoading ? '加载中...' : `${recipes?.length ?? 0} 道食谱`}
          </Text>
          {recipesLoading ? (
            <ActivityIndicator color="#FF7043" style={{ margin: 20 }} />
          ) : recipes?.length === 0 ? (
            <Text style={styles.emptyText}>该筛选条件下暂无食谱</Text>
          ) : (
            recipes?.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() =>
                  navigation.navigate('RecipeDetail', { recipeId: recipe.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  filterChipActive: { backgroundColor: '#FF7043', borderColor: '#FF7043' },
  filterText: { fontSize: 13, color: '#555' },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  recipesSection: { paddingHorizontal: 16, paddingBottom: 32 },
  recipesTitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 14,
  },
});
