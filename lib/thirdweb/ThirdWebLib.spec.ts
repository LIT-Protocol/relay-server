import { expect, test } from "bun:test";
import { ThirdWebLib } from "./ThirdWebLib";
import { ethers } from "ethers";

// bun test --test-name-pattern 'getAllWallets'
test("getAllWallets", async () => {
	const wallets = await ThirdWebLib.Action.getAllWallets({ limit: 500 });
	console.log("total wallets:", wallets.length);

	expect(wallets.length).toBeGreaterThan(0);
});

// bun test --test-name-pattern 'createWallet'
test("createWallet", async () => {
	const res = await ThirdWebLib.Action.createWallet("test-wallet");
	console.log(res);

	expect(res).toHaveProperty("walletAddress");
	expect(res.status).toBe("success");
});

// bun test --test-name-pattern 'create 500 wallets' --timeout 300000
test("create 500 wallets", async () => {
	const totalWallets = 500;
	const currentTotalWallets = await ThirdWebLib.Action.getAllWallets();

	const neededWallets = totalWallets - currentTotalWallets.length;
	console.log("neededWallets:", neededWallets);

	for (let i = 0; i < neededWallets; i++) {
		const label = `wallet-${neededWallets - i}`;
		const res = await ThirdWebLib.Action.createWallet(label);
		console.log(`${label}:`, res);

		expect(res).toHaveProperty("walletAddress");
		expect(res.status).toBe("success");
	}
});

// Used this to create a master wallet address
// // bun test --test-name-pattern 'ethers generate private key'
// // 0x05Dffce4D37ffEeb758b01fE3d1f0468a78fD58D
// test("ethers generate private key", async () => {
// 	const privateKey = ethers.Wallet.createRandom().privateKey;
// 	console.log("privateKey:", privateKey);
// });

// bun test --test-name-pattern 'ethers check balance'
// 10 LIT = 10000000000000000000 wei
// test("ethers check balance", async () => {
// 	const address = "0x05Dffce4D37ffEeb758b01fE3d1f0468a78fD58D";
// 	const rpc = "https://chain-rpc.litprotocol.com/http";
// 	const provider = new ethers.providers.JsonRpcProvider(rpc);
// 	const balance = await provider.getBalance(address);
// 	const parsedBalance = ethers.utils.formatEther(balance);
// 	const originalBalance = ethers.utils.parseEther(parsedBalance);
// 	console.log("balance:", parsedBalance);
// 	console.log("balance in wei:", balance.toString());
// 	console.log("originalBalance:", originalBalance.toString());

// 	expect(balance.toString()).toBe(originalBalance.toString());
// });

// bun test --test-name-pattern 'maintainBalances' --timeout 300000
test("maintainBalances", async () => {
	// -- config
	const masterAddress = process.env.MASTER_WALLET_ADDRESS as string;
	if (!masterAddress) {
		throw new Error("MASTER_WALLET_ADDRESS is not set");
	}

	const queueIds = await ThirdWebLib.Action.maintainBalances({
		minimumBalance: "0.001",
		funderAddress: masterAddress,
	});

	const funded = queueIds.filter((q) => q.queueId === "");
	const funding = 500 - funded.length;
	console.log("funded:", funded.length);
	console.log("funding:", funding);
});

// bun test --test-name-pattern 'get all transactions'
test("get all transactions", async () => {
	const queuedTxs = await ThirdWebLib.Action.getAllTransactions();
	const totalTxs = queuedTxs.length;
	const totalQueueingTxs = queuedTxs.filter(
		(tx: any) => tx.status === "queued",
	).length;
	console.log("totalTxs:", totalTxs);
	console.log("totalQueueingTxs:", totalQueueingTxs);
});

// bun test --test-name-pattern 'get balances' --timeout 300000
test("get balances", async () => {
	const wallets = await ThirdWebLib.Action.getAllWallets({
		limit: 500,
	});

	const balancePromises = wallets.map((wallet) => {
		return ThirdWebLib.Action.getBalance(wallet.address);
	});

	const balances = await Promise.all(balancePromises);

	// check how many wallets have a balance of 0
	const zeroBalances = balances.filter((balance) => {
		return parseInt(balance.value) <= 0;
	}).length;

	const greaterThanZeroBalances = balances.filter((balance) => {
		return parseInt(balance.value) > 0;
	});

	console.log("zeroBalances:", zeroBalances);
	console.log("greaterThanZeroBalances:", greaterThanZeroBalances.length);
});

// bun test --test-name-pattern 'read contract' --timeout 300000
test("read contract", async () => {
	const read = await ThirdWebLib.Fetch.get(
		"/contract/lit-protocol/0x3c3ad2d238757Ea4AF87A8624c716B11455c1F9A/read?functionName=mintCost",
	);

	console.log("read:", read);
});

// bun test --test-name-pattern 'read lit' --timeout 300000
test("read lit", async () => {
	const read = await ThirdWebLib.Fetch.get(
		"/contract/lit-protocol",
	);

	console.log("read:", read);
});
