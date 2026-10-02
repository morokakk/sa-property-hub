// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  testRunnerNodeArgs: ['--max-old-space-size=4096'],
  mutate: [
    'src/lib/calculations/**/*.ts',
    '!src/lib/calculations/__tests__/**',
  ],
  thresholds: {
    high: 80,
    low: 65,
    break: null,
  },
  coverageAnalysis: 'off',
  vitest: {
    related: false,
  },
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
};
