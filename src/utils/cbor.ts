/**
 * CBOR decoding utilities
 * Adapted from SimpleWebAuthn
 */

import cbor from "cbor";

/**
 * Decodes CBOR data and handles extra bytes
 * @param input Data to decode
 * @returns Decoded data
 */
export function decodeCborFirst(
  input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView,
): any {
  try {
    // throws if there are extra bytes
    return cbor.decodeFirstSync(input);
  } catch (err) {
    const _err = err as CborDecoderError;
    // if the error was due to extra bytes, return the unpacked value
    if (_err.value) {
      return _err.value;
    }
    throw err;
  }
}

/**
 * Error class for CBOR decoding errors
 */
class CborDecoderError extends Error {
  value: any;
} 