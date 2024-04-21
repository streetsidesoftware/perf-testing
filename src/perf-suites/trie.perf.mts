import assert from 'node:assert';
import fs from 'node:fs/promises';

import { buildITrieFromWords, buildTrie, buildTrieFast, TrieBuilder } from 'cspell-trie-lib';

import { SimpleTrie } from '../lib/SimpleTrie.mjs';
import { Trie } from '../lib/Trie.mjs';
import { suite } from '../perfSuite.mjs';

const wordsUrl = new URL('../../ngram/1-gram.tsv', import.meta.url);

let words: string[] | undefined = undefined;

suite('trie-insert', 'Insert words into a trie', async (test, { beforeAll }) => {
    const words = await loadWords();
    const sortedWords = [...words].sort();

    beforeAll(() => {
        // console.log('words: %o', words);

        // warm up the words.
        words.forEach((word) => word);
    });

    test('SimpleTrie', () => {
        const trie = new SimpleTrie();
        trie.addWords(words);
        assert(trie.has('hello'));
        return trie;
    });

    test('Trie', () => {
        const trie = new Trie();
        trie.addWords(words);
        assert(trie.has('hello'));
        return trie;
    });

    test('buildITrieFromWords', () => {
        const trie = buildITrieFromWords(words);
        assert(trie.has('hello'));
        return trie;
    });

    test('buildTrie', () => {
        const trie = buildTrie(words);
        assert(trie.has('hello'));
        return trie;
    });
    test('buildTrieFast', () => {
        const trie = buildTrieFast(words);
        assert(trie.has('hello'));
        return trie;
    });

    test('TrieBuilder.build(false)', () => {
        const builder = new TrieBuilder();
        builder.insert(words);
        const trie = builder.build(false);
        assert(trie.has('hello'));
        return trie;
    });

    test('TrieBuilder.build(true)', () => {
        const builder = new TrieBuilder();
        builder.insert(words);
        const trie = builder.build(true);
        assert(trie.has('hello'));
        return trie;
    });

    test('TrieBuilder.build(false) sorted', () => {
        const builder = new TrieBuilder();
        builder.insert(sortedWords);
        const trie = builder.build(false);
        assert(trie.has('hello'));
        return trie;
    });
}).setTimeout(2000);

const numberOfSearchWords = 1000;

suite('trie-search', 'Search for words in a trie', async (_test, { prepare }) => {
    const words = [...(await loadWords())].sort();
    const searchWords = sampleWords(words, numberOfSearchWords);

    prepare(() => new SimpleTrie().addWords(words)).test('SimpleTrie', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => new Trie().addWords(words)).test('Trie', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => buildITrieFromWords(words)).test('buildITrieFromWords', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => buildTrie(words)).test('buildTrie', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => buildTrieFast(words)).test('buildTrieFast', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => {
        const builder = new TrieBuilder();
        builder.insert(words);
        return builder.build(false);
    }).test('TrieBuilder.build(false)', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });

    prepare(() => {
        const builder = new TrieBuilder();
        builder.insert(words);
        return builder.build(true);
    }).test('TrieBuilder.build(true)', (trie) => {
        return searchWords.map((word) => trie.has(word));
    });
}).setTimeout(1000);

async function loadWords() {
    if (words) return words;
    const raw = await fs.readFile(wordsUrl, 'utf-8');
    const wordFreq = raw
        .split('\n')
        .map((a) => a.trim())
        .filter((a) => !a.startsWith('#'))
        .filter((a) => a)
        .map((a) => a.split('\t'))
        .map(([word, freq]) => [word, Number(freq)] as const)
        .sort((a, b) => b[1] - a[1]);

    // const lines = wordFreq.map(([word, freq]) => {
    //     const n1 = freq.toPrecision(4);
    //     const n2 = freq.toString(10);
    //     return `${word}\t${n1.length < n2.length ? n1 : n2}`;
    // });

    // await fs.writeFile(wordsUrl, lines.join('\n') + '\n');

    words = wordFreq.map(([word]) => word);

    Object.freeze(words);

    return words;
}

function sampleWords(words: string[], n: number) {
    const samples: string[] = [];
    for (let i = 0; i < n; i++) {
        const r = Math.floor(Math.random() * words.length);
        samples.push(words[r]);
    }
    return samples;
}
