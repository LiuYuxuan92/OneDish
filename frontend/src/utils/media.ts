import { API_ORIGIN } from '../api/client';

function tryParseMediaList(value?: string | null): string[] | null {
  const raw = String(value || '').trim();
  if (!raw || (!raw.startsWith('[') && !raw.startsWith('"'))) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch {
    return null;
  }

  return null;
}

function buildGeneratedRecipeMediaPath(recipeId?: string | null): string | undefined {
  const normalized = String(recipeId || '').trim();
  if (!normalized) return undefined;
  return `/media/generated/recipes/${normalized}.jpg`;
}

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (!API_ORIGIN) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? `${API_ORIGIN}${trimmed}` : `${API_ORIGIN}/${trimmed}`;
}

export function resolveMediaUrls(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => resolveMediaUrl(item)).filter(Boolean) as string[];
  }

  const parsedList = typeof value === 'string' ? tryParseMediaList(value) : null;
  if (parsedList?.length) {
    return parsedList.map((item) => resolveMediaUrl(item)).filter(Boolean) as string[];
  }

  const single = resolveMediaUrl(value);
  return single ? [single] : [];
}

export function resolveRecipeImageUrl(recipeId?: string | null, value?: string[] | string | null): string | undefined {
  const imageUrls = resolveMediaUrls(value);
  if (imageUrls.length > 0) {
    return imageUrls[0];
  }

  return resolveMediaUrl(buildGeneratedRecipeMediaPath(recipeId));
}

export function resolveRecipeImageUrls(recipeId?: string | null, value?: string[] | string | null): string[] {
  const imageUrls = resolveMediaUrls(value);
  if (imageUrls.length > 0) {
    return imageUrls;
  }

  const fallback = resolveRecipeImageUrl(recipeId);
  return fallback ? [fallback] : [];
}
