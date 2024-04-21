import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Argument, Command, program as defaultCommand } from 'commander';
import { globby } from 'globby';

interface AppOptions {
    repeat?: number;
    timeout?: number;
    all?: boolean;
}

const urlRunnerCli = new URL('./runBenchmarkCli.mjs', import.meta.url).toString();
const pathToRunnerCliModule = fileURLToPath(urlRunnerCli);

console.log('args: %o', process.argv);

export async function app(program = defaultCommand): Promise<Command> {
    const argument = new Argument('[suite...]', 'list of test suites to run');
    argument.variadic = true;

    program
        .name('perf runner')
        .addArgument(argument)
        .description('Run performance tests.')
        .option('-a, --all', 'run all tests', false)
        .option('--repeat <count>', 'repeat the tests', (v) => Number(v), 1)
        .option('-t, --timeout <timeout>', 'timeout for each test', (v) => Number(v), 1000)
        .action(async (suiteNamesToRun: string[], options: AppOptions) => {
            const found = await globby(['**/*.perf.{js,mjs,cjs}', '!**/node_modules/**']);

            const files = found.filter(
                (file) => !suiteNamesToRun.length || suiteNamesToRun.some((name) => file.includes(name)),
            );

            console.log('%o', { files, found });

            await spawnRunners(files, options);

            console.log(chalk.green('done.'));
        });

    program.showHelpAfterError();
    return program;
}

const defaultAbortTimeout = 1000 * 60 * 5; // 5 minutes

async function spawnRunners(files: string[], options: AppOptions): Promise<void> {
    const cliOptions: string[] = [];

    if (options.repeat) {
        cliOptions.push('--repeat', options.repeat.toString());
    }

    if (options.timeout) {
        cliOptions.push('--timeout', options.timeout.toString());
    }

    for (const file of files) {
        try {
            const code = await spawnRunner([file, ...cliOptions]);
            code && console.error('Runner failed with "%s" code: %d', file, code);
        } catch (e) {
            console.error('Failed to spawn runner.', e);
        }
    }
}

function spawnRunner(args: string[]): Promise<number | undefined> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), defaultAbortTimeout);
    const process = fork(pathToRunnerCliModule, args, { stdio: 'inherit', signal: ac.signal });

    return new Promise((resolve, reject) => {
        let completed = false;
        let error: Error | undefined = undefined;
        let exitCode: number | undefined = undefined;

        function complete() {
            if (completed) return;
            clearTimeout(timeout);
            completed = true;
            process.connected && process.disconnect();
            error ? reject(error) : resolve(exitCode);
        }

        process.on('error', (err) => {
            error = err;
            console.error('Runner error: %o', err);
            complete();
        });

        process.on('exit', (code, _signal) => {
            exitCode = code ?? undefined;
            complete();
        });
    });
}

export async function run(argv?: string[], program?: Command): Promise<void> {
    const prog = await app(program);
    await prog.parseAsync(argv);
}
