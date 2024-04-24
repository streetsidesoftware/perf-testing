import { describe, expect, test } from 'vitest';

import { decode } from './base64.mjs';

describe('base64', () => {
    test.each`
        str
        ${'Hello there'}
        ${'Hello there 😀😃😄😁😆🥹😅😂'}
        ${''}
        ${'1'}
        ${'12'}
        ${'123'}
        ${'1234'}
        ${'12345'}
        ${'123456'}
    `('decode $str', ({ str }) => {
        const buffer = Buffer.from(str);
        const encoded = buffer.toString('base64');
        // console.log('%o', { str, encoded });
        const decoded = decode(encoded);
        // console.log('%o', decoded);
        expect(Buffer.from(decoded).toString()).toEqual(str);
        expect(decoded).toEqual(Uint8Array.from(buffer));
        expect(decode(encoded.replaceAll('=', ''))).toEqual(Uint8Array.from(buffer));
        expect(Buffer.from(decoded)).toEqual(buffer);
    });
});
