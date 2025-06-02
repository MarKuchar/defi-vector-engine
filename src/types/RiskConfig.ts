import { z } from 'zod';

/**
 * Risk management configuration schema - applies to both spot and perp trading
 */
export const RiskConfigSchema = z.object({
  // Position sizing
  maxPositionSize: z.number()
    .min(0.01).max(1)
    .describe("Max position size as % of total equity (0.01-1)"),
    
  maxLeverage: z.number()
    .min(1).max(20)
    .describe("Maximum allowed leverage"),

  // Loss limits
  dailyLossLimit: z.number()
    .min(0.01).max(0.5)
    .describe("Max daily loss as % of equity (0.01-0.5)"),
    
  weeklyLossLimit: z.number()
    .min(0.05).max(1)
    .optional()
    .describe("Optional weekly loss limit"),

  // Margin requirements  
  minEquityRatio: z.number()
    .min(0.01).max(0.5)
    .describe("Minimum equity/deposits ratio before blocking new trades"),
    
  maintenanceMarginBuffer: z.number()
    .min(0.01).max(0.2)
    .default(0.05)
    .describe("Additional buffer above protocol maintenance margin"),

  // Volatility controls
  maxVolatility: z.number()
    .min(0.1).max(10)
    .optional()
    .describe("Max allowed 24h volatility (in %) to enter positions"),
    
  minLiquidity: z.number()
    .min(1000)
    .default(10000)
    .describe("Minimum USD liquidity required to trade"),

  // Circuit breakers
  cooldownAfterLoss: z.number()
    .min(0).max(3600)
    .default(300)
    .describe("Seconds to wait after significant loss"),
    
  maxDrawdown: z.number()
    .min(0.05).max(0.5)
    .optional()
    .describe("Max allowed drawdown before stopping trading"),

  // Per-market overrides
  marketOverrides: z.record(z.object({
    maxPositionSize: z.number().optional(),
    maxLeverage: z.number().optional()
  })).optional()
});

export type RiskConfig = z.infer<typeof RiskConfigSchema>;

/**
 * Default safe configuration for devnet testing
 */
export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxPositionSize: 0.1, // 10%
  maxLeverage: 3,
  dailyLossLimit: 0.05, // 5%
  minEquityRatio: 0.1, // 10%
  maintenanceMarginBuffer: 0.05,
  minLiquidity: 5000,
  cooldownAfterLoss: 0
};

/**
 * Validates and parses risk configuration from JSON
 */
export function parseRiskConfig(json: unknown): RiskConfig {
  return RiskConfigSchema.parse(json);
}