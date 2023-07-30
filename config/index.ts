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
		"0x7E1e587eE282Fe2681e2293c8335a83FB347543B",
	pkpNftAddress:
		PKP_NFT_ADDRESS || "0x1d0CBb2bE18fc854855f74ADA6F104a6E6E106f7",
	pkpHelperAddress:
		PKP_HELPER_ADDRESS || "0x039c6B04144D1BCC8720cFDa763757487E3451c0",
	pkpPermissionsAddress:
		PKP_PERMISSIONS_ADDRESS || "0xBD27A47f22ED33c1A9aD1B5D32df0Ac0AD5bd94d",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
};

export default {
	...baseConfig,
} as Config;
