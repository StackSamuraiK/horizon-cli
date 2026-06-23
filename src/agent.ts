import { createChat } from './ai.js';
import { handleToolCall } from './tools/index.js';
import { spin, killSpin, showTool, showDone, showToolError, showAI, showError } from './ui.js';

const MAX_DEPTH = 3;

export class Agent {
  private chat: any;
  private depth: number;

  constructor(chat: any, depth = 0) {
    this.chat = chat;
    this.depth = depth;
  }

  static async create(depth = 0) {
    return new Agent(await createChat(), depth);
  }

  async run(userMessage: string): Promise<string> {
    spin('Thinking…');

    try {
      let response = await this.chat.sendMessage({ message: userMessage });
      let iterations = 0;
      let finalText = '';

      while (response.functionCalls?.length && iterations < 50) {
        iterations++;
        killSpin();

        const results: any[] = [];

        for (const call of response.functionCalls) {
          const name: string = call.name || '';
          const args: Record<string, string> = call.args || {};

          if (name === 'delegate') {
            if (this.depth >= MAX_DEPTH) {
              showToolError('Max delegation depth reached');
              results.push({
                functionResponse: {
                  name,
                  response: { result: 'Max delegation depth reached. Handle this yourself.' },
                },
              });
              continue;
            }

            const detail = args.task?.slice(0, 80) + (args.task?.length > 80 ? '…' : '');
            showTool('delegate', detail);
            const sub = await Agent.create(this.depth + 1);
            const subResult = await sub.run(args.task);
            showDone();
            results.push({
              functionResponse: { name, response: { result: subResult } },
            });
            continue;
          }

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

          results.push({
            functionResponse: { name, response: { result } },
          });
        }

        spin('Thinking…');
        response = await this.chat.sendMessage({ message: results });
      }

      killSpin();

      if (response.text) {
        showAI(response.text);
        finalText = response.text;
      }

      return finalText;
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
      return '';
    }
  }
}
