import { apiClient } from './client';

export interface UploadImageResponse {
  key: string;
  url: string;
  mime_type: string;
  size: number;
}

export interface UploadImagePayload {
  uri: string;
  name: string;
  type: string;
}

export const uploadsApi = {
  uploadImage: (file: UploadImagePayload) => {
    const formData = new FormData();
    formData.append('file', file as any);

    return apiClient.post<UploadImageResponse>('/uploads/image', formData);
  },
};
