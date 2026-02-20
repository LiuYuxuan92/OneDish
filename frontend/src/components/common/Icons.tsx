/**
 * 简家厨 - 图标组件库
 * 使用 @expo/vector-icons Ionicons 实现，跨平台（native + web）兼容
 */

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number; // 保留兼容性，Ionicons 通过 name 区分线条/实心
}

// ============================================
// 底部导航栏图标
// ============================================

export function HomeIcon({ size = 24, color = Colors.primary.main }: IconProps) {
  return <Ionicons name="home-outline" size={size} color={color} />;
}

export function UtensilsIcon({ size = 24, color = Colors.primary.main }: IconProps) {
  return <Ionicons name="restaurant-outline" size={size} color={color} />;
}

export function CalendarIcon({ size = 24, color = Colors.primary.main }: IconProps) {
  return <Ionicons name="calendar-outline" size={size} color={color} />;
}

export function UserIcon({ size = 24, color = Colors.primary.main }: IconProps) {
  return <Ionicons name="person-outline" size={size} color={color} />;
}

// ============================================
// 功能图标
// ============================================

export function SearchIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="search-outline" size={size} color={color} />;
}

export function HeartIcon({ size = 24, color = Colors.text.secondary, fill = 'transparent' }: IconProps & { fill?: string }) {
  const filled = fill !== 'transparent';
  return <Ionicons name={filled ? 'heart' : 'heart-outline'} size={size} color={filled ? '#F44336' : color} />;
}

export function ChevronLeftIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="chevron-back" size={size} color={color} />;
}

export function ChevronRightIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="chevron-forward" size={size} color={color} />;
}

export function SettingsIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="settings-outline" size={size} color={color} />;
}

export function PlusIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="add" size={size} color={color} />;
}

export function TrashIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="trash-outline" size={size} color={color} />;
}

export function PencilIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="create-outline" size={size} color={color} />;
}

export function CheckIcon({ size = 24, color = Colors.functional.success }: IconProps) {
  return <Ionicons name="checkmark" size={size} color={color} />;
}

export function CloseIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="close" size={size} color={color} />;
}

// XIcon 是 CloseIcon 的别名
export const XIcon = CloseIcon;

export function ShoppingCartIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="cart-outline" size={size} color={color} />;
}

export function ShoppingBagIcon({ size = 24, color = Colors.primary.main }: IconProps) {
  return <Ionicons name="bag-outline" size={size} color={color} />;
}

export function ListIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="list" size={size} color={color} />;
}

export function ClockIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="time-outline" size={size} color={color} />;
}

export function FlameIcon({ size = 24, color = Colors.functional.warning }: IconProps) {
  return <Ionicons name="flame-outline" size={size} color={color} />;
}

export function StarIcon({ size = 24, color = Colors.text.secondary, filled = false }: IconProps & { filled?: boolean }) {
  return <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? '#FFCA28' : color} />;
}

export function InfoIcon({ size = 24, color = Colors.functional.info }: IconProps) {
  return <Ionicons name="information-circle-outline" size={size} color={color} />;
}

export function AlertIcon({ size = 24, color = Colors.functional.error }: IconProps) {
  return <Ionicons name="warning-outline" size={size} color={color} />;
}

export function CheckCircleIcon({ size = 24, color = Colors.functional.success }: IconProps) {
  return <Ionicons name="checkmark-circle-outline" size={size} color={color} />;
}

export function ShareIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="share-social-outline" size={size} color={color} />;
}

export function UsersIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="people-outline" size={size} color={color} />;
}

export function ChefHatIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="restaurant-outline" size={size} color={color} />;
}

export function BabyIcon({ size = 24, color = Colors.secondary.main }: IconProps) {
  return <Ionicons name="happy-outline" size={size} color={color} />;
}

export function LeafIcon({ size = 24, color = Colors.functional.success }: IconProps) {
  return <Ionicons name="leaf-outline" size={size} color={color} />;
}

export function FireIcon({ size = 24, color = Colors.functional.warning }: IconProps) {
  return <Ionicons name="flame" size={size} color={color} />;
}

export function TimerIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="timer-outline" size={size} color={color} />;
}

export function HelpCircleIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="help-circle-outline" size={size} color={color} />;
}

export function PlayIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="play" size={size} color={color} />;
}

export function PauseIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="pause" size={size} color={color} />;
}

export function ResetIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="refresh" size={size} color={color} />;
}

export function RefreshCwIcon({ size = 24, color = Colors.text.secondary }: IconProps) {
  return <Ionicons name="refresh" size={size} color={color} />;
}
