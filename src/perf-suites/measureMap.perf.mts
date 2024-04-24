import { loremIpsum } from 'lorem-ipsum';
import { suite } from 'perf-insight';

const defaultTimeout = 2000;

suite('map', 'Measure .map and .filter performance with different functions', async (test) => {
    const knownWords = loremIpsum({ count: 10000, units: 'words' }).split(' ');

    // test('baseline', () => {});
    test('(a) => a.length', () => {
        return knownWords.map((a) => a.length);
    });

    test('filter Boolean', () => {
        return knownWords.filter(Boolean);
    });

    test('filter (a) => a', () => {
        return knownWords.filter((a) => a);
    });

    test('filter (a) => !!a', () => {
        return knownWords.filter((a) => !!a);
    });

    test('(a) => { return a.length; }', () => {
        return knownWords.map((a) => {
            return a.length;
        });
    });

    function fnLen(a: string) {
        return a.length;
    }

    test('(fnLen)', () => {
        return knownWords.map(fnLen);
    });

    test('(a) => fnLen(a)', () => {
        return knownWords.map((a) => fnLen(a));
    });

    const vfLen = (a: string) => a.length;

    test('(vfLen)', () => {
        return knownWords.map(vfLen);
    });

    test('for of', () => {
        const result: number[] = [];
        for (const a of knownWords) {
            result.push(a.length);
        }
        return result;
    });

    test('for i', () => {
        const result: number[] = [];
        const words = knownWords;
        const len = words.length;
        for (let i = 0; i < len; i++) {
            result.push(words[i].length);
        }
        return result;
    });

    test('for i r[i]=v', () => {
        const words = knownWords;
        const result: number[] = [];
        const len = words.length;
        for (let i = 0; i < len; i++) {
            result[i] = words[i].length;
        }
        return result;
    });

    test('for i Array.from(words)', () => {
        const words = knownWords;
        const result: number[] = Array.from(words) as unknown as number[];
        const len = words.length;
        for (let i = 0; i < len; i++) {
            result[i] = words[i].length;
        }
        return result;
    });

    test('for i Array.from', () => {
        const words = knownWords;
        const result: number[] = Array.from({ length: words.length });
        const len = words.length;
        for (let i = 0; i < len; i++) {
            result[i] = words[i].length;
        }
        return result;
    });

    test('for i Array(size)', () => {
        const words = knownWords;
        const result: number[] = new Array(words.length);
        const len = words.length;
        for (let i = 0; i < len; i++) {
            result[i] = words[i].length;
        }
        return result;
    });
}).setTimeout(defaultTimeout);
