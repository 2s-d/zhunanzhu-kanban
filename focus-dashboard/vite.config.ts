import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  plugins: [
    react(), 
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3007,
    strictPort: true,
    host: true, // 允许外部访问
    open: false, // 不自动打开浏览器
    // 本地开发代理：将 /ws 转发到中转服务器的 WebSocket 端口
    // 这样前端代码里只需要使用相对路径 ws(s)://<host>/ws
    proxy: {
      "/ws": {
        target: "ws://108.160.131.86:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

