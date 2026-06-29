import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

// Two pages:
//   index.html  → the art preview workbench (character workstream)
//   app.html    → Miro live (the product: perception → brain → state → pet)
//
// The /cerebras proxy forwards to the Cerebras API and injects the key
// server-side, so the key never ships to the browser bundle and CORS is a non-issue.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: '127.0.0.1',
      proxy: {
        '/cerebras': {
          target: 'https://api.cerebras.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cerebras/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.CEREBRAS_API_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${env.CEREBRAS_API_KEY}`);
              }
            });
          },
        },
      },
    },
    build: {
      target: 'esnext', // allow top-level await (used in the PixiJS entries)
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          app: resolve(process.cwd(), 'app.html'),
        },
      },
    },
  };
});
