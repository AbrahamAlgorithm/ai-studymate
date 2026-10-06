import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// dev only, the go server does this in production. reads just these two values out of backend/.env
const firebaseConfig = () => ({
  name: 'firebase-config',
  apply: 'serve',
  transformIndexHtml() {
    const backendDir = fileURLToPath(new URL('./backend', import.meta.url))
    const env = loadEnv('development', backendDir, ['FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY'])
    if (!env.FIREBASE_WEB_API_KEY) return
    const config = {
      apiKey: env.FIREBASE_WEB_API_KEY,
      authDomain: `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.FIREBASE_PROJECT_ID,
    }
    return [{ tag: 'script', injectTo: 'head-prepend', children: `window.__FIREBASE_CONFIG__ = ${JSON.stringify(config).replace(/</g, '\\u003c')}` }]
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), firebaseConfig()],
  build: {
    rollupOptions: {
      output: {
        // these barely change, so browsers keep them cached between deploys
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    // the go api runs on 8080 in dev, proxying keeps it same origin
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        // it's same origin through the proxy, without this the api rejects vite's backup ports like 5174
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
})
