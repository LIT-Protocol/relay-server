"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthStatusHandler = void 0;
const ethers_1 = require("ethers");
const lit_1 = require("../../lit");
const models_1 = require("../../models");
const SAFE_BLOCK_CONFIRMATIONS = 8;
async function getAuthStatusHandler(req, res) {
    // get requestId from params
    const { requestId } = req.params;
    // query the chain using requestId as the txHash.
    const provider = (0, lit_1.getProvider)();
    let mintReceipt;
    try {
        mintReceipt = await provider.waitForTransaction(requestId, SAFE_BLOCK_CONFIRMATIONS, 200); // 200ms is the max we will wait for.
        console.log("mint PKP receipt", { mintReceipt });
    }
    catch (err) {
        console.error("Error waiting for transaction hash", {
            txHash: requestId,
            err,
        });
        if (err.code === ethers_1.errors.TIMEOUT) {
            return res.status(200).json({
                status: models_1.AuthStatus.InProgress,
            });
        }
        return res.status(500).json({
            error: "Unable to fetch status of request",
        });
    }
    console.debug(mintReceipt.logs);
    // once tx hash received, fetch eth adddress from chain
    const tokenIdFromEvent = mintReceipt.logs[2].topics[3];
    try {
        const pkpEthAddress = await (0, lit_1.getPkpEthAddress)(tokenIdFromEvent);
        const pkpPublicKey = await (0, lit_1.getPkpPublicKey)(tokenIdFromEvent);
        return res.status(200).json({
            status: models_1.AuthStatus.Succeeded,
            pkpTokenId: tokenIdFromEvent,
            pkpEthAddress,
            pkpPublicKey,
        });
    }
    catch (err) {
        console.error("Error fetching PKP information", {
            tokenIdFromEvent,
            err,
        });
        return res.status(500).json({
            error: "Unable to fetch PKP information",
        });
    }
}
exports.getAuthStatusHandler = getAuthStatusHandler;
//# sourceMappingURL=status.js.map