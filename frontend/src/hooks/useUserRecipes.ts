import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRecipesApi } from '../api/userRecipes';

export function useUserRecipes(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['userRecipes', page, limit],
    queryFn: async () => {
      const result = await userRecipesApi.getList({ page, limit });
      return (result as any)?.data ?? result;
    },
  });
}

export function usePublishedUserRecipes(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['publishedUserRecipes', page, limit],
    queryFn: async () => {
      const result = await userRecipesApi.getPublished({ page, limit });
      return (result as any)?.data ?? result;
    },
  });
}

export function useCreateUserRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => userRecipesApi.createDraft(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userRecipes'] }),
  });
}

export function useUpdateUserRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => userRecipesApi.updateDraft(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userRecipes'] }),
  });
}

export function useSubmitUserRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userRecipesApi.submit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userRecipes'] }),
  });
}

export function useReviewUserRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'published' | 'rejected'; reason?: string }) =>
      userRecipesApi.review(id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['publishedUserRecipes'] });
    },
  });
}

export function useToggleUserRecipeFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userRecipesApi.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishedUserRecipes'] });
    },
  });
}

export function useSaveSearchResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (searchResult: any) => userRecipesApi.save(searchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecipes'] });
    },
  });
}

export function useDeleteUserRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userRecipesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecipes'] });
    },
  });
}

export function useAdminReviewList(status: 'pending' | 'rejected' | 'published' = 'pending', page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['adminUserRecipes', status, page, limit],
    queryFn: async () => {
      const result = await userRecipesApi.adminList({ status, page, limit });
      return (result as any)?.data ?? result;
    },
  });
}

export function useAdminBatchReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action, note }: { ids: string[]; action: 'published' | 'rejected'; note?: string }) =>
      userRecipesApi.adminBatchReview(ids, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['userRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['publishedUserRecipes'] });
    },
  });
}
