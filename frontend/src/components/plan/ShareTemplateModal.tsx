import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { usePublishTemplate } from '../../hooks/useMealPlanTemplates';
import type { MealPlanTemplate, CreateTemplateInput } from '../../api/mealPlanTemplates';

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
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState('');
  
  const publishMutation = usePublishTemplate();

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('请输入模板标题');
      return;
    }

    if (!weeklyData || !weeklyData.plans) {
      Alert.alert('没有可分享的计划数据');
      return;
    }

    try {
      // 转换周计划数据为模板格式
      const planData: Record<string, { breakfast?: string; lunch?: string; dinner?: string }> = {};
      Object.entries(weeklyData.plans).forEach(([date, dayPlans]: [string, any]) => {
        planData[date] = {
          breakfast: dayPlans?.breakfast?.recipe_id || dayPlans?.breakfast?.id,
          lunch: dayPlans?.lunch?.recipe_id || dayPlans?.lunch?.id,
          dinner: dayPlans?.dinner?.recipe_id || dayPlans?.dinner?.id,
        };
      });

      const input: CreateTemplateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        planData,
        tags: tags.trim() ? tags.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
        isPublic,
      };

      const result = await publishMutation.mutateAsync(input);
      Alert.alert('发布成功', '模板已发布到社区', [
        { text: '确定', onPress: () => {
          setTitle('');
          setDescription('');
          setTags('');
          setIsPublic(true);
          onClose();
        }}
      ]);
    } catch (error: any) {
      Alert.alert('发布失败', error?.message || '请稍后重试');
    }
  };

  const handleClose = () => {
    if (!publishMutation.isPending) {
      setTitle('');
      setDescription('');
      setTags('');
      setIsPublic(true);
      onClose();
    }
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
          <TouchableOpacity onPress={handleClose} disabled={publishMutation.isPending}>
            <Text style={{ fontSize: Typography.fontSize.base, color: Colors.primary.main }}>取消</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>分享为模板</Text>
          <TouchableOpacity onPress={handlePublish} disabled={publishMutation.isPending}>
            {publishMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary.main} />
            ) : (
              <Text style={{ fontSize: Typography.fontSize.base, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold }}>发布</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>模板标题 *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如：7-9个月宝宝的一周辅食计划"
            style={{
              backgroundColor: Colors.background.secondary,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontSize: Typography.fontSize.base,
              marginBottom: Spacing.lg,
            }}
          />

          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>简介描述</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="分享这个计划的特点..."
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

          <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.xs }}>标签（用逗号分隔）</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="例如：辅食, 7个月, 简单"
            style={{
              backgroundColor: Colors.background.secondary,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontSize: Typography.fontSize.base,
              marginBottom: Spacing.lg,
            }}
          />

          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingVertical: Spacing.md,
            borderTopWidth: 1,
            borderTopColor: Colors.border.light,
          }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium }}>公开分享</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.text.secondary }}>其他人可以浏览和使用</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.border.default, true: Colors.primary.light }}
              thumbColor={isPublic ? Colors.primary.main : Colors.neutral.gray400}
            />
          </View>

          {weeklyData && weeklyData.plans && (
            <View style={{ marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.functional.infoLight, borderRadius: BorderRadius.md }}>
              <Text style={{ fontSize: Typography.fontSize.sm, color: Colors.functional.info }}>
                📋 将分享 {Object.keys(weeklyData.plans).length} 天的膳食计划
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
