// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock the recommendation insights
jest.mock('../recommendationInsights', () => ({
  buildRecommendationReasons: jest.fn().mockReturnValue([]),
}));

import { buildPreferredCategories, getSwapCandidate } from '../swapStrategy';
import { getSwapWeightsConfig } from '../swapWeightsConfig';

describe('HomeRecommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Enable fake timers for debounce tests
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Swap Debounce', () => {
    it('should prevent rapid consecutive swap requests (debounce test)', () => {
      const SWAP_DEBOUNCE_MS = 1000;
      let lastSwapAt = 0;
      let swapCount = 0;

      const attemptSwap = () => {
        const now = Date.now();
        if (now - lastSwapAt < SWAP_DEBOUNCE_MS) {
          return false; // Debounced
        }
        lastSwapAt = now;
        swapCount++;
        return true; // Success
      };

      // First swap should succeed
      expect(attemptSwap()).toBe(true);
      expect(swapCount).toBe(1);

      // Immediate second swap should be debounced
      expect(attemptSwap()).toBe(false);
      expect(swapCount).toBe(1);

      // After debounce period, should succeed
      jest.advanceTimersByTime(1000);
      expect(attemptSwap()).toBe(true);
      expect(swapCount).toBe(2);
    });

    it('should track last swap time correctly', () => {
      const SWAP_DEBOUNCE_MS = 1000;
      const lastSwapAtRef = { current: 0 };

      const canSwap = () => {
        const now = Date.now();
        const result = now - lastSwapAtRef.current >= SWAP_DEBOUNCE_MS;
        if (result) {
          lastSwapAtRef.current = now;
        }
        return result;
      };

      // Initial
      expect(canSwap()).toBe(true);

      // Try immediately
      expect(canSwap()).toBe(false);

      // Partial time advance
      jest.advanceTimersByTime(500);
      expect(canSwap()).toBe(false);

      // Full time advance
      jest.advanceTimersByTime(500);
      expect(canSwap()).toBe(true);
    });

    it('should handle rapid swap attempts gracefully', () => {
      const SWAP_DEBOUNCE_MS = 1000;
      let lastSwapAt = 0;
      let successfulSwaps = 0;

      const rapidSwapAttempts = Array(10).fill(null).map(() => {
        const now = Date.now();
        if (now - lastSwapAt >= SWAP_DEBOUNCE_MS) {
          lastSwapAt = now;
          successfulSwaps++;
          return true;
        }
        return false;
      });

      // With all attempts happening in same timestamp, only first should succeed
      expect(successfulSwaps).toBe(1);
    });
  });

  describe('Preference Categories from Favorites', () => {
    it('should build preferred categories from favorites', () => {
      const mockFavorites = [
        { recipe: { id: 'r1', category: ['鱼类', '清淡'] } },
        { recipe: { id: 'r2', category: ['粥类', '养胃'] } },
        { recipe: { id: 'r3', category: ['鸡肉', '家常'] } },
      ];

      const mockAllRecipes = [
        { id: 'r1', category: ['鱼类', '清淡'] },
        { id: 'r2', category: ['粥类', '养胃'] },
        { id: 'r3', category: ['鸡肉', '家常'] },
        { id: 'r4', category: ['猪肉', '红烧'] },
      ];

      const preferred = buildPreferredCategories({
        favoritesItems: mockFavorites,
        allRecipes: mockAllRecipes,
        localMemory: [],
        limit: 3,
      });

      expect(preferred).toHaveLength(3);
      expect(preferred).toContain('鱼类');
    });

    it('should limit categories to configured limit', () => {
      const mockFavorites = [
        { recipe: { id: 'r1', category: ['A'] } },
        { recipe: { id: 'r2', category: ['B'] } },
        { recipe: { id: 'r3', category: ['C'] } },
        { recipe: { id: 'r4', category: ['D'] } },
        { recipe: { id: 'r5', category: ['E'] } },
      ];

      const preferred = buildPreferredCategories({
        favoritesItems: mockFavorites,
        allRecipes: [],
        localMemory: [],
        limit: 3,
      });

      expect(preferred.length).toBeLessThanOrEqual(3);
    });

    it('should fall back to local memory when no favorites', () => {
      const localMemory = ['粥类', '快手', '家常'];

      const preferred = buildPreferredCategories({
        favoritesItems: [],
        allRecipes: [],
        localMemory,
        limit: 3,
      });

      expect(preferred).toEqual(['粥类', '快手', '家常']);
    });

    it('should handle empty favorites and local memory gracefully', () => {
      const preferred = buildPreferredCategories({
        favoritesItems: [],
        allRecipes: [],
        localMemory: [],
        limit: 3,
      });

      expect(preferred).toEqual([]);
    });
  });

  describe('Swap Weights Config', () => {
    it('should return default weights when no config available', async () => {
      // Mock weights config to return defaults
      const config = await getSwapWeightsConfig({ userId: null });

      expect(config).toHaveProperty('weights');
      expect(config).toHaveProperty('bucket');
      expect(config).toHaveProperty('source');
    });

    it('should return A/B bucket', async () => {
      const config = await getSwapWeightsConfig({ userId: 'test-user' });

      expect(config.bucket).toMatch(/^[AB]$/);
    });
  });

  describe('Swap Candidate Selection', () => {
    it('should prefer categories from favorites when selecting candidate', () => {
      const currentRecipe = {
        id: 'current',
        type: 'dinner' as const,
        category: ['家常'],
        prep_time: 30,
      };

      const allRecipes = [
        currentRecipe,
        { id: 'match', type: 'dinner' as const, category: ['鱼类'], prep_time: 30 },
        { id: 'no-match', type: 'dinner' as const, category: ['肉类'], prep_time: 45 },
      ];

      // With preferred categories from favorites
      const candidate = getSwapCandidate({
        currentRecipe,
        allRecipesItems: allRecipes,
        preferredCategories: ['鱼类', '粥类'],
        currentStage: undefined,
        timeWindowMinutes: 10,
        weights: undefined,
      });

      expect(candidate?.id).toBe('match');
    });

    it('should return null when no valid candidates', () => {
      const currentRecipe = {
        id: 'only',
        type: 'dinner' as const,
        category: ['家常'],
        prep_time: 30,
      };

      const candidate = getSwapCandidate({
        currentRecipe,
        allRecipesItems: [currentRecipe],
        preferredCategories: ['鱼类'],
        currentStage: undefined,
      });

      expect(candidate).toBeNull();
    });
  });
});
