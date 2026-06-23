import chalk from 'chalk';

const LINES = [
    { text: '  ██╗  ██╗ ██████╗ ██████╗ ██╗███████╗ ██████╗ ███╗   ██╗', color: '#00E5FF' },
    { text: '  ██║  ██║██╔═══██╗██╔══██╗██║╚══███╔╝██╔═══██╗████╗  ██║', color: '#00C8FF' },
    { text: '  ███████║██║   ██║██████╔╝██║  ███╔╝ ██║   ██║██╔██╗ ██║', color: '#0099FF' },
    { text: '  ██╔══██║██║   ██║██╔══██╗██║ ███╔╝  ██║   ██║██║╚██╗██║', color: '#5577FF' },
    { text: '  ██║  ██║╚██████╔╝██║  ██║██║███████╗╚██████╔╝██║ ╚████║', color: '#7755FF' },
    { text: '  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝', color: '#666666' },
];

export function printBanner() {
    if (process.env.npm_lifecycle_event === 'dev') return;

    console.log('');
    for (const { text, color } of LINES) {
        console.log(chalk.hex(color).bold(text));
    }
    console.log('');
    console.log(
        `  ${chalk.gray('v2.0.1')}  ${chalk.dim('·')}  ${chalk.hex('#7755FF')('autonomous terminal agent')}  ${chalk.dim('·')}  ${chalk.gray('github.com/StackSamuraiK/horizon-cli')}`,
    );
    console.log(chalk.dim(`  ${'─'.repeat(61)}`));
    console.log(`  ${chalk.yellow('tip')} ${chalk.dim('→')} run ${chalk.cyan('horizon auth')} to configure your API key`);
    console.log('');
}
