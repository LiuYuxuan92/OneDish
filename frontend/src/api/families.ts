import { apiClient } from './client';

export interface FamilyMember {
  user_id: string;
  display_name?: string;
  avatar_url?: string | null;
  role: 'owner' | 'member';
}

export interface FamilyContext {
  family_id: string;
  owner_id: string;
  role: 'owner' | 'member';
  name: string;
  invite_code: string;
  members: FamilyMember[];
}

export const familiesApi = {
  getMine: () => apiClient.get<FamilyContext | null>('/families/me'),
  create: (name?: string) => apiClient.post<FamilyContext>('/families', { name }),
  join: (invite_code: string) => apiClient.post<FamilyContext>('/families/join', { invite_code }),
  regenerateInvite: (familyId: string) => apiClient.post<{ invite_code: string }>(`/families/${familyId}/regenerate`),
  removeMember: (familyId: string, memberId: string) => apiClient.delete(`/families/${familyId}/members/${memberId}`),
};
