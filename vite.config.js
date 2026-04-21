import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['699a-2605-59c0-e2b-4f08-d464-c306-155f-3449.ngrok-free.app']
  }
})
