import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { GoogleOAuthRequest, AuthMethodVerifyToMintResponse, AuthMethodVerifyToFetchResponse } from "../../models";
export declare function googleOAuthVerifyToMintHandler(req: Request<{}, AuthMethodVerifyToMintResponse, GoogleOAuthRequest, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>>;
export declare function googleOAuthVerifyToFetchPKPsHandler(req: Request<{}, AuthMethodVerifyToFetchResponse, GoogleOAuthRequest, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>>;
