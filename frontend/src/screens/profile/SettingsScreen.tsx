import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { quotaApi, QuotaStatus } from '../../api/quota';
import { useRecommendationFeedbackStats } from '../../hooks/useMealPlans';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

const CACHE_KEYS = ['@recipe_filter_prefs', '@home_data_cache', '@recipe_list_cache'];

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

interface SettingItem {
  title: string;
  description?: string;
  value?: string;
  type: 'switch' | 'navigation' | 'button';
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  currentValue?: boolean;
}

export function SettingsScreen({ navigation }: Props) {
  const { theme, themeMode, setThemeMode, themePreviews } = useTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [quota, setQuota] = React.useState<QuotaStatus | null>(null);
  const { data: feedbackStats } = useRecommendationFeedbackStats(7);

  const loadQuota = React.useCallback(async () => {
    const data = await quotaApi.getStatus();
    setQuota(data);
  }, []);

  React.useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  const handleClearCache = async () => {
    Alert.alert('清除缓存', '确定要清除缓存数据吗？这不会影响登录状态。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const key of CACHE_KEYS) {
              await AsyncStorage.removeItem(key);
            }
            Alert.alert('已清除', '缓存数据已经清空。');
          } catch {
            Alert.alert('清除失败', '请稍后再试。');
          }
        },
      },
    ]);
  };

  const handleThemeSelect = (mode: string) => {
    setThemeMode(mode as any);
    setShowThemeModal(false);
  };

  const feedbackData = feedbackStats?.data;
  const themeName = themePreviews.find((item) => item.mode === themeMode)?.name || 'Warm';

  const summaryCards = [
    {
      label: 'AI 配额',
      value: quota ? `${quota.daily.ai_used}/${quota.daily.ai_limit}` : '加载中',
      helper: '今天还能用多少次 AI',
    },
    {
      label: '联网配额',
      value: quota ? `${quota.daily.web_used}/${quota.daily.web_limit}` : '加载中',
      helper: '联网搜索与抓取的消耗',
    },
    {
      label: '近 7 天采纳率',
      value: feedbackData ? `${(feedbackData.adoption_rate * 100).toFixed(1)}%` : '暂无数据',
      helper: feedbackData ? `${feedbackData.accepted}/${feedbackData.total || 0} 次被采纳` : '等更多反馈后再看',
    },
  ];

  const settings: SettingItem[] = [
    {
      title: '推送通知',
      description: '重要提醒和阶段更新通知',
      type: 'switch',
      currentValue: notifications,
      onValueChange: setNotifications,
    },
    {
      title: '主题',
      description: '调整整体色调与观感',
      value: themeName,
      type: 'navigation',
      onPress: () => setShowThemeModal(true),
    },
    {
      title: 'AI 配置',
      description: '控制 AI 生成和推荐偏好',
      type: 'navigation',
      onPress: () => navigation.navigate('AISettings'),
    },
    {
      title: '饮食偏好',
      description: '宝宝月龄、食材、时间和难度',
      type: 'navigation',
      onPress: () => navigation.navigate('PreferenceSettings'),
    },
    {
      title: '配额状态',
      description: '查看并刷新今天的 AI 与联网额度',
      value: quota ? `AI ${quota.daily.ai_used}/${quota.daily.ai_limit} · 联网 ${quota.daily.web_used}/${quota.daily.web_limit}` : '点击刷新',
      type: 'navigation',
      onPress: loadQuota,
    },
    {
      title: '清除缓存',
      description: '清掉搜索和列表缓存，不影响登录',
      type: 'button',
      onPress: handleClearCache,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.Colors.background.secondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme.Colors.background.primary }]}>
          <Text style={styles.heroKicker}>SETTINGS</Text>
          <Text style={[styles.heroTitle, { color: theme.Colors.text.primary }]}>把主题、配额和偏好收进一个清晰的控制台</Text>
          <Text style={[styles.heroSubtitle, { color: theme.Colors.text.secondary }]}>这里只放真正影响整体体验的控制项，不把页面做成密密麻麻的开关墙。</Text>

          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.label} style={[styles.summaryCard, { backgroundColor: theme.Colors.background.secondary }]}>
                <Text style={[styles.summaryValue, { color: theme.Colors.text.primary }]}>{card.value}</Text>
                <Text style={[styles.summaryLabel, { color: theme.Colors.text.secondary }]}>{card.label}</Text>
                <Text style={[styles.summaryHelper, { color: theme.Colors.text.tertiary }]}>{card.helper}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>主要控制项</Text>
            <Text style={[styles.sectionDesc, { color: theme.Colors.text.secondary }]}>优先保留最常动到的设置。</Text>
          </View>

          {settings.map((item, index) => (
            <TouchableOpacity
              key={`${item.title}-${index}`}
              style={[styles.settingItem, { borderBottomColor: theme.Colors.border.light }]}
              onPress={item.onPress}
              disabled={item.type === 'switch'}
              activeOpacity={0.78}
            >
              <View style={styles.settingCopy}>
                <Text style={[styles.settingTitle, { color: theme.Colors.text.primary }]}>{item.title}</Text>
                {item.description ? <Text style={[styles.settingDescription, { color: theme.Colors.text.secondary }]}>{item.description}</Text> : null}
                {item.value ? <Text style={[styles.settingValue, { color: theme.Colors.primary.main }]}>{item.value}</Text> : null}
              </View>

              {item.type === 'switch' ? (
                <Switch
                  value={Boolean(item.currentValue)}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: theme.Colors.neutral.gray300, true: theme.Colors.primary.main }}
                  thumbColor={theme.Colors.background.primary}
                />
              ) : (
                <Text style={[styles.settingArrow, { color: theme.Colors.text.tertiary }]}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>关于</Text>
            <Text style={[styles.sectionDesc, { color: theme.Colors.text.secondary }]}>版本和配额重置时间。</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={[styles.versionText, { color: theme.Colors.text.primary }]}>简家厨 v1.0.0</Text>
            {quota?.reset_at ? (
              <Text style={[styles.quotaResetText, { color: theme.Colors.text.secondary }]}>
                配额重置时间：{new Date(quota.reset_at).toLocaleString('zh-CN')}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showThemeModal} transparent animationType="slide" onRequestClose={() => setShowThemeModal(false)}>
        <TouchableOpacity style={styles.themeModalOverlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.themeModalContent, { backgroundColor: theme.Colors.background.primary }]}>
            <View style={styles.themeModalHeader}>
              <Text style={[styles.themeModalTitle, { color: theme.Colors.text.primary }]}>选择主题</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[styles.closeText, { color: theme.Colors.primary.main }]}>关闭</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {themePreviews.map((item) => (
                <TouchableOpacity
                  key={item.mode}
                  style={[
                    styles.themeOption,
                    { backgroundColor: theme.Colors.background.secondary },
                    themeMode === item.mode && [styles.themeOptionSelected, { borderColor: theme.Colors.primary.main }],
                  ]}
                  onPress={() => handleThemeSelect(item.mode)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.themePreview, { backgroundColor: item.backgroundColor }]}>
                    <View style={[styles.themePreviewTop, { backgroundColor: item.primaryColor }]} />
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: theme.Colors.text.primary }]}>{item.name}</Text>
                    <Text style={[styles.themeDescription, { color: theme.Colors.text.secondary }]}>{item.description}</Text>
                  </View>
                  {themeMode === item.mode ? <Text style={[styles.checkIcon, { color: theme.Colors.primary.main }]}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['3xl'], gap: Spacing.md },
  heroCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  heroKicker: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 30,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
  },
  summaryHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  section: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  settingCopy: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  settingDescription: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    lineHeight: 19,
  },
  settingValue: {
    marginTop: 6,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  settingArrow: {
    fontSize: 24,
  },
  aboutCard: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  versionText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  quotaResetText: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
  },
  themeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 25, 22, 0.5)',
    justifyContent: 'flex-end',
  },
  themeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '78%',
  },
  themeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  themeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  themeOptionSelected: {
    borderWidth: 2,
  },
  themePreview: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 16,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  themePreviewTop: {
    height: 20,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkIcon: {
    fontSize: 20,
  },
});
