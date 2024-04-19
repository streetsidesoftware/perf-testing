import type { Ora } from 'ora';
import ora from 'ora';

import { createRunningStdDev, RunningStdDev } from './sd.mjs';

export type testFn = (name: string, method: () => void, timeout?: number) => void;
export type testAsyncFn = (name: string, method: () => void | Promise<void>, timeout?: number) => void;

export interface RunnerContext {
    test: testFn;
    testAsync: testAsyncFn;
    timeout: number;
    setTimeout: (timeoutMs: number) => void;
}

export interface TestResult {
    name: string;
    isAsync: boolean;
    /** the total amount of time spent in the test. */
    duration: number;
    /** the number of iterations */
    iterations: number;

    runs: number[];
    /**
     * The error that was thrown.
     */
    error?: Error | undefined;
    /**
     * The timeout in milliseconds used.
     */
    timeout: number;

    /** The time related to testing, but not included in duration. */
    overhead: number;

    iterationCallbacks: number;

    sd: RunningStdDev;
}

export interface RunnerResult {
    description: string;
    results: TestResult[];
}

interface TestDef {
    name: string;
    method: () => unknown;
    timeout: number;
    isAsync: boolean;
}

interface TestDefinitionSync extends TestDef {
    method: () => void;
    isAsync: false;
}

interface TestDefinitionAsync extends TestDef {
    method: () => void | Promise<void>;
    isAsync: true;
}

type TestDefinition = TestDefinitionSync | TestDefinitionAsync;

interface ProgressReporting {
    testStart?(name: string): void;
    testEnd?(result: TestResult): void;
    testIteration?(name: string, iteration: number, duration: number): void;
    log?: typeof console.log;
    error?: typeof console.error;
    stderr?: typeof process.stderr;
    stdout?: typeof process.stdout;
    spinner?: Ora;
}

const defaultTime = 10_000;

export async function runTests(
    description: string,
    testWrapperFn: (context: RunnerContext) => void | Promise<void>,
    progress?: ProgressReporting,
): Promise<RunnerResult> {
    const log = progress?.log || console.log;
    const stderr = progress?.stderr || process.stderr;
    const spinner = progress?.spinner || ora({ stream: stderr });

    let nameWidth = 0;

    const reportTestStart = progress?.testStart ?? ((name: string) => spinner.start(name));
    const reportTestEnd = (result: TestResult) => {
        if (progress?.testEnd) {
            if (spinner.isSpinning) {
                spinner.stop();
            }
            return progress.testEnd(result);
        }

        const { name, duration, iterations, sd } = result;

        const min = sd.min;
        const max = sd.max;
        const p95 = sd.ok ? sd.p95 : NaN;
        const mean = sd.ok ? sd.mean : NaN;
        const ops = (iterations * 1000) / duration;

        if (spinner.isSpinning) {
            if (result.error) {
                spinner.fail(`${name} ${duration.toFixed(2)}ms`);
                log('Error: %o', result.error);
            } else {
                spinner.succeed(
                    `${name.padEnd(nameWidth)}: ` +
                        `ops: ${ops.toFixed(2).padStart(8)} ` +
                        `cnt: ${iterations.toFixed(0).padStart(6)} ` +
                        `mean: ${mean.toPrecision(5).padStart(8)} ` +
                        `p95: ${p95.toPrecision(5).padStart(8)} ` +
                        `min/max: ${min.toPrecision(5).padStart(8)}/${max.toPrecision(5).padStart(8)} ` +
                        `${duration.toFixed(2)}ms `,
                );
            }
        } else {
            if (result.error) {
                log(`Test: ${name} finished in ${duration}ms with error: %o`, result.error);
            } else {
                log(`Test: ${name} finished in ${duration}ms`);
            }
        }
    };
    const reportTestIteration =
        progress?.testIteration ??
        (() => {
            spinner.isSpinning && spinner.render();
        });

    const context: RunnerContext = {
        test,
        testAsync,
        timeout: defaultTime,
        setTimeout: (timeout: number) => {
            context.timeout = timeout;
        },
    };

    const tests: TestDefinition[] = [];
    const results: TestResult[] = [];

    function test(name: string, method: () => void, timeout?: number): void {
        tests.push({ name, method, timeout: timeout ?? context.timeout, isAsync: false });
    }

    function testAsync(name: string, method: () => void | Promise<void>, timeout?: number): void {
        tests.push({ name, method, timeout: timeout ?? context.timeout, isAsync: true });
    }

    async function runTestAsync(test: TestDefinition): Promise<TestResult> {
        const startTime = performance.now();
        let duration = 0;
        const runs: number[] = [];
        let iterations = 0;
        const reportInterval = 100;
        let interval: ReturnType<typeof setInterval> | undefined;
        let error: Error | undefined;
        let iterationCallbacks = 0;
        const sd = createRunningStdDev();
        let lastReport = startTime;

        let nextSd = 0;

        function reportIteration() {
            try {
                ++iterationCallbacks;
                reportTestIteration(test.name, iterations, duration);
            } catch (e) {
                error ??= toError(e);
            }
        }

        try {
            while (performance.now() - startTime < test.timeout && !error) {
                const startTime = performance.now();
                let delta: number;
                try {
                    await test.method();
                    delta = performance.now() - startTime;
                } catch (e) {
                    error = toError(e);
                    break;
                }
                duration += delta;
                const now = performance.now();
                if (now > nextSd) {
                    sd.push(delta);
                    nextSd = performance.now() + 1;
                }
                if (now - lastReport > reportInterval) {
                    reportIteration();
                    lastReport = performance.now();
                }
                iterations++;
            }
            clearInterval(interval);
            interval = undefined;
        } catch (e) {
            error ??= toError(e);
        } finally {
            clearInterval(interval);
        }

        return {
            name: test.name,
            isAsync: false,
            duration,
            iterations,
            runs,
            error,
            timeout: test.timeout,
            overhead: performance.now() - startTime - duration,
            iterationCallbacks,
            sd,
        };
    }

    async function runTest(test: TestDefinition) {
        const result = await runTestAsync(test);
        results.push(result);
        return result;
    }

    await testWrapperFn(context);

    nameWidth = Math.max(...tests.map((t) => t.name.length));

    log(`Running: ${description}:`);
    for (const test of tests) {
        reportTestStart(test.name);
        const result = await runTest(test);
        reportTestEnd(result);
    }

    return {
        description,
        results,
    };
}

function toError(e: unknown): Error {
    return e instanceof Error ? e : new Error(String(e));
}

// function wait(time: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, time));
// }
