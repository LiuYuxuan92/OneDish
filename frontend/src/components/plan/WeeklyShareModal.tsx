import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

interface SharedWeeklyPlan {
  role: string;
  members?: Array<{
    user_id: string;
    display_name?: string;
  }>;
  plans?: {
    [date: string]: {
      [mealType: string]: {
        id: string;
        name: string;
        is_completed?: boolean;
      };
    };
  };
}

interface WeeklyShareModalProps {
  sharedData?: SharedWeeklyPlan;
  inviteCode: string;
  onInviteCodeChange: (code: string) => void;
  onCreateShare: () => void;
  onJoinShare: () => void;
  onRegenerateInvite: () => void;
  onRemoveMember: (memberId: string) => void;
  onMarkSharedMealComplete: (planId: string) => void;
  isCreating: boolean;
  isJoining: boolean;
}

function getRoleLabel(role?: string) {
  if (role === 'owner') return '发起人';
  if (role === 'member') return '成员';
  return role || '待确认';
}

export function WeeklyShareModal({
  sharedData,
  inviteCode,
  onInviteCodeChange,
  onCreateShare,
  onJoinShare,
  onRegenerateInvite,
  onRemoveMember,
  onMarkSharedMealComplete,
  isCreating,
  isJoining,
}: WeeklyShareModalProps) {
  return (
    <View style={styles.shareSection}>
      <View style={styles.shareActionRow}>
        <TouchableOpacity
          style={styles.shareMiniBtn}
          onPress={onCreateShare}
          disabled={isCreating}
        >
          <Text style={styles.shareMiniBtnText}>共享周计划</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.shareCodeInput}
          placeholder="输入邀请码"
          value={inviteCode}
          onChangeText={onInviteCodeChange}
          placeholderTextColor={Colors.text.tertiary}
        />
        <TouchableOpacity
          style={styles.shareMiniBtn}
          onPress={onJoinShare}
          disabled={isJoining || !inviteCode.trim()}
        >
          <Text style={styles.shareMiniBtnText}>加入</Text>
        </TouchableOpacity>
      </View>

      {sharedData?.plans && (
        <View style={styles.planSection}>
          <Text style={styles.sectionTitle}>共享周计划</Text>
          <Text style={styles.shareIdentityText}>当前身份：{getRoleLabel(sharedData.role)}</Text>
          
          {sharedData.role === 'owner' && (
            <View style={styles.shareOwnerPanel}>
              <TouchableOpacity
                style={styles.shareOwnerBtn}
                onPress={onRegenerateInvite}
              >
                <Text style={styles.shareOwnerBtnText}>失效当前邀请码并重置</Text>
              </TouchableOpacity>
              
              <Text style={styles.shareMembersTitle}>成员列表（最小可用）</Text>
              {(sharedData.members || []).length === 0 ? (
                <Text style={styles.shareMemberItem}>暂无成员</Text>
              ) : (
                (sharedData.members || []).map((m) => {
                  const displayName = m.display_name || m.user_id;
                  const avatarText = (displayName || '?').trim().charAt(0).toUpperCase() || '?';

                  return (
                    <View key={m.user_id} style={styles.shareMemberRow}>
                      <View style={styles.shareMemberIdentity}>
                        <View style={styles.shareMemberAvatar}>
                          <Text style={styles.shareMemberAvatarText}>{avatarText}</Text>
                        </View>
                        <Text style={styles.shareMemberItem}>{displayName}</Text>
                      </View>
                      <TouchableOpacity onPress={() => onRemoveMember(m.user_id)}>
                        <Text style={styles.shareMemberRemove}>移除</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}
          
          {Object.entries(sharedData.plans).slice(0, 7).map(([dateStr, dayPlans]) => (
            <View key={`shared-${dateStr}`} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{dateStr}</Text>
              {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
                const plan = dayPlans?.[mealType];
                if (!plan) return null;
                return (
                  <View key={`shared-${dateStr}-${mealType}`} style={styles.sharedMealRow}>
                    <Text style={styles.mealLabelText}>
                      {mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}
                    </Text>
                    <Text style={styles.sharedMealName}>{plan.name}</Text>
                    {!plan.is_completed && (
                      <TouchableOpacity onPress={() => onMarkSharedMealComplete(plan.id)}>
                        <Text style={styles.sharedDoneBtn}>标记完成</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shareActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  shareMiniBtn: {
    backgroundColor: Colors.secondary.main,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  shareMiniBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  shareCodeInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  shareSection: {
    paddingHorizontal: Spacing.lg,
  },
  planSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  shareIdentityText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  shareOwnerPanel: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  shareOwnerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.functional.warning,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  shareOwnerBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  shareMembersTitle: {
    marginTop: Spacing.sm,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
  },
  shareMemberRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareMemberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shareMemberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.tertiary,
  },
  shareMemberAvatarText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
  },
  shareMemberItem: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  shareMemberRemove: {
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
  },
  dayCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  sharedMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  mealLabelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  sharedMealName: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  sharedDoneBtn: {
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.success,
    fontWeight: Typography.fontWeight.semibold,
  },
});
