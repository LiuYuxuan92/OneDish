import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRecipesApi } from '../api/userRecipes';

export function useUserRecipes(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['userRecipes', page, limit],
    queryFn: async () => {
      const result = await userRecipesApi.getList({ page, limit });
      const data = (result as any)?.data ?? result;
      return data;
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
