import './perf-suites/measureAnonymous.perf.mjs';
import './perf-suites/measureMap.perf.mjs';
import './perf-suites/measureSearch.perf.mjs';
import './perf-suites/trie.perf.mjs';

import { fileURLToPath } from 'node:url';

import asTable from 'as-table';
import chalk from 'chalk';
import { Argument, Command, program as defaultCommand } from 'commander';
import * as path from 'path';

import { getActiveSuites, PerfSuite } from './perfSuite.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AppOptions {
    repeat?: number;
    timeout?: number;
    all?: boolean;
}

export async function app(program = defaultCommand): Promise<Command> {
    const argument = new Argument('[test-suite...]', 'list of test suites to run');
    argument.variadic = true;

    program
        .name('perf runner')
        .addArgument(argument)
        .description('Run performance tests.')
        .option('-a, --all', 'run all tests', false)
        .option('--repeat <count>', 'repeat the tests', (v) => Number(v), 1)
        .option('-t, --timeout <timeout>', 'timeout for each test', (v) => Number(v), 1000)
        .action(async (suiteNamesToRun: string[], options: AppOptions) => {
            // console.log('Options: %o', optionsCli);
            const suites = getActiveSuites();

            let numSuitesRun = 0;
            let showRepeatMsg = false;

            for (let repeat = options.repeat || 1; repeat > 0; repeat--) {
                if (showRepeatMsg) {
                    console.log(chalk.yellow(`Repeating tests: ${repeat} more time${repeat > 1 ? 's' : ''}.`));
                }
                numSuitesRun = await runTestSuites(suites, suiteNamesToRun, options);
                if (!numSuitesRun) break;
                showRepeatMsg = true;
            }

            if (!numSuitesRun) {
                console.log(chalk.red('No suites to run.'));
                console.log(chalk.yellow('Available suites:'));
                const width = process.stdout.columns || 80;
                const table = asTable.configure({ maxTotalWidth: width - 2 })(
                    suites.map((suite) => ({ Suite: suite.name, Description: suite.description })),
                );
                console.log(
                    table
                        .split('\n')
                        .map((line) => `  ${line}`)
                        .join('\n'),
                );
            }

            console.log(chalk.green('done.'));
        });

    program.showHelpAfterError();
    return program;
}

async function runTestSuites(suites: PerfSuite[], suiteNamesToRun: string[], options: AppOptions): Promise<number> {
    const timeout = options.timeout || 1000;
    const suitesRun = new Set<PerfSuite>();

    async function _runSuite(suites: PerfSuite[]) {
        for (const suite of suites) {
            if (suitesRun.has(suite)) continue;
            suitesRun.add(suite);
            console.log(chalk.green(`Running Perf Suite: ${suite.name}`));
            await suite.setTimeout(timeout).runTests();
        }
    }

    async function runSuite(name: string) {
        if (name === 'all') {
            await _runSuite(suites);
            return;
        }
        const matching = suites.filter((suite) => suite.name.toLowerCase().startsWith(name.toLowerCase()));
        if (!matching.length) {
            console.log(chalk.red(`Unknown test method: ${name}`));
            return;
        }
        await _runSuite(matching);
    }

    for (const name of suiteNamesToRun) {
        await runSuite(name);
    }

    return suitesRun.size;
}

export async function run(argv?: string[], program?: Command): Promise<void> {
    const prog = await app(program);
    await prog.parseAsync(argv);
}
