import { ThirdWebLib } from "../../lib/thirdweb/ThirdWebLib";
import { Request } from "express";
import { Response } from "express-serve-static-core";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getTxStatusByQueueId(
	req: Request,
	res: Response,
) {
    const { queueId } = req.params || req.query; 
    try {
        let data;
        for (let i = 0; i < 100; i++) {
          console.log('i', i);
          data = await ThirdWebLib.Action.getTxStatusByQueueId(queueId);
          console.log(data);
          if (data.status === 'sent' || data.status === 'mined') {
            console.log("transactionHash", data.transactionHash);
            console.log('i', i);
            return res.status(200).send({ ...data });
          }
          await delay(500);
        }
    
        if (data.status !== 'sent') {
          return res.status(408).send({ success: false, error: 'Transaction not sent within expected time' });
        }
    
      } catch (err:any) {
        console.log(err);
        res.status(500).send({ success: false, error: err.message });
      }
}