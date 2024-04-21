import { loremIpsum } from 'lorem-ipsum';

import { SimpleTrie } from '../lib/SimpleTrie.mjs';
import { Trie } from '../lib/Trie.mjs';
import { suite } from '../perfSuite.mjs';

const numWords = 10000;

const termNumber = [5, 10, 20, 30];

const defaultTimeout = 1000;

let data: { knownWords: string[]; wordsToSearch: string[] } | undefined;

function getData() {
    if (data) return data;
    const knownWords = [...new Set(loremIpsum({ count: 1000, units: 'words' }).split(' '))];
    const wordsToSearch = loremIpsum({ count: numWords, units: 'words' }).split(' ');

    data = { knownWords, wordsToSearch };
    return data;
}

for (const numTerms of termNumber) {
    suite(`search-${numTerms}`, `Search Dictionary, Size of dictionary: ${numTerms}`, async (test) => {
        const { wordsToSearch, knownWords } = getData();

        // test('lorem-ipsum words', () => {
        //     loremIpsum({ count: 1000, units: 'words' });
        // });
        // test('lorem-ipsum sentences', () => {
        //     loremIpsum({ count: 100, units: 'sentences' });
        // });
        // test('lorem-ipsum sentences', () => {
        //     loremIpsum({ count: 30, units: 'paragraphs' });
        // });

        // test('lorem-ipsum word x 1000', () => {
        //     for (let i = 0; i < 1000; i++) {
        //         loremIpsum({ count: 1, units: 'words' });
        //     }
        //     // throw new Error('test error');
        // });

        const words = wordsToSearch;
        const searchTerms = knownWords.slice(0, numTerms);
        const searchObjMap = Object.fromEntries(searchTerms.map((term) => [term, true]));
        const searchSet = new Set(searchTerms);

        test('search `searchTerms.includes`', () => {
            const terms = searchTerms;
            return words.filter((word) => terms.includes(word));
        });

        test('search `searchTerms.includes` for', () => {
            const terms = searchTerms;
            const result: string[] = [];
            for (const word of words) {
                if (terms.includes(word)) {
                    result.push(word);
                }
            }
            return result;
        });

        test('search `word in searchObjMap`', () => {
            return words.filter((word) => word in searchObjMap);
        });

        test('search `word in searchObjMap` local', () => {
            const map = searchObjMap;
            return words.filter((word) => word in map);
        });

        test('search `word in searchObjMap` for', () => {
            const map = searchObjMap;
            const result: string[] = [];
            for (const word of words) {
                if (word in map) {
                    result.push(word);
                }
            }
            return result;
        });

        test('search `searchSet.has`', () => {
            return words.filter((word) => searchSet.has(word));
        });

        test('search `searchSet.has` local', () => {
            const s = searchSet;
            return words.filter((word) => s.has(word));
        });

        test('search `searchSet.has` for', () => {
            const s = searchSet;
            const result: string[] = [];
            for (const word of words) {
                if (s.has(word)) {
                    result.push(word);
                }
            }
            return result;
        });

        test('search `searchSet.has` for i', () => {
            const s = searchSet;
            const result: string[] = [];
            const w = words;
            const len = w.length;
            for (let i = 0, c = 0; i < len; i++) {
                const word = w[i];
                if (s.has(word)) {
                    result[c++] = word;
                }
            }
            return result;
        });

        test('search `searchSet.has` for i push', () => {
            const s = searchSet;
            const result: string[] = [];
            const w = words;
            const len = w.length;
            for (let i = 0; i < len; i++) {
                const word = w[i];
                if (s.has(word)) {
                    result.push(word);
                }
            }
            return result;
        });

        test('search `searchSet.has` for i alloc', () => {
            let c = 0;
            const s = searchSet;
            const result: string[] = new Array(words.length);
            const w = words;
            const len = w.length;
            for (let i = 0; i < len; i++) {
                const word = w[i];
                if (s.has(word)) {
                    result[c++] = word;
                }
            }
            result.length = c;
            return result;
        });

        const hasWords = new RegExp(`^${searchTerms.map((w) => w.replaceAll(/\W/g, '')).join('|')}$`);

        test('search regexp', () => {
            const re = hasWords;
            return words.filter((word) => re.test(word));
        });

        test('search regexp for', () => {
            const re = hasWords;
            const result: string[] = [];
            for (const word of words) {
                if (re.test(word)) {
                    result.push(word);
                }
            }
            return result;
        });

        const sTrie = new SimpleTrie().addWords(searchTerms);
        const trie = new Trie().addWords(searchTerms);

        test('search trie', () => {
            const t = trie;
            return words.filter((word) => t.has(word));
        });

        test('search trie for', () => {
            const t = trie;
            const result: string[] = [];
            for (const word of words) {
                if (t.has(word)) {
                    result.push(word);
                }
            }
            return result;
        });

        test('search sTrie', () => {
            const t = sTrie;
            return words.filter((word) => t.has(word));
        });

        test('search sTrie for', () => {
            const t = sTrie;
            const result: string[] = [];
            for (const word of words) {
                if (t.has(word)) {
                    result.push(word);
                }
            }
            return result;
        });
    }).setTimeout(defaultTimeout);

    // console.log('%o', result);
}
