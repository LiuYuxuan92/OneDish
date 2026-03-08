jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockPost = jest.fn();

jest.mock('axios', () => ({
  post: (...args: any[]) => mockPost(...args),
  create: jest.fn(() => ({
    defaults: { baseURL: 'http://localhost:3000/api/v1' },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

describe('useAuth web auth state sync', () => {
  let React: typeof import('react');
  let TestRenderer: typeof import('react-test-renderer');
  let useAuth: typeof import('../useAuth').useAuth;
  let localStorageMock: {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, '__DEV__', {
      value: true,
      configurable: true,
    });

    React = require('react');
    TestRenderer = require('react-test-renderer');
    ({ useAuth } = require('../useAuth'));
  });

  function renderHook() {
    const latest: { current: any } = { current: null };

    function Probe() {
      latest.current = useAuth();
      return null;
    }

    let renderer: import('react-test-renderer').ReactTestRenderer;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(React.createElement(Probe));
    });

    return {
      latest,
      unmount: () => renderer!.unmount(),
    };
  }

  it('auto guest login on web without token and sync login state across hook instances', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    mockPost.mockResolvedValue({
      data: {
        data: { token: 'guest-token' },
      },
    });

    const first = renderHook();
    const second = renderHook();

    await TestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPost).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/guest');
    expect(first.latest.current.isAuthenticated).toBe(true);
    expect(second.latest.current.isAuthenticated).toBe(true);

    await TestRenderer.act(async () => {
      await second.latest.current.logout();
    });

    expect(first.latest.current.isAuthenticated).toBe(false);
    expect(second.latest.current.isAuthenticated).toBe(false);

    first.unmount();
    second.unmount();
  });
});
