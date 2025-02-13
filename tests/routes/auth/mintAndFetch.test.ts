import request from "supertest";
import express from "express";
import { mintNextAndAddAuthMethodsHandler } from "../../../routes/auth/mintAndFetch";
import { ethers } from "ethers";
import { Sequencer } from "../../../lib/sequencer";

// Mock the dependencies
jest.mock("../../../lit", () => ({
	mintPKP: jest.fn(),
}));

jest.mock("../../../lib/sequencer", () => ({
	Sequencer: {
		Instance: {
			wait: jest.fn(),
		},
		Wallet: null,
	},
}));

describe("mintNextAndAddAuthMethods Integration Tests", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.post(
			"/mint-next-and-add-auth-methods",
			mintNextAndAddAuthMethodsHandler,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should successfully mint a PKP and return a request ID", async () => {
		const mockTxHash = "0x123456789";
		const mockTx = { hash: mockTxHash };

		// Mock the mintPKP function to return a successful transaction
		const { mintPKP } = require("../../../lit");
		(mintPKP as jest.Mock).mockResolvedValueOnce(mockTx);

		const requestBody = {
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
			permittedAuthMethodIds: [
				"0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
			],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(requestBody)
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response.body).toEqual({
			requestId: mockTxHash,
		});
		expect(mintPKP).toHaveBeenCalledWith(requestBody);
	});

	it("should handle errors when minting fails", async () => {
		const errorMessage = "Minting failed";

		// Mock the mintPKP function to throw an error
		const { mintPKP } = require("../../../lit");
		(mintPKP as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

		const requestBody = {
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
			permittedAuthMethodIds: [
				"0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
			],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(requestBody)
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain(
			"[mintNextAndAddAuthMethodsHandler] Unable to mint PKP",
		);
		expect(mintPKP).toHaveBeenCalledWith(requestBody);
	});

	it("should validate required request body parameters", async () => {
		const invalidRequestBody = {
			// Missing required parameters
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(invalidRequestBody)
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
	});
});
