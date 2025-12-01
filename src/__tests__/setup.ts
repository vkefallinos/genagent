/**
 * Jest Setup File
 *
 * Configures the test environment
 */

import { mockLLM } from './mock-llm.js';

// Set up environment variables for testing
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

// Global setup and teardown for each test
beforeEach(() => {
  mockLLM.reset();
});

afterEach(() => {
  mockLLM.reset();
});
