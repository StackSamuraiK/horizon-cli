#!/usr/bin/env node
import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { setApiKey, getApiKey, removeApiKey, getPromptCount, incrementPromptCount } from './config.js';
import { startRepl } from './repl.js';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';

dotenv.config();

import { printBanner } from './banner.js';


const program = new Command();

program
    .name('horizon')
    .description('Horizon CLI - Your personal AI terminal assistant')
    .version('1.0.0')
    .hook('preAction', (thisCommand, actionCommand) => {
        if (actionCommand.name() === 'chat') {
            printBanner();
        }
    });

program
    .command('auth')
    .description('Configure your Gemini API key')
    .action(async () => {
        console.log(chalk.blue.bold('  Authentication'));
        console.log(chalk.dim('  ──────────────────────────────────'));

        const currentKey = getApiKey();
        if (currentKey) {
            console.log(`  ${chalk.yellow('⚠')}  An API key is already configured.`);
            console.log(`  ${chalk.dim('Entering a new one will overwrite it.')}`);
            console.log('');
        }

        const apiKey = await input({
            message: chalk.white('  Enter your Google Gemini API key:'),
            validate: (val: string) => val.trim().length > 0 ? true : 'API key cannot be empty'
        });

        setApiKey(apiKey.trim());
        console.log('');
        console.log(`  ${chalk.green('✔')}  ${chalk.white('API key securely saved.')}`);
        console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon chat')} ${chalk.dim('to start chatting.')}`);
        console.log('');
    });

program
    .command('remove-auth')
    .description('Remove your securely stored Gemini API key')
    .action(() => {
        removeApiKey();
        console.log(`  ${chalk.green('✔')}  ${chalk.white('API key successfully removed.')}`);
        console.log('');
    });

program
    .command('chat', { isDefault: true })
    .description('Start an interactive chat session with Horizon')
    .action(async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.log(`  ${chalk.red('✖')}  No API key found.`);
            console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon auth')} ${chalk.dim('to configure one.')}`);
            console.log('');
            process.exit(1);
        }
        console.log(`  ${chalk.magenta('◆')}  ${chalk.white('Starting interactive chat...')}`);
        console.log(`  ${chalk.dim('Type')} ${chalk.cyan('exit')} ${chalk.dim('or press')} ${chalk.yellow('Ctrl+C')} ${chalk.dim('to quit.')}`);
        console.log('');
        await startRepl();
    });

program
    .command('execute <prompt...>')
    .description('Run a single prompt and exit')
    .action(async (promptParts: string[]) => {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.log(`  ${chalk.red('✖')}  No API key found.`);
            console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon auth')} ${chalk.dim('to configure one.')}`);
            console.log('');
            process.exit(1);
        }

        const prompt = promptParts.join(' ');
        console.log(`  ${chalk.cyan('◈')}  ${chalk.white('Prompt:')} ${chalk.dim(prompt)}`);
        console.log('');

        try {
            incrementPromptCount();
            const count = getPromptCount();
            if (count > 15 && count <= 20) {
                console.log(`  ${chalk.yellow('⚠')}  ${chalk.yellow(`Only ${20 - count + 1} free requests remaining`)}`);
                console.log('');
            }

            const chat = await createChat();
            let response = await chat.sendMessage({ message: prompt });

            // Handle tool calls iteratively
            while (response.functionCalls && response.functionCalls.length > 0) {
                console.log(`  ${chalk.dim('┌')} ${chalk.gray('Horizon is thinking...')}`);

                const toolResponses = [];
                for (const call of response.functionCalls) {
                    const name = call.name || '';
                    console.log(`  ${chalk.dim('│')}  ${chalk.cyan('◆')} ${chalk.dim('Running')} ${chalk.white(name)}${chalk.dim('...')}`);
                    const result = await handleToolCall(name, call.args);
                    toolResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { result }
                        }
                    });
                }
                console.log(`  ${chalk.dim('└')} ${chalk.green('✔')} ${chalk.dim('Done')}`);
                console.log('');

                response = await chat.sendMessage({ message: toolResponses as any });
            }

            console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'));
            console.log(`  ${chalk.green('◆')} ${chalk.green.bold('Horizon')}`);
            console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'));
            console.log('');
            console.log(response.text);
            console.log('');

        } catch (err: any) {
            const isLimitError = err.status === 429 ||
                (err.message && (
                    err.message.includes('429') ||
                    err.message.toLowerCase().includes('quota') ||
                    err.message.toLowerCase().includes('limit')
                ));

            console.log('');
            if (isLimitError) {
                console.error(`  ${chalk.red('✖')}  ${chalk.red('Request limit reached.')} Try another API key.`);
            } else {
                console.error(`  ${chalk.red('✖')}  ${chalk.red('Error:')} ${err.message}`);
            }
            console.log('');
        }
    });

program.parse(process.argv);