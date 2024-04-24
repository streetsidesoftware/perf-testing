import { loremIpsum } from 'lorem-ipsum';
import { suite } from 'perf-insight';

const defaultTimeout = 2000;

suite('anonymous', 'Measure the cost of creating an anonymous or arrow function', async (test) => {
    const knownWords = loremIpsum({ count: 10000, units: 'words' }).split(' ');

    // test('baseline', () => {});
    test('forEach(()=>{})', () => {
        knownWords.forEach(() => {});
    });

    test('forEach(()=>undefined)', () => {
        knownWords.forEach(() => undefined);
    });

    function getFn() {
        return () => undefined;
    }

    test('forEach(getFn)', () => {
        knownWords.forEach(getFn);
    });

    test('forEach(() => getFn())', () => {
        knownWords.forEach(() => getFn()());
    });
}).setTimeout(defaultTimeout);
