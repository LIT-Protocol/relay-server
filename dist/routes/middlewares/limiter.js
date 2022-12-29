"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redisClient_1 = __importDefault(require("../../lib/redisClient"));
const limiter = (0, express_rate_limit_1.default)({
    // Redis store configuration
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => redisClient_1.default.sendCommand(args),
    }),
    max: 10,
    windowMs: 10 * 1000, // 10s
});
exports.default = limiter;
//# sourceMappingURL=limiter.js.map