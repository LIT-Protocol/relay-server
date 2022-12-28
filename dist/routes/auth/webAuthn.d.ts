import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { AuthMethodVerifyToMintResponse, WebAuthnAssertionVerifyToMintRequest } from "../../models";
export declare function webAuthnAssertionVerifyToMintHandler(req: Request<{}, AuthMethodVerifyToMintResponse, WebAuthnAssertionVerifyToMintRequest, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>>;
