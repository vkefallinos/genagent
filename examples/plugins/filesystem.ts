import { z } from 'zod';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import { definePlugin, tool } from '../../src/plugins/types.js';

/**
 * Filesystem plugin that provides file operations
 * WARNING: This plugin provides filesystem access. Use with caution.
 */
export const filesystemPlugin = definePlugin({
  name: 'Filesystem',
  system: `You have access to filesystem operations including reading files, writing files, and listing directories.
Always be careful when writing files and make sure not to overwrite important data without user confirmation.
File paths should be relative to the current working directory unless absolute paths are specified.`,
  tools: [
    tool(
      'read_file',
      'Read the contents of a file',
      z.object({
        path: z.string().describe('The path to the file to read'),
        encoding: z.enum(['utf8', 'base64']).default('utf8').describe('The encoding to use when reading the file'),
      }),
      async ({ path, encoding }) => {
        try {
          const content = await readFile(path, encoding as BufferEncoding);
          return {
            path,
            content,
            size: content.length,
            success: true,
          };
        } catch (error) {
          return {
            path,
            error: error instanceof Error ? error.message : 'Failed to read file',
            success: false,
          };
        }
      }
    ),
    tool(
      'write_file',
      'Write content to a file',
      z.object({
        path: z.string().describe('The path to the file to write'),
        content: z.string().describe('The content to write to the file'),
        encoding: z.enum(['utf8', 'base64']).default('utf8').describe('The encoding to use when writing the file'),
      }),
      async ({ path, content, encoding }) => {
        try {
          await writeFile(path, content, encoding as BufferEncoding);
          return {
            path,
            bytesWritten: content.length,
            success: true,
          };
        } catch (error) {
          return {
            path,
            error: error instanceof Error ? error.message : 'Failed to write file',
            success: false,
          };
        }
      }
    ),
    tool(
      'list_directory',
      'List the contents of a directory',
      z.object({
        path: z.string().describe('The path to the directory to list'),
        recursive: z.boolean().default(false).describe('Whether to list subdirectories recursively'),
      }),
      async ({ path, recursive }) => {
        try {
          const files = await readdir(path, { withFileTypes: true });
          const items = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            isFile: file.isFile(),
          }));

          if (recursive) {
            const subdirs = items.filter(item => item.isDirectory);
            for (const subdir of subdirs) {
              const subdirPath = join(path, subdir.name);
              const subdirItems = await readdir(subdirPath, { withFileTypes: true });
              items.push(...subdirItems.map(file => ({
                name: join(subdir.name, file.name),
                isDirectory: file.isDirectory(),
                isFile: file.isFile(),
              })));
            }
          }

          return {
            path,
            items,
            count: items.length,
            success: true,
          };
        } catch (error) {
          return {
            path,
            error: error instanceof Error ? error.message : 'Failed to list directory',
            success: false,
          };
        }
      }
    ),
    tool(
      'create_directory',
      'Create a new directory',
      z.object({
        path: z.string().describe('The path to the directory to create'),
        recursive: z.boolean().default(false).describe('Whether to create parent directories if they don\'t exist'),
      }),
      async ({ path, recursive }) => {
        try {
          await mkdir(path, { recursive });
          return {
            path,
            success: true,
          };
        } catch (error) {
          return {
            path,
            error: error instanceof Error ? error.message : 'Failed to create directory',
            success: false,
          };
        }
      }
    ),
  ],
});
