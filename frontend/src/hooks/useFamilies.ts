import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { familiesApi } from '../api/families';
import { buildMockFamily, isWebLocalGuestMode, shouldUseWebMockFallback } from '../mock/webFallback';

export function useMyFamily() {
  return useQuery({
    queryKey: ['families', 'me'],
    queryFn: async () => {
      if (isWebLocalGuestMode()) {
        return buildMockFamily();
      }
      try {
        const res = await familiesApi.getMine();
        return res || null;
      } catch (error) {
        if (Platform.OS === 'web' && shouldUseWebMockFallback(error)) {
          return buildMockFamily();
        }
        throw error;
      }
    },
    staleTime: 30 * 1000,
    retry: Platform.OS === 'web' ? 0 : 1,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => familiesApi.create(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
      await queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

export function useJoinFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => familiesApi.join(inviteCode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
      await queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

export function useRegenerateFamilyInvite(familyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error('familyId is required');
      return familiesApi.regenerateInvite(familyId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useRemoveFamilyMember(familyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!familyId) throw new Error('familyId is required');
      return familiesApi.removeMember(familyId, memberId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['families'] });
      await queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}
