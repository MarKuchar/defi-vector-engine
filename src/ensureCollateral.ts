import { BN } from "bn.js";

async function ensureCollateral(driftClient, depositAmount: number, subAccountId: number) {
  // Fetch your account info (including collateral)
  await driftClient.fetchAccounts();

  const account = driftClient.getUserAccount();
  const collateralBalance = account.getTotalCollateral();

  console.log("Current collateral:", collateralBalance.toString());

  // If collateral is less than depositAmount, deposit collateral
  if (collateralBalance.lt(new BN(depositAmount))) {
    console.log(`Depositing collateral: ${depositAmount}`);
    try {
      await driftClient.depositCollateral(new BN(depositAmount), subAccountId);
      console.log("Collateral deposited successfully.");
      // Refresh account info after deposit
      await driftClient.fetchAccounts();
    } catch (err) {
      console.error("Error depositing collateral:", err);
      throw err;
    }
  } else {
    console.log("Sufficient collateral available, no deposit needed.");
  }
}
