import { z } from 'zod';

/**
 * Risk management configuration schema - applies to both spot and perp trading
 */
export const RiskConfigSchema = z.object({
  // Position sizing controls
  maxPositionSize: z.number()
    .min(0.001).max(1)
    .describe("Maximum size for any single position as fraction of total portfolio value"),

  // Leverage constraints
  maxLeverage: z.number()
    .min(1).max(50)
    .describe("Maximum allowed leverage multiplier (e.g., 5 for 5x)"),

  // Loss limits
  dailyLossLimit: z.number()
    .min(0.005).max(0.5)
    .default(0.05)
    .describe("Maximum allowable loss in a single trading day as fraction of equity"),

  weeklyLossLimit: z.number()
    .min(0.01).max(1)
    .default(0.15)
    .describe("Maximum allowable loss in a calendar week as fraction of equity"),

  // Volatility controls
  maxVolatility: z.number()
    .min(0.01).max(1000)
    .transform(v => v / 100)
    .default(10)
    .describe("Maximum allowed 24-hour price volatility percentage (entering new positions)"),

  // Trading behavior controls
  minPositionAge: z.number()
    .min(0).max(3600)
    .optional()
    .describe("Minimum required holding time for positions in seconds"),

  minEquityRatio: z.number()
    .min(0.01).max(0.5)
    .default(0.1)
    .describe("Minimum equity-to-deposits ratio before blocking new trades"),

  maintenanceMarginBuffer: z.number()
    .min(0.01).max(0.2)
    .default(0.05)
    .describe("Additional safety buffer above protocol maintenance margin requirements"),

  minLiquidity: z.number()
    .min(1000)
    .default(10000)
    .describe("Minimum USD liquidity required in market to allow trading"),

  cooldownAfterLoss: z.number()
    .min(0).max(86400)
    .default(300)
    .describe("Cooling-off period in seconds after significant losses"),

  // Market-specific adjustments
  marketOverrides: z.record(
    z.object({
      maxPositionSize: z.number().min(0.001).optional(),
      maxLeverage: z.number().min(1).optional(),
      volatilityMultiplier: z.number().min(0.1).max(3).optional()
    })
  ).optional()
    .describe("Market-specific risk parameter adjustments")
});

/**
 * Default safe configuration for devnet testing
 */
export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxPositionSize: 0.05, // 5%
  maxLeverage: 5,
  dailyLossLimit: 0.05, // 5%
  weeklyLossLimit: 0.15, // 15%
  minEquityRatio: 0.1,
  maintenanceMarginBuffer: 0.075,
  minLiquidity: 10000,
  cooldownAfterLoss: 300,
  maxVolatility: 15 // 15%
};

export type RiskConfig = z.infer<typeof RiskConfigSchema>;

/**
 * Validates and parses risk configuration from JSON
 */
export function parseRiskConfig(json: unknown): RiskConfig {
  return RiskConfigSchema.parse(json);
}