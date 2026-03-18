const { getBaseURL } = require('./config');

function getOrigin() {
  const baseURL = String(getBaseURL() || '').trim();
  if (!baseURL) return '';
  return baseURL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

function tryParseMediaList(value) {
  const raw = String(value || '').trim();
  if (!raw || (!raw.startsWith('[') && !raw.startsWith('"'))) return null;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch (_err) {
    return null;
  }

  return null;
}

function buildGeneratedRecipeMediaPath(recipeId) {
  const normalized = String(recipeId || '').trim();
  if (!normalized) return '';
  return `/media/generated/recipes/${normalized}.jpg`;
}

function resolveMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) return raw;

  const origin = getOrigin();
  if (!origin) return raw;
  return raw.startsWith('/') ? `${origin}${raw}` : `${origin}/${raw}`;
}

function pickImage(value) {
  if (Array.isArray(value)) {
    const first = value.find(Boolean);
    return resolveMediaUrl(first || '');
  }

  const parsedList = typeof value === 'string' ? tryParseMediaList(value) : null;
  if (parsedList && parsedList.length) {
    return resolveMediaUrl(parsedList[0]);
  }

  return resolveMediaUrl(value);
}

function normalizeImageList(value) {
  if (Array.isArray(value)) return value.map((item) => resolveMediaUrl(item)).filter(Boolean);

  const parsedList = typeof value === 'string' ? tryParseMediaList(value) : null;
  if (parsedList && parsedList.length) {
    return parsedList.map((item) => resolveMediaUrl(item)).filter(Boolean);
  }

  const single = resolveMediaUrl(value);
  return single ? [single] : [];
}

function pickRecipeImage(recipeId, value) {
  return pickImage(value) || resolveMediaUrl(buildGeneratedRecipeMediaPath(recipeId));
}

function normalizeRecipeImageList(recipeId, value) {
  const images = normalizeImageList(value);
  if (images.length) return images;
  const fallback = pickRecipeImage(recipeId);
  return fallback ? [fallback] : [];
}

module.exports = {
  resolveMediaUrl,
  pickImage,
  pickRecipeImage,
  normalizeImageList,
  normalizeRecipeImageList,
};
