import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import {
  useUserRecipes,
  usePublishedUserRecipes,
  useCreateUserRecipe,
  useUpdateUserRecipe,
  useSubmitUserRecipe,
  useDeleteUserRecipe,
  useToggleUserRecipeFavorite,
  useReviewUserRecipe,
  useAdminReviewList,
  useAdminBatchReview,
} from '../../hooks/useUserRecipes';
import { useUserInfo } from '../../hooks/useUsers';
import { RiskHit } from '../../api/userRecipes';

const getRiskLevelLabel = (level?: string) => {
  if (level === 'block') return '拦截';
  if (level === 'warn') return '提醒';
  return level || '提示';
};

const formatRiskHits = (riskHits: RiskHit[] = []) =>
  riskHits.map((hit) => `• [${getRiskLevelLabel(hit.level)}] ${hit.keyword}：${hit.reason}${hit.suggestion ? `（建议：${hit.suggestion}）` : ''}`).join('\n');

const REVIEW_STATUS_LABELS = {
  pending: '待审核',
  rejected: '已拒绝',
  published: '已发布',
} as const;

const getReviewStatusLabel = (status?: string) => REVIEW_STATUS_LABELS[status as keyof typeof REVIEW_STATUS_LABELS] || status || '待确认';

const QualityTag = ({ inPool, score }: { inPool?: boolean; score?: number }) => (
  <View style={[styles.qualityTag, inPool ? styles.qualityGood : styles.qualityPending]}>
    <Text style={styles.qualityTagText}>{inPool ? '推荐入池' : '待优化'}{typeof score === 'number' ? ` · ${score}` : ''}</Text>
  </View>
);

