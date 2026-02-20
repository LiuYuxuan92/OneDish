/**
 * 简家厨 - 图片轮播组件
 * 用于展示菜谱的多张图片
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

// ============================================
// 类型定义
// ============================================

export interface ImageCarouselProps {
  /** 图片URL数组 */
  images: string[];
  /** 图片高度 */
  height?: number;
  /** 是否显示分页指示器 */
  showPagination?: boolean;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 自动播放间隔（毫秒） */
  autoPlayInterval?: number;
  /** 点击图片回调 */
  onImagePress?: (index: number) => void;
  /** 加载占位图 */
  placeholder?: React.ReactNode;
  /** 圆角 */
  borderRadius?: number;
}

// ============================================
// 组件实现
// ============================================

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 250,
  showPagination = true,
  autoPlay = false,
  autoPlayInterval = 3000,
  onImagePress,
  placeholder,
  borderRadius = BorderRadius.lg,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 自动播放
  React.useEffect(() => {
    if (autoPlay && images.length > 1) {
      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % images.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }
  }, [autoPlay, currentIndex, autoPlayInterval, images.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(newIndex);
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(index)}
        style={styles.imageContainer}
      >
        <Image
          source={{ uri: item }}
          style={[styles.image, { height }]}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (!showPagination || images.length <= 1) return null;

    return (
      <View style={styles.pagination}>
        {images.map((_, index) => {
          const inputRange = [
            (index - 1) * screenWidth,
            index * screenWidth,
            (index + 1) * screenWidth,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  if (images.length === 0) {
    return (
      <View style={[styles.container, { height, borderRadius }]}>
        {placeholder || (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🍽️</Text>
            <Text style={styles.placeholderText}>暂无图片</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={(_, index) => `image_${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />
      {renderPagination()}
    </View>
  );
};

// ============================================
// RecipeImage - 菜谱卡片图片
// ============================================

export interface RecipeImageProps {
  /** 图片URL */
  imageUrl?: string;
  /** 图片高度 */
  height?: number;
  /** 圆角 */
  borderRadius?: number;
  /** 点击事件 */
  onPress?: () => void;
  /** 是否显示收藏按钮 */
  showFavorite?: boolean;
  /** 是否已收藏 */
  isFavorited?: boolean;
  /** 收藏点击事件 */
  onFavoritePress?: () => void;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
  imageUrl,
  height = 140,
  borderRadius = BorderRadius.lg,
  onPress,
  showFavorite = false,
  isFavorited = false,
  onFavoritePress,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      style={[styles.recipeImageContainer, { height, borderRadius }]}
    >
      {imageUrl && !hasError ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.recipeImage}
          resizeMode="cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        <View style={styles.recipePlaceholder}>
          <Text style={styles.recipePlaceholderIcon}>🍳</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}

      {showFavorite && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.favoriteIcon}>
            {isFavorited ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
    width: screenWidth,
  },
  image: {
    width: screenWidth,
  },
  pagination: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral.white,
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    ...Typography.body.regular,
    color: Colors.text.tertiary,
  },
  // RecipeImage styles
  recipeImageContainer: {
    position: 'relative',
    backgroundColor: Colors.neutral.gray100,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  recipePlaceholder: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipePlaceholderIcon: {
    fontSize: 36,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  favoriteIcon: {
    fontSize: 16,
  },
});

export default ImageCarousel;
