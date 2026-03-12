'use client';

import * as React from 'react';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const FALLBACK_REOWN_PROJECT_ID = '00000000000000000000000000000000';
const reownProjectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() || FALLBACK_REOWN_PROJECT_ID;

const config = getDefaultConfig({
  appName: 'PayAG',
  projectId: reownProjectId,
  chains: [baseSepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
