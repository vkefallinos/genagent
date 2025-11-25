import { z } from 'zod';
import { definePlugin, tool } from '../../src/plugins/types.js';

/**
 * Calculator plugin that provides mathematical operations
 */
export const calculatorPlugin = definePlugin({
  name: 'Calculator',
  system: `You have access to a calculator tool that can perform basic mathematical operations.
Use this tool whenever you need to perform calculations.`,
  tools: [
    tool(
      'calculate',
      'Perform a mathematical calculation',
      z.object({
        expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5", "Math.sqrt(16)")'),
      }),
      async ({ expression }) => {
        try {
          // Sanitize the expression to only allow safe mathematical operations
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

          // Use Function constructor instead of eval for slightly better safety
          const result = Function(`'use strict'; return (${sanitized})`)();

          return {
            expression: expression,
            result: result,
            success: true,
          };
        } catch (error) {
          return {
            expression: expression,
            error: error instanceof Error ? error.message : 'Calculation failed',
            success: false,
          };
        }
      }
    ),
    tool(
      'advanced_math',
      'Perform advanced mathematical operations',
      z.object({
        operation: z.enum(['sqrt', 'pow', 'sin', 'cos', 'tan', 'log', 'abs']).describe('The mathematical operation to perform'),
        value: z.number().describe('The input value'),
        exponent: z.number().optional().describe('For pow operation, the exponent to raise the value to'),
      }),
      async ({ operation, value, exponent }) => {
        try {
          let result: number;

          switch (operation) {
            case 'sqrt':
              result = Math.sqrt(value);
              break;
            case 'pow':
              if (exponent === undefined) {
                throw new Error('Exponent is required for pow operation');
              }
              result = Math.pow(value, exponent);
              break;
            case 'sin':
              result = Math.sin(value);
              break;
            case 'cos':
              result = Math.cos(value);
              break;
            case 'tan':
              result = Math.tan(value);
              break;
            case 'log':
              result = Math.log(value);
              break;
            case 'abs':
              result = Math.abs(value);
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          return {
            operation,
            value,
            exponent,
            result,
            success: true,
          };
        } catch (error) {
          return {
            operation,
            value,
            error: error instanceof Error ? error.message : 'Operation failed',
            success: false,
          };
        }
      }
    ),
  ],
});
