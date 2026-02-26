import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';

export async function startRepl() {
    const chat = await createChat();

    while (true) {
        const userMessage = await input({ message: chalk.blue('You:') });

        if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
            console.log(chalk.yellow('Goodbye!'));
            break;
        }

        if (!userMessage.trim()) continue;

        try {
            let response = await chat.sendMessage({ message: userMessage });

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
            console.log();

        } catch (err: any) {
            console.error(chalk.red('\nError communicating with AI:'), err.message);
        }
    }
}
