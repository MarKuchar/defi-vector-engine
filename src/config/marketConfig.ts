import { z } from 'zod';

// Schema for validation
const MarketConfigSchema = z.object({
  marketSymbol: z.string().regex(/^[A-Z]+-PERP$/, 'Must be a PERP pair like SOL-PERP'),
  useWebSocket: z.boolean().default(true),
  indicators: z.object({
    trackMarkPrice: z.boolean().default(true),
    trackOraclePrice: z.boolean().default(true),
    trackFundingRate: z.boolean().default(true),
    trackVolume: z.boolean().default(true),
    trackOpenInterest: z.boolean().default(true),
    trackDailyChange: z.boolean().default(false),
    trackOrderbook: z.boolean().default(false),
    minValidVolume: z.number().int().min(1000).max(60000).default(10000),
  }),
  pollingIntervalMs: z.number().int().min(1000).max(60000).default(10000),
  pricePrecision: z.number().int().min(2).max(8).default(4),
  volumeDivisor: z.number().int().min(1000).max(60000).default(10000),
  volumePrecision: z.number().int().min(0).max(8).default(2),
  maxDataAgeMs: z.number().int().min(1000).default(15000),
});

export type MarketConfig = z.infer<typeof MarketConfigSchema>;

// Default configuration
export const marketConfig: MarketConfig = {
  marketSymbol: 'SOL-PERP',
  useWebSocket: true,
  indicators: {
    trackMarkPrice: true,
    trackOraclePrice: true,
    trackFundingRate: false,
    trackVolume: true,
    trackOpenInterest: false,
    trackDailyChange: true,
    trackOrderbook: false,
    minValidVolume: 1000,
  },
  pollingIntervalMs: 1000,
  pricePrecision: 4,
  volumeDivisor: 1e9,
  volumePrecision: 2,
  maxDataAgeMs: 30000,
};

// Validation function
export function validateMarketConfig(config: unknown): MarketConfig {
  return MarketConfigSchema.parse(config);
}

// Helper to get market index from symbol
export function getMarketIndex(symbol: string): number {
  const marketMap: Record<string, number> = {
    'SOL-PERP': 0,
    'BTC-PERP': 1,
    'ETH-PERP': 2,
  };
  return marketMap[symbol] ?? 0;
}