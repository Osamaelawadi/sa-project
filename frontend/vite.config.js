import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/users': {
        target: 'http://user-service:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/users/, '/users')
      },
      '/api/products': {
        target: 'http://product-service:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/products/, '/products')
      },
      '/api/orders': {
        target: 'http://order-service:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/orders/, '/orders')
      }
    }
  }
})
