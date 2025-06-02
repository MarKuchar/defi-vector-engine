import { RiskConfig, DEFAULT_RISK_CONFIG } from '../types/RiskConfig';
import { DriftClient } from '@drift-labs/sdk';
import { BN } from 'bn.js';

export class RiskEngine {
  private config: RiskConfig;

  constructor(
    private driftClient: DriftClient,
    config?: Partial<RiskConfig>
  ) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  async canOpenPosition(market: string, size: number): Promise<boolean> {
    const marketConfig = this.getMarketConfig(market);
    
    // 1. Check position size limit
    if (size > marketConfig.maxPositionSize) {
      console.warn(`Position size ${size} exceeds max ${marketConfig.maxPositionSize}`);
      return false;
    }

    // 2. Check available liquidity
    if (!await this.checkLiquidity(market, size)) {
      return false;
    }

    // 3. Check margin requirements
    if (!await this.checkMarginRequirements(market, size)) {
      return false;
    }

    return true;
  }

  private async checkLiquidity(market: string, size: number): Promise<boolean> {
    const index = this.getMarketIndex(market);
    const marketAccount = this.driftClient.getPerpMarketAccount(index);
    
    if (!marketAccount) {
      console.warn(`Market account not found for ${market}`);
      return false;
    }
    
    // Convert size to BN for comparison
    const sizeBN = new BN(size * 1e6); // Adjust multiplier based on your precision needs
    const availableLiquidity = marketAccount.amm.baseAssetAmountPerLp.abs();
    
    return sizeBN.lte(availableLiquidity.muln(0.1)); // Don't take more than 10% of liquidity
  }

  private async checkMarginRequirements(market: string, size: number): Promise<boolean> {
    const userAccount = this.driftClient.getUser();
    if (!userAccount) {
      console.warn('No user account found');
      return false;
    }

    const marginRatio = userAccount.getMarginRatio();
    const marketConfig = this.getMarketConfig(market);
    
    // Convert to decimal representation
    const currentLeverage = 1 / marginRatio.toNumber();
    return currentLeverage < marketConfig.maxLeverage;
  }

  private getMarketIndex(market: string): number {
    const markets: Record<string, number> = {
      'SOL-PERP': 0,
      'BTC-PERP': 1,
    };
    return markets[market] ?? 0;
  }

  getMarketConfig(market: string): RiskConfig {
    return {
      ...this.config,
      ...(this.config.marketOverrides?.[market] || {})
    };
  }
}