export function MyRecipesScreen() {
  const [tab, setTab] = React.useState<'mine' | 'plaza' | 'admin'>('mine');
  const [adminStatus, setAdminStatus] = React.useState<'pending' | 'rejected' | 'published'>('pending');
  const [batchNote, setBatchNote] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [name, setName] = React.useState('');
  const [adultIngredients, setAdultIngredients] = React.useState('');
  const [babyIngredients, setBabyIngredients] = React.useState('');
  const [babyAgeRange, setBabyAgeRange] = React.useState('');
  const [allergens, setAllergens] = React.useState('');
  const [isOnePot, setIsOnePot] = React.useState(false);
  const [stepBranches, setStepBranches] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: mineData, isLoading } = useUserRecipes();
  const { data: plazaData, isLoading: plazaLoading } = usePublishedUserRecipes();
  const { data: userInfo } = useUserInfo();
  const isAdmin = userInfo?.role === 'admin';
  const { data: adminListData, isLoading: adminLoading } = useAdminReviewList(adminStatus);

  const createMutation = useCreateUserRecipe();
  const updateMutation = useUpdateUserRecipe();
  const submitMutation = useSubmitUserRecipe();
  const reviewMutation = useReviewUserRecipe();
  const deleteMutation = useDeleteUserRecipe();
  const favMutation = useToggleUserRecipeFavorite();
  const batchReviewMutation = useAdminBatchReview();

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAdultIngredients('');
    setBabyIngredients('');
    setBabyAgeRange('');
    setAllergens('');
    setIsOnePot(false);
    setStepBranches('');
  };

  const buildPayload = () => ({
    name,
    source: 'ugc',
    adult_version: { ingredients: adultIngredients.split(/\n|,/).filter(Boolean).map((i) => ({ name: i.trim(), amount: '' })), steps: [] },
    baby_version: { ingredients: babyIngredients.split(/\n|,/).filter(Boolean).map((i) => ({ name: i.trim(), amount: '' })), steps: [] },
    baby_age_range: babyAgeRange.trim() || null,
    allergens: allergens.split(/\n|,/).filter(Boolean).map((s) => s.trim()),
    is_one_pot: isOnePot,
    step_branches: stepBranches.trim() ? [{ note: stepBranches.trim() }] : [],
  });

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('提示', '请填写菜谱名称');
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload: buildPayload() });
      } else {
        await createMutation.mutateAsync(buildPayload());
      }
      resetForm();
      Alert.alert('成功', '草稿已保存');
    } catch {
      Alert.alert('失败', '保存失败');
    }
  };

  const myItems = mineData?.items || [];
  const plazaItems = plazaData?.items || [];
  const summaryCards = [
    { label: '我的投稿', value: `${myItems.length}`, helper: '持续积累自己的双版本菜谱库' },
    { label: '广场已发布', value: `${plazaItems.length}`, helper: '看看大家都在收藏什么菜' },
    { label: '当前视图', value: tab === 'mine' ? '我的投稿' : tab === 'plaza' ? '发布广场' : '审核台', helper: '切换不同入口查看状态' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>我的投稿</Text>
          <Text style={styles.heroTitle}>把你自己的“一菜两吃”沉淀成可复用内容</Text>
          <Text style={styles.heroSubtitle}>这里同时承担草稿、发布广场和审核台入口，方便把 UGC 内容链路串起来。</Text>
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

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]} onPress={() => setTab('mine')}><Text style={styles.tabText}>我的投稿</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'plaza' && styles.tabBtnActive]} onPress={() => setTab('plaza')}><Text style={styles.tabText}>发布广场</Text></TouchableOpacity>
          {isAdmin ? <TouchableOpacity style={[styles.tabBtn, tab === 'admin' && styles.tabBtnActive]} onPress={() => setTab('admin')}><Text style={styles.tabText}>审核台</Text></TouchableOpacity> : null}
        </View>

        {tab === 'mine' && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editingId ? '编辑投稿' : '新建一菜两吃'}</Text>
              <TextInput placeholder="菜谱名称" value={name} onChangeText={setName} style={styles.input} />
              <TextInput placeholder="成人版食材（逗号/换行分隔）" value={adultIngredients} onChangeText={setAdultIngredients} style={[styles.input, styles.multiline]} multiline />
              <TextInput placeholder="宝宝版食材（逗号/换行分隔）" value={babyIngredients} onChangeText={setBabyIngredients} style={[styles.input, styles.multiline]} multiline />
              <TextInput placeholder="月龄范围（如 8-12个月）" value={babyAgeRange} onChangeText={setBabyAgeRange} style={styles.input} />
              <TextInput placeholder="过敏原（逗号/换行分隔）" value={allergens} onChangeText={setAllergens} style={styles.input} />
              <View style={styles.switchRow}><Text>是否一锅出</Text><Switch value={isOnePot} onValueChange={setIsOnePot} /></View>
              <TextInput placeholder="步骤分叉（最小版备注）" value={stepBranches} onChangeText={setStepBranches} style={[styles.input, styles.multiline]} multiline />
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.btn} onPress={onSave}><Text style={styles.btnText}>保存草稿</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={resetForm}><Text>清空</Text></TouchableOpacity>
              </View>
            </View>

            {isLoading ? <ActivityIndicator /> : myItems.map((recipe: any) => (
              <View key={recipe.id} style={styles.card}>
                <Text style={styles.title}>{recipe.name}</Text>
                <View style={styles.qualityRow}><Text style={styles.meta}>状态：{getReviewStatusLabel(recipe.status)}</Text><QualityTag inPool={recipe.in_recommend_pool} score={recipe.quality_score} /></View>
                {recipe.reject_reason ? <Text style={styles.warn}>原因：{recipe.reject_reason}</Text> : null}
                {(recipe.risk_hits || []).length > 0 ? (
                  <View style={styles.riskBox}>
                    <Text style={styles.riskTitle}>提审反馈</Text>
                    {(recipe.risk_hits || []).map((hit: RiskHit, idx: number) => (
                      <Text key={`${recipe.id}-risk-${idx}`} style={hit.level === 'block' ? styles.blockText : styles.warnText}>
                        {`[${getRiskLevelLabel(hit.level)}] ${hit.keyword}：${hit.reason}${hit.suggestion ? `（建议：${hit.suggestion}）` : ''}`}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={styles.row}>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => {
                    setEditingId(recipe.id); setName(recipe.name || '');
                    setAdultIngredients((recipe.adult_version?.ingredients || []).map((i: any) => i.name).join('\n'));
                    setBabyIngredients((recipe.baby_version?.ingredients || []).map((i: any) => i.name).join('\n'));
                    setBabyAgeRange(recipe.baby_age_range || '');
                    setAllergens((recipe.allergens || []).join('\n'));
                    setIsOnePot(Boolean(recipe.is_one_pot));
                    setStepBranches((recipe.step_branches || []).map((x: any) => x?.note || '').join('\n'));
                  }}><Text>编辑</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={async () => {
                    try {
                      await submitMutation.mutateAsync(recipe.id);
                      const warnHits = (recipe?.risk_hits || []).filter((h: RiskHit) => h.level === 'warn');
                      if (warnHits.length > 0) {
                        Alert.alert('已提交审核（含风险提醒）', formatRiskHits(warnHits));
                      } else {
                        Alert.alert('提交成功', '已提交审核');
                      }
                    } catch (e: any) {
                      const msg = e?.response?.data?.message || e?.message || '提交失败';
                      const riskHits = e?.response?.data?.risk_hits || [];
                      if (riskHits.length > 0) {
                        Alert.alert('提交失败（命中拦截规则）', `${msg}\n\n${formatRiskHits(riskHits)}`);
                      } else {
                        Alert.alert('提交失败', msg);
                      }
                    }
                  }}><Text>提交审核</Text></TouchableOpacity>
                  {isAdmin && recipe.status === 'pending' ? (
                    <TouchableOpacity style={styles.smallBtn} onPress={async () => {
                      try { await reviewMutation.mutateAsync({ id: recipe.id, action: 'published' }); Alert.alert('审核成功', '已审核通过'); }
                      catch (e: any) { Alert.alert('审核失败', e?.response?.data?.message || e?.message || '审核失败'); }
                    }}><Text>审核通过</Text></TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.smallBtn} onPress={() => deleteMutation.mutate(recipe.id)}><Text>删除</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'admin' && isAdmin && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>投稿审核列表</Text>
              <View style={styles.row}>
                {(['pending', 'rejected', 'published'] as const).map((s) => (
                  <TouchableOpacity key={s} style={[styles.smallBtn, adminStatus === s && styles.tabBtnActive]} onPress={() => { setAdminStatus(s); setSelectedIds([]); }}>
                    <Text>{getReviewStatusLabel(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="审核备注（批量拒绝建议填写）" value={batchNote} onChangeText={setBatchNote} style={styles.input} />
              <View style={styles.row}>
                <TouchableOpacity style={styles.btn} onPress={() => batchReviewMutation.mutate({ ids: selectedIds, action: 'published', note: batchNote })}><Text style={styles.btnText}>批量通过</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={() => batchReviewMutation.mutate({ ids: selectedIds, action: 'rejected', note: batchNote })}><Text style={styles.btnText}>批量拒绝</Text></TouchableOpacity>
              </View>
            </View>

            {adminLoading ? <ActivityIndicator /> : (adminListData?.items || []).map((recipe: any) => {
              const selected = selectedIds.includes(recipe.id);
              return (
                <TouchableOpacity key={recipe.id} style={styles.card} onPress={() => setSelectedIds((prev) => selected ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id])}>
                  <Text style={styles.title}>{selected ? '☑' : '☐'} {recipe.name}</Text>
                  <Text style={styles.meta}>状态：{getReviewStatusLabel(recipe.status)}</Text>
                  {recipe.reject_reason ? <Text style={styles.warn}>备注：{recipe.reject_reason}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {tab === 'plaza' && (
          <>
            {plazaLoading ? <ActivityIndicator /> : plazaItems.map((recipe: any) => (
              <View key={recipe.id} style={styles.card}>
                <Text style={styles.title}>{recipe.name}</Text>
                <View style={styles.qualityRow}><Text style={styles.meta}>一菜两吃 · 已发布</Text><QualityTag inPool={recipe.in_recommend_pool} score={recipe.quality_score} /></View>
                <TouchableOpacity style={styles.btn} onPress={() => favMutation.mutate(recipe.id)}>
                  <Text style={styles.btnText}>{recipe.is_favorited ? '取消收藏' : '收藏'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing['3xl'] },
  heroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase', marginBottom: Spacing.xs },
  heroTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, lineHeight: 28 },
  heroSubtitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  summaryCard: { flexGrow: 1, minWidth: '30%', backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md },
  summaryValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summaryLabel: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  summaryHelper: { marginTop: 4, fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: Spacing.sm },
  tabBtn: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background.primary, alignItems: 'center', ...Shadows.sm },
  tabBtnActive: { backgroundColor: Colors.primary.main },
  tabText: { color: Colors.text.primary, fontWeight: Typography.fontWeight.medium },
  formCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.md, ...Shadows.sm },
  formTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm, color: Colors.text.primary },
  input: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, color: Colors.text.primary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  formActions: { flexDirection: 'row', gap: Spacing.sm },
  btn: { backgroundColor: Colors.primary.main, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: Colors.background.secondary },
  btnText: { color: '#fff', fontWeight: Typography.fontWeight.semibold },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.md, ...Shadows.sm },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  meta: { marginTop: 4, color: Colors.text.secondary },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  qualityTag: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  qualityGood: { backgroundColor: '#E8F5E9' },
  qualityPending: { backgroundColor: '#F5F5F5' },
  qualityTagText: { fontSize: Typography.fontSize.xs, color: Colors.text.primary },
  warn: { color: Colors.functional.error, marginTop: 4 },
  riskBox: { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, gap: 4 },
  riskTitle: { fontWeight: Typography.fontWeight.medium, color: Colors.text.primary },
  blockText: { color: Colors.functional.error },
  warnText: { color: Colors.functional.warning },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  smallBtn: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
});
