declare namespace NodeJS {
  interface ProcessEnv {
    SOLANA_CLUSTER_URL: string;
    TOKEN_ACCOUNT_PUBLIC_KEY: string;
    MINT: string;
    ANCHOR_WALLET?: string;
    WALLET_PATH?: string;
    WALLET_KEYPAIR_PATH?: string;
    PRIVATE_KEY?: string;
  }
}
