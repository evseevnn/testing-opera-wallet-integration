"use client";

import { celoNetwork } from "@/blockchains/networks/celo";
import { useMetaMask } from "@/hooks/useCryptoWallet";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function Home() {
  const { connectMetaMask, isConnecting, wallet, blockchain, sendTransaction } =
    useMetaMask();
  const { accounts, balance } = wallet;
  const [cUSDBalance, setCUSDBalance] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (blockchain && accounts[0]) {
      blockchain
        .getAssetBalance(accounts[0], "cUSD")
        .then((balance) => setCUSDBalance(balance));
    }
  }, [blockchain, accounts]);

  const payWithCelo = useCallback(
    async (amount: number) => {
      if (!blockchain) return;
      setIsProcessing(true);
      try {
        // Check balance
        const assetBalance = await blockchain.getAssetBalance(
          wallet.accounts[0],
          blockchain.paymentToken // Later we can refactor it for choose asset from frontend
        );

        if (assetBalance < amount) {
          toast.error("Not enough balance of cUSD");
          return;
        }

        const balance = await blockchain.getBalance(wallet.accounts[0]);
        if (balance < blockchain.minimalTransferAmount) {
          toast.error("Not enough balance CELO for transaction fee");
          return;
        }

        // Send transaction
        const txHash = await sendTransaction({
          to: accounts[0], // We will send to self for testing
          asset: blockchain.paymentToken,
          amount,
        });

        if (!txHash) {
          toast.error("Transaction failed");
          return;
        }

        setTxHash(txHash);
      } catch (error: any) {
        console.error(error);
        toast.error(error.toString());
      } finally {
        setIsProcessing(false);
      }
    },
    [blockchain, accounts]
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Testing CELO integration
        </p>
      </div>

      {accounts.length ? (
        <>
          <div className="z-10 max-w-5xl w-full text-center items-center justify-center font-mono text-sm">
            <p>Network: {blockchain?.connectionParams.chainName}</p>
            <p>Address: {accounts}</p>
            <p>Balance: {balance}</p>
            <p>cUSD balance: {cUSDBalance}</p>
          </div>

          {txHash ? (
            <div>
              <a
                className="btn btn-primary mr-4"
                href={blockchain?.getTransactionExplorerUrl(txHash)}
                target="_blank"
              >
                Open transaction in explorer
              </a>
            </div>
          ) : isProcessing ? (
            <span className="loading loading-spinner loading-lg"></span>
          ) : (
            <div>
              <button
                className="btn btn-primary mr-4"
                onClick={() => payWithCelo(0.5)}
              >
                Pay $0.50 cents with CELO fee
              </button>
            </div>
          )}
        </>
      ) : isConnecting ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : (
        <div>
          <button
            className="btn btn-primary mr-4"
            onClick={() => connectMetaMask(celoNetwork)}
          >
            Connect wallet
          </button>
        </div>
      )}
    </main>
  );
}
