import { DriftClient } from '@drift-labs/sdk';
import BN from 'bn.js';
import { getCurrentPnl } from '../services/PnlService';

export async function getAccountEquity(driftClient: DriftClient): Promise<number> {
  const userAccount = driftClient.getUserAccount();
  if (!userAccount) throw new Error('UserAccount not loaded');

  // Calculate collateral net
  const collateralBN: BN = userAccount.totalDeposits.sub(userAccount.totalWithdraws);
  const collateral = collateralBN.toNumber() / 1e6;

  // Use your existing PnL calculator (which you seem to have)
  const unrealizedPnl = await getCurrentPnl(driftClient);

  return collateral + unrealizedPnl;
}