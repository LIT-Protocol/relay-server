// copy-🍝 from https://github.com/MasterKale/SimpleWebAuthn/blob/33528afe001d4aca62052dce204c0398c3127ffd/packages/server/src/helpers/toHash.ts#L8

import crypto from "crypto";

/**
 * Returns hash digest of the given data using the given algorithm.
 * @param data Data to hash
 * @return The hash
 */
export function toHash(data: Buffer | string, algo = "SHA256"): Buffer {
	return crypto.createHash(algo).update(data).digest();
}
