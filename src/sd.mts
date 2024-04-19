export interface RunningStdDev {
    push(value: number): void;
    readonly count: number;
    readonly mean: number;
    readonly variance: number;
    readonly sampleVariance: number;
    readonly standardDeviation: number;
    readonly sampleStandardDeviation: number;
    readonly min: number;
    readonly max: number;
    readonly ok: boolean;
    readonly p95: number;
}

export function createRunningStdDev(): RunningStdDev {
    return new RunningStdDevImpl();
}

class RunningStdDevImpl {
    #count = 0;
    #sum = 0;
    #m2 = 0;
    #min = Infinity;
    #max = -Infinity;

    push(value: number) {
        let mean = this.#count ? this.#sum / this.#count : 0;
        this.#count++;
        const delta = value - mean;
        this.#sum += value;
        mean = this.#sum / this.#count;
        const delta2 = value - mean;
        this.#m2 += delta * delta2;
        this.#min = Math.min(this.#min, value);
        this.#max = Math.max(this.#max, value);
    }

    get count() {
        return this.#count;
    }

    /**
     * Returns true if there are at least two values.
     */
    get ok() {
        return this.#count > 1;
    }

    get mean() {
        assert(this.#count, 'No values to calculate mean');
        return this.#sum / this.#count;
    }

    get variance() {
        assert(this.#count > 1, 'Need at least two values to calculate variance');
        return this.#m2 / this.#count;
    }

    get sampleVariance() {
        assert(this.#count > 1, 'Need at least two values to calculate sample variance');
        return this.#m2 / (this.#count - 1);
    }

    get standardDeviation() {
        return Math.sqrt(this.variance);
    }

    get sampleStandardDeviation() {
        return Math.sqrt(this.sampleVariance);
    }

    get min() {
        return this.#min;
    }

    get max() {
        return this.#max;
    }

    get p95() {
        return this.mean + 1.96 * this.sampleStandardDeviation;
    }
}

function assert(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message ?? 'Assertion failed');
    }
}
