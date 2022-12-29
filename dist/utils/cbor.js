"use strict";
// copy-🍝 from https://github.com/MasterKale/SimpleWebAuthn/blob/33528afe001d4aca62052dce204c0398c3127ffd/packages/server/src/helpers/decodeCbor.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeCborFirst = void 0;
const cbor_1 = __importDefault(require("cbor"));
function decodeCborFirst(input) {
    try {
        // throws if there are extra bytes
        return cbor_1.default.decodeFirstSync(input);
    }
    catch (err) {
        const _err = err;
        // if the error was due to extra bytes, return the unpacked value
        if (_err.value) {
            return _err.value;
        }
        throw err;
    }
}
exports.decodeCborFirst = decodeCborFirst;
/**
 * Intuited from a quick scan of `cbor.decodeFirstSync()` here:
 *
 * https://github.com/hildjj/node-cbor/blob/v5.1.0/lib/decoder.js#L189
 */
class CborDecoderError extends Error {
}
//# sourceMappingURL=cbor.js.map