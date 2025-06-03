declare namespace NodeJS {
  interface ProcessEnv {
    SOLANA_CLUSTER_URL: string;
    TOKEN_ACCOUNT_PUBLIC_KEY: string;
    MINT: string;
    ANCHOR_WALLET?: string;
    WALLET_PATH?: string;
    WALLET_KEYPAIR_PATH?: string;
    PRIVATE_KEY?: string;
    STRATEGY_NAME?: string;
    RPC_ENDPOINT?: string;
    USDC_ATA_ADDRESS?: string;
    PROGRAM_ID?: string;
    PDA_SEEDS?: string;
    COMMITMENT?: string;
    RPC_URL?: string;
    OWNER_PUBLIC_KEY: string;
    ORACLE_PUBKEY?: string;
    DRIFT_ENV?: string;
    MARKET_INDEX?: string;
    NODE_ENV?: string;
    LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
  }
}
