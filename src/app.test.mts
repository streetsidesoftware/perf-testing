import { Command, CommanderError } from 'commander';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { run } from './app.mjs';

// const oc = expect.objectContaining;
// const sc = expect.stringContaining;
// const ac = expect.arrayContaining;

describe('app', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test.each`
        args
        ${'--help'}
    `('run error $args', async ({ args }) => {
        const argv = genArgv(args);
        const program = new Command();
        program.exitOverride((e) => {
            throw e;
        });
        const output = {
            writeOut: vi.fn(),
            writeErr: vi.fn(),
            outputError: vi.fn(),
        };
        program.configureOutput(output);
        await expect(run(argv, program)).rejects.toBeInstanceOf(CommanderError);
        expect(output.outputError).not.toHaveBeenCalled();
        expect(output.writeOut).toHaveBeenCalled();
        expect(output.writeErr).not.toHaveBeenCalled();
    });
});

function genArgv(args: string | string[]): string[] {
    args = typeof args === 'string' ? [args] : args;
    const argv: string[] = [process.argv[0], 'bin.mjs', ...args];
    return argv;
}
