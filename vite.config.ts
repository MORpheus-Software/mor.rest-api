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
      port: 5173, // This should be the default
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
    define: {
      // Fix for "process is not defined" error
      'process.env': {},
    },
  };
});
