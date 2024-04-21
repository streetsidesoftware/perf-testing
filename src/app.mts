import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Argument, Command, program as defaultCommand } from 'commander';

import { findFiles } from './findFiles.mjs';

interface AppOptions {
    repeat?: number;
    timeout?: number;
    all?: boolean;
    suite?: string[];
    test?: string[];
}

const urlRunnerCli = new URL('./runBenchmarkCli.mjs', import.meta.url).toString();
const pathToRunnerCliModule = fileURLToPath(urlRunnerCli);

export async function app(program = defaultCommand): Promise<Command> {
    const argument = new Argument('[filter...]', 'perf file filter.');
    argument.variadic = true;

    program
        .name('perf runner')
        .addArgument(argument)
        .description('Run performance tests.')
        .option('-a, --all', 'run all tests', false)
        .option('-t, --timeout <timeout>', 'override the timeout for each test', (v) => Number(v))
        .option('-s, --suite <suite...>', 'run matching suites', (v, a: string[] | undefined) => (a || []).concat(v))
        .option('-T, --test <test...>', 'run matching test found in suites', (v, a: string[] | undefined) =>
            (a || []).concat(v),
        )
        .option('--repeat <count>', 'repeat the tests', (v) => Number(v), 1)
        .action(async (suiteNamesToRun: string[], options: AppOptions, command: Command) => {
            if (!suiteNamesToRun.length && !options.all) {
                console.error(chalk.red('No tests to run.'));
                console.error(chalk.yellow('Use --all to run all tests.\n'));
                command.help();
            }

            // console.log('%o', options);

            const found = await findFiles(['**/*.perf.{js,mjs,cjs}', '!**/node_modules/**']);

            const files = found.filter(
                (file) => !suiteNamesToRun.length || suiteNamesToRun.some((name) => file.includes(name)),
            );

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

    if (options.suite?.length) {
        cliOptions.push(...options.suite.flatMap((s) => ['--suite', s]));
    }

    if (options.test?.length) {
        cliOptions.push(...options.test.flatMap((t) => ['--test', t]));
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
