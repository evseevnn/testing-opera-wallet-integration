import {
  BlockchainNetwork,
  BlockchainNetworkParams,
} from "@/blockchains/constants";
import {
  BlockchainPaymentService,
  TransferAbiParams,
} from "../blockchain-payment-service";
import { ContractKit, newKit } from "@celo/contractkit";
import { StableTokenWrapper } from "@celo/contractkit/lib/wrappers/StableTokenWrapper";

export const celoNetworks: BlockchainNetwork = {
  mainnet: {
    chainId: "0xa4ec",
    chainName: "Celo",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    rpcUrls: ["https://forno.celo.org"],
    blockExplorerUrls: ["https://explorer.celo.org/"],
    iconUrls: [],
  },
  testnet: {
    chainId: "0xaef3",
    chainName: "Alfajores Testnet",
    nativeCurrency: { name: "Alfajores Celo", symbol: "A-CELO", decimals: 18 },
    rpcUrls: ["https://alfajores-forno.celo-testnet.org"],
    blockExplorerUrls: ["https://alfajores-blockscout.celo-testnet.org/"],
    iconUrls: [],
  },
};

export class Celo implements BlockchainPaymentService {
  private celoKit: ContractKit;
  private networkParams: BlockchainNetworkParams;

  constructor(networkParams: BlockchainNetworkParams) {
    this.networkParams = networkParams;
    this.celoKit = newKit(this.networkParams.rpcUrls[0]);
  }

  get paymentToken(): string {
    return "cUSD";
  }

  get minimalTransferAmount(): number {
    const minimalWei = 60000;
    return parseFloat(this.celoKit.web3.utils.fromWei(minimalWei.toString()));
  }

  get connectionParams(): BlockchainNetworkParams {
    return this.networkParams;
  }

  getTransactionExplorerUrl(txHash: string): string {
    return `${this.connectionParams.blockExplorerUrls[0]}/tx/${txHash}`;
  }

  async getBalance(address: string): Promise<number> {
    const balance = (await this.celoKit.getTotalBalance(address)).CELO;
    return parseFloat(
      this.celoKit.web3.utils.fromWei(balance?.toString() || "0")
    );
  }

  async getAssetBalance(address: string, asset: string): Promise<number> {
    const assets = await this.getAvailableAssets();
    const assetData = assets[asset];

    if (!assetData) {
      throw new Error("Asset not supported");
    }

    let balance = await assetData.contract.methods.balanceOf(address).call();
    balance = this.celoKit.web3.utils.fromWei(balance, "ether");

    return parseFloat(balance);
  }

  async getAvailableAssets(): Promise<Record<string, any>> {
    let cUSDtoken: StableTokenWrapper =
      await this.celoKit.contracts.getStableToken();
    return {
      cUSD: cUSDtoken,
    };
  }

  async getTransferAbi({ to, asset, amount }: TransferAbiParams): Promise<any> {
    const assets = await this.getAvailableAssets();
    const assetData = assets[asset];

    if (!assetData) {
      throw new Error("Asset not supported");
    }

    const transferAmount = this.celoKit.web3.utils.toWei(
      amount.toString(),
      "ether"
    );

    const transferMethod = assetData.contract.methods.transfer(
      to,
      transferAmount
    );

    const abiData = transferMethod.encodeABI();

    return abiData;
  }
}

export const celoNetwork = new Celo(celoNetworks.testnet);
