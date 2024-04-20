import './perf-suites/measureAnonymous.mjs';
import './perf-suites/measureMap.mjs';
import './perf-suites/measureSearch.mjs';

import { fileURLToPath } from 'node:url';

import asTable from 'as-table';
import chalk from 'chalk';
import { Argument, Command, program as defaultCommand } from 'commander';
import * as path from 'path';

import { getActiveSuites, PerfSuite } from './perfSuite.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AppOptions {
    timeout?: number;
    all?: boolean;
}

export async function app(program = defaultCommand): Promise<Command> {
    const suites = getActiveSuites();
    const setOfSuiteNames = new Set(suites.map((suite) => suite.name));
    const suitesNames = [...setOfSuiteNames, 'all'];

    const argument = new Argument('[test-suite...]', 'list of test suites to run');
    argument.choices(suitesNames);
    argument.variadic = true;

    program
        .name('perf runner')
        .addArgument(argument)
        .description('Run performance tests.')
        .option('-a, --all', 'run all tests', false)
        .option('-t, --timeout <timeout>', 'timeout for each test', (v) => Number(v), 1000)
        .action(async (suiteNamesToRun: string[], options: AppOptions) => {
            // console.log('Options: %o', optionsCli);
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
                const matching = suites.filter((suite) => suite.name === name);
                if (!matching.length) {
                    console.log(chalk.red(`Unknown test method: ${name}`));
                    return;
                }
                await _runSuite(matching);
            }

            for (const name of suiteNamesToRun) {
                await runSuite(name);
            }

            if (!suitesRun.size) {
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

export async function run(argv?: string[], program?: Command): Promise<void> {
    const prog = await app(program);
    await prog.parseAsync(argv);
}
