export type BlockchainNetworkParams = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrls: string[];
};

export type BlockchainNetwork = {
  mainnet: BlockchainNetworkParams;
  testnet: BlockchainNetworkParams;
};

export enum Blockchain {
  CELO = "celo",
}
