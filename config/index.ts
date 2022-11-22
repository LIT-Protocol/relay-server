require("dotenv").config();

import { Config } from "../models";

const { REDIS_URL, PORT } = process.env;

const config: Config = {
	redisUrl: REDIS_URL || "dummy-url",
	port: parseInt(PORT === "" ? PORT : "3000"),
};

export default config;
