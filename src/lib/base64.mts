const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const base64Chars = chars;

const charToValMap = new Uint8Array(128);
[...chars].forEach((char, index) => {
    charToValMap[(char.codePointAt(0) || 0) & 0x7f] = index;
});

export function encode(input: Uint8Array): string {
    let output = '';
    for (let i = 0; i < input.length; i += 3) {
        const a = input[i];
        const b = input[i + 1];
        const c = input[i + 2];
        output += chars[a >> 2];
        output += chars[((a & 3) << 4) | (b >> 4)];
        output += b === undefined ? '=' : chars[((b & 15) << 2) | (c >> 6)];
        output += c === undefined ? '=' : chars[c & 63];
    }
    return output;
}

const textEncoder = new TextEncoder();

export function decodeInPlace(input: Uint8Array): Uint8Array {
    const len = input.length & ~3;
    const remainder = input.length & 3;
    const output = input;

    const map = charToValMap;

    let i = 0;
    let j = 0;
    let e0 = 0;
    let e1 = 0;
    for (i = 0, j = 0; i < len; ) {
        const a = map[output[i++] & 0x7f];
        const b = map[output[i++] & 0x7f];
        const c = map[(e0 = output[i++]) & 0x7f];
        const d = map[(e1 = output[i++]) & 0x7f];
        output[j++] = (a << 2) | (b >> 4);
        output[j++] = (b << 4) | (c >> 2);
        output[j++] = (c << 6) | d;
    }

    if (remainder) {
        const len = input.length;
        const a = map[output[i] & 0x7f];
        const b = map[++i < len ? output[i] & 0x7f : 0x3d];
        const c = map[(e0 = ++i < len ? output[i] & 0x7f : 0x3d)];
        const d = map[(e1 = ++i < len ? output[i] & 0x7f : 0x3d)];
        output[j++] = (a << 2) | (b >> 4);
        output[j++] = (b << 4) | (c >> 2);
        output[j++] = (c << 6) | d;
    }

    j -= e0 === 0x3d ? 2 : e1 === 0x3d ? 1 : 0;

    return output.slice(0, j);
}

export function decode(input: string | Uint8Array): Uint8Array {
    const len = (input.length + 3) & ~3;

    if (typeof input === 'string') {
        return decodeInPlace(textEncoder.encode(input));
    }

    const output = new Uint8Array(len);
    output.set(input);

    return decodeInPlace(output);
}
