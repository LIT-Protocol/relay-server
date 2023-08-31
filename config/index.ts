require("dotenv").config();

import { Config } from "../models";

const {
	REDIS_URL,
	PORT,
	ENABLE_HTTPS,
	SERRANO_ACCESS_CONTROL_CONDITIONS_ADDRESS,
	SERRANO_PKP_NFT_ADDRESS,
	SERRANO_PKP_HELPER_ADDRESS,
	SERRANO_PKP_PERMISSIONS_ADDRESS,
	CAYENNE_ACCESS_CONTROL_CONDITIONS_ADDRESS,
	CAYENNE_PKP_NFT_ADDRESS,
	CAYENNE_PKP_HELPER_ADDRESS,
	CAYENNE_PKP_PERMISSIONS_ADDRESS,
	NETWORK,
	USE_SOLO_NET,
	EXPECTED_ORIGINS,
} = process.env;

const baseConfig = {
	redisUrl: REDIS_URL || "dummy-url",
	port: parseInt(PORT !== "" ? PORT! : "3001"),
	enableHttps: ENABLE_HTTPS === "true",
	serranoContracts: {
		accessControlConditionsAddress:
			SERRANO_ACCESS_CONTROL_CONDITIONS_ADDRESS ||
			"0x8b353Bb9E26F2c2B8155f377982537C39AD01A1B",
		pkpNftAddress:
			SERRANO_PKP_NFT_ADDRESS ||
			"0x8F75a53F65e31DD0D2e40d0827becAaE2299D111",
		pkpHelperAddress:
			SERRANO_PKP_HELPER_ADDRESS ||
			"0x8bB62077437D918891F12c7F35d9e1B78468bF11",
		pkpPermissionsAddress:
			SERRANO_PKP_PERMISSIONS_ADDRESS ||
			"0x4Aed2F242E806c58758677059340e29E6B5b7619",
	},
	cayenneContracts: {
		accessControlConditionsAddress:
			CAYENNE_ACCESS_CONTROL_CONDITIONS_ADDRESS ||
			"0x8b353Bb9E26F2c2B8155f377982537C39AD01A1B",
		pkpNftAddress:
			CAYENNE_PKP_NFT_ADDRESS ||
			"0xAC2159fA4DC095cA76E035415699446386229562",
		pkpHelperAddress:
			CAYENNE_PKP_HELPER_ADDRESS ||
			"0x43db60069D175F4D77e49b46B99073d8297f00a3",
		pkpPermissionsAddress:
			CAYENNE_PKP_PERMISSIONS_ADDRESS ||
			"0xA7DB2Bf287a728E0cD22806325a247997f978446",
	},
	network: NETWORK || "serrano",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
	
};

export default {
	...baseConfig,
} as Config;
