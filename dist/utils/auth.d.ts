import { CapabilityProtocolPrefix, SessionSig } from "../models";
export declare function getFullResourceUri(protocolPrefix: CapabilityProtocolPrefix, resourceUri: string): string;
export declare function getResourceWildcardUri(protocolPrefix: CapabilityProtocolPrefix): string;
export declare function getSiweMessageUri(sessionPubKey: string): string;
export declare function validateSessionSignature(sessionSig: SessionSig, fullResourceUri: string, capabilityProtocolPrefix: CapabilityProtocolPrefix): Promise<[string, Error | null]>;
