import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env so VITE_PUBLIC_PATH can set base for GitHub Pages (e.g. /repo-name/)
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_PUBLIC_PATH || '/';

  return {
    plugins: [react()],
    base,
    server: {
      // Local dev: browser calls /.netlify/functions/... like production; forward to Express.
      proxy: {
        '/.netlify/functions/bias-score': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
          rewrite: () => '/api/bias-score',
        },
      },
    },
  };
});
