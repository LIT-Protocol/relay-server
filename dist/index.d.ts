/**
 * An example Express server showing off a simple integration of @simplewebauthn/server.
 *
 * The webpages served from ./public use @simplewebauthn/browser.
 */
/**
 * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
 * represents the expected URL from which registration or authentication occurs.
 */
export declare const rpID: string;
export declare let expectedOrigin: string;
