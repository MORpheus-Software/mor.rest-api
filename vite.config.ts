import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from process.env and .env files
  // This allows overriding values via runtime environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine if we're in development mode
  const isDevelopment = mode === 'development';
  const isPreview = mode === 'preview' || mode === 'production';
  
  // Check if we're running in the Lovable environment
  const isLovableEnv = process.env.LOVABLE_ENV === 'true' || env.LOVABLE_ENV === 'true';
  
  console.log(`[VITE] Environment: ${mode}`);
  console.log(`[VITE] Lovable environment: ${isLovableEnv ? 'yes' : 'no'}`);
  
  // Get the model environment variables, giving precedence to process.env over .env file
  const modelName = process.env.REACT_APP_DEFAULT_MODEL_NAME || 
                    env.REACT_APP_DEFAULT_MODEL_NAME || 
                    'Llama-3.1-8B';
                    
  const modelId = process.env.REACT_APP_DEFAULT_MODEL_ID || 
                  env.REACT_APP_DEFAULT_MODEL_ID || 
                  'llama-3.1-8b-instant';
  
  // Always use secure Upstash Redis URL for preview and production modes
  const upstashRedisUrl = 'rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379';
  
  // Ensure we're using the right Redis URL for the environment
  const redisUrl = isPreview
    ? upstashRedisUrl
    : (process.env.REDIS_URL || env.REDIS_URL || 'redis://localhost:6379');
  
  console.log(`[VITE] Using model: ${modelName} (${modelId})`);
  console.log(`[VITE] Using Redis URL: ${redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`);

  // Always set the REDIS_URL in process.env so it's available to the application
  process.env.REDIS_URL = redisUrl;
  
  // Explicitly log Redis environment setup
  console.log(`[VITE] Setting process.env.REDIS_URL to: ${process.env.REDIS_URL.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`);
  
  return {
    server: {
      host: "::",
      port: 8080, // Changed from 5173 to 8080 as required
      proxy: {
        '/api': {
          target: isDevelopment ? 'http://localhost:4000' : '/api',
          changeOrigin: isDevelopment,
          secure: !isDevelopment,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[VITE] Proxying ${req.method} ${req.url}`);
            });
          },
        }
      }
    },
    plugins: [
      react(),
      isDevelopment && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    preview: {
      // Add preview server configuration specifically for Lovable
      port: 8080,
      // Don't proxy in preview mode - let the server handle API requests
      proxy: {
        '/api': {
          target: '/api',
          changeOrigin: false,
          rewrite: (path) => path,
        }
      },
    },
    build: {
      // Enable cache busting by adding timestamp hash to filenames
      rollupOptions: {
        output: {
          // Generate unique filenames with hash for proper cache busting
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`
        }
      },
      // Force clean the dist directory before each build
      emptyOutDir: true,
    },
    define: {
      // Fix for "process is not defined" error
      // Properly handle environment variables in both development and production
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || '/api'),
        // Add React App environment variables to make them available in client code
        REACT_APP_DEFAULT_MODEL_NAME: JSON.stringify(modelName),
        REACT_APP_DEFAULT_MODEL_ID: JSON.stringify(modelId),
        // Add Redis URL to the environment, using Upstash URL for preview/production
        REDIS_URL: JSON.stringify(redisUrl),
        // Add Lovable environment flag
        LOVABLE_ENV: JSON.stringify(isLovableEnv),
      },
    },
  };
});
