// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { AIConfigSafe, getProviderInfo } from '../../api/ai-configs';
import { PencilIcon, TrashIcon, RefreshCwIcon, CheckCircleIcon } from '../common/Icons';

interface AIConfigCardProps {
  config: AIConfigSafe;
  onEdit: (config: AIConfigSafe) => void;
  onDelete: (config: AIConfigSafe) => void;
  onTest: (config: AIConfigSafe) => void;
  isTesting?: boolean;
}

export function AIConfigCard({
  config,
  onEdit,
  onDelete,
  onTest,
  isTesting = false,
}: AIConfigCardProps) {
  const providerInfo = getProviderInfo(config.provider);
  
  return (
    <View style={styles.card}>
      {/* 提供商图标和名称 */}
      <View style={styles.header}>
        <Text style={styles.providerIcon}>{providerInfo.icon}</Text>
        <View style={styles.headerText}>
          <Text style={styles.providerName}>{providerInfo.label}</Text>
          <Text style={styles.displayName} numberOfLines={1}>
            {config.display_name}
            {config.is_active && <Text style={styles.activeTag}> (激活中)</Text>}
          </Text>
        </View>
      </View>

      {/* Key 预览和状态 */}
      <View style={styles.infoRow}>
        <Text style={styles.keyPreview}>{config.key_preview}</Text>
        <View style={styles.statusBadge}>
          <CheckCircleIcon size={14} color={Colors.functional.success} />
          <Text style={styles.statusText}>已添加</Text>
        </View>
      </View>

      {/* 模型信息 */}
      {config.model && (
        <Text style={styles.modelInfo}>模型: {config.model}</Text>
      )}

      {/* 操作按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(config)}
          activeOpacity={0.7}
        >
          <PencilIcon size={16} color={Colors.primary.main} />
          <Text style={styles.actionText}>编辑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(config)}
          activeOpacity={0.7}
        >
          <TrashIcon size={16} color={Colors.functional.error} />
          <Text style={[styles.actionText, { color: Colors.functional.error }]}>
            删除
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.testButton]}
          onPress={() => onTest(config)}
          disabled={isTesting}
          activeOpacity={0.7}
        >
          {isTesting ? (
            <ActivityIndicator size={14} color={Colors.primary.main} />
          ) : (
            <RefreshCwIcon size={16} color={Colors.primary.main} />
          )}
          <Text style={styles.actionText}>
            {isTesting ? '测试中...' : '测试'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  providerIcon: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  providerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  displayName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  activeTag: {
    color: Colors.functional.success,
    fontWeight: Typography.fontWeight.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  keyPreview: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.functional.success + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.success,
    marginLeft: 4,
    fontWeight: Typography.fontWeight.medium,
  },
  modelInfo: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  testButton: {
    backgroundColor: Colors.primary.light + '30',
    borderRadius: BorderRadius.md,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginLeft: 4,
  },
});
