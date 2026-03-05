import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSwapWeightsConfig,
  resetSwapRemoteConfigControls,
  setSwapRemoteConfigControls,
  SWAP_REMOTE_CONFIG_ENABLED_KEY,
  SWAP_REMOTE_CONFIG_URL_KEY,
} from './swapWeightsConfig';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

export interface HomeDebugPanelProps {
  userId?: string;
}

export function HomeDebugPanel({ userId }: HomeDebugPanelProps) {
  const [remoteEnabledDraft, setRemoteEnabledDraft] = useState(false);
  const [remoteUrlDraft, setRemoteUrlDraft] = useState('');
  const [swapScoringWeights, setSwapScoringWeights] = useState<any>(null);
  const [swapExperimentBucket, setSwapExperimentBucket] = useState<'A' | 'B'>('A');
  const [swapConfigSource, setSwapConfigSource] = useState<'default' | 'remote' | 'local'>('default');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const loadDebugControls = async () => {
      const [enabledRaw, urlRaw] = await Promise.all([
        AsyncStorage.getItem(SWAP_REMOTE_CONFIG_ENABLED_KEY),
        AsyncStorage.getItem(SWAP_REMOTE_CONFIG_URL_KEY),
      ]);
      setRemoteEnabledDraft(enabledRaw === '1' || enabledRaw === 'true');
      setRemoteUrlDraft(urlRaw || '');
    };

    loadDebugControls().catch((err) => {
      console.error('读取换菜远端配置调试项失败:', err);
    });
  }, []);

  const onApplyRemoteConfigDebug = async () => {
    try {
      await setSwapRemoteConfigControls({
        enabled: remoteEnabledDraft,
        url: remoteUrlDraft,
      });
      const config = await getSwapWeightsConfig({ userId: userId || null });
      setSwapScoringWeights(config.weights);
      setSwapExperimentBucket(config.bucket);
      setSwapConfigSource(config.source);
    } catch (err) {
      console.error('更新远端配置调试项失败:', err);
    }
  };

  const onResetRemoteConfigDebug = async () => {
    try {
      await resetSwapRemoteConfigControls();
      setRemoteEnabledDraft(false);
      setRemoteUrlDraft('');
      const config = await getSwapWeightsConfig({ userId: userId || null });
      setSwapScoringWeights(config.weights);
      setSwapExperimentBucket(config.bucket);
      setSwapConfigSource(config.source);
    } catch (err) {
      console.error('重置远端配置调试项失败:', err);
    }
  };

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.debugToggleButton}
        onPress={() => setShowDebugPanel((prev) => !prev)}
      >
        <Text style={styles.debugToggleButtonText}>
          {showDebugPanel ? '收起' : '展开'}换菜配置调试面板（开发态）
        </Text>
      </TouchableOpacity>

      {showDebugPanel && (
        <View style={styles.debugPanel}>
          <TouchableOpacity
            style={styles.debugRow}
            onPress={() => setRemoteEnabledDraft((prev) => !prev)}
          >
            <Text style={styles.debugLabel}>启用远端配置</Text>
            <Text style={styles.debugValue}>{remoteEnabledDraft ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <Text style={styles.debugLabel}>远端 URL（可选）</Text>
          <TextInput
            value={remoteUrlDraft}
            onChangeText={setRemoteUrlDraft}
            placeholder="https://example.com/swap-weights.json"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.debugInput}
          />

          <View style={styles.debugActions}>
            <TouchableOpacity style={styles.debugActionBtn} onPress={onApplyRemoteConfigDebug}>
              <Text style={styles.debugActionBtnText}>应用</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.debugActionBtn, styles.debugActionBtnGhost]}
              onPress={onResetRemoteConfigDebug}
            >
              <Text style={styles.debugActionBtnGhostText}>恢复默认</Text>
            </TouchableOpacity>
          </View>

          {/* Debug info display */}
          <View style={styles.debugInfo}>
            <Text style={styles.debugInfoLabel}>
              当前分桶: {swapExperimentBucket} | 配置源: {swapConfigSource}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
  },
  debugToggleButton: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background.card,
  },
  debugToggleButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  debugPanel: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background.card,
    gap: Spacing.sm,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  debugValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  debugInput: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.text.primary,
  },
  debugActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  debugActionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  debugActionBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  debugActionBtnGhost: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  debugActionBtnGhostText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  debugInfo: {
    marginTop: Spacing.xs,
    padding: Spacing.xs,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.sm,
  },
  debugInfoLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
});
