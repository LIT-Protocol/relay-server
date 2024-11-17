/**
 * Enum representing the version strategy for the relay server.
 */
export enum VersionStrategy {
	/**
	 * The default version strategy. Use the relay server to process the request.
	 */
	DEFAULT = "default",

	/**
	 * Forward the request to ThirdWeb for processing.
	 */
	FORWARD_TO_THIRDWEB = "thirdweb",
}

/**
 * Determines the version strategy based on the provided URL.
 * @param url - The URL to check for the version.
 * @returns The version strategy based on the URL.
 */
export function getVersionStrategy(url: string): VersionStrategy {
	const versionRegex = /\/api\/v(\d+)\//;
	const match = url.match(versionRegex);
	const version = match ? parseInt(match[1], 10) : null;

	switch (version) {
		case 2:
			return VersionStrategy.FORWARD_TO_THIRDWEB;
		default:
			return VersionStrategy.DEFAULT;
	}
}
