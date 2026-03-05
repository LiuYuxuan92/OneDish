import { useState, useMemo } from 'react';
import { Colors } from '../styles/theme';

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = typeof MEAL_TYPES[number];

export const MEAL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  breakfast: { label: '早餐', icon: '🌅', color: Colors.food.fruit },
  lunch: { label: '午餐', icon: '☀️', color: Colors.food.vegetable },
  dinner: { label: '晚餐', icon: '🌙', color: Colors.food.meat },
};

export interface WeeklyPlanState {
  // Week navigation
  selectedWeek: Date;
  setSelectedWeek: (date: Date) => void;
  start: Date;
  end: Date;
  dates: string[];
  
  // Tab state
  activeTab: 'week' | 'today';
  setActiveTab: (tab: 'week' | 'today') => void;
  
  // Refresh state
  refreshingMeals: Set<string>;
  setRefreshingMeals: (meals: Set<string>) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  
  // Generation options
  showGenOptions: boolean;
  setShowGenOptions: (show: boolean) => void;
  genBabyAge: number | null;
  setGenBabyAge: (age: number | null) => void;
  genExclude: string;
  setGenExclude: (exclude: string) => void;
  
  // Smart recommendation
  showSmartRec: boolean;
  setShowSmartRec: (show: boolean) => void;
  smartMealType: 'all-day' | 'breakfast' | 'lunch' | 'dinner';
  setSmartMealType: (type: 'all-day' | 'breakfast' | 'lunch' | 'dinner') => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  
  // Share
  weeklyInviteCode: string;
  setWeeklyInviteCode: (code: string) => void;
  activeShareId: string | null;
  setActiveShareId: (id: string | null) => void;
  
  // Helpers
  formatDate: (date: Date) => string;
  getWeekRange: (date: Date) => { start: Date; end: Date };
}

export function useWeeklyPlanState(): WeeklyPlanState {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [refreshingMeals, setRefreshingMeals] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'today'>('week');
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [genBabyAge, setGenBabyAge] = useState<number | null>(null);
  const [genExclude, setGenExclude] = useState('');
  const [showSmartRec, setShowSmartRec] = useState(false);
  const [smartMealType, setSmartMealType] = useState<'all-day' | 'breakfast' | 'lunch' | 'dinner'>('all-day');
  const [rejectReason, setRejectReason] = useState('');
  const [weeklyInviteCode, setWeeklyInviteCode] = useState('');
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const { start, end } = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      result.push(formatDate(d));
    }
    return result;
  }, [start]);

  return {
    selectedWeek,
    setSelectedWeek,
    start,
    end,
    dates,
    activeTab,
    setActiveTab,
    refreshingMeals,
    setRefreshingMeals,
    isGenerating,
    setIsGenerating,
    showGenOptions,
    setShowGenOptions,
    genBabyAge,
    setGenBabyAge,
    genExclude,
    setGenExclude,
    showSmartRec,
    setShowSmartRec,
    smartMealType,
    setSmartMealType,
    rejectReason,
    setRejectReason,
    weeklyInviteCode,
    setWeeklyInviteCode,
    activeShareId,
    setActiveShareId,
    formatDate,
    getWeekRange,
  };
}
