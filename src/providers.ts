import { createOpenAI } from '@ai-sdk/openai';

/**
 * Configuration for a custom OpenAI-compatible provider
 */
interface CustomProviderConfig {
  apiKey: string;
  baseURL: string;
  apiType: string;
}

/**
 * Gets custom provider configuration from environment variables
 * Looks for variables like OPENROUTER_API_KEY, OPENROUTER_API_BASE, OPENROUTER_API_TYPE
 *
 * @param provider - The provider name (e.g., 'openrouter', 'zai')
 * @returns Provider configuration if available, null otherwise
 */
function getCustomProviderConfig(provider: string): CustomProviderConfig | null {
  const envPrefix = provider.toUpperCase();
  const apiKey = process.env[`${envPrefix}_API_KEY`];
  const baseURL = process.env[`${envPrefix}_API_BASE`];
  const apiType = process.env[`${envPrefix}_API_TYPE`];

  if (apiKey && baseURL && apiType === 'openai') {
    return { apiKey, baseURL, apiType };
  }

  return null;
}

/**
 * Creates a model instance for custom OpenAI-compatible providers
 *
 * @param provider - The provider name (e.g., 'openrouter', 'zai')
 * @param modelId - The model identifier
 * @returns Model instance if custom provider is configured, null otherwise
 */
export function createCustomProviderModel(provider: string, modelId: string): any | null {
  const config = getCustomProviderConfig(provider);

  if (!config) {
    return null;
  }

  // Create OpenAI-compatible provider with custom configuration
  const customProvider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return customProvider(modelId);
}
