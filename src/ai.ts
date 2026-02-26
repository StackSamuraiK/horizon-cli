import { GoogleGenAI } from '@google/genai';
import { getApiKey } from './config.js';
import { toolDeclarations } from './tools/index.js';

export function getClient() {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API key not configured.');
    }
    return new GoogleGenAI({ apiKey });
}

export const systemPrompt = `You are Horizon, a highly capable AI CLI assistant.
You help the user navigate their terminal, write code, and solve problems.
You have access to tools to read and write files, and execute shell commands.
Be concise and helpful.`;

export async function createChat() {
    const ai = getClient();
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations: toolDeclarations }],
        }
    });
    return chat;
}
