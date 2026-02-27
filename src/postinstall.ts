import fs from 'fs';
import { printBanner } from './banner.js';

// Force chalk to output colors even if npm intercepts stdout/stderr
process.env.FORCE_COLOR = '1';

try {
    // On UNIX systems, attempt to print directly to the user's terminal
    // This bypasses modern npm's behavior of swallowing postinstall stdout logs
    const tty = fs.openSync('/dev/tty', 'w');
    const originalLog = console.log;

    console.log = (...args: any[]) => {
        fs.writeSync(tty, args.join(' ') + '\n');
    };

    printBanner();

    console.log = originalLog;
    fs.closeSync(tty);
} catch (error) {
    // Fallback if not on UNIX or no TTY available (e.g., in CI environments or Windows)
    printBanner();
}
