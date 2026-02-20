/**
 * 简家厨 - 分享功能
 * 提供菜谱分享能力
 */

import { Share, Platform, Linking } from 'react-native';

// ============================================
// 类型定义
// ============================================

export interface ShareRecipeParams {
  /** 菜谱名称 */
  recipeName: string;
  /** 菜谱描述 */
  description?: string;
  /** 菜谱图片URL */
  imageUrl?: string;
  /** 大人版烹饪时间 */
  adultTime?: string;
  /** 宝宝版烹饪时间 */
  babyTime?: string;
  /** 菜谱ID */
  recipeId?: string;
  /** 分享来源 */
  source?: string;
}

export interface ShareOptions {
  /** 标题 */
  title?: string;
  /** 消息 */
  message?: string;
  /** URL */
  url?: string;
}

// ============================================
// 分享配置
// ============================================

// 应用信息
const APP_INFO = {
  name: '简家厨',
  tagline: '一菜两吃，全家共享',
  downloadUrl: 'https://example.com/download', // 替换为实际下载链接
};

// ============================================
// 分享函数
// ============================================

/**
 * 分享菜谱
 */
export const shareRecipe = async (params: ShareRecipeParams): Promise<boolean> => {
  const {
    recipeName,
    description,
    adultTime,
    babyTime,
    recipeId,
  } = params;

  // 构建分享文本
  let shareText = `【${recipeName}】\n`;
  
  if (description) {
    shareText += `${description}\n\n`;
  }
  
  shareText += `🍽️ 大人版`;
  if (adultTime) {
    shareText += ` · ${adultTime}`;
  }
  shareText += `\n👶 宝宝版`;
  if (babyTime) {
    shareText += ` · ${babyTime}`;
  }
  
  shareText += `\n\n来自 "${APP_INFO.name}" - ${APP_INFO.tagline}`;
  shareText += `\n${APP_INFO.downloadUrl}`;

  try {
    const result = await Share.share({
      message: shareText,
      title: `推荐菜谱：${recipeName}`,
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('分享失败:', error);
    return false;
  }
};

/**
 * 分享到微信（需要跳转到微信）
 * 注意：实际实现需要安装 react-native-wechat 或其他微信SDK
 */
export const shareToWeChat = async (params: ShareRecipeParams): Promise<boolean> => {
  // 这里需要根据实际使用的微信SDK来实现
  // 示例使用通用分享
  console.log('分享到微信功能需要额外配置');
  return shareRecipe(params);
};

/**
 * 生成菜谱海报图片数据
 */
export const generateShareData = (params: ShareRecipeParams): ShareOptions => {
  const {
    recipeName,
    description,
    imageUrl,
  } = params;

  return {
    title: `推荐菜谱：${recipeName}`,
    message: `${description || ''}\n\n来自 "${APP_INFO.name}" - ${APP_INFO.tagline}`,
    url: imageUrl,
  };
};

/**
 * 复制菜谱链接到剪贴板
 */
export const copyRecipeLink = async (recipeId: string): Promise<boolean> => {
  // 注意：React Native 的 Clipboard API 已被废弃
  // 建议使用 @react-native-clipboard/clipboard
  try {
    const { Clipboard } = await import('@react-native-clipboard/clipboard');
    const link = `${APP_INFO.downloadUrl}/recipe/${recipeId}`;
    Clipboard.setString(link);
    return true;
  } catch (error) {
    console.error('复制链接失败:', error);
    return false;
  }
};

/**
 * 分享应用给朋友
 */
export const shareApp = async (): Promise<boolean> => {
  const message = `推荐 "${APP_INFO.name}" - ${APP_INFO.tagline}\n一款让做饭变得简单的家庭餐厨助手\n${APP_INFO.downloadUrl}`;

  try {
    const result = await Share.share({
      message,
      title: `推荐 ${APP_INFO.name}`,
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('分享失败:', error);
    return false;
  }
};

/**
 * 分享反馈
 */
export const shareFeedback = async (): Promise<boolean> => {
  const email = 'feedback@example.com'; // 替换为实际反馈邮箱
  const subject = `[${APP_INFO.name}] 用户反馈`;
  const body = '';

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error('打开邮件失败:', error);
    return false;
  }
};

/**
 * 评分
 */
export const rateApp = async (): Promise<boolean> => {
  // 根据平台跳转到应用商店
  const appStoreUrl = Platform.OS === 'ios' 
    ? 'https://apps.apple.com/app/id123456789' // 替换为实际App Store链接
    : 'https://play.google.com/store/apps/details?id=com.example.app'; // 替换为实际Google Play链接

  try {
    const canOpen = await Linking.canOpenURL(appStoreUrl);
    if (canOpen) {
      await Linking.openURL(appStoreUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error('打开应用商店失败:', error);
    return false;
  }
};

// ============================================
// 分享菜单组件
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share as RNShare,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

export interface ShareMenuProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 菜谱信息 */
  recipe?:RecipeParams;
  /** 额外 Share选项 */
  extraOptions?: Array<{
    icon: string;
    title: string;
    onPress: () => void;
  }>;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({
  visible,
  onClose,
  recipe,
  extraOptions = [],
}) => {
  const handleShare = async (type: 'wechat' | 'moments' | 'system') => {
    if (recipe) {
      await shareRecipe(recipe);
    }
    onClose();
  };

  const defaultOptions = [
    {
      icon: '💬',
      title: '微信好友',
      onPress: () => handleShare('wechat'),
    },
    {
      icon: '🌐',
      title: '朋友圈',
      onPress: () => handleShare('moments'),
    },
    {
      icon: '📋',
      title: '复制链接',
      onPress: async () => {
        if (recipe?.recipeId) {
          await copyRecipeLink(recipe.recipeId);
        }
        onClose();
      },
    },
    {
      icon: '📤',
      title: '更多',
      onPress: () => handleShare('system'),
    },
  ];

  const options = [...defaultOptions, ...extraOptions];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <Text style={styles.title}>分享到</Text>
          
          <View style={styles.options}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.option}
                onPress={option.onPress}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>{option.icon}</Text>
                </View>
                <Text style={styles.optionTitle}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background.scrim,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  option: {
    alignItems: 'center',
    width: 70,
    marginBottom: Spacing.md,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionTitle: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  cancelButton: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
});
