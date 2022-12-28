"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisClient_1 = __importDefault(require("../../lib/redisClient"));
const API_KEY_HEADER_KEY = "api-key";
function apiKeyGateAndTracking(req, res, next) {
    const apiKey = req.header(API_KEY_HEADER_KEY);
    if (!apiKey) {
        return res.status(400).json({
            error: "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98",
        });
    }
    // increment tracking
    const now = new Date();
    const trackingKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${apiKey}`;
    redisClient_1.default.incr(trackingKey);
    next();
}
exports.default = apiKeyGateAndTracking;
//# sourceMappingURL=apiKeyGateAndTracking.js.map