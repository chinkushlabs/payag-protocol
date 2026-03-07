'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function LandingWalletButton() {
  return <ConnectButton chainStatus="none" showBalance={false} />;
}
