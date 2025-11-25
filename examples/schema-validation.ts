import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example demonstrating response schema validation with automatic retries
 *
 * This example shows how the library:
 * 1. Injects schema instructions into the system prompt
 * 2. Validates LLM responses against the provided Zod schema
 * 3. Automatically retries with error feedback if validation fails
 */

async function main() {
  console.log('🔍 Testing response schema validation...\n');

  // Define a strict schema for the response
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

  try {
    const result = await runPrompt(
      async ({ $ }) => {
        return $`Create a profile for a fictional software engineer named Alex who loves coding and lives in San Francisco.`;
      },
      {
        model: 'large',
        responseSchema: PersonSchema,
        system: [
          'You are a helpful assistant that creates detailed person profiles.',
          'Always respond with valid JSON matching the requested schema.'
        ],
        label: 'schema-validation-test',
      }
    );

    console.log('\n✅ Successfully received and validated response:');
    console.log(JSON.stringify(result, null, 2));

    // TypeScript knows the exact type of result!
    console.log(`\n📧 Email: ${result.email}`);
    console.log(`👤 Name: ${result.name}, Age: ${result.age}`);
    console.log(`🏠 Location: ${result.address.city}, ${result.address.country}`);
    console.log(`🎯 Hobbies: ${result.hobbies.join(', ')}`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
