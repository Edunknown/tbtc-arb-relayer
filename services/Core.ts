import { BigNumber, ethers } from "ethers";
import { L1BitcoinDepositorABI } from "../interfaces/L1BitcoinDepositor";
import { L2BitcoinDepositorABI } from "../interfaces/L2BitcoinDepositor";
import { finalizeDeposit } from "./FinalizeDeposits";
import cron from "node-cron";
import { TBTC } from "@keep-network/tbtc-v2.ts";
import { getAllJsonOperationsQueued, getJsonById, writeNewJson } from "../utils/JsonUtils";
import { createDeposit } from "../utils/CreateDeposit";
import { initializeDepositL1 } from "./InitializeDepositServices/InitializeDepositL1";
import { Deposit } from "../types/Deposit.type";
import { initializeDepositsL1 } from "./InitializeDepositServices/InitializeDepositsL1";
import { LogMessage } from "../utils/Logs";
import { TBTCVaultABI } from "../interfaces/TBTCVaultSepolia";
import { attempFinalizeDeposit } from "./FinalizeDepositServices/AttempFinalizeDeposit";
// ---------------------------------------------------------------

// Environment Variables
const ArbitrumRPC: string = process.env.ArbitrumRPCSepolia || "";
const EthereumRPC: string = process.env.EthereumRPCSepolia || "";
const L1BitcoinDepositor_Address: string = process.env.L1BitcoinDepositor || "";
const L2BitcoinDepositor_Address: string = process.env.L2BitcoinDepositor || "";
const TBTCVaultAdress: string = process.env.TBTCVaultSepolia || "";
const privateKey: string = process.env.PRIVATE_KEY || "";

// Provider
const providerArb: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(ArbitrumRPC);
const providerEth: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(EthereumRPC);

//Signer
const signerArb: ethers.Wallet = new ethers.Wallet(privateKey, providerArb);
const signerEth: ethers.Wallet = new ethers.Wallet(privateKey, providerEth);

// Contracts
export const L1BitcoinDepositor: ethers.Contract = new ethers.Contract(
	L1BitcoinDepositor_Address,
	L1BitcoinDepositorABI,
	signerEth
);

export const L2BitcoinDepositor: ethers.Contract = new ethers.Contract(
	L2BitcoinDepositor_Address,
	L2BitcoinDepositorABI,
	signerArb
);

export const TBTCVault: ethers.Contract = new ethers.Contract(TBTCVaultAdress, TBTCVaultABI, signerEth);

export const sdkPromise = TBTC.initializeSepolia(providerEth, true);

// Start the cronjobs for the
export const startCronJobs = () => {
	//CRONJOBS
	console.log("Starting cron job setup...");

	cron.schedule("* * * * *", async () => {
		finalizeDeposit();
		console.log("Finalized Deposits!");
		const queuedDeposits: Array<Deposit> = await getAllJsonOperationsQueued();
		if (queuedDeposits.length > 0) {
			initializeDepositsL1(queuedDeposits);
		} else {
			LogMessage("No deposits found to initialize");
		}
	});

	console.log("Cron job setup complete.");
};

//Listeners for initialize and finalize deposit
export const checkEvents = () => {
	L2BitcoinDepositor.on("DepositInitialized", (fundingTx, reveal, l2DepositOwner, l2Sender) => {
		const deposit: Deposit = createDeposit(fundingTx, reveal, l2DepositOwner, l2Sender);
		writeNewJson(fundingTx, reveal, l2DepositOwner, l2Sender);
		initializeDepositL1(deposit);
	});

	TBTCVault.on("OptimisticMintingFinalized", (minter, depositKey, depositor, optimisticMintingDebt) => {
		console.log("🚀 ~ TBTCVault.on ~ depositKey:", depositKey);
		const BigDepositKey = BigNumber.from(depositKey);
		const deposit: Deposit | null = getJsonById(BigDepositKey.toString());
		if (deposit) {
			attempFinalizeDeposit(deposit);
		}
	});
};

// ---------------------------------------------------------------
