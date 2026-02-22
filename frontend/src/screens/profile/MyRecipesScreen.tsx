import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
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
} from '../../hooks/useUserRecipes';

export function MyRecipesScreen() {
  const [tab, setTab] = React.useState<'mine' | 'plaza'>('mine');
  const [name, setName] = React.useState('');
  const [adultIngredients, setAdultIngredients] = React.useState('');
  const [babyIngredients, setBabyIngredients] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: mineData, isLoading } = useUserRecipes();
  const { data: plazaData, isLoading: plazaLoading } = usePublishedUserRecipes();
  const createMutation = useCreateUserRecipe();
  const updateMutation = useUpdateUserRecipe();
  const submitMutation = useSubmitUserRecipe();
  const deleteMutation = useDeleteUserRecipe();
  const favMutation = useToggleUserRecipeFavorite();

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAdultIngredients('');
    setBabyIngredients('');
  };

  const buildPayload = () => ({
    name,
    source: 'ugc',
    adult_version: { ingredients: adultIngredients.split(/\n|,/).filter(Boolean).map((i) => ({ name: i.trim(), amount: '' })), steps: [] },
    baby_version: { ingredients: babyIngredients.split(/\n|,/).filter(Boolean).map((i) => ({ name: i.trim(), amount: '' })), steps: [] },
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
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.btn} onPress={onSave}><Text style={styles.btnText}>保存草稿</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={resetForm}><Text>清空</Text></TouchableOpacity>
            </View>
          </View>

          {isLoading ? <ActivityIndicator /> : myItems.map((recipe: any) => (
            <View key={recipe.id} style={styles.card}>
              <Text style={styles.title}>{recipe.name}</Text>
              <Text style={styles.meta}>状态：{recipe.status}</Text>
              {recipe.reject_reason ? <Text style={styles.warn}>驳回原因：{recipe.reject_reason}</Text> : null}
              <View style={styles.row}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => {
                  setEditingId(recipe.id); setName(recipe.name || '');
                  setAdultIngredients((recipe.adult_version?.ingredients || []).map((i: any) => i.name).join('\n'));
                  setBabyIngredients((recipe.baby_version?.ingredients || []).map((i: any) => i.name).join('\n'));
                }}><Text>编辑</Text></TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={() => submitMutation.mutate(recipe.id)}><Text>提交审核</Text></TouchableOpacity>
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
              <Text style={styles.meta}>一菜两吃 · 已发布</Text>
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
  formActions: { flexDirection: 'row', gap: Spacing.sm },
  btn: { backgroundColor: Colors.primary.main, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: Colors.neutral.gray100 },
  btnText: { color: '#fff' },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  meta: { marginTop: 4, color: Colors.text.secondary },
  warn: { color: Colors.functional.error, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  smallBtn: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
});
