import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in development mode
  const isDevelopment = mode === 'development';
  const isPreview = mode === 'preview' || mode === 'production';
  
  // Default Redis URL
  const redisUrl = 'redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379';
  
  // Set it in process.env
  process.env.REDIS_URL = redisUrl;
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: isDevelopment ? 'http://localhost:4000' : '/api',
          changeOrigin: isDevelopment,
          secure: !isDevelopment
        }
      }
    },
    plugins: [
      react(),
      nodePolyfills({
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: 'buffer/',
        process: 'process/browser',
        stream: 'stream-browserify',
        util: 'util/'
      },
    },
    build: {
      emptyOutDir: true,
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        VITE_API_BASE_URL: JSON.stringify('/api'),
        REDIS_URL: JSON.stringify(redisUrl)
      },
      global: 'window',
    },
  };
}); 