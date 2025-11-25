import {
  readFile,
  writeFile,
  appendFile,
  unlink,
  readdir,
  stat,
} from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Workspace utilities for file operations
 */

/**
 * Read text content from a file
 * @param path Path to the file
 * @param encoding Text encoding (default: 'utf-8')
 * @returns The file content as a string
 */
export async function readText(
  path: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  return await readFile(path, encoding);
}

/**
 * Read and parse JSON content from a file
 * @param path Path to the JSON file
 * @returns Parsed JSON object
 */
export async function readJSON<T = any>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write text content to a file
 * @param path Path to the file
 * @param content Content to write
 * @param encoding Text encoding (default: 'utf-8')
 */
export async function writeText(
  path: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  await writeFile(path, content, encoding);
}

/**
 * Write JSON content to a file
 * @param path Path to the file
 * @param data Data to serialize as JSON
 * @param pretty Whether to pretty-print the JSON (default: true)
 */
export async function writeJSON(
  path: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFile(path, content, 'utf-8');
}

/**
 * Append text content to a file
 * @param path Path to the file
 * @param content Content to append
 * @param encoding Text encoding (default: 'utf-8')
 */
export async function appendText(
  path: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  await appendFile(path, content, encoding);
}

/**
 * Find files matching a pattern in a directory
 * @param pattern Glob pattern to match (e.g., '*.ts', '**\/*.json')
 * @param cwd Current working directory (default: process.cwd())
 * @returns Array of matching file paths
 */
export async function findFiles(
  pattern: string,
  cwd: string = process.cwd()
): Promise<string[]> {
  // Use find command for glob pattern matching
  try {
    const { stdout } = await execAsync(`find . -name "${pattern}"`, { cwd });
    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^\.\//, ''));
  } catch (error) {
    // If find fails, return empty array
    return [];
  }
}

/**
 * Search for text patterns in files using grep
 * @param pattern Text or regex pattern to search for
 * @param path Path to file or directory to search in
 * @param options Grep options
 * @returns Array of matching lines with file paths
 */
export async function grep(
  pattern: string,
  path: string = '.',
  options: {
    recursive?: boolean;
    ignoreCase?: boolean;
    lineNumber?: boolean;
  } = {}
): Promise<string[]> {
  const flags = [
    options.recursive ? '-r' : '',
    options.ignoreCase ? '-i' : '',
    options.lineNumber ? '-n' : '',
  ]
    .filter((f) => f)
    .join(' ');

  try {
    const { stdout } = await execAsync(
      `grep ${flags} "${pattern}" ${path}`,
      { cwd: process.cwd() }
    );
    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch (error) {
    // If grep finds no matches, it exits with code 1
    // Return empty array in this case
    return [];
  }
}

/**
 * Remove a file
 * @param path Path to the file to remove
 */
export async function removeFile(path: string): Promise<void> {
  await unlink(path);
}
