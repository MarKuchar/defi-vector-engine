// src/services/RiskEngine.ts
import { RiskConfig, parseRiskConfig, DEFAULT_RISK_CONFIG } from '../types/RiskConfig';
import fs from 'fs/promises';
import path from 'path';
import { DriftClient, } from '@drift-labs/sdk';

export class RiskEngine {
  private config: RiskConfig;

  constructor(
    private driftClient: DriftClient,
    config?: Partial<RiskConfig>
  ) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  static async create(driftClient: DriftClient): Promise<RiskEngine> {
    try {
      const raw = await fs.readFile(
        path.resolve(__dirname, '../../config/risk/default.json'),
        'utf8'
      );
      const config = parseRiskConfig(JSON.parse(raw));
      return new RiskEngine(driftClient, config);
    } catch (err) {
      console.warn('Using default risk config due to load error:', err);
      return new RiskEngine(driftClient);
    }
  }

  getMarketConfig(market: string): RiskConfig {
    return {
      ...this.config,
      ...(this.config.marketOverrides?.[market] || {})
    };
  }
}