import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { AuthSig, AuthMethodVerifyToMintResponse, AuthMethodVerifyToFetchResponse } from "../../models";
export declare function walletVerifyToMintHandler(req: Request<{}, AuthMethodVerifyToMintResponse, AuthSig, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>>;
export declare function walletVerifyToFetchPKPsHandler(req: Request<{}, AuthMethodVerifyToFetchResponse, AuthSig, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>>;
