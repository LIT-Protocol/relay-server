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
		"0x4595b678a795244F7D9eFFda31c5CE547A87B5c1",
	pkpNftAddress:
		PKP_NFT_ADDRESS || "0xa4bbAAf3aD9Db1B3f1f6fe38af60AE228f6DF153",
	pkpHelperAddress:
		PKP_HELPER_ADDRESS || "0x85E8860FB3Ad3517151C8da5E5F4Bcd626CCbfD6",
	pkpPermissionsAddress:
		PKP_PERMISSIONS_ADDRESS || "0x35daf1e7FDf12417aFa8d8deC1fAA874ef4492d9",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
};

export default {
	...baseConfig,
} as Config;
