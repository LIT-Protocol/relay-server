import { ThirdWebLib } from "../../lib/thirdweb/ThirdWebLib";
import { Request } from "express";
import { Response } from "express-serve-static-core";

export async function getTxStatusByQueueId(
	req: Request,
	res: Response,
) {
    const { queueId } = req.params || req.query; 
    try {
        const data = await ThirdWebLib.Action.getTxStatusByQueueId(queueId);
        res.status(200).send({data});
    }catch(err: any){
        console.log(err)
        res.status(500).send({success: false, error: err.message});
    }
}