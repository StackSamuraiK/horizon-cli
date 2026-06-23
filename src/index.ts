#!/usr/bin/env node
import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { setApiKey, getApiKey, removeApiKey } from './config.js';
import { startRepl } from './repl.js';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';
import { spin, killSpin, showTool, showDone, showToolError, showAI, showError } from './ui.js';
import { printBanner } from './banner.js';

dotenv.config();

const program = new Command();

program
    .name('horizon')
    .description('Horizon — your autonomous AI terminal agent')
    .version('2.0.0')
    .hook('preAction', (_cmd, action) => {
        if (action.name() === 'chat') printBanner();
    });

// ─── auth ──────────────────────────────────────────────────

program
    .command('auth')
    .description('Configure your Gemini API key')
    .action(async () => {
        console.log(chalk.blue.bold('  Authentication'));
        console.log(chalk.dim('  ──────────────────────────────────'));

        const current = getApiKey();
        if (current) {
            console.log(`  ${chalk.yellow('⚠')}  An API key is already configured.`);
            console.log(`  ${chalk.dim('Entering a new one will overwrite it.')}`);
            console.log('');
        }

        const apiKey = await input({
            message: chalk.white('  Enter your Google Gemini API key:'),
            validate: (v: string) => (v.trim().length > 0 ? true : 'API key cannot be empty'),
        });

        setApiKey(apiKey.trim());
        console.log('');
        console.log(`  ${chalk.green('✔')}  ${chalk.white('API key saved.')}`);
        console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon')} ${chalk.dim('to start.')}`);
        console.log('');
    });

// ─── remove-auth ───────────────────────────────────────────

program
    .command('remove-auth')
    .description('Remove your stored Gemini API key')
    .action(() => {
        removeApiKey();
        console.log(`  ${chalk.green('✔')}  ${chalk.white('API key removed.')}`);
        console.log('');
    });

// ─── chat (default) ────────────────────────────────────────

program
    .command('chat', { isDefault: true })
    .description('Start an interactive agent session')
    .action(async () => {
        if (!getApiKey()) {
            console.log(`  ${chalk.red('✖')}  No API key found.`);
            console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon auth')} ${chalk.dim('to configure one.')}`);
            console.log('');
            process.exit(1);
        }
        await startRepl();
    });

// ─── execute ───────────────────────────────────────────────

program
    .command('execute <prompt...>')
    .description('Run a single prompt and exit')
    .action(async (parts: string[]) => {
        if (!getApiKey()) {
            console.log(`  ${chalk.red('✖')}  No API key found.`);
            console.log(`  ${chalk.dim('Run')} ${chalk.cyan('horizon auth')} ${chalk.dim('to configure one.')}`);
            console.log('');
            process.exit(1);
        }

        const prompt = parts.join(' ');
        console.log(`  ${chalk.cyan('◈')}  ${chalk.white('Prompt:')} ${chalk.dim(prompt)}`);
        console.log('');

        spin('Thinking…');

        try {
            const chat = await createChat();
            let response = await chat.sendMessage({ message: prompt });
            let iterations = 0;

            while (
                response.functionCalls &&
                response.functionCalls.length > 0 &&
                iterations < 50
            ) {
                iterations++;
                killSpin();

                const toolResponses: any[] = [];
                for (const call of response.functionCalls) {
                    const name = call.name || '';
                    const args = (call.args || {}) as Record<string, string>;
                    const detail =
                        args.command || args.path || args.question || args.pattern || args.query || args.directory || '';

                    showTool(name, detail);
                    const result = await handleToolCall(name, args);

                    if (result.startsWith('Error')) {
                        showToolError(result);
                    } else {
                        showDone();
                    }

                    toolResponses.push({
                        functionResponse: { name: call.name, response: { result } },
                    });
                }

                spin('Thinking…');
                response = await chat.sendMessage({ message: toolResponses });
            }

            killSpin();
            if (response.text) showAI(response.text);
        } catch (err: any) {
            killSpin();
            const msg: string = err?.message || String(err);
            const isLimit =
                err?.status === 429 ||
                msg.includes('429') ||
                msg.toLowerCase().includes('quota') ||
                msg.toLowerCase().includes('limit');

            if (isLimit) {
                showError('Rate limit reached.', 'Wait a moment or switch your API key.');
            } else {
                showError('Something went wrong.', msg);
            }
        }
    });

program.parse(process.argv);
