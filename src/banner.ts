import chalk from 'chalk';

export function printBanner() {
    if (process.env.npm_lifecycle_event === 'dev') return;
    console.log('');
    console.log(chalk.cyan.bold('  ██╗  ██╗ ██████╗ ██████╗ ██╗███████╗ ██████╗ ███╗   ██╗'));
    console.log(chalk.cyan.bold('  ██║  ██║██╔═══██╗██╔══██╗██║╚══███╔╝██╔═══██╗████╗  ██║'));
    console.log(chalk.cyan.bold('  ███████║██║   ██║██████╔╝██║  ███╔╝ ██║   ██║██╔██╗ ██║'));
    console.log(chalk.blue.bold('  ██╔══██║██║   ██║██╔══██╗██║ ███╔╝  ██║   ██║██║╚██╗██║'));
    console.log(chalk.blue.bold('  ██║  ██║╚██████╔╝██║  ██║██║███████╗╚██████╔╝██║ ╚████║'));
    console.log(chalk.dim('  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝'));
    console.log('');
    console.log(`  ${chalk.gray('v1.0.4')}  ${chalk.dim('·')}  ${chalk.magenta('Your personal AI terminal assistant')}  ${chalk.dim('·')}  ${chalk.gray('github.com/StackSamuraiK/horizon-cli')}`);
    console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'));
    console.log(`  ${chalk.yellow('tip')} ${chalk.dim('→')} run ${chalk.cyan('horizon auth')} to get started`);
    console.log('');
}
