import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useUserInfo, useUpdateUserInfo } from '../../hooks/useUsers';
import { useUploadImage } from '../../hooks/useUploads';
import { API_BASE_URL } from '../../api/client';
import { resolveMediaUrl } from '../../utils/media';

interface EditProfileScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
}

interface SelectedAvatar {
  uri: string;
  name: string;
  type: string;
  file?: File;
}

export function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { data: user, isLoading } = useUserInfo();
  const updateMutation = useUpdateUserInfo();
  const uploadMutation = useUploadImage();
  const webFileInputRef = useRef<any>(null);
  const [familySize, setFamilySize] = useState('');
  const [babyAge, setBabyAge] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFamilySize(user.family_size?.toString() || '');
      setBabyAge(user.baby_age?.toString() || '');
    }
  }, [user]);

  const userName = user?.username || '新手爸妈';
  const avatarText = userName.trim().slice(0, 1) || '家';
  const currentAvatarUrl = resolveMediaUrl(user?.avatar_url);
  const previewAvatarUrl = selectedAvatar?.uri || currentAvatarUrl;
  const isSavingProfile = updateMutation.isPending;
  const isSubmitting = isUploadingAvatar || isSavingProfile;
  const saveButtonText = useMemo(() => {
    if (isUploadingAvatar) return '上传头像中...';
    if (isSavingProfile) return '保存中...';
    return '保存';
  }, [isSavingProfile, isUploadingAvatar]);

  const buildUploadFileName = (uri: string, mimeType: string) => {
    const normalizedUri = String(uri || '').trim();
    const uriName = normalizedUri.split('/').pop()?.split('?')[0];
    if (uriName) return uriName;

    const extFromMime = mimeType.split('/')[1] || 'jpg';
    return `avatar.${extFromMime}`;
  };

  const handleWebFileChange = (event: any) => {
    const input = event.target as any;
    const file = input.files?.[0];
    if (!file) return;

    const mimeType = file.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      Alert.alert('提示', '目前仅支持 JPG、PNG、WebP 图片');
      input.value = '';
      return;
    }

    setSelectedAvatar({
      uri: URL.createObjectURL(file),
      name: file.name || buildUploadFileName(file.name, mimeType),
      type: mimeType,
      file,
    });
    input.value = '';
  };

  const pickAvatar = async () => {
    if (Platform.OS === 'web') {
      webFileInputRef.current?.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        Alert.alert('提示', '目前仅支持 JPG、PNG、WebP 图片');
        return;
      }

      setSelectedAvatar({
        uri: asset.uri,
        name: asset.fileName || buildUploadFileName(asset.uri, mimeType),
        type: mimeType,
      });
    } catch (error) {
      console.error('选择头像失败:', error);
      Alert.alert('提示', '选择头像失败，请稍后重试');
    }
  };

  const uploadAvatarOnWeb = async (avatar: SelectedAvatar) => {
    const token = (globalThis as typeof globalThis & {
      localStorage?: { getItem(key: string): string | null };
    }).localStorage?.getItem('access_token');

    if (!avatar.file || !token) {
      throw new Error('当前登录状态或文件无效，请重新选择头像后再试');
    }

    const formData = new FormData();
    formData.append('file', avatar.file);

    const response = await fetch(`${API_BASE_URL}/uploads/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: payload,
        },
        message: payload?.message || '上传失败',
      };
    }

    return payload?.data;
  };

  const uploadAvatar = async (avatar: SelectedAvatar) => {
    if (Platform.OS === 'web') {
      return uploadAvatarOnWeb(avatar);
    }
    return uploadMutation.mutateAsync(avatar);
  };

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
      let avatarUrl = user?.avatar_url;

      if (selectedAvatar) {
        setIsUploadingAvatar(true);
        const uploadResult = await uploadAvatar(selectedAvatar);
        avatarUrl = uploadResult.url;
      }

      setIsUploadingAvatar(false);
      await updateMutation.mutateAsync({
        family_size: familySizeNum,
        baby_age: babyAgeNum,
        avatar_url: avatarUrl,
      });
      navigation.goBack();
    } catch (error: any) {
      setIsUploadingAvatar(false);
      console.error('保存失败:', error);
      const message = error?.response?.data?.message || error?.message || '保存失败，请稍后重试';
      Alert.alert('提示', message);
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
          {Platform.OS === 'web' ? (
            <input
              ref={webFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleWebFileChange}
            />
          ) : null}

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>编辑资料</Text>
            <Text style={styles.heroTitle}>把头像、家庭规模和宝宝阶段补齐，个人空间会更完整</Text>
            <Text style={styles.heroSubtitle}>这里先完成头像与核心资料闭环，保存后个人页会立刻展示你的新头像。</Text>
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
            <Text style={styles.sectionTitle}>头像与基本信息</Text>

            <View style={styles.avatarSection}>
              <View style={styles.avatarPreviewWrap}>
                {previewAvatarUrl ? (
                  <Image source={{ uri: previewAvatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{avatarText}</Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarTitle}>头像</Text>
                <Text style={styles.avatarHint}>仅支持从相册选择单张图片，保存时会自动上传并写入资料。</Text>
                <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar} disabled={isSubmitting}>
                  <Text style={styles.avatarButtonText}>更换头像</Text>
                </TouchableOpacity>
              </View>
            </View>

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
            <TouchableOpacity style={[styles.button, styles.saveButton, isSubmitting && styles.buttonDisabled]} onPress={handleSave} disabled={isSubmitting}>
              <Text style={styles.saveButtonText}>{saveButtonText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()} disabled={isSubmitting}>
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
  avatarSection: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  avatarPreviewWrap: { width: 88, height: 88 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.background.secondary },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.background.tertiary, borderWidth: 2, borderColor: Colors.primary.light, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 30, color: Colors.primary.main, fontWeight: Typography.fontWeight.bold },
  avatarInfo: { flex: 1, gap: Spacing.xs },
  avatarTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  avatarHint: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  avatarButton: { alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary },
  avatarButtonText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: Typography.fontSize.base, color: Colors.text.primary },
  readOnlyField: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  readOnlyText: { fontSize: Typography.fontSize.base, color: Colors.text.secondary },
  hint: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary, marginTop: Spacing.xs },
  buttonContainer: { gap: Spacing.sm, marginTop: Spacing.md },
  button: { paddingVertical: Spacing.md, borderRadius: BorderRadius.full, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  saveButton: { backgroundColor: Colors.primary.main },
  saveButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.inverse },
  cancelButton: { backgroundColor: Colors.background.primary, ...Shadows.sm },
  cancelButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
});
