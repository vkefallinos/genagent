import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Converts a Zod schema to a JSON Schema and creates instructions for the LLM
 */
export function createSchemaInstructions(schema: z.ZodSchema): string {
  const jsonSchema = zodToJsonSchema(schema, 'ResponseSchema');

  return `You must respond with valid JSON that matches the following schema:

${JSON.stringify(jsonSchema, null, 2)}

IMPORTANT:
- Your response must be ONLY valid JSON matching this schema
- Do not include any explanatory text before or after the JSON
- Ensure all required fields are present
- Ensure all field types match the schema exactly`;
}

/**
 * Formats a Zod validation error into a clear message for the LLM
 */
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `  - ${path}: ${issue.message}`;
  }).join('\n');

  return `Your previous response did not match the required schema. Please fix the following validation errors:

${issues}

Please provide a corrected response that addresses all these errors.`;
}
