import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { useBillingFeatureMatrix, useBillingProducts, useBillingSummary } from '../../hooks/useBilling';
import { billingApi, BillingProductCode } from '../../api/billing';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_LABELS: Record<string, string> = {
  core_ai: '核心 AI 能力',
  sync: '跨端同步权益',
  inventory: '高级管理能力',
  insight: '洞察与复盘',
  family: '家庭协作',
  cooking: '烹饪体验',
};

const CATEGORY_ORDER = ['core_ai', 'sync', 'inventory', 'insight', 'family', 'cooking'];

type Props = NativeStackScreenProps<ProfileStackParamList, 'Membership'>;

function formatDate(dateStr?: string | null) {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function MembershipScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const productsQuery = useBillingProducts();
  const matrixQuery = useBillingFeatureMatrix('app');
  const summaryQuery = useBillingSummary('app');
  const [devActionLoading, setDevActionLoading] = useState(false);

  const selectedProduct = useMemo(() => {
    const products = productsQuery.data || [];
    return products.find((item) => item.code === 'growth_monthly_1990') || products[0] || null;
  }, [productsQuery.data]);

  const activeEntitlement = summaryQuery.data?.active_entitlements?.[0] || null;
  const quotaCards = summaryQuery.data?.quota_summary || [];

  const featureGroups = useMemo(() => {
    const features = matrixQuery.data || summaryQuery.data?.feature_matrix || [];
    const grouped = new Map<string, typeof features>();

    features.forEach((item) => {
      const key = item.category || 'core_ai';
      const list = grouped.get(key) || [];
      list.push(item);
      grouped.set(key, list);
    });

    return CATEGORY_ORDER.filter((key) => grouped.has(key)).map((key) => ({
      key,
      title: CATEGORY_LABELS[key] || '会员权益',
      items: grouped.get(key) || [],
    }));
  }, [matrixQuery.data, summaryQuery.data?.feature_matrix]);

  const isLoading =
    authLoading ||
    productsQuery.isLoading ||
    matrixQuery.isLoading ||
    (isAuthenticated && summaryQuery.isLoading);
  const showDevTools = isAuthenticated && __DEV__;

  async function runDevAction(action: () => Promise<any>, successMessage: string) {
    if (!isAuthenticated) {
      Alert.alert('请先登录', '登录后才能使用测试会员工具。');
      return;
    }

    setDevActionLoading(true);
    try {
      await action();
      await summaryQuery.refetch();
      Alert.alert('测试操作成功', successMessage);
    } catch (error: any) {
      Alert.alert('测试操作失败', error?.message || '请稍后重试');
    } finally {
      setDevActionLoading(false);
    }
  }

  function grantDevProduct(productCode: BillingProductCode, label: string) {
    runDevAction(
      () => billingApi.devGrantProduct(productCode).then((res) => res.data || res),
      `${label} 已发放到当前账号。`,
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.Colors.background.secondary }]} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.Colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.Colors.text.secondary }]}>正在加载会员信息...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.Colors.background.secondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, activeEntitlement ? styles.heroCardActive : null]}>
          <Text style={styles.heroKicker}>{activeEntitlement ? 'MEMBERSHIP ACTIVE' : 'GROWTH MEMBERSHIP'}</Text>
          <Text style={styles.heroTitle}>{activeEntitlement ? '成长会员已开通' : '成长会员在 App 解锁更完整的家庭厨房体验'}</Text>
          <Text style={styles.heroSubtitle}>
            {activeEntitlement
              ? `当前有效期至 ${formatDate(activeEntitlement.ends_at)}`
              : '同一会员账号，小程序负责轻量决策，App 承担完整的库存、协作、复盘和 AI 能力。'}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{selectedProduct ? `¥${selectedProduct.price_yuan}/月` : '查看方案'}</Text>
              <Text style={styles.heroMetaLabel}>推荐档位</Text>
            </View>
            <View style={[styles.heroMetaCard, styles.heroMetaCardSoft]}>
              <Text style={styles.heroMetaValue}>{activeEntitlement ? '权益生效中' : '待开通'}</Text>
              <Text style={styles.heroMetaLabel}>当前状态</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.86}
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert('请先登录', '登录后可同步查看成长会员权益。');
                return;
              }
              Alert.alert(
                selectedProduct?.name || '成长会员',
                selectedProduct
                  ? `当前支付链路仍在接入中。推荐档位：¥${selectedProduct.price_yuan}`
                  : '当前支付链路仍在接入中。',
              );
            }}
          >
            <Text style={styles.heroButtonText}>{activeEntitlement ? '续费会员' : '查看购买方案'}</Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated && quotaCards.length ? (
          <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>本期剩余次数</Text>
              <Text style={[styles.sectionDesc, { color: theme.Colors.text.secondary }]}>把关键 AI 与计划额度先看清楚。</Text>
            </View>

            <View style={styles.summaryRow}>
              {quotaCards.map((item) => (
                <View key={item.feature_code} style={[styles.summaryCard, { backgroundColor: theme.Colors.background.secondary }]}>
                  <Text style={[styles.summaryValue, { color: theme.Colors.primary.dark }]}>
                    {item.remaining_quota}/{item.total_quota}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.Colors.text.primary }]}>
                    {item.feature_code === 'ai_baby_recipe'
                      ? '宝宝版 AI 改写'
                      : item.feature_code === 'weekly_plan_from_prompt'
                        ? '自然语言周计划'
                        : item.feature_code === 'smart_recommendation'
                          ? '智能推荐 / 换菜'
                          : item.feature_code}
                  </Text>
                  <Text style={[styles.summaryHelper, { color: theme.Colors.text.secondary }]}>
                    {item.reset_modes?.includes('period') ? '会员周期内可用' : '按包消耗'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>App 会员权益</Text>
            <Text style={[styles.sectionDesc, { color: theme.Colors.text.secondary }]}>把权益按能力分组，不让整页看起来像一串条款。</Text>
          </View>

          {featureGroups.map((group) => (
            <View key={group.key} style={styles.groupBlock}>
              <Text style={[styles.groupTitle, { color: theme.Colors.text.secondary }]}>{group.title}</Text>
              {group.items.map((item) => (
                <View
                  key={item.feature_code}
                  style={[
                    styles.featureCard,
                    { backgroundColor: item.app_only_value ? theme.Colors.background.tertiary : theme.Colors.background.secondary },
                  ]}
                >
                  <View style={styles.featureHeader}>
                    <Text style={[styles.featureTitle, { color: theme.Colors.text.primary }]}>{item.display_name}</Text>
                    <View
                      style={[
                        styles.featureTag,
                        { backgroundColor: item.access_policy === 'member_quota' ? Colors.primary.main : Colors.secondary.main },
                      ]}
                    >
                      <Text style={styles.featureTagText}>
                        {item.access_policy === 'member_quota' ? '次数权益' : item.app_only_value ? 'App 完整体验' : '会员权益'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.featureDesc, { color: theme.Colors.text.secondary }]}>{item.description}</Text>
                  <Text style={[styles.featureExtra, { color: theme.Colors.text.tertiary }]}>
                    {item.upsell_copy || '同一会员账号可在小程序和 App 同步权益。'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {summaryQuery.data?.recent_orders?.length ? (
          <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>最近订单</Text>
            </View>
            {summaryQuery.data.recent_orders.slice(0, 3).map((order) => (
              <View key={order.id} style={styles.orderRow}>
                <Text style={[styles.orderTitle, { color: theme.Colors.text.primary }]}>
                  {order.metadata?.product_name || order.product_code}
                </Text>
                <Text style={[styles.orderDesc, { color: theme.Colors.text.secondary }]}>
                  {order.status === 'paid' ? '已支付' : '待支付'} · ¥{order.amount_yuan}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {showDevTools ? (
          <View style={[styles.section, styles.devSection, { backgroundColor: theme.Colors.background.primary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>开发测试工具</Text>
              <Text style={[styles.sectionDesc, { color: theme.Colors.text.secondary }]}>仅开发环境显示，用来反复验证会员与额度链路。</Text>
            </View>

            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={[styles.devButton, styles.devButtonPrimary]}
                disabled={devActionLoading}
                onPress={() => grantDevProduct('growth_monthly_1990', '月卡')}
              >
                <Text style={styles.devButtonPrimaryText}>{devActionLoading ? '处理中...' : '一键开月卡'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                disabled={devActionLoading}
                onPress={() => grantDevProduct('growth_quarterly_4900', '季卡')}
              >
                <Text style={styles.devButtonText}>一键开季卡</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={styles.devButton}
                disabled={devActionLoading}
                onPress={() => grantDevProduct('ai_baby_pack_20_990', '宝宝 AI 加油包')}
              >
                <Text style={styles.devButtonText}>发宝宝 AI 包</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                disabled={devActionLoading}
                onPress={() =>
                  runDevAction(
                    () =>
                      billingApi
                        .devResetQuotas(['ai_baby_recipe', 'weekly_plan_from_prompt', 'smart_recommendation'])
                        .then((res) => res.data || res),
                    '所有 AI 测试额度已重置。',
                  )
                }
              >
                <Text style={styles.devButtonText}>重置全部额度</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.devButton, styles.devButtonDanger]}
              disabled={devActionLoading}
              onPress={() =>
                Alert.alert('清空测试权益？', '会将当前账号的会员与测试额度都置为失效，便于重新走购买流程。', [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '确认清空',
                    style: 'destructive',
                    onPress: () =>
                      runDevAction(
                        () => billingApi.devClearBenefits().then((res) => res.data || res),
                        '当前账号的测试权益已清空。',
                      ),
                  },
                ])
              }
            >
              <Text style={styles.devButtonDangerText}>清空测试权益</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: theme.Colors.background.primary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.Colors.text.primary }]}>说明</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, { color: theme.Colors.text.primary }]}>会员跨端通用</Text>
            <Text style={[styles.infoText, { color: theme.Colors.text.secondary }]}>
              成长会员绑定账号，同一账号登录小程序和 App 都能享受对应权益。
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, { color: theme.Colors.text.primary }]}>为什么 App 功能更多？</Text>
            <Text style={[styles.infoText, { color: theme.Colors.text.secondary }]}>
              App 更适合库存管理、家庭协作、周复盘和烹饪模式，小程序则更适合快速决策。
            </Text>
          </View>
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.linkButtonText, { color: theme.Colors.primary.main }]}>继续完善偏好与账号设置</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['3xl'], gap: Spacing.md },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  loadingText: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm },
  heroCard: {
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    backgroundColor: '#2F4338',
    ...Shadows.md,
  },
  heroCardActive: {
    backgroundColor: '#4A5F53',
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: Spacing.sm,
    color: Colors.neutral.white,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    color: 'rgba(255,255,255,0.84)',
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroMetaCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroMetaCardSoft: {
    backgroundColor: 'rgba(255,245,232,0.14)',
  },
  heroMetaValue: {
    color: Colors.neutral.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  heroMetaLabel: {
    marginTop: Spacing.xs,
    color: 'rgba(255,255,255,0.72)',
    fontSize: Typography.fontSize.xs,
  },
  heroButton: {
    marginTop: Spacing.lg,
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  heroButtonText: {
    color: Colors.primary.dark,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  section: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    ...Shadows.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryCard: { minWidth: '30%', flexGrow: 1, borderRadius: BorderRadius.xl, padding: Spacing.md },
  summaryValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  summaryLabel: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  summaryHelper: { marginTop: 4, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  groupBlock: { marginBottom: Spacing.md },
  groupTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  featureCard: { borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  featureTitle: { flex: 1, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  featureTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  featureTagText: { color: Colors.neutral.white, fontSize: Typography.fontSize['2xs'], fontWeight: Typography.fontWeight.bold },
  featureDesc: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  featureExtra: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  orderRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  orderTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
  orderDesc: { marginTop: 4, fontSize: Typography.fontSize.xs },
  devSection: { borderWidth: 1, borderColor: '#D8D0C3', borderStyle: 'dashed' },
  devButtonRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  devButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#F3EEE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonPrimary: { backgroundColor: Colors.primary.main },
  devButtonDanger: { backgroundColor: '#F9ECE9', marginTop: Spacing.xs },
  devButtonText: { color: Colors.primary.dark, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  devButtonPrimaryText: { color: Colors.neutral.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  devButtonDangerText: { color: '#A14E42', fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  infoBlock: { marginBottom: Spacing.md },
  infoTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  infoText: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  linkButton: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  linkButtonText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
});
