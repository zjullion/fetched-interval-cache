export default {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/**.{ts,tsx}'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['fixture.ts', 'test.ts', 'jestHelpers.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  preset: 'ts-jest',
  verbose: true,
}
