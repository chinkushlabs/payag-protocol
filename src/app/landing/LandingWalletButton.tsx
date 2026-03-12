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
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 sm:px-4 sm:text-sm"
            >
              Connect Wallet
            </button>
          );
        }

        return (
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <button
              onClick={openChainModal}
              type="button"
              className="rounded-lg border border-gray-700 px-2 py-2 text-[11px] text-gray-200 hover:border-gray-500 sm:px-3 sm:text-xs"
            >
              {chain.name}
            </button>
            <button
              onClick={openAccountModal}
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 sm:px-4 sm:text-sm"
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

