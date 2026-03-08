import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../styles/theme';
import { authApi } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

export function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isGuest } = useAuth();

  // 邮箱格式验证
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('提示', '请填写所有必填项');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码输入不一致');
      return;
    }

    if (password.length < 6) {
      Alert.alert('提示', '密码长度至少为6位');
      return;
    }

    setLoading(true);
    try {
      if (isGuest) {
        Alert.alert('正在迁移', '正在迁移你的收藏与计划，请稍候...');
      }
      const response = isGuest
        ? await authApi.upgradeGuestRegister({ username, email, password })
        : await authApi.register({ username, email, password });
      const payload = response?.data || response;
      if (payload?.token) {
        // 注册成功，自动登录
        await login(payload.token, payload.refresh_token, payload.user);
      } else {
        Alert.alert('注册成功', '请登录');
        navigation.goBack();
      }
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || '注册失败，请稍后重试';
      Alert.alert('注册失败', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>注册账号</Text>

        <TextInput
          style={styles.input}
          placeholder="用户名"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="确认密码"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? (isGuest ? '迁移中...' : '注册中...') : '注册'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>已有账号？去登录</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.primary,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray300,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary.main,
    borderRadius: 8,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  linkText: {
    color: Colors.primary.main,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
