import * as readline from 'readline';
import chalk from 'chalk';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';
import { spin, killSpin, showTool, showDone, showToolError, showAI, showError } from './ui.js';

const MAX_ITERATIONS = 50;

export async function startRepl() {
    const chat = await createChat();

    console.log(chalk.dim(`  Working in ${chalk.white(process.cwd())}`));
    console.log(chalk.dim(`  Type a task and press Enter. ${chalk.yellow('Ctrl+C')} to exit.`));
    console.log('');

    let busy = false;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        historySize: 100,
        removeHistoryDuplicates: true,
    });

    const prompt = () => {
        rl.setPrompt(chalk.cyan.bold('  ❯ '));
        rl.prompt();
    };

    prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (busy) {
            console.log(chalk.dim('  Please wait for the current task to finish…'));
            prompt();
            return;
        }

        if (['exit', 'quit', 'q'].includes(input.toLowerCase())) {
            console.log(chalk.dim('\n  Goodbye!\n'));
            rl.close();
            return;
        }

        if (!input) {
            prompt();
            return;
        }

        busy = true;
        await agentLoop(input, chat);
        busy = false;
        prompt();
    });

    rl.on('close', () => {
        killSpin();
        process.exit(0);
    });
}

// ─── Agent Loop ────────────────────────────────────────────

async function agentLoop(userMessage: string, chat: any) {
    spin('Thinking…');

    try {
        let response = await chat.sendMessage({ message: userMessage });
        let iterations = 0;

        while (
            response.functionCalls &&
            response.functionCalls.length > 0 &&
            iterations < MAX_ITERATIONS
        ) {
            iterations++;
            killSpin();

            const toolResponses: any[] = [];

            for (const call of response.functionCalls) {
                const name: string = call.name || '';
                const args: Record<string, string> = call.args || {};

                // Pick a human-readable detail for display
                const detail =
                    args.command ||
                    args.path ||
                    args.question ||
                    args.pattern ||
                    args.query ||
                    args.directory ||
                    '';

                showTool(name, detail);

                const result = await handleToolCall(name, args);

                if (result.startsWith('Error')) {
                    showToolError(result);
                } else {
                    showDone();
                }

                toolResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { result },
                    },
                });
            }

            spin('Thinking…');
            response = await chat.sendMessage({ message: toolResponses });
        }

        killSpin();

        if (response.text) {
            showAI(response.text);
        }
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
}
