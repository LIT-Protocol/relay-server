require("dotenv").config();

import { Config } from "../models";

const {
	REDIS_URL,
	PORT,
	ENABLE_HTTPS,
	ACCESS_CONTROL_CONDITIONS_ADDRESS,
	PKP_NFT_ADDRESS,
	PKP_HELPER_ADDRESS,
	PKP_PERMISSIONS_ADDRESS,
	USE_SOLO_NET,
	EXPECTED_ORIGINS,
} = process.env;

const baseConfig = {
	redisUrl: REDIS_URL || "dummy-url",
	port: parseInt(PORT !== "" ? PORT! : "3001"),
	enableHttps: ENABLE_HTTPS === "true",
	accessControlConditionsAddress:
		ACCESS_CONTROL_CONDITIONS_ADDRESS ||
		"0x8b353Bb9E26F2c2B8155f377982537C39AD01A1B",
	pkpNftAddress:
		PKP_NFT_ADDRESS || "0x8F75a53F65e31DD0D2e40d0827becAaE2299D111",
	pkpHelperAddress:
		PKP_HELPER_ADDRESS || "0x8bB62077437D918891F12c7F35d9e1B78468bF11",
	pkpPermissionsAddress:
		PKP_PERMISSIONS_ADDRESS || "0x4Aed2F242E806c58758677059340e29E6B5b7619",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
};

export default {
	...baseConfig,
} as Config;
