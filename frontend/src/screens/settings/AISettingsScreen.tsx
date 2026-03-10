// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useAIConfigsWithActions } from '../../hooks/useAIConfigs';
import { AIConfigSafe, AIConfigFormData } from '../../api/ai-configs';
import { AIConfigCard } from '../../components/settings/AIConfigCard';
import { AIConfigForm } from '../../components/settings/AIConfigForm';
import { PlusIcon, ChevronLeftIcon } from '../../components/common/Icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AISettings'>;

export function AISettingsScreen({ navigation }: Props) {
  const {
    configs,
    isLoading,
    refetch,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    isCreating,
    isTesting,
  } = useAIConfigsWithActions();

  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfigSafe | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleEdit = (config: AIConfigSafe) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = (config: AIConfigSafe) => {
    Alert.alert(
      '确认删除',
      `确定要删除 "${config.display_name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConfig(config.id);
              Alert.alert('成功', '配置已删除');
            } catch (error: any) {
              Alert.alert('错误', error?.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleTest = async (config: AIConfigSafe) => {
    setTestingId(config.id);
    try {
      const result = await testConfig(config.id);
      if (result.success) {
        Alert.alert('测试成功', result.message || '连接正常');
      } else {
        Alert.alert('测试失败', result.message || '连接异常');
      }
    } catch (error: any) {
      Alert.alert('测试失败', error?.message || '测试失败，请稍后重试');
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (data: AIConfigFormData) => {
    try {
      if (editingConfig) {
        await updateConfig(editingConfig.id, data);
        Alert.alert('成功', '配置已更新');
      } else {
        await createConfig(data);
        Alert.alert('成功', '配置已添加');
      }
    } catch (error: any) {
      Alert.alert('错误', error?.message || '保存失败');
      throw error; // Re-throw to prevent form from closing
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🤖</Text>
      <Text style={styles.emptyTitle}>还没有 AI 配置</Text>
      <Text style={styles.emptySubtitle}>
        添加你的 AI 接口密钥，可以节省平台成本并获得更好的体验
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
        <PlusIcon size={20} color={Colors.text.inverse} />
        <Text style={styles.emptyButtonText}>添加 AI 配置</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: AIConfigSafe }) => (
    <AIConfigCard
      config={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onTest={handleTest}
      isTesting={testingId === item.id}
    />
  );

  if (isLoading && !configs.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeftIcon size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI 配置</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <PlusIcon size={24} color={Colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {configs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={configs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary.main]}
              tintColor={Colors.primary.main}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                已配置 {configs.length} 个 AI 提供商
              </Text>
            </View>
          }
        />
      )}

      {/* Form Modal */}
      <AIConfigForm
        visible={showForm}
        editingConfig={editingConfig}
        onClose={() => {
          setShowForm(false);
          setEditingConfig(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  addButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  listContent: {
    padding: Spacing.md,
  },
  listHeader: {
    marginBottom: Spacing.md,
  },
  listHeaderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
});
