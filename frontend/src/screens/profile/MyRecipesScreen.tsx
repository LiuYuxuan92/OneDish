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
} from '../../hooks/useUserRecipes';
import { useUserInfo } from '../../hooks/useUsers';
import { RiskHit } from '../../api/userRecipes';

const formatRiskHits = (riskHits: RiskHit[] = []) =>
  riskHits.map((hit) => `• [${hit.level.toUpperCase()}] ${hit.keyword}：${hit.reason}${hit.suggestion ? `（建议：${hit.suggestion}）` : ''}`).join('\n');

const QualityTag = ({ inPool, score }: { inPool?: boolean; score?: number }) => (
  <View style={[styles.qualityTag, inPool ? styles.qualityGood : styles.qualityPending]}>
    <Text style={styles.qualityTagText}>{inPool ? '推荐入池' : '待优化'}{typeof score === 'number' ? ` · ${score}` : ''}</Text>
  </View>
);

export function MyRecipesScreen() {
  const [tab, setTab] = React.useState<'mine' | 'plaza'>('mine');
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

  const createMutation = useCreateUserRecipe();
  const updateMutation = useUpdateUserRecipe();
  const submitMutation = useSubmitUserRecipe();
  const reviewMutation = useReviewUserRecipe();
  const deleteMutation = useDeleteUserRecipe();
  const favMutation = useToggleUserRecipeFavorite();

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]} onPress={() => setTab('mine')}><Text style={styles.tabText}>我的投稿</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'plaza' && styles.tabBtnActive]} onPress={() => setTab('plaza')}><Text style={styles.tabText}>发布广场</Text></TouchableOpacity>
      </View>

      {tab === 'mine' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <View style={styles.qualityRow}><Text style={styles.meta}>状态：{recipe.status}</Text><QualityTag inPool={recipe.in_recommend_pool} score={recipe.quality_score} /></View>
              {recipe.reject_reason ? <Text style={styles.warn}>原因：{recipe.reject_reason}</Text> : null}
              {(recipe.risk_hits || []).length > 0 ? (
                <View style={styles.riskBox}>
                  <Text style={styles.riskTitle}>提审反馈</Text>
                  {(recipe.risk_hits || []).map((hit: RiskHit, idx: number) => (
                    <Text key={`${recipe.id}-risk-${idx}`} style={hit.level === 'block' ? styles.blockText : styles.warnText}>
                      {`[${hit.level.toUpperCase()}] ${hit.keyword}：${hit.reason}${hit.suggestion ? `（建议：${hit.suggestion}）` : ''}`}
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
                  }
                  catch (e: any) {
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
        </ScrollView>
      )}

      {tab === 'plaza' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {plazaLoading ? <ActivityIndicator /> : plazaItems.map((recipe: any) => (
            <View key={recipe.id} style={styles.card}>
              <Text style={styles.title}>{recipe.name}</Text>
              <View style={styles.qualityRow}><Text style={styles.meta}>一菜两吃 · 已发布</Text><QualityTag inPool={recipe.in_recommend_pool} score={recipe.quality_score} /></View>
              <TouchableOpacity style={styles.btn} onPress={() => favMutation.mutate(recipe.id)}>
                <Text style={styles.btnText}>{recipe.is_favorited ? '取消收藏' : '收藏'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  tabs: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  tabBtn: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral.gray100, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary.main },
  tabText: { color: Colors.text.primary, fontWeight: Typography.fontWeight.medium },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  formCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm },
  formTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  formActions: { flexDirection: 'row', gap: Spacing.sm },
  btn: { backgroundColor: Colors.primary.main, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: Colors.neutral.gray100 },
  btnText: { color: '#fff' },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  meta: { marginTop: 4, color: Colors.text.secondary },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  qualityTag: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  qualityGood: { backgroundColor: '#E8F5E9' },
  qualityPending: { backgroundColor: '#F5F5F5' },
  qualityTagText: { fontSize: Typography.fontSize.xs, color: Colors.text.primary },
  warn: { color: Colors.functional.error, marginTop: 4 },
  riskBox: { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, gap: 4 },
  riskTitle: { fontWeight: Typography.fontWeight.medium, color: Colors.text.primary },
  blockText: { color: Colors.functional.error },
  warnText: { color: Colors.functional.warning },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  smallBtn: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
});