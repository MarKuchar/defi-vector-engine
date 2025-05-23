import { BN } from "bn.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey("Aj9Bie6REe74rSGwAqfAvx6tV1LZKUd1iKzD8U2FJh8z"); // USDC on devnet

export async function ensureCollateral(driftClient: { fetchAccounts: () => any; getUser: () => any; wallet: { publicKey: PublicKey; }; deposit: (arg0: import("bn.js"), arg1: number, arg2: PublicKey, arg3: number) => any; }, depositAmount: number, subAccountId = 0) {
  await driftClient.fetchAccounts();
  const user = driftClient.getUser();
  const totalCollateral = user.getTotalCollateral();

  console.log("Current collateral:", totalCollateral.toString());

  if (totalCollateral.lt(new BN(depositAmount))) {
    console.log(`Depositing ${depositAmount} collateral...`);

    // Get your associated token account (ATA) for USDC
    const usdcTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      driftClient.wallet.publicKey
    );

    try {
      await driftClient.deposit(
        new BN(depositAmount),
        0, // spotMarketIndex = 0 for USDC
        usdcTokenAccount,
        subAccountId
      );

      console.log("✅ Collateral deposited.");
      await driftClient.fetchAccounts(); // Refresh
    } catch (err) {
      console.error("❌ Error depositing collateral:", err);
      throw err;
    }
  } else {
    console.log("✅ Sufficient collateral available. No deposit needed.");
  }
}
