// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { quotaApi, QuotaStatus } from '../../api/quota';
import { useRecommendationFeedbackStats } from '../../hooks/useMealPlans';

// 需要清除的缓存键列表
const CACHE_KEYS = [
  '@recipe_filter_prefs',
  '@home_data_cache',
  '@recipe_list_cache',
];

export function SettingsScreen() {
  const { theme, themeMode, setThemeMode, themePreviews, isDark } = useTheme();
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
    Alert.alert(
      '清除缓存',
      '确定要清除缓存数据吗？这不会影响您的登录状态。',
      [
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
            } catch (error) {
              Alert.alert('错误', '清除缓存失败，请重试');
            }
          },
        },
      ]
    );
  };

  const handleThemeSelect = (mode: string) => {
    setThemeMode(mode as any);
    setShowThemeModal(false);
  };

  const settings = [
    { icon: '🔔', title: '推送通知', type: 'switch', value: notifications, onValueChange: setNotifications },
    { icon: '🎨', title: '主题', type: 'navigation', value: themePreviews.find(t => t.mode === themeMode)?.name || '温暖橙', onPress: () => setShowThemeModal(true) },
    { icon: '👨‍👩‍👧', title: '家庭成员', type: 'navigation', onPress: () => {} },
    { icon: '🍽️', title: '饮食偏好', type: 'navigation', onPress: () => {} },
    { icon: '🌐', title: '语言', type: 'navigation', value: '简体中文', onPress: () => {} },
    {
      icon: '📊',
      title: '配额状态',
      type: 'navigation',
      value: quota
        ? `AI ${quota.daily.ai_used}/${quota.daily.ai_limit} · Web ${quota.daily.web_used}/${quota.daily.web_limit}`
        : '加载中...',
      onPress: loadQuota,
    },
    {
      icon: '✅',
      title: '近7天推荐采纳率',
      type: 'navigation',
      value: feedbackStats
        ? `${(feedbackStats.adoption_rate * 100).toFixed(1)}% (${feedbackStats.accepted}/${feedbackStats.total || 0})`
        : '暂无数据',
      onPress: () => {},
    },
    { icon: '🔄', title: '清除缓存', type: 'button', onPress: handleClearCache },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.Colors.background.secondary }]} edges={['bottom']}>
      <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
        {settings.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingItem,
              { borderBottomColor: theme.Colors.border.light }
            ]}
            onPress={item.onPress}
            disabled={item.type === 'switch'}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>{item.icon}</Text>
              <Text style={[styles.settingTitle, { color: theme.Colors.text.primary }]}>{item.title}</Text>
            </View>
            <View style={styles.settingRight}>
              {item.type === 'switch' ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: theme.Colors.neutral.gray300, true: theme.Colors.primary.main }}
                  thumbColor={theme.Colors.background.primary}
                />
              ) : item.value ? (
                <Text style={[styles.settingValue, { color: theme.Colors.text.secondary }]}>{item.value}</Text>
              ) : (
                <Text style={[styles.settingArrow, { color: theme.Colors.neutral.gray400 }]}>›</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}> 
        <Text style={[styles.sectionTitle, { color: theme.Colors.text.secondary }]}>关于</Text>
        <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={[styles.versionText, { color: theme.Colors.text.secondary }]}>简家厨 v1.0.0</Text>
            {quota?.reset_at ? (
              <Text style={[styles.quotaResetText, { color: theme.Colors.text.secondary }]}>配额重置时间：{new Date(quota.reset_at).toLocaleString('zh-CN')}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      {/* 主题选择弹窗 */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.themeModalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.themeModalContent,
              { backgroundColor: theme.Colors.background.primary }
            ]}
          >
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
                    themeMode === item.mode && [
                      styles.themeOptionSelected,
                      { borderColor: theme.Colors.primary.main }
                    ]
                  ]}
                  onPress={() => handleThemeSelect(item.mode)}
                >
                  <View
                    style={[
                      styles.themePreview,
                      { backgroundColor: item.backgroundColor }
                    ]}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: item.primaryColor,
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                      }}
                    />
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: theme.Colors.text.primary }]}>{item.name}</Text>
                    <Text style={[styles.themeDescription, { color: theme.Colors.text.secondary }]}>{item.description}</Text>
                  </View>
                  {themeMode === item.mode && (
                    <Text style={[styles.checkIcon, { color: theme.Colors.primary.main }]}>✓</Text>
                  )}
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
  container: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    padding: 16,
    paddingBottom: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  settingArrow: {
    fontSize: 24,
  },
  versionText: {
    fontSize: 14,
  },
  quotaResetText: {
    fontSize: 12,
    marginTop: 4,
  },
  // 主题选择器样式
  themeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  themeModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  themeOptionSelected: {
    borderWidth: 2,
  },
  themePreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 16,
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
  },
  checkIcon: {
    fontSize: 20,
  },
});
