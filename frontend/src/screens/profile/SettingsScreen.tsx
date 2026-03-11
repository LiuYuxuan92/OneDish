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
            Alert.alert('成功', '缓存已清除');
          } catch {
            Alert.alert('错误', '清除缓存失败，请重试');
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

  const summaryCards = [
    {
      label: 'AI 配额',
      value: quota ? `${quota.daily.ai_used}/${quota.daily.ai_limit}` : '加载中',
      helper: '查看今天还能用多少次 AI',
    },
    {
      label: '联网配额',
      value: quota ? `${quota.daily.web_used}/${quota.daily.web_limit}` : '加载中',
      helper: '控制联网搜索与抓取消耗',
    },
    {
      label: '近7天采纳率',
      value: feedbackData ? `${(feedbackData.adoption_rate * 100).toFixed(1)}%` : '暂无数据',
      helper: feedbackData ? `${feedbackData.accepted}/${feedbackData.total || 0} 次被采纳` : '等更多反馈积累后再看',
    },
  ];

  const settings = [
    { icon: '🔔', title: '推送通知', type: 'switch', value: notifications, onValueChange: setNotifications },
    { icon: '🎨', title: '主题', type: 'navigation', value: themePreviews.find((t) => t.mode === themeMode)?.name || '温暖橙', onPress: () => setShowThemeModal(true) },
    { icon: '🤖', title: 'AI 配置', type: 'navigation', onPress: () => navigation.navigate('AISettings') },
    { icon: '🍽️', title: '饮食偏好', type: 'navigation', value: '宝宝月龄 / 食材 / 时间 / 难度', onPress: () => navigation.navigate('PreferenceSettings') },
    { icon: '📊', title: '配额状态', type: 'navigation', value: quota ? `AI ${quota.daily.ai_used}/${quota.daily.ai_limit} · 联网 ${quota.daily.web_used}/${quota.daily.web_limit}` : '点击刷新', onPress: loadQuota },
    { icon: '✅', title: '近7天推荐采纳率', type: 'navigation', value: feedbackData ? `${(feedbackData.adoption_rate * 100).toFixed(1)}% (${feedbackData.accepted}/${feedbackData.total || 0})` : '暂无数据', onPress: () => {} },
    { icon: '🔄', title: '清除缓存', type: 'button', onPress: handleClearCache },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.Colors.background.secondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { backgroundColor: theme.Colors.background.primary }]}> 
          <Text style={styles.eyebrow}>设置中心</Text>
          <Text style={[styles.heroTitle, { color: theme.Colors.text.primary }]}>把主题、配额、偏好和缓存管理收在一个地方</Text>
          <Text style={[styles.heroSubtitle, { color: theme.Colors.text.secondary }]}>这里主要负责全局体验调节，不改业务逻辑，但让关键控制项更容易找到。</Text>
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
          {settings.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.settingItem, { borderBottomColor: theme.Colors.border.light }]}
              onPress={item.onPress}
              disabled={item.type === 'switch'}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, { color: theme.Colors.text.primary }]}>{item.title}</Text>
                  {item.value ? <Text style={[styles.settingSubtitle, { color: theme.Colors.text.secondary }]}>{item.value}</Text> : null}
                </View>
              </View>
              <View style={styles.settingRight}>
                {item.type === 'switch' ? (
                  <Switch
                    value={Boolean(item.value)}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: theme.Colors.neutral.gray300, true: theme.Colors.primary.main }}
                    thumbColor={theme.Colors.background.primary}
                  />
                ) : (
                  <Text style={[styles.settingArrow, { color: theme.Colors.neutral.gray400 }]}>›</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}> 
          <Text style={[styles.sectionTitle, { color: theme.Colors.text.secondary }]}>关于</Text>
          <View style={styles.aboutCard}>
            <Text style={[styles.versionText, { color: theme.Colors.text.primary }]}>简家厨 v1.0.0</Text>
            {quota?.reset_at ? <Text style={[styles.quotaResetText, { color: theme.Colors.text.secondary }]}>配额重置时间：{new Date(quota.reset_at).toLocaleString('zh-CN')}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showThemeModal} transparent animationType="slide" onRequestClose={() => setShowThemeModal(false)}>
        <TouchableOpacity style={styles.themeModalOverlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.themeModalContent, { backgroundColor: theme.Colors.background.primary }]}>
            <View style={styles.themeModalHeader}>
              <Text style={[styles.themeModalTitle, { color: theme.Colors.text.primary }]}>选择主题</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={{ color: theme.Colors.primary.main, fontSize: 16 }}>关闭</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {themePreviews.map((item) => (
                <TouchableOpacity
                  key={item.mode}
                  style={[
                    styles.themeOption,
                    { backgroundColor: theme.Colors.background.secondary },
                    themeMode === item.mode && [styles.themeOptionSelected, { borderColor: theme.Colors.primary.main }],
                  ]}
                  onPress={() => handleThemeSelect(item.mode)}
                >
                  <View style={[styles.themePreview, { backgroundColor: item.backgroundColor }]}> 
                    <View style={{ flex: 1, backgroundColor: item.primaryColor, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
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
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['3xl'] },
  heroCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase', marginBottom: Spacing.xs },
  heroTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, lineHeight: 28 },
  heroSubtitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  summaryCard: { flexGrow: 1, minWidth: '30%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  summaryValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  summaryLabel: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs },
  summaryHelper: { marginTop: 4, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  section: { marginTop: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.xs, padding: Spacing.md, paddingBottom: 0, textTransform: 'uppercase', fontWeight: Typography.fontWeight.semibold },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingTextWrap: { flex: 1 },
  settingIcon: { fontSize: 20, marginRight: 16 },
  settingTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
  settingSubtitle: { fontSize: Typography.fontSize.xs, marginTop: 4 },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  settingArrow: { fontSize: 24 },
  aboutCard: { padding: Spacing.md },
  versionText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
  quotaResetText: { fontSize: Typography.fontSize.xs, marginTop: 4 },
  themeModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  themeModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 40 },
  themeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  themeModalTitle: { fontSize: 18, fontWeight: '600' },
  themeOption: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  themeOptionSelected: { borderWidth: 2 },
  themePreview: { width: 48, height: 48, borderRadius: 12, marginRight: 16 },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  themeDescription: { fontSize: 13 },
  checkIcon: { fontSize: 20 },
});
