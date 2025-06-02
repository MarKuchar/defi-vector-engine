import { DriftClient } from '@drift-labs/sdk';
import { BN } from '@coral-xyz/anchor';

export async function getCurrentPnl(driftClient: DriftClient): Promise<number> {
  const user = driftClient.getUser();
  if (!user) {
    console.warn('User not initialized.');
    return 0;
  }

  await user.fetchAccounts();

  const positions = user.getUserAccount().perpPositions;
  let totalPnl = 0;

  for (const pos of positions) {
    if (pos.baseAssetAmount.isZero()) continue;

    try {
      const marketIndex = pos.marketIndex;
      const pnl: BN = user.getUnrealizedPNL(true, marketIndex);
      totalPnl += pnl.toNumber();
    } catch (err) {
      console.warn(`Failed to get PnL for market ${pos.marketIndex.toString()}:`, err);
    }
  }

  return totalPnl;
}
