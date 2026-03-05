import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { useBrowseTemplates, useCloneTemplate } from '../../hooks/useMealPlanTemplates';
import { trackEvent } from '../../analytics/sdk';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import type { MealPlanTemplate } from '../../api/mealPlanTemplates';
import { templateDiscoveryStyles as styles } from './templateDiscoveryStyles';

type Props = NativeStackScreenProps<PlanStackParamList, 'TemplateDiscovery'>;

const AGE_FILTERS = [
  { label: '6-8月', value: 7 },
  { label: '8-10月', value: 9 },
  { label: '10-12月', value: 11 },
  { label: '12-18月', value: 15 },
  { label: '18-24月', value: 21 },
  { label: '24-36月', value: 30 },
];

const TAG_FILTERS = [
  { label: '简单', value: '简单' },
  { label: '营养', value: '营养' },
  { label: '快手', value: '快手' },
  { label: '辅食', value: '辅食' },
];

export function TemplateDiscoveryScreen({ navigation }: Props) {
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const params = {
    babyAgeMonths: selectedAge || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    page: 1,
    pageSize: 20,
  };

  const { data, isLoading, isRefetching, refetch } = useBrowseTemplates(params);
  const cloneMutation = useCloneTemplate();

  const handleAgeFilter = (age: number) => {
    setSelectedAge(selectedAge === age ? null : age);
    setPage(1);
    trackEvent('template_filter_changed', { filterType: 'babyAge', value: age });
  };

  const handleTagFilter = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setPage(1);
    trackEvent('template_filter_changed', { filterType: 'tags', value: newTags.join(',') });
  };

  const handleCloneTemplate = async (templateId: string, title: string) => {
    try {
      await trackEvent('template_clone_requested', { templateId, title });
      await cloneMutation.mutateAsync(templateId);
      await trackEvent('template_clone_success', { templateId, title });
      Alert.alert('克隆成功', '模板已应用到您的周计划', [
        { text: '查看计划', onPress: () => navigation.navigate('WeeklyPlan') }
      ]);
    } catch (error: any) {
      await trackEvent('template_clone_failed', { templateId, title, error: error?.message });
      Alert.alert('克隆失败', error?.message || '请稍后重试');
    }
  };

  const renderTemplateCard = ({ item }: { item: MealPlanTemplate }) => {
    const daysCount = Object.keys(item.plan_data || {}).length;
    
    return (
      <View style={styles.templateCard}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        
        {item.description && (
          <Text style={styles.templateDescription} numberOfLines={2}>{item.description}</Text>
        )}
        
        <View style={styles.templateMeta}>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>📅 {daysCount}天</Text>
          </View>
          {item.baby_age_start_months && item.baby_age_end_months && (
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>👶 {item.baby_age_start_months}-{item.baby_age_end_months}月</Text>
            </View>
          )}
          {item.tags && item.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.metaTag}>
              <Text style={styles.metaTagText}>#{tag}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.templateFooter}>
          <Text style={styles.cloneCount}>已被克隆 {item.clone_count || 0} 次</Text>
          <TouchableOpacity 
            style={styles.cloneButton}
            onPress={() => handleCloneTemplate(item.id, item.title)}
            disabled={cloneMutation.isPending}
          >
            {cloneMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.cloneButtonText}>一键克隆</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>暂无模板</Text>
      <Text style={styles.emptyText}>还没有公开的膳食计划模板</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="搜索模板..."
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>
        
        <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.sm }}>宝宝月龄</Text>
        <View style={styles.filterContainer}>
          {AGE_FILTERS.map(age => (
            <TouchableOpacity
              key={age.value}
              style={[styles.filterChip, selectedAge === age.value && styles.filterChipActive]}
              onPress={() => handleAgeFilter(age.value)}
            >
              <Text style={[styles.filterChipText, selectedAge === age.value && styles.filterChipTextActive]}>
                {age.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: Spacing.md, marginBottom: Spacing.sm }}>标签</Text>
        <View style={styles.filterContainer}>
          {TAG_FILTERS.map(tag => (
            <TouchableOpacity
              key={tag.value}
              style={[styles.filterChip, selectedTags.includes(tag.value) && styles.filterChipActive]}
              onPress={() => handleTagFilter(tag.value)}
            >
              <Text style={[styles.filterChipText, selectedTags.includes(tag.value) && styles.filterChipTextActive]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <FlatList
        data={data?.templates || []}
        renderItem={renderTemplateCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
