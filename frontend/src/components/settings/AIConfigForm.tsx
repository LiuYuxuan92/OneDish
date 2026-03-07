// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { AIConfigFormData, AIConfigSafe, AI_PROVIDERS, AIProvider } from '../../api/ai-configs';
import { XIcon, EyeIcon, EyeOffIcon } from '../common/Icons';

interface AIConfigFormProps {
  visible: boolean;
  editingConfig?: AIConfigSafe | null;
  onClose: () => void;
  onSubmit: (data: AIConfigFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function AIConfigForm({
  visible,
  editingConfig,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AIConfigFormProps) {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  // Reset form when editing config changes
  useEffect(() => {
    if (editingConfig) {
      setProvider(editingConfig.provider);
      setDisplayName(editingConfig.display_name);
      setApiKey(''); // Don't pre-fill API key for security
      setBaseUrl(editingConfig.base_url || '');
      setModel(editingConfig.model || '');
    } else {
      // Reset to defaults for new config
      setProvider('openai');
      setDisplayName('');
      setApiKey('');
      setBaseUrl('');
      setModel('');
    }
    setShowApiKey(false);
  }, [editingConfig, visible]);

  const handleSubmit = async () => {
    // Validation
    if (!displayName.trim()) {
      Alert.alert('提示', '请输入显示名称');
      return;
    }
    if (!apiKey.trim() && !editingConfig) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }

    const data: AIConfigFormData = {
      provider,
      display_name: displayName.trim(),
      api_key: apiKey.trim(),
    };

    if (baseUrl.trim()) {
      data.base_url = baseUrl.trim();
    }
    if (model.trim()) {
      data.model = model.trim();
    }

    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.value === provider);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {editingConfig ? '编辑 AI 配置' : '添加 AI 配置'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Provider Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>提供商</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowProviderPicker(true)}
              >
                <Text style={styles.selectText}>
                  {selectedProvider?.icon} {selectedProvider?.label}
                </Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Display Name */}
            <View style={styles.field}>
              <Text style={styles.label}>显示名称</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="如：我的 GPT-4"
                placeholderTextColor={Colors.text.disabled}
              />
            </View>

            {/* API Key */}
            <View style={styles.field}>
              <Text style={styles.label}>API Key</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={editingConfig ? '留空则不修改' : '请输入 API Key'}
                  placeholderTextColor={Colors.text.disabled}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOffIcon size={20} color={Colors.text.secondary} />
                  ) : (
                    <EyeIcon size={20} color={Colors.text.secondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Base URL (Optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>Base URL <Text style={styles.optional}>(可选)</Text></Text>
              <TextInput
                style={styles.input}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="留空使用默认地址"
                placeholderTextColor={Colors.text.disabled}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                用于代理或自定义域名，如 https://api.openai.com/v1
              </Text>
            </View>

            {/* Model (Optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>模型 <Text style={styles.optional}>(可选)</Text></Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="如 gpt-4o、gpt-4o-mini"
                placeholderTextColor={Colors.text.disabled}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Provider Picker Modal */}
        <Modal
          visible={showProviderPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProviderPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowProviderPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>选择提供商</Text>
              {AI_PROVIDERS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.pickerOption,
                    provider === p.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setProvider(p.value as AIProvider);
                    setShowProviderPicker(false);
                    // Auto-fill display name if empty
                    if (!displayName) {
                      setDisplayName(p.label);
                    }
                  }}
                >
                  <Text style={styles.pickerOptionText}>
                    {p.icon} {p.label}
                  </Text>
                  {provider === p.value && (
                    <Text style={styles.pickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  optional: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.normal,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  selectText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  selectArrow: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  submitButton: {
    flex: 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.primary.light,
  },
  submitButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pickerContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary.light + '30',
  },
  pickerOptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  pickerCheck: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
});
