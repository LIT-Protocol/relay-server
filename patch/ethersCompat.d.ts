// This file is used to patch a compatibility issue with siwe and
// ethers v5.

import { ethers } from 'ethers';
type ProviderV5 = ethers.providers.Provider;
// @ts-expect-error -- v6 compatibility hack
type ProviderV6 = ethers.Provider;
export type Provider = ProviderV6 extends undefined ? ProviderV5 : ProviderV6;
export declare const verifyMessage: any;
export declare const hashMessage: any;
export declare const getAddress: any;
export { };
