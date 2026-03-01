import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SWAP_WEIGHTS } from './swapStrategy';

export type SwapExperimentBucket = 'A' | 'B';
export interface SwapWeights {
  preference: number;
  category: number;
  time: number;
  stage: number;
  prepDiffPenalty: number;
}

export interface SwapWeightsConfigResult {
  bucket: SwapExperimentBucket;
  weights: SwapWeights;
  source: 'default' | 'remote' | 'local';
}

export const SWAP_WEIGHTS_OVERRIDE_KEY = 'home:swap_weights_override';
export const SWAP_BUCKET_CACHE_KEY = 'home:swap_bucket';
export const SWAP_REMOTE_CONFIG_ENABLED_KEY = 'home:swap_weights_remote_enabled';
export const SWAP_REMOTE_CONFIG_URL_KEY = 'home:swap_weights_remote_url';
export const SWAP_REMOTE_TIMEOUT_MS_KEY = 'home:swap_weights_remote_timeout_ms';

const REMOTE_TIMEOUT_FALLBACK_MS = 800;
const REMOTE_TIMEOUT_MIN_MS = 500;
const REMOTE_TIMEOUT_MAX_MS = 1000;

const BUCKET_B_WEIGHTS: SwapWeights = {
  ...DEFAULT_SWAP_WEIGHTS,
  preference: 210,
  stage: 70,
};

const BUCKET_WEIGHTS: Record<SwapExperimentBucket, SwapWeights> = {
  A: DEFAULT_SWAP_WEIGHTS,
  B: BUCKET_B_WEIGHTS,
};

const clampWeight = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const normalizeWeights = (value: unknown): Partial<SwapWeights> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const input = value as Record<string, unknown>;
  const output: Partial<SwapWeights> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'preference')) {
    output.preference = clampWeight(input.preference, DEFAULT_SWAP_WEIGHTS.preference);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'category')) {
    output.category = clampWeight(input.category, DEFAULT_SWAP_WEIGHTS.category);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'time')) {
    output.time = clampWeight(input.time, DEFAULT_SWAP_WEIGHTS.time);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'stage')) {
    output.stage = clampWeight(input.stage, DEFAULT_SWAP_WEIGHTS.stage);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'prepDiffPenalty')) {
    output.prepDiffPenalty = clampWeight(input.prepDiffPenalty, DEFAULT_SWAP_WEIGHTS.prepDiffPenalty);
  }

  return output;
};

const toStableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
};

const pickBucketByHash = (seed: string) => (toStableHash(seed) % 2 === 0 ? 'A' : 'B');

async function getBucket(userId?: string | null): Promise<SwapExperimentBucket> {
  if (userId) {
    return pickBucketByHash(String(userId));
  }

  const cached = await AsyncStorage.getItem(SWAP_BUCKET_CACHE_KEY);
  if (cached === 'A' || cached === 'B') {
    return cached;
  }

  const generated = pickBucketByHash(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  await AsyncStorage.setItem(SWAP_BUCKET_CACHE_KEY, generated);
  return generated;
}

async function getLocalOverride(bucket: SwapExperimentBucket): Promise<Partial<SwapWeights>> {
  const raw = await AsyncStorage.getItem(SWAP_WEIGHTS_OVERRIDE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    // 支持两种本地覆盖格式：
    // 1) 直接 Partial<SwapWeights>
    // 2) { all?: Partial<SwapWeights>, A?: Partial<SwapWeights>, B?: Partial<SwapWeights> }
    const common = normalizeWeights(parsed?.all ?? {});
    const byBucket = normalizeWeights(parsed?.[bucket] ?? {});
    const direct = normalizeWeights(parsed);

    return {
      ...direct,
      ...common,
      ...byBucket,
    };
  } catch {
    return {};
  }
}

async function getRemoteTimeoutMs(): Promise<number> {
  const raw = await AsyncStorage.getItem(SWAP_REMOTE_TIMEOUT_MS_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return REMOTE_TIMEOUT_FALLBACK_MS;
  }
  return Math.max(REMOTE_TIMEOUT_MIN_MS, Math.min(REMOTE_TIMEOUT_MAX_MS, parsed));
}

async function isRemoteConfigEnabled(): Promise<boolean> {
  const raw = (await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_ENABLED_KEY))?.trim();
  return raw === '1' || raw === 'true';
}

async function getRemoteOverride(bucket: SwapExperimentBucket): Promise<Partial<SwapWeights> | null> {
  const enabled = await isRemoteConfigEnabled();
  if (!enabled) {
    return null;
  }

  const endpoint = (await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_URL_KEY))?.trim();
  if (!endpoint) {
    return null;
  }

  const timeoutMs = await getRemoteTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();

    // 远端协议与本地一致：
    // 1) 直接 Partial<SwapWeights>
    // 2) { all?: Partial<SwapWeights>, A?: Partial<SwapWeights>, B?: Partial<SwapWeights> }
    const common = normalizeWeights(payload?.all ?? {});
    const byBucket = normalizeWeights(payload?.[bucket] ?? {});
    const direct = normalizeWeights(payload);

    const merged = {
      ...direct,
      ...common,
      ...byBucket,
    };

    return Object.keys(merged).length > 0 ? merged : null;
  } catch {
    // 容灾：网络失败/超时统一降级为 null，让上层继续使用本地覆盖或默认值。
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function setSwapRemoteConfigControls(params: {
  enabled: boolean;
  url?: string;
}) {
  await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, params.enabled ? '1' : '0');
  if (typeof params.url === 'string') {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, params.url.trim());
  }
}

export async function resetSwapRemoteConfigControls() {
  await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '0');
  await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, '');
}

export async function getSwapWeightsConfig(params: {
  userId?: string | null;
} = {}): Promise<SwapWeightsConfigResult> {
  // 分桶优先级：真实 userId > 本地缓存 bucket
  const bucket = await getBucket(params.userId);
  const base = BUCKET_WEIGHTS[bucket] || DEFAULT_SWAP_WEIGHTS;

  const [localOverride, remoteOverride] = await Promise.all([
    getLocalOverride(bucket),
    getRemoteOverride(bucket),
  ]);

  const merged = {
    ...base,
    ...(remoteOverride || {}),
    ...(localOverride || {}),
  } as SwapWeights;

  const hasLocalOverride = Object.keys(localOverride || {}).length > 0;
  const hasRemoteOverride = Object.keys(remoteOverride || {}).length > 0;
  const source: SwapWeightsConfigResult['source'] = hasLocalOverride
    ? 'local'
    : hasRemoteOverride
      ? 'remote'
      : 'default';

  return {
    bucket,
    weights: merged,
    source,
  };
}
