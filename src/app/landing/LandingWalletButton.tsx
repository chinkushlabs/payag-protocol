'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function LandingWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Connect Wallet
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={openChainModal}
              type="button"
              className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:border-gray-500"
            >
              {chain.name}
            </button>
            <button
              onClick={openAccountModal}
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
