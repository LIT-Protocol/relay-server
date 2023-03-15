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
		"0x247B02100dc0929472945E91299c88b8c80b029E",
	pkpNftAddress:
		PKP_NFT_ADDRESS || "0x86062B7a01B8b2e22619dBE0C15cbe3F7EBd0E92",
	pkpHelperAddress:
		PKP_HELPER_ADDRESS || "0xffD53EeAD24a54CA7189596eF1aa3f1369753611",
	pkpPermissionsAddress:
		PKP_PERMISSIONS_ADDRESS || "0x274d0C69fCfC40f71E57f81E8eA5Bd786a96B832",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
};

export default {
	...baseConfig,
} as Config;
