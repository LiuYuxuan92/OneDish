import { registerRootComponent } from 'expo';
import App from './src/App';

if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  const ensureDebugOverlay = () => {
    let overlay = document.getElementById('web-runtime-debug');
    if (!overlay) {
      overlay = document.createElement('pre');
      overlay.id = 'web-runtime-debug';
      overlay.style.position = 'fixed';
      overlay.style.left = '12px';
      overlay.style.right = '12px';
      overlay.style.bottom = '12px';
      overlay.style.maxHeight = '45vh';
      overlay.style.overflow = 'auto';
      overlay.style.padding = '12px';
      overlay.style.margin = '0';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.wordBreak = 'break-word';
      overlay.style.borderRadius = '12px';
      overlay.style.background = 'rgba(34, 38, 35, 0.92)';
      overlay.style.color = '#f8f4ec';
      overlay.style.font = '12px/1.5 Consolas, Menlo, monospace';
      overlay.style.zIndex = '999999';
      document.body.appendChild(overlay);
    }
    return overlay;
  };

  const writeDebugMessage = (label, detail) => {
    const overlay = ensureDebugOverlay();
    overlay.textContent = `${label}\n${detail}`;
  };

  window.addEventListener('error', (event) => {
    const detail = event.error?.stack || event.message || 'Unknown error';
    writeDebugMessage('Runtime error', detail);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const detail =
      reason?.stack || reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason, null, 2));
    writeDebugMessage('Unhandled rejection', detail);
  });

  const hash = window.location.hash || '';
  const shouldBootstrapWebAuth = hash.includes('figmacapture=') || hash.includes('debug-auth');

  if (shouldBootstrapWebAuth) {
    if (!localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', 'figma-capture-token');
    }

    if (!localStorage.getItem('user_info')) {
      localStorage.setItem(
        'user_info',
        JSON.stringify({
          id: 'guest-web',
          username: '本地访客',
          email: 'guest@local.onedish',
          family_size: 3,
          baby_age: 12,
          is_guest: false,
          preferences: {
            default_baby_age: 12,
            exclude_ingredients: ['辣椒'],
            prefer_ingredients: ['鸡蛋', '番茄', '鳕鱼'],
            cooking_time_limit: 25,
            difficulty_preference: 'easy',
          },
        })
      );
    }

    if (hash.includes('figmacapture=')) {
      const existingCaptureScript = document.querySelector('script[data-figma-capture="true"]');
      if (!existingCaptureScript) {
        const script = document.createElement('script');
        script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
        script.async = true;
        script.dataset.figmaCapture = 'true';
        document.head.appendChild(script);
      }
    }
  }
}

registerRootComponent(App);
