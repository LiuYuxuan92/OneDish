import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useUserInfo, useUpdateUserInfo } from '../../hooks/useUsers';

interface EditProfileScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
}

export function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { data: user, isLoading } = useUserInfo();
  const updateMutation = useUpdateUserInfo();
  const [familySize, setFamilySize] = useState('');
  const [babyAge, setBabyAge] = useState('');

  React.useEffect(() => {
    if (user) {
      setFamilySize(user.family_size?.toString() || '');
      setBabyAge(user.baby_age?.toString() || '');
    }
  }, [user]);

  const handleSave = async () => {
    const familySizeNum = familySize ? parseInt(familySize, 10) : undefined;
    const babyAgeNum = babyAge ? parseInt(babyAge, 10) : undefined;

    if (familySize && (Number.isNaN(familySizeNum) || (familySizeNum ?? 0) < 1)) {
      Alert.alert('提示', '家庭人数必须大于 0');
      return;
    }
    if (babyAge && (Number.isNaN(babyAgeNum) || (babyAgeNum ?? 0) < 0)) {
      Alert.alert('提示', '宝宝月龄不能为负数');
      return;
    }

    try {
      await updateMutation.mutateAsync({ family_size: familySizeNum, baby_age: babyAgeNum });
      navigation.goBack();
    } catch (saveError) {
      console.error('保存失败:', saveError);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>编辑资料</Text>
            <Text style={styles.heroTitle}>把家庭规模和宝宝阶段补齐，推荐会更贴近你家节奏</Text>
            <Text style={styles.heroSubtitle}>这里先聚焦最影响推荐质量的核心信息：家庭人数和宝宝月龄。</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{familySize || '--'}</Text>
                <Text style={styles.summaryLabel}>家庭人数</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{babyAge ? `${babyAge} 月` : '--'}</Text>
                <Text style={styles.summaryLabel}>宝宝月龄</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{user?.username || '--'}</Text>
                <Text style={styles.summaryLabel}>当前账号</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本信息</Text>

            <View style={styles.field}>
              <Text style={styles.label}>用户名</Text>
              <View style={styles.readOnlyField}><Text style={styles.readOnlyText}>{user?.username || ''}</Text></View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>邮箱</Text>
              <View style={styles.readOnlyField}><Text style={styles.readOnlyText}>{user?.email || ''}</Text></View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>家庭人数</Text>
              <TextInput
                style={styles.input}
                value={familySize}
                onChangeText={setFamilySize}
                placeholder="请输入家庭人数"
                keyboardType="number-pad"
                placeholderTextColor={Colors.text.disabled}
              />
              <Text style={styles.hint}>用于计算食材份量和周计划餐次规模</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>宝宝月龄</Text>
              <TextInput
                style={styles.input}
                value={babyAge}
                onChangeText={setBabyAge}
                placeholder="请输入宝宝月龄（如没有可留空）"
                keyboardType="number-pad"
                placeholderTextColor={Colors.text.disabled}
              />
              <Text style={styles.hint}>用于推荐适合的菜谱与一菜两吃改造方式</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={updateMutation.isPending}>
              <Text style={styles.saveButtonText}>{updateMutation.isPending ? '保存中...' : '保存'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()} disabled={updateMutation.isPending}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['3xl'] },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase', marginBottom: Spacing.xs },
  heroTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, lineHeight: 28 },
  heroSubtitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  summaryCard: { flexGrow: 1, minWidth: '30%', backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md },
  summaryValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summaryLabel: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  section: { marginTop: Spacing.md, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: Typography.fontSize.base, color: Colors.text.primary },
  readOnlyField: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  readOnlyText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary },
  hint: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, marginTop: Spacing.xs },
  buttonContainer: { gap: Spacing.sm, marginTop: Spacing.md },
  button: { paddingVertical: Spacing.md, borderRadius: BorderRadius.full, alignItems: 'center' },
  saveButton: { backgroundColor: Colors.primary.main },
  saveButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.inverse },
  cancelButton: { backgroundColor: Colors.background.primary, ...Shadows.sm },
  cancelButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
});
