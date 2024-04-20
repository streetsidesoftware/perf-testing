interface TrieNode {
    w: boolean;
    c?: Record<string, TrieNode>;
}
export class SimpleTrie {
    nodes: TrieNode = { w: false };
    add(word: string) {
        trieAdd(this.nodes, word);
        return this;
    }

    addWords(words: string[]) {
        for (const word of words) {
            this.add(word);
        }
        return this;
    }

    has(word: string) {
        return trieHas(this.nodes, word);
    }
}
function trieAdd(node: TrieNode, word: string): TrieNode {
    if (!word) return node;

    let current = node;
    for (const c of word) {
        const children = (current.c ??= Object.create(null));
        current = children[c] ??= { w: false };
    }
    current.w = true;
    return current;
}
function trieHas(node: TrieNode, word: string): boolean {
    let current: TrieNode | undefined = node;
    for (const c of word) {
        if (!current) return false;
        current = current.c?.[c];
    }
    return !!current?.w;
}
