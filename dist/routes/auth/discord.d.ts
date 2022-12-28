import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { DiscordOAuthRequest, AuthMethodVerifyToMintResponse, AuthMethodVerifyToFetchResponse } from "../../models";
export declare function discordOAuthVerifyToMintHandler(req: Request<{}, AuthMethodVerifyToMintResponse, DiscordOAuthRequest, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>>;
export declare function discordOAuthVerifyToFetchPKPsHandler(req: Request<{}, AuthMethodVerifyToFetchResponse, DiscordOAuthRequest, ParsedQs, Record<string, any>>, res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>): Promise<Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>>;
