#!/usr/bin/env node
import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { setApiKey, getApiKey, removeApiKey, getPromptCount, incrementPromptCount } from './config.js';
import { startRepl } from './repl.js';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';

// Load .env relative to runtime if present, though global CLI primarily uses config
dotenv.config();

const program = new Command();

program
    .name('horizon')
    .description('Horizon CLI - Your personal AI terminal assistant')
    .version('1.0.0');

program
    .command('auth')
    .description('Configure your Gemini API key')
    .action(async () => {
        console.log(chalk.blue('Welcome to Horizon CLI Authentication'));
        const currentKey = getApiKey();
        if (currentKey) {
            console.log(chalk.yellow('An API key is already configured. Entering a new one will overwrite it.'));
        }

        const apiKey = await input({
            message: 'Enter your Google Gemini API key:',
            validate: (val: string) => val.trim().length > 0 ? true : 'API key cannot be empty'
        });

        setApiKey(apiKey.trim());
        console.log(chalk.green('✅ API key securely saved locally.'));
    });

program
    .command('remove-auth')
    .description('Remove your securely stored Gemini API key')
    .action(() => {
        removeApiKey();
        console.log(chalk.green('✅ API key successfully removed from local storage.'));
    });

program
    .command('chat', { isDefault: true })
    .description('Start an interactive chat session with Horizon')
    .action(async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.log(chalk.red('❌ Missing API key. Please run `horizon auth` first.'));
            process.exit(1);
        }
        console.log(chalk.magenta('Starting interactive LLM chat loop...'));
        await startRepl();
    });

program
    .command('execute <prompt...>')
    .description('Run a single prompt and exit')
    .action(async (promptParts: string[]) => {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.log(chalk.red('❌ Missing API key. Please run `horizon auth` first.'));
            process.exit(1);
        }
        const prompt = promptParts.join(' ');
        console.log(chalk.cyan(`Executing single prompt: "${prompt}"...`));
        try {
            incrementPromptCount();
            const count = getPromptCount();
            if (count > 15 && count <= 20) {
                console.log(chalk.yellow(`⚠️ Warning: You only have ${20 - count + 1} free LLM requests available until the 20 free limit.`));
            }

            const chat = await createChat();
            let response = await chat.sendMessage({ message: prompt });

            // Handle tool calls iteratively
            while (response.functionCalls && response.functionCalls.length > 0) {
                console.log(chalk.gray(`[Horizon is thinking and using tools...]`));

                const toolResponses = [];
                for (const call of response.functionCalls) {
                    const name = call.name || '';
                    console.log(chalk.dim(`  Running ${name}...`));
                    const result = await handleToolCall(name, call.args);
                    toolResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { result }
                        }
                    });
                }

                response = await chat.sendMessage({ message: toolResponses as any });
            }

            console.log(chalk.green('\nHorizon:'));
            console.log(response.text);
        } catch (err: any) {
            const isLimitError = err.status === 429 ||
                (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('limit')));

            if (isLimitError) {
                console.error(chalk.red('\nError: the request limit may be out try another api key'));
            } else {
                console.error(chalk.red('Error:'), err.message);
            }
        }
    });

program.parse(process.argv);
