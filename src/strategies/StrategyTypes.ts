import { z } from 'zod';

export const StrategyConfigSchema = z.object({
  strategy: z.string(),
  pair: z.string(),
  params: z.object({
    lookbackPeriod: z.number().int().positive(),
    entryZScore: z.number(),
    exitZScore: z.number()
  }).optional(),
  entryRules: z.object({
    priceAboveMA: z.object({
      period: z.number().int().positive(),
      threshold: z.number().positive()
    }),
    rsiConditions: z.object({
      period: z.number().int().positive(),
      overbought: z.number().min(0).max(100),
      oversold: z.number().min(0).max(100)
    })
  }),
  risk: z.object({
    maxPositionSize: z.number().min(0).max(1),
    stopLoss: z.number().min(0).max(1)
  }),
  circuitBreaker: z.object({
    maxDailyLoss: z.number(),
    maxDrawdown: z.number()
  }).optional()
});

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;

export interface MarketData {
  currentPrice: number;
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  timestamp: number;
}

export interface TradeSignal {
  direction: 'LONG' | 'SHORT' | 'CLOSE' | null;
  size: number;
  reason?: string;
}

export function parseStrategyConfig(json: unknown): StrategyConfig {
  return StrategyConfigSchema.parse(json);
}