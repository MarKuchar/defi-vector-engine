import { z } from 'zod';

const StrategyConfigSchema = z.object({
  strategy: z.string(),
  pair: z.string(),
  entryRules: z.object({
    priceAboveMA: z.object({
      period: z.number().int().positive(),
      threshold: z.number().positive()
    }),
    rsiConditions: z.object({
      period: z.number().int().positive(),
      overbought: z.number().positive(),
      oversold: z.number().positive()
    })
  }),
  risk: z.object({
    maxPositionSize: z.number().min(0).max(1),
    stopLoss: z.number().min(0).max(1)
  }),
  circuitBreaker: z.object({
    maxDailyLoss: z.number().negative(),
    maxDrawdown: z.number().negative()
  }).optional()
});

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;

export function parseStrategyConfig(json: unknown): StrategyConfig {
  return StrategyConfigSchema.parse(json);
}