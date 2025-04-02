module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["json", "lcov", "text", "clover"],
  testMatch: ["**/*.spec.ts"],
};
