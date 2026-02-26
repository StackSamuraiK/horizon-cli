#!/usr/bin/env node
import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { setApiKey, getApiKey } from './config.js';
import { startRepl } from './repl.js';
import { createChat } from './ai.js';

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
    .command('chat')
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
            const chat = await createChat();
            let response = await chat.sendMessage({ message: prompt });
            // We'll just print the text. In a fully robust CLI, we'd also process tool calls here.
            console.log(chalk.green('\nHorizon:'));
            console.log(response.text);
        } catch (err: any) {
            console.error(chalk.red('Error:'), err.message);
        }
    });

program.parse(process.argv);
