import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { StoreConditionRequest, StoreConditionResponse } from "../models";
export declare function storeConditionHandler(req: Request<{}, StoreConditionResponse, StoreConditionRequest, ParsedQs, Record<string, any>>, res: Response<StoreConditionResponse, Record<string, any>, number>): Promise<Response<StoreConditionResponse, Record<string, any>, number>>;
