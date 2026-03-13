import { useQuery } from '@tanstack/react-query';
import { billingApi, BillingProduct, BillingSummary, ClientPlatform, FeatureMatrixItem } from '../api/billing';
import { useAuth } from './useAuth';

export function useBillingProducts() {
  return useQuery<BillingProduct[]>({
    queryKey: ['billing', 'products'],
    queryFn: () => billingApi.getProducts().then(res => res.data || res),
    staleTime: 10 * 60 * 1000,
  });
}

export function useBillingFeatureMatrix(platform: ClientPlatform = 'app') {
  return useQuery<FeatureMatrixItem[]>({
    queryKey: ['billing', 'feature-matrix', platform],
    queryFn: () => billingApi.getFeatureMatrix(platform).then(res => res.data || res),
    staleTime: 10 * 60 * 1000,
  });
}

export function useBillingSummary(platform: ClientPlatform = 'app') {
  const { isAuthenticated, isLoading } = useAuth();

  return useQuery<BillingSummary>({
    queryKey: ['billing', 'summary', platform],
    queryFn: () => billingApi.getSummary(platform).then(res => res.data || res),
    staleTime: 2 * 60 * 1000,
    enabled: !isLoading && isAuthenticated,
  });
}
