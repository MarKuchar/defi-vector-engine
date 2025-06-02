import { z } from 'zod';

const StrategyConfigSchema = z.object({
  strategy: z.string(),
  pair: z.string(),
  params: z.object({
    lookbackPeriod: z.number().int().positive(),
    entryZScore: z.number(),
    exitZScore: z.number()
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

export function parseStrategyConfig(json: any): StrategyConfig {
  return StrategyConfigSchema.parse(json);
}
