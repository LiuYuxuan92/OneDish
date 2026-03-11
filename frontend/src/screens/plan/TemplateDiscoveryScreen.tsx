import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../styles/theme';
import { useApplyTemplate, useDeleteTemplate, useMealPlanTemplates } from '../../hooks/useMealPlanTemplates';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '../../types';
import type { MealPlanTemplate } from '../../api/mealPlanTemplates';
import { templateDiscoveryStyles as styles } from './templateDiscoveryStyles';

type Props = NativeStackScreenProps<PlanStackParamList, 'TemplateDiscovery'>;

function getUpcomingMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toISOString().split('T')[0];
}

export function TemplateDiscoveryScreen({ navigation }: Props) {
  const [targetStartDate] = useState(getUpcomingMonday());
  const params = useMemo(() => ({ mine: true, page: 1, pageSize: 50 }), []);
  const { data, isLoading, isRefetching, refetch } = useMealPlanTemplates(params);
  const applyMutation = useApplyTemplate();
  const deleteMutation = useDeleteTemplate();

  const templates = data?.templates || [];
  const summaryCards = useMemo(
    () => [
      {
        label: '模板数量',
        value: `${templates.length}`,
        helper: '把顺手的周计划留作复用底板',
      },
      {
        label: '默认目标周',
        value: targetStartDate,
        helper: '当前最小版默认套用到下一个周一',
      },
      {
        label: '当前状态',
        value: templates.length > 0 ? '可直接复用' : '待补充',
        helper: '套用后会自动回到周计划继续调整',
      },
    ],
    [targetStartDate, templates.length]
  );

  const handleApplyTemplate = async (template: MealPlanTemplate) => {
    try {
      const result = await applyMutation.mutateAsync({ templateId: template.id, input: { targetStartDate } });
      const skipped = result?.skippedMissingRecipeCount || 0;
      const message = skipped > 0 ? `${result.message}\n\n已自动跳过 ${skipped} 个已失效菜谱。` : result.message;
      Alert.alert('套用完成', message, [{ text: '查看周计划', onPress: () => navigation.navigate('WeeklyPlan') }]);
    } catch (error: any) {
      Alert.alert('套用失败', error?.message || '请稍后重试');
    }
  };

  const handleDeleteTemplate = (template: MealPlanTemplate) => {
    Alert.alert('删除模板', `确定删除「${template.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(template.id);
          } catch (error: any) {
            Alert.alert('删除失败', error?.message || '请稍后重试');
          }
        },
      },
    ]);
  };

  const renderTemplateCard = ({ item }: { item: MealPlanTemplate }) => {
    const tags = item.tags || [];
    const mealsCount = (item.plan_data || []).length;

    return (
      <View style={styles.templateCard}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaTag}><Text style={styles.metaTagText}>{mealsCount} 餐</Text></View>
        </View>

        {item.description ? <Text style={styles.templateDescription} numberOfLines={2}>{item.description}</Text> : null}

        <View style={styles.templateMeta}>
          <View style={styles.metaTag}><Text style={styles.metaTagText}>目标周：{targetStartDate}</Text></View>
          {tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.metaTag}><Text style={styles.metaTagText}>#{tag}</Text></View>
          ))}
        </View>

        <Text style={styles.cloneCount}>套用后可继续在周计划里替换菜谱、补购物清单和分享给家人。</Text>

        <View style={styles.templateFooter}>
          <TouchableOpacity style={[styles.cloneButton, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDeleteTemplate(item)} disabled={deleteMutation.isPending}>
            <Text style={[styles.cloneButtonText, { color: Colors.functional.error }]}>删除</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cloneButton} onPress={() => handleApplyTemplate(item)} disabled={applyMutation.isPending}>
            {applyMutation.isPending ? <ActivityIndicator size="small" color={Colors.text.inverse} /> : <Text style={styles.cloneButtonText}>套用到新一周</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🗂️</Text>
      <Text style={styles.emptyTitle}>还没有模板</Text>
      <Text style={styles.emptyText}>先去周计划页把当前计划保存为模板吧。</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.templateTitle}>我的模板</Text>
            <Text style={styles.templateDescription}>这里保存你自己的周计划模板，方便快速复用一周节奏和一菜两吃搭配。</Text>
            <View style={styles.templateMeta}>
              {summaryCards.map((card) => (
                <View key={card.label} style={[styles.metaTag, { minWidth: '31%', paddingVertical: 12, paddingHorizontal: 12 }]}> 
                  <Text style={[styles.metaTagText, { fontWeight: '700', color: Colors.text.primary }]}>{card.value}</Text>
                  <Text style={[styles.metaTagText, { marginTop: 4 }]}>{card.label}</Text>
                  <Text style={[styles.metaTagText, { marginTop: 4, color: Colors.text.tertiary }]}>{card.helper}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />}
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
