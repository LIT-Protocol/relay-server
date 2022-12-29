import { ethers } from "ethers";
import { AuthMethodType, StoreConditionWithSigner, PKP } from "./models";
export declare function getProvider(): ethers.providers.JsonRpcProvider;
export declare function getPkpEthAddress(tokenId: string): Promise<any>;
export declare function getPkpPublicKey(tokenId: string): Promise<any>;
export declare function storeConditionWithSigner(storeConditionRequest: StoreConditionWithSigner): Promise<ethers.Transaction>;
export declare function mintPKP({ authMethodType, idForAuthMethod, }: {
    authMethodType: AuthMethodType;
    idForAuthMethod: string;
}): Promise<ethers.Transaction>;
export declare function getPKPsForAuthMethod({ authMethodType, idForAuthMethod, }: {
    authMethodType: AuthMethodType;
    idForAuthMethod: string;
}): Promise<PKP[]>;
