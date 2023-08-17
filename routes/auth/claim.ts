import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { Claim, ClaimAndMintResponse } from "../../models";

export async function mintClaimedKeyId(
	req: Request<{}, Claim, ParsedQs, Record<string, any>>,
	res: Response<ClaimAndMintResponse, Record<string, any>>,
) {
    
}
