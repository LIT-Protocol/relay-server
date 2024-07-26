import { Request, Response } from 'express';
import { isExpired, isValidSignature } from '../../utils/thirdweb/webhook';
import redisClient from '../../lib/redisClient';
import { io } from '../..';

const { WEBHOOK_SECRET } = process.env;
export async function thirdwebWebHookHandler(req: Request, res: Response) {
    try {
        console.log("webhook");
        if (!WEBHOOK_SECRET) {
            throw new Error("WEBHOOK_SECRET Required");
        }
        const signatureFromHeader = req.header("X-Engine-Signature");
        const timestampFromHeader = req.header("X-Engine-Timestamp");

        if (!signatureFromHeader || !timestampFromHeader) {
            throw new Error("Missing signature or timestamp header");
        }
       
        // if (
        //     !isValidSignature(
        //         req.body,
        //         timestampFromHeader,
        //         signatureFromHeader,
        //         WEBHOOK_SECRET,
        //     )
        // ) {
        //     throw new Error("Invalid signature");
        // }

        if (isExpired(timestampFromHeader, 300)) {
            // Assuming expiration time is 5 minutes (300 seconds)
            throw new Error("Request has expired");
        }
        console.log("queueId", req.body.id);
        const uuid = await redisClient.hGet("userQueueIdMapping",req.body.id);
        console.log("uuid", uuid);
        if(!uuid) {
            throw new Error("Queue ID not found in redis");
        }
        //await redisClient.hDel("userQueueIdMapping", req.body.id); 
        const socketId = await redisClient.hGet("userSocketMapping",uuid);
        console.log("socketId", socketId);
        if(!socketId) {
            throw new Error("socketId not found in redis");
        }
        io.to(socketId).emit('transactionComplete', {requestId: req.body.transactionHash, queueId: req.body.id});
        res.status(200).send({requestId: req.body.transactionHash, queueId: req.body.id});
    } catch (err) {
        console.log(err);

    }
}