/**
 * Tests for schema-validation.ts example functionality
 */

import { runPrompt } from '../index.js';
import { mockLLM } from './mock-llm.js';
import { z } from 'zod';

describe('Schema Validation', () => {
  const PersonSchema = z.object({
    name: z.string().min(1, 'Name must not be empty'),
    age: z.number().int().positive('Age must be a positive integer'),
    email: z.string().email('Must be a valid email address'),
    hobbies: z.array(z.string()).min(1, 'Must have at least one hobby'),
    address: z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
      zipCode: z.string(),
    }),
  });

  it('should validate a valid response', async () => {
    const validPerson = {
      name: 'Alex Johnson',
      age: 28,
      email: 'alex@example.com',
      hobbies: ['coding', 'reading', 'hiking'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    mockLLM.addResponse(JSON.stringify(validPerson));

    const result = await runPrompt(
      async ({ $ }) => {
        return $`Create a profile for a fictional software engineer named Alex who loves coding and lives in San Francisco.`;
      },
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
        system: [
          'You are a helpful assistant that creates detailed person profiles.',
          'Always respond with valid JSON matching the requested schema.',
        ],
      }
    );

    expect(result).toEqual(validPerson);
    expect(result.name).toBe('Alex Johnson');
    expect(result.age).toBe(28);
    expect(result.email).toBe('alex@example.com');
    expect(result.hobbies).toContain('coding');
    expect(result.address.city).toBe('San Francisco');
  });

  it('should retry when response has invalid email', async () => {
    const invalidPerson = {
      name: 'Alex Johnson',
      age: 28,
      email: 'invalid-email', // Invalid email format
      hobbies: ['coding'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    const validPerson = {
      ...invalidPerson,
      email: 'alex@example.com', // Fixed email
    };

    // First response fails validation, second succeeds
    mockLLM.addResponses([
      JSON.stringify(invalidPerson),
      JSON.stringify(validPerson),
    ]);

    const result = await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    expect(result.email).toBe('alex@example.com');
    expect(mockLLM.getCalls()).toHaveLength(2);
  });

  it('should retry when response has invalid age', async () => {
    const invalidPerson = {
      name: 'Alex Johnson',
      age: -5, // Negative age (invalid)
      email: 'alex@example.com',
      hobbies: ['coding'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    const validPerson = {
      ...invalidPerson,
      age: 28, // Fixed age
    };

    mockLLM.addResponses([
      JSON.stringify(invalidPerson),
      JSON.stringify(validPerson),
    ]);

    const result = await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    expect(result.age).toBe(28);
    expect(mockLLM.getCalls()).toHaveLength(2);
  });

  it('should retry when response is missing required fields', async () => {
    const incompletePerson = {
      name: 'Alex Johnson',
      age: 28,
      // Missing email, hobbies, and address
    };

    const completePerson = {
      name: 'Alex Johnson',
      age: 28,
      email: 'alex@example.com',
      hobbies: ['coding'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    mockLLM.addResponses([
      JSON.stringify(incompletePerson),
      JSON.stringify(completePerson),
    ]);

    const result = await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    expect(result).toEqual(completePerson);
    expect(mockLLM.getCalls()).toHaveLength(2);
  });

  it('should inject schema instructions into system prompt', async () => {
    const validPerson = {
      name: 'Alex Johnson',
      age: 28,
      email: 'alex@example.com',
      hobbies: ['coding'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    mockLLM.addResponse(JSON.stringify(validPerson));

    await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    const calls = mockLLM.getCalls();
    expect(calls[0].system).toBeDefined();
    // The system prompt should contain JSON schema instructions
    expect(calls[0].system).toContain('JSON');
  });

  it('should handle nested object validation', async () => {
    const invalidAddress = {
      name: 'Alex Johnson',
      age: 28,
      email: 'alex@example.com',
      hobbies: ['coding'],
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        // Missing country and zipCode
      },
    };

    const validAddress = {
      ...invalidAddress,
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    mockLLM.addResponses([
      JSON.stringify(invalidAddress),
      JSON.stringify(validAddress),
    ]);

    const result = await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    expect(result.address.country).toBe('USA');
    expect(result.address.zipCode).toBe('94102');
  });

  it('should handle array validation', async () => {
    const emptyHobbies = {
      name: 'Alex Johnson',
      age: 28,
      email: 'alex@example.com',
      hobbies: [], // Empty array (invalid - must have at least one)
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        country: 'USA',
        zipCode: '94102',
      },
    };

    const withHobbies = {
      ...emptyHobbies,
      hobbies: ['coding', 'reading'],
    };

    mockLLM.addResponses([
      JSON.stringify(emptyHobbies),
      JSON.stringify(withHobbies),
    ]);

    const result = await runPrompt(
      async ({ $ }) => $`Create a profile for Alex`,
      {
        model: 'openai:gpt-4',
        responseSchema: PersonSchema,
      }
    );

    expect(result.hobbies).toHaveLength(2);
    expect(mockLLM.getCalls()).toHaveLength(2);
  });
});
