// @ts-nocheck
/**
 * 简家厨 - 食材库存管理页面
 * 用于管理家中食材库存，记录食材数量和保质期
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useIngredientInventory, useAddInventory, useDeleteInventory, useUpdateInventory } from '../../hooks/useIngredientInventory';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';
import {
  PlusIcon,
  TrashIcon,
  CloseIcon,
  AlertIcon,
  ChevronRightIcon,
} from '../../components/common/Icons';
import { useSuggestByInventory } from '../../hooks/useRecipes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Inventory'>;

// 食材位置选项
const LOCATION_OPTIONS = ['冷藏', '冷冻', '常温'];

// 单位选项
const UNIT_OPTIONS = ['个', '千克', '克', '斤', '两', '袋', '盒', '瓶', '把'];

export function InventoryScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  
  // 添加表单状态
  const [formData, setFormData] = useState({
    ingredient_name: '',
    quantity: '1',
    unit: '个',
    location: '冷藏',
    expiry_date: '',
    notes: '',
  });

  const { data, isLoading, error, refetch } = useIngredientInventory();
  const addMutation = useAddInventory();
  const deleteMutation = useDeleteInventory();
  const updateMutation = useUpdateInventory();
  const { data: suggestData } = useSuggestByInventory();
  const highlightCount = suggestData?.suggestions?.length || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddItem = async () => {
    if (!formData.ingredient_name.trim()) {
      Alert.alert('提示', '请输入食材名称');
      return;
    }

    try {
      await addMutation.mutateAsync({
        ingredient_name: formData.ingredient_name.trim(),
        quantity: parseFloat(formData.quantity) || 1,
        unit: formData.unit,
        location: formData.location,
        expiry_date: formData.expiry_date || undefined,
        notes: formData.notes || undefined,
      });
      
      Alert.alert('成功', '食材添加成功');
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('错误', err?.message || '添加失败，请重试');
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除该食材吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id);
              Alert.alert('成功', '食材已删除');
            } catch (err) {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      ingredient_name: '',
      quantity: '1',
      unit: '个',
      location: '冷藏',
      expiry_date: '',
      notes: '',
    });
  };

  // 过滤食材
  const filteredItems = React.useMemo(() => {
    if (!data?.inventory) return [];
    
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return data.inventory.filter(item => {
      if (!item.expiry_date) return filter === 'all';
      
      const expiryDate = new Date(item.expiry_date);
      
      if (filter === 'expired') {
        return expiryDate < now;
      } else if (filter === 'expiring') {
        return expiryDate >= now && expiryDate <= threeDaysLater;
      }
      return true;
    });
  }, [data, filter]);

  // 检查是否过期
  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // 检查是否即将过期（3天内）
  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiry >= now && expiry <= threeDaysLater;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} showAvatar={false} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          type="error"
          title="加载失败"
          description="无法获取食材库存，请检查网络连接"
          buttonText="重试"
          onButtonPress={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Inventory</Text>
            <Text style={styles.heroTitle}>先看库存状态，再决定本周做什么</Text>
            <Text style={styles.heroSubtitle}>把临期提醒、库存覆盖和推荐菜谱放在同一屏里，方便和首页、周计划联动。</Text>
          </View>
          <TouchableOpacity style={styles.heroAction} onPress={() => setShowAddModal(true)}>
            <Text style={styles.heroActionText}>添加食材</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroSummaryRow}>
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{data?.stats?.total || 0}</Text>
            <Text style={styles.heroSummaryLabel}>库存总数</Text>
          </View>
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{data?.stats?.expiring || 0}</Text>
            <Text style={styles.heroSummaryLabel}>临期提醒</Text>
          </View>
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryValue}>{highlightCount}</Text>
            <Text style={styles.heroSummaryLabel}>可消耗菜谱</Text>
          </View>
        </View>
      </View>

      {/* 统计卡片 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{data?.stats?.total || 0}</Text>
          <Text style={styles.statLabel}>总计</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statWarning]}>{data?.stats?.expiring || 0}</Text>
          <Text style={styles.statLabel}>即将过期</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statDanger]}>{data?.stats?.expired || 0}</Text>
          <Text style={styles.statLabel}>已过期</Text>
        </View>
      </View>

      {/* 筛选标签 */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expiring' && styles.filterTabActive]}
          onPress={() => setFilter('expiring')}
        >
          <Text style={[styles.filterText, filter === 'expiring' && styles.filterTextActive]}>
            即将过期
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expired' && styles.filterTabActive]}
          onPress={() => setFilter('expired')}
        >
          <Text style={[styles.filterText, filter === 'expired' && styles.filterTextActive]}>
            已过期
          </Text>
        </TouchableOpacity>
      </View>

      {/* 即将过期食材推荐菜谱 */}
      {suggestData?.suggestions && suggestData.suggestions.length > 0 && (
        <View style={styles.suggestSection}>
          <Text style={styles.suggestTitle}>🍳 临期食材推荐菜谱</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestList}>
            {suggestData.suggestions.slice(0, 5).map((item: any) => (
              <TouchableOpacity key={item.id} style={styles.suggestCard}>
                <Text style={styles.suggestName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.suggestMatch} numberOfLines={1}>
                  可用: {item.matched_ingredients.join('、')}
                </Text>
                <Text style={styles.suggestTime}>⏱ {item.prep_time}分钟</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 食材列表 */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            type="no-inventory"
            title={filter === 'all' ? '还没有食材' : '没有符合条件的食材'}
            description={filter === 'all' ? '添加你家厨房的食材，方便搭配菜谱' : '试试其他筛选条件'}
            buttonText="添加食材"
            onButtonPress={() => setShowAddModal(true)}
          />
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.inventoryItem}>
              <View style={styles.itemMain}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.ingredient_name}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                
                <View style={styles.itemMeta}>
                  <View style={styles.locationTag}>
                    <Text style={styles.locationTagText}>{item.location}</Text>
                  </View>
                  
                  {item.expiry_date && (
                    <View style={[
                      styles.expiryTag,
                      isExpired(item.expiry_date) && styles.expiryTagExpired,
                      isExpiringSoon(item.expiry_date) && styles.expiryTagWarning,
                    ]}>
                      <AlertIcon size={12} color={
                        isExpired(item.expiry_date) 
                          ? Colors.functional.error 
                          : isExpiringSoon(item.expiry_date)
                            ? Colors.functional.warning
                            : Colors.text.secondary
                      } />
                      <Text style={[
                        styles.expiryText,
                        isExpired(item.expiry_date) && styles.expiryTextExpired,
                        isExpiringSoon(item.expiry_date) && styles.expiryTextWarning,
                      ]}>
                        {new Date(item.expiry_date).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(item.id)}
              >
                <TrashIcon size={20} color={Colors.functional.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 添加按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <PlusIcon size={28} color={Colors.text.inverse} />
      </TouchableOpacity>

      {/* 添加食材弹窗 */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加食材</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <CloseIcon size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 食材名称 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>食材名称 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.ingredient_name}
                  onChangeText={(text) => setFormData({ ...formData, ingredient_name: text })}
                  placeholder="例如：鸡蛋、牛奶"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              {/* 数量和单位 */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>数量</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.quantity}
                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: Spacing.md }]}>
                  <Text style={styles.formLabel}>单位</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.unitOptions}>
                      {UNIT_OPTIONS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitOption,
                            formData.unit === unit && styles.unitOptionActive,
                          ]}
                          onPress={() => setFormData({ ...formData, unit })}
                        >
                          <Text style={[
                            styles.unitOptionText,
                            formData.unit === unit && styles.unitOptionTextActive,
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* 存储位置 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>存储位置</Text>
                <View style={styles.locationOptions}>
                  {LOCATION_OPTIONS.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.locationOption,
                        formData.location === location && styles.locationOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, location })}
                    >
                      <Text style={[
                        styles.locationOptionText,
                        formData.location === location && styles.locationOptionTextActive,
                      ]}>
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 保质期 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>保质期（可选）</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expiry_date}
                  onChangeText={(text) => setFormData({ ...formData, expiry_date: text })}
                  placeholder="格式：2024-12-31"
                  placeholderTextColor={Colors.text.tertiary}
                />
                <Text style={styles.formHint}>格式：年-月-日，例如 2024-12-31</Text>
              </View>

              {/* 备注 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>备注（可选）</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="添加备注信息"
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* 底部按钮 */}
            <View style={styles.modalFooter}>
              <Button
                title="取消"
                variant="outline"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
              <Button
                title="添加"
                onPress={handleAddItem}
                loading={addMutation.isPending}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              />
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
  loadingContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    ...Typography.body.caption,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    ...Typography.heading.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body.small,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  heroAction: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  heroActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroSummaryItem: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  heroSummaryValue: {
    ...Typography.heading.h3,
    color: Colors.text.primary,
  },
  heroSummaryLabel: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  // 统计卡片样式
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.card,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
  },
  statWarning: {
    color: Colors.functional.warning,
  },
  statDanger: {
    color: Colors.functional.error,
  },
  statLabel: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.xs,
  },
  // 筛选标签
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
  },
  filterTabActive: {
    backgroundColor: Colors.primary.main,
  },
  filterText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
  // 推荐菜谱区域
  suggestSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  suggestTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  suggestList: {
    gap: Spacing.sm,
  },
  suggestCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: 140,
    ...Shadows.sm,
  },
  suggestName: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  suggestMatch: {
    ...Typography.body.caption,
    color: Colors.functional.success,
    marginBottom: Spacing.xs,
  },
  suggestTime: {
    ...Typography.body.caption,
    color: Colors.text.tertiary,
  },
  // 列表样式
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  inventoryItem: {
    flexDirection: 'row',
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  itemMain: {
    flex: 1,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemName: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  itemQuantity: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationTag: {
    backgroundColor: Colors.neutral.gray100,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  locationTagText: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  expiryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryTagExpired: {
    backgroundColor: `${Colors.functional.error}15`,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  expiryTagWarning: {
    backgroundColor: `${Colors.functional.warning}15`,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  expiryText: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  expiryTextExpired: {
    color: Colors.functional.error,
  },
  expiryTextWarning: {
    color: Colors.functional.warning,
  },
  deleteButton: {
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  // 浮动添加按钮
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.background.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    ...Typography.heading.h3,
    color: Colors.text.primary,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  // 表单样式
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  formHint: {
    ...Typography.body.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body.regular,
    color: Colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  unitOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  unitOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
  },
  unitOptionActive: {
    backgroundColor: Colors.primary.main,
  },
  unitOptionText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  unitOptionTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.gray100,
    alignItems: 'center',
  },
  locationOptionActive: {
    backgroundColor: Colors.primary.main,
  },
  locationOptionText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  locationOptionTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default InventoryScreen;
