import { ThirdWebLib } from "../../lib/thirdweb/ThirdWebLib";
import { Request } from "express";
import { Response } from "express-serve-static-core";

export async function getTxStatusByQueueId(
	req: Request,
	res: Response,
) {
    const { queueId } = req.params || req.query; 
    try {
        let data;
        for (let i = 0; i < 100; i++) {
          data = await ThirdWebLib.Action.getTxStatusByQueueId(queueId);
          if (data.status === 'sent') {
            console.log("transactionHash", data.transactionHash);
            console.log('i', i);
            break;
          }
        }
    
        if (data.status !== 'sent') {
          return res.status(408).send({ success: false, error: 'Transaction not sent within expected time' });
        }
    
        res.status(200).send({ ...data });
      } catch (err:any) {
        console.log(err);
        res.status(500).send({ success: false, error: err.message });
      }
}