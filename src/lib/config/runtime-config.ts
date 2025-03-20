/**
 * Runtime configuration module
 * 
 * This module provides access to configuration values that can be set at runtime
 * and injected by the server into the client application.
 * 
 * The priority order for configuration values is:
 * 1. Runtime values injected by the server
 * 2. Build-time environment variables
 * 3. Default fallback values
 */

interface RuntimeConfig {
  modelName: string;
  modelId: string;
  // Add other runtime config properties as needed
}

// Access the runtime config injected by the server
const getRuntimeConfig = (): Partial<RuntimeConfig> | undefined => {
  if (typeof window !== 'undefined') {
    return (window as any).RUNTIME_CONFIG;
  }
  return undefined;
};

// Get the model name with the appropriate fallback logic
export const getModelName = (): string => {
  return getRuntimeConfig()?.modelName || 
         process.env.REACT_APP_DEFAULT_MODEL_NAME || 
         'Hermes-3-Llama-3.1-8B';
};

// Get the model ID with the appropriate fallback logic
export const getModelId = (): string => {
  return getRuntimeConfig()?.modelId || 
         process.env.REACT_APP_DEFAULT_MODEL_ID || 
         'llama-3.1-8b-instant';
};

// Check if we're using runtime configuration
export const isUsingRuntimeConfig = (): boolean => {
  return !!getRuntimeConfig();
};

// Log runtime configuration status
export const logConfigSource = (): void => {
  const config = getRuntimeConfig();
  if (config) {
    console.log('[CONFIG] Using runtime configuration injected by server:', config);
  } else {
    console.log('[CONFIG] Using build-time configuration from environment variables');
  }
}; 