import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';

import { getPromptCount, incrementPromptCount } from './config.js';

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
            incrementPromptCount();
            const count = getPromptCount();
            if (count > 15 && count <= 20) {
                console.log(chalk.yellow(`⚠️ Warning: You only have ${20 - count + 1} free LLM requests available until the 20 free limit.`));
            }

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
            const isLimitError = err.status === 429 ||
                (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('limit')));

            if (isLimitError) {
                console.error(chalk.red('\nError: the request limit may be out try another api key'));
            } else {
                console.error(chalk.red('\nError communicating with AI:'), err.message);
            }
        }
    }
}
