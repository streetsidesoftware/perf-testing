import fs from 'fs/promises';
import { describe, expect, test } from 'vitest';

import { createRunningStdDev } from './sd.mjs';

const urlFixtures = new URL('../fixtures/', import.meta.url);

describe('sd', async () => {
    const sampleData = (await readSampleData()).sort((a, b) => a - b);

    const sum = sampleData.reduce((a, b) => a + b, 0);
    const count = sampleData.length;
    const mean = sum / count;
    const p95 = sampleData[Math.floor(count * 0.95)];
    const min = sampleData[0];
    const max = sampleData[sampleData.length - 1];

    // console.log('%o', { sum, count, mean, p95, min, max });

    const sd = createRunningStdDev();

    sampleData.forEach((value) => sd.push(value));

    test('sd', () => {
        expect(sd.count).toBe(count);
        expect(sd.mean).toBe(mean);
        expect(sd.min).toBe(min);
        expect(sd.max).toBe(max);
        expect(sd.p95).toBeGreaterThan(p95 * 0.9);
        expect(sd.p95).toBeLessThan(p95 * 1.05);
    });
});

async function readSampleData() {
    const url = new URL('sample-data.txt', urlFixtures);
    const data = await fs.readFile(url, 'utf8');
    return data
        .split('\n')
        .filter((a) => a)
        .map(Number);
}
