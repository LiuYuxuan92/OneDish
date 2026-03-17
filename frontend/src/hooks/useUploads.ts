import { useMutation } from '@tanstack/react-query';
import { uploadsApi, UploadImagePayload } from '../api/uploads';

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: UploadImagePayload) => uploadsApi.uploadImage(file).then(res => res.data),
  });
}
