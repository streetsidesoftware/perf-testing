import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Argument, Command, program as defaultCommand } from 'commander';
import * as path from 'path';

import { measureAnonymous } from './measureAnonymous.mjs';
import { measureMap } from './measureMap.mjs';
import { measureSearch } from './measureSearch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function version(): Promise<string> {
    const pathPackageJson = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(await fs.readFile(pathPackageJson, 'utf8'));
    return (typeof packageJson === 'object' && packageJson?.version) || '0.0.0';
}

const knownTests = {
    search: measureSearch,
    anonymous: measureAnonymous,
    map: measureMap,
};

const allTests = {
    search: measureSearch,
    anonymous: measureAnonymous,
    map: measureMap,
    all: async (timeout?: number) => {
        for (const test of Object.values(knownTests)) {
            await test(timeout);
        }
    },
};

interface AppOptions {
    timeout?: number;
}

export async function app(program = defaultCommand): Promise<Command> {
    const argument = new Argument('[test-methods...]', 'list of test methods to run');
    argument.choices(Object.keys(allTests));
    argument.default(['all']);
    argument.variadic = true;

    program
        .name('perf runner')
        .addArgument(argument)
        .description('Run performance tests.')
        .option('-t, --timeout <timeout>', 'timeout for each test', (v) => Number(v), 1000)
        .version(await version())
        .action(async (methods: string[], options: AppOptions) => {
            // console.log('Options: %o', optionsCli);
            const timeout = options.timeout || 1000;
            const tests = Object.entries(allTests);
            for (const method of methods) {
                const test = tests.find(([key]) => key === method);
                if (!test) {
                    console.log(chalk.red(`Unknown test method: ${method}`));
                    continue;
                }
                const [key, fn] = test;
                console.log(chalk.green(`Running test: ${key}`));
                await fn(timeout);
            }
            console.log(chalk.green('done.'));
        });

    program.showHelpAfterError();
    return program;
}

export async function run(argv?: string[], program?: Command): Promise<void> {
    const prog = await app(program);
    await prog.parseAsync(argv);
}
