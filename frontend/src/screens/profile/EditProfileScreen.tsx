// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing } from '../../styles/theme';
import { useUserInfo, useUpdateUserInfo } from '../../hooks/useUsers';

interface EditProfileScreenProps {
  navigation: StackNavigationProp<ProfileStackParamList, 'EditProfile'>;
}

export function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { data: user, isLoading } = useUserInfo();
  const updateMutation = useUpdateUserInfo();

  const [familySize, setFamilySize] = useState('');
  const [babyAge, setBabyAge] = useState('');

  // 当用户数据加载后更新表单
  React.useEffect(() => {
    if (user) {
      setFamilySize(user.family_size?.toString() || '');
      setBabyAge(user.baby_age?.toString() || '');
    }
  }, [user]);

  const handleSave = async () => {
    const familySizeNum = familySize ? parseInt(familySize, 10) : undefined;
    const babyAgeNum = babyAge ? parseInt(babyAge, 10) : undefined;

    if (familySize && (isNaN(familySizeNum) || familySizeNum < 1)) {
      Alert.alert('提示', '家庭人数必须大于0');
      return;
    }

    if (babyAge && (isNaN(babyAgeNum) || babyAgeNum < 0)) {
      Alert.alert('提示', '宝宝月龄不能为负数');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        family_size: familySizeNum,
        baby_age: babyAgeNum,
      });
      navigation.goBack();
    } catch (error) {
      console.error('保存失败:', error);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>基本信息</Text>

          <View style={styles.section}>
            <View style={styles.field}>
              <Text style={styles.label}>用户名</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{user?.username || ''}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>邮箱</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{user?.email || ''}</Text>
              </View>
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
              <Text style={styles.hint}>用于计算食材份量</Text>
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
              <Text style={styles.hint}>用于推荐适合的菜谱</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.saveButtonText}>
                {updateMutation.isPending ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  readOnlyField: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  readOnlyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary.main,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  cancelButton: {
    backgroundColor: Colors.neutral.gray200,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
});
