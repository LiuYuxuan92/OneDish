const store = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, value) => {
    store[key] = String(value);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
    return Promise.resolve();
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSwapWeightsConfig,
  SWAP_BUCKET_CACHE_KEY,
  SWAP_WEIGHTS_OVERRIDE_KEY,
  SWAP_REMOTE_CONFIG_ENABLED_KEY,
  SWAP_REMOTE_CONFIG_URL_KEY,
  SWAP_REMOTE_TIMEOUT_MS_KEY,
  resetSwapRemoteConfigControls,
  setSwapRemoteConfigControls,
} from '../swapWeightsConfig';

describe('swapWeightsConfig', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('userId 分桶稳定（同 userId 命中同 bucket）', async () => {
    const a1 = await getSwapWeightsConfig({ userId: 'user-1001' });
    const a2 = await getSwapWeightsConfig({ userId: 'user-1001' });

    expect(a1.bucket).toBe(a2.bucket);
  });

  it('无 userId 时缓存 bucket，重启前后保持稳定', async () => {
    const c1 = await getSwapWeightsConfig();
    const cache = await AsyncStorage.getItem(SWAP_BUCKET_CACHE_KEY);
    const c2 = await getSwapWeightsConfig();

    expect(cache).toBe(c1.bucket);
    expect(c2.bucket).toBe(c1.bucket);
  });

  it('远端覆盖生效并标记 source=remote', async () => {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '1');
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, 'https://example.com/swap-weights');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ all: { category: 777 } }),
    });

    const config = await getSwapWeightsConfig({ userId: 'bucket-b-user' });

    expect(config.source).toBe('remote');
    expect(config.weights.category).toBe(777);
  });

  it('支持本地覆盖并优先于远端，source=local', async () => {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '1');
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, 'https://example.com/swap-weights');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ all: { category: 777 } }),
    });

    await AsyncStorage.setItem(
      SWAP_WEIGHTS_OVERRIDE_KEY,
      JSON.stringify({
        all: { category: 999 },
        B: { stage: 123 },
      }),
    );

    const config = await getSwapWeightsConfig({ userId: 'bucket-b-user' });

    expect(config.source).toBe('local');
    expect(config.weights.category).toBe(999);
    if (config.bucket === 'B') {
      expect(config.weights.stage).toBe(123);
    }
  });

  it('远端失败时自动降级到默认配置', async () => {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '1');
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, 'https://example.com/swap-weights');
    global.fetch.mockRejectedValue(new Error('network down'));

    const config = await getSwapWeightsConfig({ userId: 'user-1001' });

    expect(config.source).toBe('default');
  });

  it('远端超时阈值可配置并会传入 AbortSignal', async () => {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '1');
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, 'https://example.com/swap-weights');
    await AsyncStorage.setItem(SWAP_REMOTE_TIMEOUT_MS_KEY, '900');

    global.fetch.mockImplementation((_url, options) => {
      expect(options.signal).toBeDefined();
      return Promise.resolve({
        ok: true,
        json: async () => ({ all: { time: 666 } }),
      });
    });

    const config = await getSwapWeightsConfig({ userId: 'user-1001' });

    expect(config.source).toBe('remote');
    expect(config.weights.time).toBe(666);
  });

  it('未启用远端开关时即使配置 URL 也不请求远端', async () => {
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_ENABLED_KEY, '0');
    await AsyncStorage.setItem(SWAP_REMOTE_CONFIG_URL_KEY, 'https://example.com/swap-weights');

    const config = await getSwapWeightsConfig({ userId: 'user-1001' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(config.source).toBe('default');
  });

  it('调试开关支持应用与一键恢复默认', async () => {
    await setSwapRemoteConfigControls({
      enabled: true,
      url: 'https://example.com/weights',
    });

    expect(await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_ENABLED_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_URL_KEY)).toBe('https://example.com/weights');

    await resetSwapRemoteConfigControls();

    expect(await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_ENABLED_KEY)).toBe('0');
    expect(await AsyncStorage.getItem(SWAP_REMOTE_CONFIG_URL_KEY)).toBe('');
  });
});
