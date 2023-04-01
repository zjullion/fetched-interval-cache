export default {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['fixture.ts', 'test.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  preset: 'ts-jest',
  testMatch: ['**/**.test.ts'],
  verbose: true,
}
