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
  REACT_APP_AVAILABLE_MODELS?: string;
}

declare global {
  interface Window {
    RUNTIME_CONFIG?: RuntimeConfig;
  }
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
  return 'Mistral Small 3.1 24B';
};

// Get the model ID with the appropriate fallback logic
export const getModelId = (): string => {
  return 'mistralai/mistral-small-3.1-24b-instruct:free';
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

// Get the available models with the appropriate fallback logic
export const getAvailableModels = (): Array<{ id: string; name: string }> => {
  // Hard-coded models list from .env REACT_APP_AVAILABLE_MODELS
  return [
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B' },
    { id: 'deepseek/deepseek-r1-zero:free', name: 'Deepseek R1 Zero' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' }
  ];
}; 