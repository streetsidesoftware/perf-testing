# Perf Tests

This is a collection of perf tests. They are designed to check assumptions on performance.

This is a simple command line tool that lists files matching the provided globs.

## Getting Started

1. Install [`pnpm`](https://pnppm.io)
1. `pnpm i`
1. `pnpm build`
1. `pnpm test`
1. `pnpm run app --help`

   <!--- @@inject: static/help.txt --->

   ```
   Usage: perf runner [options] [test-methods...]

   Run performance tests.

   Arguments:
     test-methods             list of test methods to run (choices: "search",
                              "anonymous", "map", "all", default: ["all"])

   Options:
     -t, --timeout <timeout>  timeout for each test (default: 1000)
     -V, --version            output the version number
     -h, --help               display help for command
   ```

   <!--- @@inject-end: static/help.txt --->

1. `pnpm run app map`

   **Example:**

   <!--- @@inject: static/example.txt --->

   ```
   Running test: map
   Running: Map Anonymous:
   ✔ (a) => a.length            : ops: 30756.44 cnt:  30482 mean: 0.056665 p95:  0.20633 min/max: 0.020739/  1.2881 991.08ms
   ✔ filter Boolean             : ops: 10380.80 cnt:  10339 mean:  0.14109 p95:  0.30647 min/max: 0.044631/ 0.65964 995.97ms
   ✔ filter (a) => a            : ops: 14978.50 cnt:  14922 mean:  0.10100 p95:  0.23417 min/max: 0.038621/ 0.43152 996.23ms
   ✔ filter (a) => !!a          : ops: 12926.77 cnt:  12883 mean:  0.11535 p95:  0.26402 min/max: 0.042264/ 0.71627 996.61ms
   ✔ (a) => { return a.length; }: ops: 31771.79 cnt:  31558 mean: 0.050315 p95:  0.13926 min/max: 0.021965/ 0.38313 993.27ms
   ✔ (fnLen)                    : ops: 29314.10 cnt:  29129 mean: 0.055057 p95:  0.15008 min/max: 0.021760/ 0.48103 993.69ms
   ✔ (a) => fnLen(a)            : ops: 29233.77 cnt:  29043 mean: 0.055084 p95:  0.14469 min/max: 0.021979/ 0.37546 993.47ms
   ✔ (vfLen)                    : ops: 31732.97 cnt:  31525 mean: 0.051079 p95:  0.13862 min/max: 0.021709/ 0.36765 993.45ms
   ✔ for of                     : ops: 21886.60 cnt:  21765 mean: 0.061837 p95:  0.18468 min/max: 0.036873/  1.0753 994.44ms
   ✔ for i                      : ops: 24704.07 cnt:  24556 mean: 0.051921 p95:  0.14648 min/max: 0.032250/ 0.64389 994.01ms
   ✔ for i r[i]=v               : ops: 19494.68 cnt:  19400 mean: 0.065557 p95:  0.17119 min/max: 0.040939/ 0.49368 995.14ms
   ✔ for i Array.from(words)    : ops: 33609.02 cnt:  33345 mean: 0.040022 p95:  0.12977 min/max: 0.025327/ 0.69438 992.14ms
   ✔ for i Array.from           : ops:  2041.26 cnt:   2040 mean:  0.50531 p95:  0.70403 min/max:  0.43681/  1.2301 999.38ms
   ✔ for i Array(size)          : ops: 32333.11 cnt:  32082 mean: 0.056348 p95:  0.63695 min/max: 0.024706/  6.5348 992.23ms
   done.
   ```

   <!--- @@inject-end: static/example.txt --->
