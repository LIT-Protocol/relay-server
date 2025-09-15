module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/*.test.ts"],
	moduleFileExtensions: ["ts", "js", "json", "node"],
	setupFiles: ["<rootDir>/tests/setup.ts"],
	testTimeout: 30000, // Increased to 30 seconds to allow background operations to complete
};
