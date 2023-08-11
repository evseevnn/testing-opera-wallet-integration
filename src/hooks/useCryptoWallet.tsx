"use client";
import {
  useState,
  useEffect,
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
} from "react";

import detectEthereumProvider from "@metamask/detect-provider";
import { formatBalance } from "../helpers";
import { toast } from "react-toastify";
import { BlockchainPaymentService } from "@/blockchains/blockchain-payment-service";

interface WalletState {
  accounts: any[];
  balance: string;
  chainId: string;
}

interface TransactionProps {
  to: string;
  asset: string;
  amount: number;
}

interface MetaMaskContextData {
  wallet: WalletState;
  hasProvider: boolean | null;
  error: boolean;
  errorMessage: string;
  isConnecting: boolean;
  blockchain?: BlockchainPaymentService;
  connectMetaMask: (blockchain: BlockchainPaymentService) => Promise<void>;
  changeBlockchain: (blockchain: BlockchainPaymentService) => Promise<void>;
  sendTransaction: (props: TransactionProps) => Promise<string | undefined>;
  clearError: () => void;
}

const disconnectedState: WalletState = {
  accounts: [],
  balance: "",
  chainId: "",
};

const MetaMaskContext = createContext<MetaMaskContextData>(
  {} as MetaMaskContextData
);

export const MetaMaskContextProvider = ({ children }: PropsWithChildren) => {
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const clearError = () => setErrorMessage("");
  const [blockchain, setBlockchain] = useState<BlockchainPaymentService>();
  const [wallet, setWallet] = useState(disconnectedState);

  const _updateWallet = useCallback(async (providedAccounts?: any) => {
    const accounts =
      providedAccounts ||
      (await window.ethereum.request({ method: "eth_accounts" }));

    if (accounts.length === 0) {
      // If there are no accounts, then the user is disconnected
      setWallet(disconnectedState);
      return;
    }

    const balance = formatBalance(
      await window.ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      })
    );
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    setWallet({ accounts, balance, chainId });
  }, []);

  const updateWalletAndAccounts = useCallback(
    () => _updateWallet(),
    [_updateWallet]
  );
  const updateWallet = useCallback(
    (accounts: any) => _updateWallet(accounts),
    [_updateWallet]
  );

  /**
   * This logic checks if MetaMask is installed. If it is, some event handlers are set up
   * to update the wallet state when MetaMask changes. The function returned by useEffect
   * is used as a "cleanup": it removes the event handlers whenever the MetaMaskProvider
   * is unmounted.
   */
  useEffect(() => {
    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true });
      setHasProvider(Boolean(provider));

      if (provider) {
        window.ethereum.on("accountsChanged", updateWallet);
        window.ethereum.on("chainChanged", updateWalletAndAccounts);
      }
    };

    getProvider();

    return () => {
      window.ethereum?.removeListener("accountsChanged", updateWallet);
      window.ethereum?.removeListener("chainChanged", updateWalletAndAccounts);
    };
  }, [updateWallet, updateWalletAndAccounts]);

  const changeBlockchain = async (blockchain: BlockchainPaymentService) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: blockchain.connectionParams.chainId }],
      });

      setBlockchain(blockchain);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [blockchain.connectionParams],
          });

          // Register assets in wallet
          // Currently working only for Metamask
          if (window.ethereum.isMetaMask) {
            const assets = await blockchain.getAvailableAssets();
            for (const symbol in assets) {
              const params = {
                type: "ERC20",
                options: {
                  address: assets[symbol].address,
                  symbol: symbol,
                  decimals: await assets[symbol].decimals(),
                  image: "",
                },
              };

              await window.ethereum.request({
                method: "wallet_watchAsset",
                params,
              });
            }
          }

          setBlockchain(blockchain);
        } catch (error: any) {
          console.error(error);
          setErrorMessage("Cannot add network");
        }
      } else {
        console.error(error);
        setErrorMessage("Cannot switch network");
      }
    }
  };

  useEffect(() => {
    if (blockchain) {
      (async () => {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: blockchain.connectionParams.chainId }],
        });
      })();
    }
  }, [blockchain]);

  useEffect(() => {
    if (
      blockchain &&
      wallet.accounts.length &&
      wallet.chainId !== blockchain.connectionParams.chainId &&
      !errorMessage
    ) {
      setErrorMessage("Please check your network, you are on the wrong chain");
    }
  }, [wallet.chainId]);

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
      clearError();
    }
  }, [errorMessage]);

  const connectMetaMask = async (blockchain: BlockchainPaymentService) => {
    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      clearError();
      await changeBlockchain(blockchain);
      await updateWallet(accounts);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Cannot connect to your wallet");
    }
    setIsConnecting(false);
  };

  const sendTransaction = async ({
    to,
    asset,
    amount,
  }: TransactionProps): Promise<string | undefined> => {
    try {
      const { accounts } = wallet;
      // Check is connected
      if (accounts.length < 1) {
        setErrorMessage("Please connect your wallet");
        return;
      }

      if (!blockchain) {
        setErrorMessage("Blockchain not selected, please select a blockchain");
        return;
      }

      // Check is on the right chain
      if (wallet.chainId !== blockchain.connectionParams.chainId) {
        setErrorMessage(
          "Please check your network, you are on the wrong chain"
        );
        return;
      }

      // Getting the abi data
      const contractAbiData = await blockchain.getTransferAbi({
        to,
        asset,
        amount: amount.toString(),
      });

      // Get asset contract address
      const assets = await blockchain.getAvailableAssets();
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.accounts[0],
            to: assets[asset].address,
            data: contractAbiData,
          },
        ],
      });

      return txHash;
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Cannot send transaction");
    }
  };

  return (
    <MetaMaskContext.Provider
      value={{
        wallet,
        hasProvider,
        error: !!errorMessage,
        errorMessage,
        isConnecting,
        blockchain,
        connectMetaMask,
        sendTransaction,
        changeBlockchain,
        clearError,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error(
      'useMetaMask must be used within a "MetaMaskContextProvider"'
    );
  }
  return context;
};
