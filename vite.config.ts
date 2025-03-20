import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in development mode
  const isDevelopment = mode === 'development';
  
  // Set proxy target based on environment
  const proxyTarget = isDevelopment
    ? 'http://localhost:4000'  // Use local server in development
    : 'https://nfa-proxy-1081887913409.us-west1.run.app'; // Use production server otherwise
  
  console.log(`[VITE] Environment: ${mode}`);
  console.log(`[VITE] Proxy target: ${proxyTarget}`);
  
  return {
    server: {
      host: "::",
      port: 8080, // Changed from 5173 to 8080 as required
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: !isDevelopment, // Only use secure for production
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[VITE] Proxying ${req.method} ${req.url} to ${proxyTarget}`);
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
        VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL || 'https://nfa-proxy-1081887913409.us-west1.run.app'),
      },
    },
  };
});
