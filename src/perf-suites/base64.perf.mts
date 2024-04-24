import assert from 'node:assert';
import fs from 'node:fs/promises';

// @ts-ignore
import { toBytes as fbToBytes } from 'fast-base64';
// @ts-ignore
import { toBytes as fbToBytesJs } from 'fast-base64/js';
import { suite } from 'perf-insight';

import { base64Chars, decode } from '../lib/base64.mjs';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

suite('base64', 'Measure the cost of base64 encoding and decoding', async (test) => {
    const dataRaw = await fs.readFile(new URL('../../ngram/1-gram.tsv', import.meta.url));
    const dataBase64 = dataRaw.toString('base64');

    assert(await verify(dataBase64, fbToBytes));
    assert(await verify(dataBase64, fbToBytesJs));
    assert(await verify(dataBase64, decode));

    test('base64 decode Buffer', () => Buffer.from(dataBase64, 'base64'));
    test('base64 decode', () => decode(dataBase64));
    test('base64 decodeInPlace', () => decodeBitwise(dataBase64));
    test('base64 decodeSlow', () => decodeSlow1(dataBase64));
    test('base64 decode fast-base64', () => fbToBytes(dataBase64));
    test('base64 decode fast-base64/js', () => fbToBytesJs(dataBase64));
});

async function verify(data: string, fn: (data: string) => Uint8Array | Promise<Uint8Array>): Promise<boolean> {
    const buffer = Buffer.from(data, 'base64').toString('utf-8');
    const r = await fn(data);
    return textDecoder.decode(r) === buffer;
}

function decodeSlow1(input: string): Uint8Array {
    const output = new Uint8Array((input.length / 4) * 3);
    let outputIndex = 0;
    for (let i = 0; i < input.length; i += 4) {
        const a = base64Chars.indexOf(input[i]);
        const b = base64Chars.indexOf(input[i + 1]);
        const c = base64Chars.indexOf(input[i + 2]);
        const d = base64Chars.indexOf(input[i + 3]);
        output[outputIndex++] = (a << 2) | (b >> 4);
        if (c !== undefined) output[outputIndex++] = (b << 4) | (c >> 2);
        if (d !== undefined) output[outputIndex++] = (c << 6) | d;
    }
    return output.slice(0, outputIndex);
}

export function decodeInPlace(input: Uint8Array): Uint8Array {
    const len = input.length & ~3;
    const output = input;

    const codeToVal = (charCode: number) => {
        const MM = ((charCode & 0x80) - 0x80) >> 31;
        const v = charCode & 0x7f & MM;

        const r =
            ((((v & ~95) - 1) >> 31) & (v - 65)) + // A-Z for values 0-25
            (~(((v & 96) - 96) >> 31) & (v - 71)) + // a-z for values 26-51
            (~(-((v & 240) ^ 48) >> 31) & ((v & 15) + 52)) + // 0-9 for values 52-61
            (~(-(v ^ 43) >> 31) & 62) + // + for value 62
            (~(-(v ^ 47) >> 31) & 63) + // / for value 63
            (~(-(v ^ 0x3d) >> 31) & -65); // = for value 0 (padding)

        return r;
    };

    let i = 0;
    let j = 0;
    let e0 = 0;
    let e1 = 0;
    for (i = 0, j = 0; i < len; i += 4) {
        const a = codeToVal(output[i]);
        const b = codeToVal(output[i + 1]);
        const c = codeToVal((e0 = output[i + 2]));
        const d = codeToVal((e1 = output[i + 3]));
        output[j++] = (a << 2) | (b >> 4);
        output[j++] = (b << 4) | (c >> 2);
        output[j++] = (c << 6) | d;
    }

    j -= e1 === 0x3d ? 1 : e0 === 0x3d ? 2 : 0;

    return output.slice(0, j);
}

export function decodeBitwise(input: string | Uint8Array): Uint8Array {
    const len = (input.length + 3) & ~3;

    if (typeof input === 'string') {
        if (input.length == len) {
            return decodeInPlace(textEncoder.encode(input));
        }
        return decodeInPlace(textEncoder.encode(input.padEnd(len, '=')));
    }

    const output = new Uint8Array(len);
    output.set(input);

    for (let i = input.length; i < len; i++) {
        output[i] = 0x3d;
    }

    return decodeInPlace(output);
}
