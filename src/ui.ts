import chalk from 'chalk';
import * as readline from 'readline';

// ─── Spinner ───────────────────────────────────────────────

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let _timer: ReturnType<typeof setInterval> | null = null;
let _frame = 0;
let _text = '';

export function spin(text: string) {
    killSpin();
    _text = text;
    _frame = 0;
    process.stdout.write('\x1b[?25l');
    _timer = setInterval(() => {
        process.stdout.write(`\r\x1b[K  ${chalk.cyan(FRAMES[_frame])} ${chalk.dim(_text)}`);
        _frame = (_frame + 1) % FRAMES.length;
    }, 80);
}

export function killSpin() {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
        process.stdout.write('\r\x1b[K');
        process.stdout.write('\x1b[?25h');
    }
}

// ─── Tool Display ──────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
    readFile: 'read',
    writeFile: 'write',
    runCommand: 'run',
    listDirectory: 'ls',
    searchFiles: 'find',
    searchContent: 'grep',
    createDirectory: 'mkdir',
    askUser: 'ask',
};

export function showTool(name: string, detail: string) {
    const label = TOOL_LABELS[name] || name;
    const max = (process.stdout.columns || 80) - 16;
    const d = detail.length > max ? detail.slice(0, max - 1) + '…' : detail;
    console.log(`  ${chalk.blue('◆')} ${chalk.gray(label.padEnd(6))} ${chalk.white(d)}`);
}

export function showDone() {
    console.log(`  ${chalk.green('✔')} ${chalk.dim('done')}`);
}

export function showToolError(msg: string) {
    const max = (process.stdout.columns || 80) - 6;
    const truncated = msg.length > max ? msg.slice(0, max - 1) + '…' : msg;
    console.log(`  ${chalk.red('✖')} ${chalk.red.dim(truncated)}`);
}

// ─── Ask User (used by askUser tool) ──────────────────────

export function askUserInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(`  ${chalk.yellow('?')} ${question} `, (answer) => {
            rl.close();
            resolve(answer.trim() || '(no response)');
        });
    });
}

// ─── AI Response ───────────────────────────────────────────

export function showAI(text: string) {
    if (!text?.trim()) return;
    const w = Math.min(55, (process.stdout.columns || 80) - 4);
    console.log('');
    console.log(`  ${chalk.green('◆')} ${chalk.bold.green('Horizon')}`);
    console.log(chalk.dim(`  ${'─'.repeat(w)}`));
    console.log('');
    console.log(renderMd(text));
    console.log('');
}

// ─── Markdown Renderer ────────────────────────────────────

function renderMd(text: string): string {
    // fenced code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const w = Math.min((process.stdout.columns || 80) - 6, 70);
        const bar = '─'.repeat(w);
        const lines = code.trimEnd().split('\n').map((l:any) =>
            `  ${chalk.dim('│')} ${l.length > w ? l.slice(0, w - 1) + '…' : l}`
        );
        const header = lang
            ? chalk.dim(`  ┌ ${lang} ${bar.slice(lang.length + 3)}`)
            : chalk.dim(`  ┌${bar}`);
        return `\n${header}\n${lines.join('\n')}\n${chalk.dim(`  └${bar}`)}`;
    });

    // inline code
    text = text.replace(/`([^`]+)`/g, (_, c) => chalk.bgBlack(chalk.cyan(c)));

    // bold
    text = text.replace(/\*\*([^*]+)\*\*/g, (_, t) => chalk.bold(t));

    // bullet points
    text = text.replace(/^[\-\*] (.+)$/gm, (_, t) => `  ${chalk.cyan('•')} ${t}`);

    // numbered lists
    text = text.replace(/^(\d+)\. (.+)$/gm, (_, n, t) => `  ${chalk.cyan(n + '.')} ${t}`);

    // indent remaining lines (skip already-indented and ANSI lines)
    text = text.split('\n').map(line => {
        if (!line) return '';
        if (
            line.startsWith('  ┌') ||
            line.startsWith('  │') ||
            line.startsWith('  └') ||
            line.startsWith('  •') ||
            line.startsWith('\x1b')
        ) return line;
        if (line.startsWith('  ')) return line;
        return '  ' + line;
    }).join('\n');

    return text;
}

// ─── Error ─────────────────────────────────────────────────

export function showError(msg: string, detail?: string) {
    console.log('');
    console.log(`  ${chalk.red('✖')} ${chalk.red(msg)}`);
    if (detail) console.log(`  ${chalk.dim(detail)}`);
    console.log('');
}
