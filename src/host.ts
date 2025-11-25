import readline from 'readline';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execCallback);

/**
 * Host utilities for interacting with the terminal/user
 */

/**
 * Prompt the user for text input
 * @param prompt The prompt message to display
 * @returns The user's input
 */
export async function input(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompt the user to select one option from a list
 * @param prompt The prompt message to display
 * @param options Array of options to choose from
 * @returns The selected option
 */
export async function select<T extends string>(
  prompt: string,
  options: T[]
): Promise<T> {
  console.log(prompt);
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askForInput = () => {
      rl.question('Enter your choice (number): ', (answer) => {
        const index = parseInt(answer, 10) - 1;
        if (index >= 0 && index < options.length) {
          rl.close();
          resolve(options[index]);
        } else {
          console.log('Invalid choice, please try again.');
          askForInput();
        }
      });
    };
    askForInput();
  });
}

/**
 * Prompt the user to select multiple options from a list
 * @param prompt The prompt message to display
 * @param options Array of options to choose from
 * @returns Array of selected options
 */
export async function multiSelect<T extends string>(
  prompt: string,
  options: T[]
): Promise<T[]> {
  console.log(prompt);
  console.log('(Enter comma-separated numbers, e.g., "1,3,4")');
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askForInput = () => {
      rl.question('Enter your choices: ', (answer) => {
        const indices = answer
          .split(',')
          .map((s) => parseInt(s.trim(), 10) - 1)
          .filter((i) => i >= 0 && i < options.length);

        if (indices.length > 0) {
          rl.close();
          resolve(indices.map((i) => options[i]));
        } else {
          console.log('Invalid choices, please try again.');
          askForInput();
        }
      });
    };
    askForInput();
  });
}

/**
 * Prompt the user for a yes/no confirmation
 * @param prompt The prompt message to display
 * @returns true if user confirms, false otherwise
 */
export async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${prompt} (y/n): `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Fetch data from a URL
 * @param url The URL to fetch from
 * @param options Fetch options
 * @returns The response data
 */
export async function fetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return globalThis.fetch(url, options);
}

/**
 * Execute a shell command
 * @param command The command to execute
 * @returns Object containing stdout, stderr, and exit code
 */
export async function exec(command: string): Promise<{
  stdout: string;
  stderr: string;
}> {
  return execAsync(command);
}
