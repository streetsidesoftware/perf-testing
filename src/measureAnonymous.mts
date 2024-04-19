import { loremIpsum } from 'lorem-ipsum';

import { runTests } from './runner.mjs';

export async function measureAnonymous(defaultTimeout = 2000) {
    const knownWords = loremIpsum({ count: 10000, units: 'words' }).split(' ');

    await runTests('Measure Anonymous', async ({ test, setTimeout }) => {
        setTimeout(defaultTimeout);

        // test('baseline', () => {});
        test('()=>{}', () => {
            knownWords.forEach(() => {});
        });

        test('()=>undefined', () => {
            knownWords.forEach(() => undefined);
        });

        function getFn() {
            return () => undefined;
        }

        test('(getFn)', () => {
            knownWords.forEach(getFn);
        });

        test('() => getFn()', () => {
            knownWords.forEach(() => getFn()());
        });
    });
}
