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
		PKP_NFT_ADDRESS || "0xF5cB699652cED3781Dd75575EDBe075d6212DF98",
	pkpHelperAddress:
		PKP_HELPER_ADDRESS || "0x5a8e445BCFE85264566c32Be50A172F3d14F53Fc",
	pkpPermissionsAddress:
		PKP_PERMISSIONS_ADDRESS || "0xE34eAB00607E6817327d575B26E8de29c320D6e9",
	useSoloNet: USE_SOLO_NET === "true",
	expectedOrigins: EXPECTED_ORIGINS?.split(",") || ["http://localhost:3000"],
};

export default {
	...baseConfig,
} as Config;
