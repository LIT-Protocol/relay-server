module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/*.test.ts"],
	moduleFileExtensions: ["ts", "js", "json", "node"],
	setupFiles: ["<rootDir>/tests/setup.ts"],
	testTimeout: 30000, // 30 seconds
};
