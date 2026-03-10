import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserInfo, UpdateUserInfoRequest, UserPreferences } from '../api/users';
import { buildMockUserInfo, shouldUseWebMockFallback } from '../mock/webFallback';

// 获取用户信息
export function useUserInfo() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      try {
        const user = await usersApi.getUserInfo().then(res => res.data || res);
        try {
          const prefResponse = await usersApi.getPreferences();
          const prefPayload = prefResponse?.data || prefResponse;
          return {
            ...user,
            preferences: prefPayload?.preferences || prefPayload || user?.preferences || {},
          };
        } catch (prefError) {
          if (shouldUseWebMockFallback(prefError)) {
            return {
              ...user,
              preferences: user?.preferences || buildMockUserInfo().preferences,
            };
          }
          return user;
        }
      } catch (error) {
        if (shouldUseWebMockFallback(error)) {
          return buildMockUserInfo();
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// 获取用户偏好
export function usePreferenceInfo() {
  return useQuery({
    queryKey: ['users', 'me', 'preferences'],
    queryFn: () => usersApi.getPreferences().then(res => res.data || res),
    staleTime: 5 * 60 * 1000,
  });
}

// 更新用户信息
export function useUpdateUserInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInfoRequest) =>
      usersApi.updateUserInfo(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });
}

// 更新用户偏好
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserPreferences) =>
      usersApi.updatePreferences(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me', 'preferences'] });
    },
  });
}
