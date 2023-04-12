import cbor from "cbor";
import { ec as EC } from "elliptic";
import { COSEKEYS } from "./convertCOSEtoPKCS";

const ec = new EC("secp256k1");

export function decodeECKeyAndGetPublicKey(
	cborEncodedPublicKey: Buffer,
): string {
	const struct = cbor.decodeAllSync(cborEncodedPublicKey)[0];

	const x = struct.get(COSEKEYS.x);
	const y = struct.get(COSEKEYS.y);

	const key = ec.keyFromPublic({
		x,
		y,
	});

	return key.getPublic(true, "hex");
}
