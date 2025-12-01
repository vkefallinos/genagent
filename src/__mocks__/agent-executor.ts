/**
 * Mock for agent-executor module
 * Jest will automatically use this when agent-executor is imported in tests
 */

import { mockLoadModelInstance } from '../__tests__/mock-llm.js';

// Re-export everything from the actual module
export * from '../agent-executor.js';

// Override loadModelInstance with the mock
export { mockLoadModelInstance as loadModelInstance };
