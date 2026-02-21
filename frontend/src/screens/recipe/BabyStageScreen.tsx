import React from 'react';
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
import type { RecipeStackParamList, BabyStageKey } from '../../types';
import { useAllBabyStages } from '../../hooks/useBabyStages';

type Props = NativeStackScreenProps<RecipeStackParamList, 'BabyStages'>;

const STAGE_COLORS: Record<string, string> = {
  '6-8m': '#4CAF50',
  '8-10m': '#8BC34A',
  '10-12m': '#FF7043',
  '12-18m': '#FF9800',
  '18-24m': '#9C27B0',
  '24-36m': '#2196F3',
};

export function BabyStageScreen({ navigation }: Props) {
  const { data: stages, isLoading } = useAllBabyStages();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7043" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>选择宝宝月龄阶段</Text>
        <Text style={styles.subtitle}>按阶段浏览适合宝宝的辅食食谱</Text>

        {(stages ?? []).map((stage) => {
          const color = STAGE_COLORS[stage.stage] ?? '#888';

          return (
            <TouchableOpacity
              key={stage.stage}
              style={styles.stageCard}
              onPress={() =>
                navigation.navigate('StageDetail', {
                  stage: stage.stage as BabyStageKey,
                  stageName: stage.name,
                })
              }
            >
              <View style={[styles.indicator, { backgroundColor: color }]}>
                <Text style={styles.indicatorText}>
                  {stage.stage.replace('m', '月')}
                </Text>
              </View>
              <View style={styles.stageInfo}>
                <Text style={styles.stageName}>{stage.name}</Text>
                <Text style={styles.ageRange}>{stage.age_range}</Text>
                <Text style={styles.nutritionHint}>
                  重点：{stage.key_nutrients.slice(0, 3).join(' · ')}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  indicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  indicatorText: { fontSize: 11, color: '#FFF', fontWeight: '700', textAlign: 'center' },
  stageInfo: { flex: 1 },
  stageName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  ageRange: { fontSize: 13, color: '#888', marginTop: 2 },
  nutritionHint: { fontSize: 12, color: '#FF9800', marginTop: 4 },
  arrow: { fontSize: 22, color: '#CCC' },
});
