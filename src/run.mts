import asTable from 'as-table';
import chalk from 'chalk';

import type { PerfSuite } from './perfSuite.mjs';
import { getActiveSuites } from './perfSuite.mjs';

export interface RunOptions {
    repeat?: number | undefined;
    timeout?: number | undefined;
    suites?: string[] | undefined;
    tests?: string[] | undefined;
}

/**
 *
 * @param suiteNames
 * @param options
 */
export async function runBenchmarkSuites(suiteToRun?: (string | PerfSuite)[], options?: RunOptions) {
    const suites = getActiveSuites();

    let numSuitesRun = 0;
    let showRepeatMsg = false;

    for (let repeat = options?.repeat || 1; repeat > 0; repeat--) {
        if (showRepeatMsg) {
            console.log(chalk.yellow(`Repeating tests: ${repeat} more time${repeat > 1 ? 's' : ''}.`));
        }
        numSuitesRun = await runTestSuites(suites, suiteToRun || suites, options || {});
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
}

async function runTestSuites(
    suites: PerfSuite[],
    suitesToRun: (string | PerfSuite)[],
    options: RunOptions,
): Promise<number> {
    const timeout = options.timeout || undefined;
    const suitesRun = new Set<PerfSuite>();

    async function _runSuite(suites: PerfSuite[]) {
        for (const suite of suites) {
            if (suitesRun.has(suite)) continue;
            if (!filterSuite(suite)) continue;
            suitesRun.add(suite);
            console.log(chalk.green(`Running Perf Suite: ${suite.name}`));
            await suite.setTimeout(timeout).runTests({ tests: options.tests });
        }
    }

    async function runSuite(name: string | PerfSuite) {
        if (typeof name !== 'string') {
            return await _runSuite([name]);
        }

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

    for (const name of suitesToRun) {
        await runSuite(name);
    }

    return suitesRun.size;

    function filterSuite(suite: PerfSuite): boolean {
        const { suites } = options;
        if (!suites?.length) return true;
        return !!suites.find((name) => suite.name.toLowerCase().includes(name.toLowerCase()));
    }
}
