import { Type, FunctionDeclaration } from '@google/genai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { askUserInput } from '../ui.js';

const execAsync = promisify(exec);

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Read the full contents of a file at the given path.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'Absolute or relative file path' },
            },
            required: ['path'],
        },
    },
    {
        name: 'writeFile',
        description: "Write content to a file. Creates parent directories automatically if they don't exist.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'File path to write to' },
                content: { type: Type.STRING, description: 'Content to write' },
            },
            required: ['path', 'content'],
        },
    },
    {
        name: 'runCommand',
        description: 'Execute a shell command and return stdout. Use for package managers, build tools, git, and any CLI commands.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                command: { type: Type.STRING, description: 'The shell command to execute' },
            },
            required: ['command'],
        },
    },
    {
        name: 'listDirectory',
        description: 'List all files and subdirectories inside a directory.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'Directory path to list' },
            },
            required: ['path'],
        },
    },
    {
        name: 'searchFiles',
        description: 'Recursively find files whose names contain the given pattern. Skips node_modules, .git, dist, build.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                directory: { type: Type.STRING, description: 'Root directory to search in' },
                pattern: { type: Type.STRING, description: 'Substring to match against file names (e.g. "tsconfig", ".env")' },
            },
            required: ['directory', 'pattern'],
        },
    },
    {
        name: 'searchContent',
        description: 'Search for a text string inside all files under a directory (recursive grep). Returns file paths with line numbers. Skips node_modules, .git, dist, build.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                directory: { type: Type.STRING, description: 'Root directory to search in' },
                query: { type: Type.STRING, description: 'Text to search for' },
            },
            required: ['directory', 'query'],
        },
    },
    {
        name: 'createDirectory',
        description: 'Create a directory including any missing parent directories (mkdir -p).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'Directory path to create' },
            },
            required: ['path'],
        },
    },
    {
        name: 'askUser',
        description: 'Ask the user a question and return their typed response. Use when you need clarification, a decision, or missing information.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: 'Question to present to the user' },
            },
            required: ['question'],
        },
    },
];

// ─── Tool Handler ──────────────────────────────────────────

export async function handleToolCall(
    name: string,
    args: Record<string, string>,
): Promise<string> {
    try {
        switch (name) {
            // ── file operations ────────────────────────────
            case 'readFile': {
                return await fs.readFile(args.path, 'utf8');
            }

            case 'writeFile': {
                const dir = path.dirname(args.path);
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(args.path, args.content, 'utf8');
                return `Wrote ${args.path} (${args.content.length} bytes)`;
            }

            // ── shell ──────────────────────────────────────
            case 'runCommand': {
                const { stdout, stderr } = await execAsync(args.command, {
                    timeout: 120_000,
                    maxBuffer: 1024 * 1024,
                });
                if (stderr && !stdout) return `stderr: ${stderr}`;
                if (stdout && stderr) return `${stdout}\n[stderr] ${stderr}`;
                return stdout || '(no output)';
            }

            // ── directory ──────────────────────────────────
            case 'listDirectory': {
                const entries = await fs.readdir(args.path || '.', {
                    withFileTypes: true,
                });
                if (entries.length === 0) return '(empty directory)';
                return entries
                    .map(e => `${e.isDirectory() ? 'DIR ' : 'FILE'} ${e.name}`)
                    .join('\n');
            }

            case 'createDirectory': {
                await fs.mkdir(args.path, { recursive: true });
                return `Created directory ${args.path}`;
            }

            // ── search ────────────────────────────────────
            case 'searchFiles': {
                const hits: string[] = [];
                await walk(args.directory || '.', (fp, entry) => {
                    if (entry.name.includes(args.pattern)) hits.push(fp);
                });
                return hits.length ? hits.slice(0, 100).join('\n') : 'No files found';
            }

            case 'searchContent': {
                const hits: string[] = [];
                await walk(args.directory || '.', async (fp, entry) => {
                    if (!entry.isFile()) return;
                    try {
                        const content = await fs.readFile(fp, 'utf8');
                        content.split('\n').forEach((line, i) => {
                            if (line.toLowerCase().includes(args.query.toLowerCase())) {
                                hits.push(`${fp}:${i + 1}: ${line.trim()}`);
                            }
                        });
                    } catch { /* binary / unreadable */ }
                });
                if (!hits.length) return 'No matches found';
                if (hits.length > 50) return hits.slice(0, 50).join('\n') + '\n… (truncated)';
                return hits.join('\n');
            }

            // ── ask user ──────────────────────────────────
            case 'askUser': {
                return await askUserInput(args.question);
            }

            default:
                return `Unknown tool: ${name}`;
        }
    } catch (err: any) {
        return `Error: ${err.message}`;
    }
}

// ─── Directory Walker ──────────────────────────────────────

const SKIP = new Set([
    'node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', '.vercel',
]);

async function walk(
    dir: string,
    fn: (fullPath: string, entry: import('fs').Dirent) => Promise<void> | void,
    depth = 0,
) {
    if (depth > 15) return;
    let entries: import('fs').Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
        if (SKIP.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        await fn(full, entry);
        if (entry.isDirectory()) await walk(full, fn, depth + 1);
    }
}
