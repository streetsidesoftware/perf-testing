import assert from 'node:assert';

import type { Ora } from 'ora';
import ora from 'ora';

import { createRunningStdDev, RunningStdDev } from './sd.mjs';

export type PerfTestFn = (name: string, method: () => unknown | Promise<unknown>, timeout?: number) => void;

export type UserFn = () => unknown | Promise<unknown>;

export interface RunnerContext {
    test: PerfTestFn;
    /**
     * Register a function to be called after all tests have been run to allow for cleanup.
     * @param fn - The function to run after all tests have been run.
     */
    afterAll: (fn: UserFn) => void;
    /**
     * Register a function to be called after each test has been run to allow for cleanup.
     * @param fn - The function to run after each test.
     */
    afterEach: (fn: UserFn) => void;
    /**
     * Register a function to be called before all tests have been run to allow for setup.
     * @param fn - The function to run before all tests.
     */
    beforeAll: (fn: UserFn) => void;
    /**
     * Register a function to be called before each test has been run to allow for setup.
     * @param fn - The function to run before all tests.
     */
    beforeEach: (fn: UserFn) => void;
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
    name: string;
    description: string | undefined;
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
    error?: typeof console.error;
    stdout?: typeof process.stdout;
    spinner?: Ora;
}

export type SuiteFn = (test: PerfTestFn, context: RunnerContext) => void | Promise<void>;

const defaultTime = 500; // 1/2 second

const activeSuites = new Set<PerfSuite>();

function registerSuite(suite: PerfSuite): void {
    activeSuites.add(suite);
}

export function getActiveSuites(): PerfSuite[] {
    return Array.from(activeSuites);
}

export interface PerfSuite {
    readonly name: string;
    readonly description?: string | undefined;
    readonly runTests: () => Promise<RunnerResult>;
    /**
     * Sets the default timeout for all tests in the suite.
     * @param timeout - time in milliseconds.
     * @returns PerfSuite
     */
    readonly setTimeout: (timeout: number) => this;
}

export function suite(name: string, suiteFn: SuiteFn): PerfSuite;
export function suite(name: string, description: string | undefined, suiteFn: SuiteFn): PerfSuite;
export function suite(name: string, description: string, suiteFn: SuiteFn): PerfSuite;
export function suite(name: string, p2: string | undefined | SuiteFn, p3?: SuiteFn): PerfSuite {
    const description = typeof p2 === 'string' ? p2 : undefined;
    const suiteFn = typeof p2 === 'function' ? p2 : p3;
    assert(suiteFn, 'suiteFn must be a function');

    return new PerfSuiteImpl(name, description, suiteFn);
}

export function runSuite(suite: PerfSuite): Promise<RunnerResult>;
export function runSuite(name: string, description: string | undefined, suiteFn: SuiteFn): Promise<RunnerResult>;
export function runSuite(name: string, suiteFn: SuiteFn): Promise<RunnerResult>;
export function runSuite(suiteOrName: PerfSuite | string, p2?: string | SuiteFn, p3?: SuiteFn): Promise<RunnerResult> {
    if (typeof suiteOrName === 'object') {
        return suiteOrName.runTests();
    }

    if (typeof p2 === 'function') {
        return suite(suiteOrName, p2).runTests();
    }

    assert(typeof p3 === 'function', 'suiteFn must be a function');
    return suite(suiteOrName, p2, p3).runTests();
}

function toError(e: unknown): Error {
    return e instanceof Error ? e : new Error(String(e));
}

function formatResult(result: TestResult, nameWidth: number): string {
    const { name, duration, iterations, sd } = result;

    const min = sd.min;
    const max = sd.max;
    const p95 = sd.ok ? sd.p95 : NaN;
    const mean = sd.ok ? sd.mean : NaN;
    const ops = (iterations * 1000) / duration;

    if (result.error) {
        return `${name.padEnd(nameWidth)}: ${duration.toFixed(2)}ms\n` + `Error: ${result.error}`;
    }

    const msg =
        `${name.padEnd(nameWidth)}: ` +
        `ops: ${ops.toFixed(2).padStart(8)} ` +
        `cnt: ${iterations.toFixed(0).padStart(6)} ` +
        `mean: ${mean.toPrecision(5).padStart(8)} ` +
        `p95: ${p95.toPrecision(5).padStart(8)} ` +
        `min/max: ${min.toPrecision(5).padStart(8)}/${max.toPrecision(5).padStart(8)} ` +
        `${duration.toFixed(2).padStart(7)}ms `;

    return msg;
}

