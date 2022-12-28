import { NextFunction, Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
export default function apiKeyGateAndTracking(req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>, next: NextFunction): Response<any, Record<string, any>, number> | undefined;
