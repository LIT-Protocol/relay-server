"use strict";
// copy-🍝 from https://github.com/MasterKale/SimpleWebAuthn/blob/33528afe001d4aca62052dce204c0398c3127ffd/packages/server/src/helpers/toHash.ts#L8
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Returns hash digest of the given data using the given algorithm.
 * @param data Data to hash
 * @return The hash
 */
function toHash(data, algo = "SHA256") {
    return crypto_1.default.createHash(algo).update(data).digest();
}
exports.toHash = toHash;
//# sourceMappingURL=toHash.js.map