// function wait(time: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, time));
// }

class PerfSuiteImpl implements PerfSuite {
    timeout: number = defaultTime;

    constructor(
        public readonly name: string,
        public readonly description: string | undefined,
        public readonly suiteFn: SuiteFn,
    ) {
        registerSuite(this);
    }

    runTests(): Promise<RunnerResult> {
        return runTests(this);
    }

    setTimeout(timeout: number): this {
        this.timeout = timeout;
        return this;
    }
}

async function runTests(suite: PerfSuiteImpl, progress?: ProgressReporting): Promise<RunnerResult> {
    const stdout = progress?.stdout || process.stdout;
    const spinner = progress?.spinner || ora({ stream: stdout, discardStdin: false, hideCursor: false });
    const log = (msg: string) => stdout.write(msg + '\n');
    const { name, description } = suite;

    let nameWidth = 0;

    const reportTestStart = progress?.testStart ?? ((name: string) => stdout.isTTY && spinner.start(name));
    const reportTestEnd = (result: TestResult) => {
        if (progress?.testEnd) {
            if (spinner.isSpinning) {
                spinner.stop();
            }
            return progress.testEnd(result);
        }

        const msg = formatResult(result, nameWidth);

        if (spinner.isSpinning) {
            if (result.error) {
                spinner.fail(msg);
            } else {
                spinner.succeed(msg);
            }
        } else {
            if (result.error) {
                log(`X ${msg}`);
            } else {
                log(`✔ ${msg}`);
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
        beforeAll,
        beforeEach,
        afterAll,
        afterEach,
        timeout: suite.timeout || defaultTime,
        setTimeout: (timeout: number) => {
            context.timeout = timeout;
        },
    };

    const tests: TestDefinition[] = [];
    const results: TestResult[] = [];
    const beforeEachFns: UserFn[] = [];
    const afterEachFns: UserFn[] = [];
    const beforeAllFns: UserFn[] = [];
    const afterAllFns: UserFn[] = [];

    function test(name: string, method: () => void, timeout?: number): void {
        tests.push({ name, method, timeout: timeout ?? context.timeout, isAsync: false });
    }

    function beforeEach(fn: UserFn) {
        beforeEachFns.push(fn);
    }

    function afterEach(fn: UserFn) {
        afterEachFns.push(fn);
    }

    function beforeAll(fn: UserFn) {
        beforeAllFns.push(fn);
    }

    function afterAll(fn: UserFn) {
        afterAllFns.push(fn);
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
                await runBeforeEach();
                const startTime = performance.now();
                let delta: number;
                try {
                    await test.method();
                    delta = performance.now() - startTime;
                } catch (e) {
                    error = toError(e);
                    break;
                }
                await runAfterEach();
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

    async function runBeforeAll() {
        for (const fn of beforeAllFns) {
            await fn();
        }
    }

    async function runAfterAll() {
        for (const fn of afterAllFns) {
            await fn();
        }
    }

    async function runBeforeEach() {
        for (const fn of beforeEachFns) {
            await fn();
        }
    }

    async function runAfterEach() {
        for (const fn of afterEachFns) {
            await fn();
        }
    }

    await suite.suiteFn(context.test, context);

    nameWidth = Math.max(...tests.map((t) => t.name.length));

    // log(`Running: ${name}:`);
    if (description) {
        log(description);
    }
    await runBeforeAll();
    for (const test of tests) {
        reportTestStart(test.name);
        const result = await runTest(test);
        reportTestEnd(result);
    }
    await runAfterAll();

    return {
        name,
        description,
        results,
    };
}
