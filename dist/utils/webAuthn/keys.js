"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeECKeyAndGetPublicKey = void 0;
const cbor_1 = __importDefault(require("cbor"));
const elliptic_1 = require("elliptic");
const convertCOSEtoPKCS_1 = require("./convertCOSEtoPKCS");
const ec = new elliptic_1.ec("secp256k1");
function decodeECKeyAndGetPublicKey(cborDecodedPublicKey) {
    const struct = cbor_1.default.decodeAllSync(cborDecodedPublicKey)[0];
    const x = struct.get(convertCOSEtoPKCS_1.COSEKEYS.x);
    const y = struct.get(convertCOSEtoPKCS_1.COSEKEYS.y);
    const key = ec.keyFromPublic({
        x,
        y,
    });
    return key.getPublic(true, "hex");
}
exports.decodeECKeyAndGetPublicKey = decodeECKeyAndGetPublicKey;
//# sourceMappingURL=keys.js.map