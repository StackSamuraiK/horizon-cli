import * as readline from 'readline';
import chalk from 'chalk';
import { Agent } from './agent.js';
import { killSpin } from './ui.js';

export async function startRepl() {
    const agent = await Agent.create();

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
        await agent.run(input);
        busy = false;
        prompt();
    });

    rl.on('close', () => {
        killSpin();
        process.exit(0);
    });
}
