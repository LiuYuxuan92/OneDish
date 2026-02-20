import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserInfo, UpdateUserInfoRequest, UserPreferences } from '../api/users';

// 获取用户信息
export function useUserInfo() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.getUserInfo().then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5分钟
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
    },
  });
}
