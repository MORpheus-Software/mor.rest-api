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
  REACT_APP_DEFAULT_MODEL_NAME?: string;
  REACT_APP_DEFAULT_MODEL_ID?: string;
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
  console.log('[RUNTIME_CONFIG] Getting model name from window.RUNTIME_CONFIG:', window.RUNTIME_CONFIG?.REACT_APP_DEFAULT_MODEL_NAME);
  console.log('[RUNTIME_CONFIG] Getting model name from process.env:', process.env.REACT_APP_DEFAULT_MODEL_NAME);
  const modelName = window.RUNTIME_CONFIG?.REACT_APP_DEFAULT_MODEL_NAME || process.env.REACT_APP_DEFAULT_MODEL_NAME || 'Auto';
  // Strip any quotes from the model name
  return modelName.replace(/^"|"$/g, '');
};

// Get the model ID with the appropriate fallback logic
export const getModelId = (): string => {
  console.log('[RUNTIME_CONFIG] Getting model ID from window.RUNTIME_CONFIG:', window.RUNTIME_CONFIG?.REACT_APP_DEFAULT_MODEL_ID);
  console.log('[RUNTIME_CONFIG] Getting model ID from process.env:', process.env.REACT_APP_DEFAULT_MODEL_ID);
  const modelId = window.RUNTIME_CONFIG?.REACT_APP_DEFAULT_MODEL_ID || process.env.REACT_APP_DEFAULT_MODEL_ID || 'openrouter/auto';
  // Strip any quotes from the model ID
  return modelId.replace(/^"|"$/g, '');
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
  const defaultModels = [
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B' },
    { id: 'deepseek/deepseek-r1-zero:free', name: 'Deepseek R1 Zero' },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B' }
  ];

  const modelsString = window.RUNTIME_CONFIG?.REACT_APP_AVAILABLE_MODELS || 
                      process.env.REACT_APP_AVAILABLE_MODELS;

  if (!modelsString) {
    return defaultModels;
  }

  try {
    return modelsString.split(',').map(modelStr => {
      const [id, name] = modelStr.split('|');
      return { id, name };
    });
  } catch (error) {
    console.error('[RUNTIME_CONFIG] Error parsing available models:', error);
    return defaultModels;
  }
}; 