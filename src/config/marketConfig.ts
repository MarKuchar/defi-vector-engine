export const marketConfig = {
  marketSymbol: 'SOL-PERP',
  useWebSocket: true,
  indicators: {
    trackMarkPrice: true,
    trackOraclePrice: true,
    trackFundingRate: true,
    // add more as needed
  },
  pollingIntervalMs: 10000, // fallback for polling if needed
};
