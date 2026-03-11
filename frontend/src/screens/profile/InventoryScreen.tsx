import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useIngredientInventory, useAddInventory, useDeleteInventory } from '../../hooks/useIngredientInventory';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';
import { PlusIcon, TrashIcon, CloseIcon, AlertIcon } from '../../components/common/Icons';
import { useSuggestByInventory } from '../../hooks/useRecipes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Inventory'>;

const LOCATION_OPTIONS = ['冷藏', '冷冻', '常温'];
const UNIT_OPTIONS = ['个', '千克', '克', '斤', '两', '袋', '盒', '瓶', '把'];

export function InventoryScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');
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
  const { data: suggestData } = useSuggestByInventory();

  const inventory = data?.inventory || [];
  const suggestions = suggestData?.suggestions || [];

  const summaryCards = useMemo(
    () => [
      {
        label: '库存总数',
        value: `${data?.stats?.total || 0}`,
        helper: '先看家里有什么再决定做什么',
      },
      {
        label: '临期提醒',
        value: `${data?.stats?.expiring || 0}`,
        helper: '适合优先做掉这些食材',
      },
      {
        label: '可消耗菜谱',
        value: `${suggestions.length}`,
        helper: '库存命中的推荐会优先显示',
      },
    ],
    [data?.stats?.expiring, data?.stats?.total, suggestions.length]
  );

  const insightChips = useMemo(() => {
    const chips = [`${inventory.length} 项库存`];
    if (data?.stats?.expired) chips.push(`${data.stats.expired} 项已过期`);
    if (data?.stats?.expiring) chips.push('优先消耗临期食材');
    if (suggestions.length) chips.push('可联动推荐菜谱');
    return chips;
  }, [data?.stats?.expired, data?.stats?.expiring, inventory.length, suggestions.length]);

  const filteredItems = useMemo(() => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return inventory.filter((item) => {
      if (!item.expiry_date) return filter === 'all';
      const expiryDate = new Date(item.expiry_date);
      if (filter === 'expired') return expiryDate < now;
      if (filter === 'expiring') return expiryDate >= now && expiryDate <= threeDaysLater;
      return true;
    });
  }, [filter, inventory]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
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
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('错误', err?.message || '添加失败，请重试');
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('确认删除', '确定要删除该食材吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
          } catch {
            Alert.alert('错误', '删除失败，请重试');
          }
        },
      },
    ]);
  };

  const isExpired = (expiryDate: string | null) => !!expiryDate && new Date(expiryDate) < new Date();
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
          title="库存暂时没拉回来"
          description="请检查网络后重新试一次"
          buttonText="重新加载"
          onButtonPress={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.eyebrow}>库存管理</Text>
              <Text style={styles.heroTitle}>先看库存状态，再决定本周做什么</Text>
              <Text style={styles.heroSubtitle}>把临期提醒、库存覆盖和推荐菜谱放在同一屏里，方便和首页、周计划联动。</Text>
            </View>
            <TouchableOpacity style={styles.heroAction} onPress={() => setShowAddModal(true)}>
              <Text style={styles.heroActionText}>添加食材</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {insightChips.map((chip) => (
              <View key={chip} style={styles.insightChip}>
                <Text style={styles.insightChipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: 'all', label: '全部' },
            { key: 'expiring', label: '即将过期' },
            { key: 'expired', label: '已过期' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key as 'all' | 'expiring' | 'expired')}
            >
              <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {suggestions.length > 0 ? (
          <View style={styles.suggestCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>库存命中的推荐菜谱</Text>
                <Text style={styles.sectionSubtitle}>优先消耗家里已有或临期的食材。</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Recipes')}>
                <Text style={styles.sectionLink}>去看菜谱</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestList}>
              {suggestions.slice(0, 5).map((item: any) => (
                <View key={item.id} style={styles.suggestItem}>
                  <Text style={styles.suggestName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.suggestMatch} numberOfLines={2}>可用：{item.matched_ingredients.join('、')}</Text>
                  <Text style={styles.suggestMeta}>⏱ {item.prep_time} 分钟</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {filteredItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              type="no-inventory"
              title={filter === 'all' ? '还没有食材' : '没有符合条件的食材'}
              description={filter === 'all' ? '添加你家厨房的食材，方便搭配菜谱' : '换个筛选条件看看'}
              buttonText="添加食材"
              onButtonPress={() => setShowAddModal(true)}
            />
          </View>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.inventoryItem}>
              <View style={styles.itemMain}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName}>{item.ingredient_name}</Text>
                  <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
                </View>
                <View style={styles.itemMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{item.location}</Text>
                  </View>
                  {item.expiry_date ? (
                    <View
                      style={[
                        styles.expiryPill,
                        isExpired(item.expiry_date) && styles.expiryPillExpired,
                        isExpiringSoon(item.expiry_date) && styles.expiryPillWarning,
                      ]}
                    >
                      <AlertIcon
                        size={12}
                        color={
                          isExpired(item.expiry_date)
                            ? Colors.functional.error
                            : isExpiringSoon(item.expiry_date)
                              ? Colors.functional.warning
                              : Colors.text.secondary
                        }
                      />
                      <Text
                        style={[
                          styles.expiryText,
                          isExpired(item.expiry_date) && styles.expiryTextExpired,
                          isExpiringSoon(item.expiry_date) && styles.expiryTextWarning,
                        ]}
                      >
                        {new Date(item.expiry_date).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {item.notes ? <Text style={styles.itemNote}>{item.notes}</Text> : null}
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item.id)}>
                <TrashIcon size={18} color={Colors.functional.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <PlusIcon size={24} color={Colors.text.inverse} />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加食材</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <CloseIcon size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                    <View style={styles.optionRow}>
                      {UNIT_OPTIONS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.optionChip, formData.unit === unit && styles.optionChipActive]}
                          onPress={() => setFormData({ ...formData, unit })}
                        >
                          <Text style={[styles.optionChipText, formData.unit === unit && styles.optionChipTextActive]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>存储位置</Text>
                <View style={styles.locationOptions}>
                  {LOCATION_OPTIONS.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[styles.locationOption, formData.location === location && styles.locationOptionActive]}
                      onPress={() => setFormData({ ...formData, location })}
                    >
                      <Text style={[styles.locationOptionText, formData.location === location && styles.locationOptionTextActive]}>{location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>保质期（可选）</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expiry_date}
                  onChangeText={(text) => setFormData({ ...formData, expiry_date: text })}
                  placeholder="格式：2026-03-31"
                  placeholderTextColor={Colors.text.tertiary}
                />
                <Text style={styles.formHint}>格式：年-月-日，例如 2026-03-31</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>备注（可选）</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="补充数量来源、适合哪顿饭等"
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="取消"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1, marginRight: Spacing.sm, backgroundColor: Colors.background.secondary }}
                textStyle={{ color: Colors.text.primary }}
              />
              <Button title="添加" onPress={handleAddItem} loading={addMutation.isPending} style={{ flex: 1, marginLeft: Spacing.sm }} />
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroTextBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  insightChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  insightChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  summaryHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  filterChip: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  suggestCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  sectionLink: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  suggestList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  suggestItem: {
    width: 160,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  suggestName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  suggestMatch: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.success,
    lineHeight: 18,
  },
  suggestMeta: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  emptyWrap: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  inventoryItem: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  itemMain: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  itemQuantity: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaPill: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  metaPillText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  expiryPillExpired: {
    backgroundColor: Colors.functional.errorLight,
  },
  expiryPillWarning: {
    backgroundColor: Colors.functional.warningLight,
  },
  expiryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  expiryTextExpired: {
    color: Colors.functional.error,
  },
  expiryTextWarning: {
    color: Colors.functional.warning,
  },
  itemNote: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
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
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  formHint: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  optionChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  optionChipActive: {
    backgroundColor: Colors.primary.main,
  },
  optionChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  optionChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationOption: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  locationOptionActive: {
    backgroundColor: Colors.primary.main,
  },
  locationOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  locationOptionTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default InventoryScreen;
