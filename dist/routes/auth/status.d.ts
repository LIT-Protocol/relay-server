import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { GetAuthStatusRequestParams, GetAuthStatusResponse } from "../../models";
export declare function getAuthStatusHandler(req: Request<GetAuthStatusRequestParams, GetAuthStatusResponse, {}, ParsedQs, Record<string, any>>, res: Response<GetAuthStatusResponse, Record<string, any>, number>): Promise<Response<GetAuthStatusResponse, Record<string, any>, number>>;
