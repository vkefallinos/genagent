import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Quickstart example - Weather Agent
 *
 * This example creates a simple weather agent that can:
 * - Get current weather for a location
 * - Provide weather recommendations
 */

async function weatherAgent() {
  const result = await runPrompt(
    async ({ defTool, $ }) => {
      // Define a weather tool
      defTool(
        'getCurrentWeather',
        'Get the current weather for a location',
        z.object({
          location: z.string().describe('The city name'),
          unit: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
        }),
        async ({ location, unit }) => {
          // This would normally call a real weather API
          const temp = unit === 'celsius' ? 22 : 72;
          return {
            location,
            temperature: temp,
            unit,
            condition: 'Partly cloudy',
            humidity: 65,
          };
        }
      );

      // The prompt - using template literal
      const city = 'London';
      return $`What's the weather like in ${city}? Should I bring an umbrella?`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: [
        'You are a helpful weather assistant.',
        'Use the weather tool to get current conditions.',
        'Provide practical advice based on the weather.',
      ],
    }
  );

  console.log('\n✅ Agent response:', result);
}

weatherAgent().catch(console.error);
