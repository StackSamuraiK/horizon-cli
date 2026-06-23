#!/usr/bin/env node
import { Command } from 'commander';
import { password } from '@inquirer/prompts';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { setApiKey, getApiKey, removeApiKey } from './config.js';
import { startRepl } from './repl.js';
import { Agent } from './agent.js';
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

        const apiKey = await password({
            message: chalk.white('  Enter your Google Gemini API key:'),
            mask: true,
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

        const agent = await Agent.create();
        await agent.run(prompt);
    });

program.parse(process.argv);
