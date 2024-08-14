import { ThirdWebLib } from "../../lib/thirdweb/ThirdWebLib";
import { Request } from "express";
import { Response } from "express-serve-static-core";
import * as Sentry from "@sentry/node";

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
        for (let i = 0; i < 50; i++) {
          console.log('i', i);
          data = await ThirdWebLib.Action.getTxStatusByQueueId(queueId);
          console.log(data);
          if (data.status === 'sent' || data.status === 'mined') {
            console.log("transactionHash", data.transactionHash);
            console.log('i', i);
            return res.status(200).send({success: true, ...data });
          }else if(data.status === 'errored') {
            console.log('i', i);
            return res.status(200).send({data, success: false, error: 'Transaction Failed'});
          }
          await delay(500);
        }
    
        if (data.status !== 'sent') {
          const err = new Error("Timeout, didn't get any Tx data by queueID within 25 seconds");
          Sentry.captureException(err, {
            contexts: {
              request_body: {
                ...req.body
              },
            }
          });
          return res.status(408).send({ success: false, error: 'Transaction not sent within expected time' });
        }
    
      } catch (err:any) {
        Sentry.captureException(err, {
          contexts: {
            request_body: {
              ...req.body
            },
          }
        });
        res.status(500).send({ success: false, error: err.message });
      }
}