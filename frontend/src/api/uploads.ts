import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from './client';

function getWebToken() {
  const storage = (globalThis as typeof globalThis & {
    localStorage?: { getItem(key: string): string | null };
  }).localStorage;
  return storage?.getItem('access_token') || null;
}

async function uploadWithAxios<T>(formData: FormData) {
  const token = Platform.OS === 'web' ? getWebToken() : null;
  const response = await axios.post(API_BASE_URL + '/uploads/image', formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data as { data: T } & Record<string, any>;
}

function normalizeResponse<T>(response: any) {
  return {
    ...response,
    meta: response?.meta || null,
  };
}

function normalizeError(error: any): never {
  throw {
    message: error?.response?.data?.message || error?.message || '请求失败',
    code: error?.response?.data?.code || error?.response?.status,
    http_status: error?.response?.status,
  };
}



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
  file?: File;
}

async function buildUploadFormData(file: UploadImagePayload) {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    if (file.file) {
      formData.append('file', file.file);
      return formData;
    }

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const uploadFile = new File([blob], file.name, {
      type: file.type || blob.type || 'image/jpeg',
    });
    formData.append('file', uploadFile);
    return formData;
  }

  formData.append('file', file as any);
  return formData;
}

export const uploadsApi = {
  uploadImage: async (file: UploadImagePayload) => {
    try {
      const formData = await buildUploadFormData(file);
      const response = await uploadWithAxios<UploadImageResponse>(formData);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },
};
