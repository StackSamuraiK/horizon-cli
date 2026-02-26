import { Type, FunctionDeclaration } from '@google/genai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Read the contents of a local file',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: {
                    type: Type.STRING,
                    description: 'The absolute or relative path to the file'
                }
            },
            required: ['path']
        }
    },
    {
        name: 'writeFile',
        description: 'Write content to a local file',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: {
                    type: Type.STRING,
                    description: 'The path where the file will be written'
                },
                content: {
                    type: Type.STRING,
                    description: 'The content to write to the file'
                }
            },
            required: ['path', 'content']
        }
    },
    {
        name: 'runCommand',
        description: 'Execute a shell command in the terminal',
        parameters: {
            type: Type.OBJECT,
            properties: {
                command: {
                    type: Type.STRING,
                    description: 'The shell command to execute'
                }
            },
            required: ['command']
        }
    }
];

export async function handleToolCall(name: string, args: any): Promise<string> {
    try {
        switch (name) {
            case 'readFile':
                return await fs.readFile(args.path, 'utf8');
            case 'writeFile':
                await fs.writeFile(args.path, args.content, 'utf8');
                return `Successfully wrote to ${args.path}`;
            case 'runCommand': {
                const { stdout, stderr } = await execAsync(args.command);
                if (stderr && !stdout) return `stderr: ${stderr}`;
                return stdout;
            }
            default:
                return `Unknown tool: ${name}`;
        }
    } catch (err: any) {
        return `Error executing tool ${name}: ${err.message}`;
    }
}
