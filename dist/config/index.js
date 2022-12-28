"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const { REDIS_URL, PORT } = process.env;
const config = {
    redisUrl: REDIS_URL || "dummy-url",
    port: parseInt(PORT === "" ? PORT : "3000"),
};
exports.default = config;
//# sourceMappingURL=index.js.map