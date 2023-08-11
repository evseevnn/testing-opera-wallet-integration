import { BlockchainNetworkParams } from "./constants";

export type TransferAbiParams = {
  to: string;
  asset: string;
  amount: string;
};

export interface BlockchainPaymentService {
  get connectionParams(): BlockchainNetworkParams;
  get minimalTransferAmount(): number;
  get paymentToken(): string;
  getAvailableAssets(): Promise<Record<string, any>>;
  getTransactionExplorerUrl(txHash: string): string;
  getTransferAbi(props: TransferAbiParams): Promise<any>;
  getAssetBalance(address: string, asset: string): Promise<number>;
  getBalance(address: string): Promise<number>;
}
