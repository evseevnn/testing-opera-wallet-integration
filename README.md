# Testing Opera Crypto Wallet integration with CELO

## Description

Here simple implementation of CELO wallet integration with Opera Crypto Wallet.

To connect to the CELO network used [Alfajores Testnet](https://docs.celo.org/getting-started/testnet).

The current implementation not supported cUSD as a fee currency, so for sending transactions used CELO as a fee currency.

Here we did not use [react-celo](https://github.com/celo-org/react-celo), but anyway, based on the react-celo source code, feeCurrency is available only in Ledger wallet. Also, you can check integration on https://react-celo.vercel.app/

[CELO wallet](https://celowallet.app/) also does not provide a possibility to send transactions with custom assets as fee currency.
