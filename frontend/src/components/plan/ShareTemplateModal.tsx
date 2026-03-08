import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { useCreateTemplate } from '../../hooks/useMealPlanTemplates';
import type { CreateTemplateInput } from '../../api/mealPlanTemplates';

interface ShareTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  weeklyData: {
    start_date: string;
    end_date: string;
    plans: Record<string, any>;
  } | undefined;
}

export function ShareTemplateModal({ visible, onClose, weeklyData }: ShareTemplateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const createMutation = useCreateTemplate();
  const dayCount = useMemo(() => Object.keys(weeklyData?.plans || {}).length, [weeklyData]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setTags('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('请输入模板标题');
      return;
    }

    if (!weeklyData?.start_date) {
      Alert.alert('没有可保存的周计划');
      return;
    }

    try {
      const input: CreateTemplateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.trim() ? tags.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
        isPublic: false,
        sourceStartDate: weeklyData.start_date,
        sourceEndDate: weeklyData.end_date,
      };

      await createMutation.mutateAsync(input);
      Alert.alert('已保存', '这个周计划已经保存为模板，可在“我的模板”里再次套用。', [
        { text: '确定', onPress: () => { reset(); onClose(); } },
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请稍后重试');
    }
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: Spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border.light,
        }}>
          <TouchableOpacity onPress={handleClose} disabled={createMutation.isPending}>
            <Text style={{ fontSize: Typography.fontSize.base, color: Colors.primary.main }}>取消</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>保存为模板</Text>
          <TouchableOpacity onPress={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary.main} />
            ) : (
              <Text style={{ fontSize: Typography.fontSize.base, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold }}>保存</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>模板名称 *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如：工作日快手晚餐"
            style={{
              backgroundColor: Colors.background.secondary,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontSize: Typography.fontSize.base,
              marginBottom: Spacing.lg,
            }}
          />

          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>模板说明</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="可选，写下这个模板适合什么场景"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: Colors.background.secondary,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontSize: Typography.fontSize.base,
              marginBottom: Spacing.lg,
              textAlignVertical: 'top',
              minHeight: 80,
            }}
          />

          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>标签</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="例如：快手, 家庭, 一周复用"
            style={{
              backgroundColor: Colors.background.secondary,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontSize: Typography.fontSize.base,
              marginBottom: Spacing.lg,
            }}
          />

          <View style={{ marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.functional.infoLight, borderRadius: BorderRadius.md }}>
            <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.functional.info }}>📋 将保存 {dayCount} 天计划，后续可一键套用到新的周起始日期。</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
