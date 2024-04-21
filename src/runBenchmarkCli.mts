/**
 * This cli is designed to run the benchmarking suites found in the files on the command line.
 */

import { pathToFileURL } from 'node:url';
import type { ParseArgsConfig } from 'node:util';
import { parseArgs } from 'node:util';

import { runBenchmarkSuites } from './run.mjs';

const cwdUrl = pathToFileURL(process.cwd() + '/');

async function run(args: string[]) {
    const parseConfig = {
        args,
        strict: true,
        allowPositionals: true,
        options: {
            repeat: { type: 'string', short: 'r' },
            timeout: { type: 'string', short: 't' },
            test: { type: 'string', short: 'T', multiple: true },
            suite: { type: 'string', short: 'S', multiple: true },
        },
    } as const satisfies ParseArgsConfig;

    const parsed = parseArgs(parseConfig);

    const repeat = Number(parsed.values['repeat'] || '0') || undefined;
    const timeout = Number(parsed.values['timeout'] || '0') || undefined;
    const tests = parsed.values['test'];
    const suites = parsed.values['suite'];

    const errors: Error[] = [];

    async function importFile(file: string) {
        const url = new URL(file, cwdUrl).toString();
        try {
            await import(url);
        } catch (_) {
            errors.push(new Error(`Failed to import file: ${file}`));
        }
    }

    // Import the files specified on the command line
    await Promise.all(parsed.positionals.map(async (file) => importFile(file)));

    if (errors.length) {
        console.error('Errors:');
        errors.forEach((err) => console.error(err.message));
        process.exitCode = 1;
        return;
    }

    await runBenchmarkSuites(undefined, { repeat, timeout, tests, suites });
}

run(process.argv.slice(2));
