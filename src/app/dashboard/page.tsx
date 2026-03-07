'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { generateProofHash } from '@/lib/payagProof';
import { getLatestVaultAddress, getVaultMilestoneProgress } from '@/lib/payagWorkerAgent';

type EscrowItem = {
  escrowId: string;
  fullHash: `0x${string}`;
  buyer: `0x${string}` | null;
  status: 'LOCKED' | 'RELEASED';
  amount: string;
  timestamp: number;
  milestonesCompleted: number;
  milestonesTotal: number;
};

const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined) ??
  '0x4c3825FA6DDfd2eaCE6fa9191de3fb3c204bAc3c';

const FACTORY_ABI = [
  {
    inputs: [],
    name: 'getVaults',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address payable', name: '_seller', type: 'address' },
      { internalType: 'bytes32', name: '_taskHash', type: 'bytes32' },
    ],
    name: 'createVault',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const VAULT_ABI = [
  {
    inputs: [],
    name: 'buyer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isReleased',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [taskInput, setTaskInput] = useState('final-proof-1');
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [autoVerifyInFlight, setAutoVerifyInFlight] = useState<Record<string, boolean>>({});

  const { data: allVaults, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getVaults',
  });

  useEffect(() => {
    let cancelled = false;

    const loadEscrows = async () => {
      if (!allVaults || !publicClient) return;

      const items = await Promise.all(
        (allVaults as `0x${string}`[]).map(async (vaultAddress, index) => {
          let buyer: `0x${string}` | null = null;
          let isReleased = false;
          let milestonesCompleted = 0;
          let milestonesTotal = 1;

          try {
            const [buyerResult, releasedResult, milestoneProgress] = await Promise.all([
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'buyer',
              }) as Promise<`0x${string}`>,
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'isReleased',
              }) as Promise<boolean>,
              getVaultMilestoneProgress({ publicClient, vaultAddress }),
            ]);

            buyer = buyerResult;
            isReleased = releasedResult;
            milestonesCompleted = milestoneProgress.completed;
            milestonesTotal = milestoneProgress.total;
          } catch {
            buyer = null;
            isReleased = false;
          }

          return {
            escrowId: `${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)}`,
            fullHash: vaultAddress,
            buyer,
            status: isReleased ? 'RELEASED' : 'LOCKED',
            amount: '0.01',
            timestamp: Date.now() - index * 60000,
            milestonesCompleted,
            milestonesTotal,
          } as EscrowItem;
        })
      );

      if (!cancelled) setEscrows(items);
    };

    loadEscrows();

    return () => {
      cancelled = true;
    };
  }, [allVaults, publicClient]);

  const totalTVL = escrows.reduce(
    (acc, curr) => (curr.status === 'LOCKED' ? acc + parseFloat(curr.amount) : acc),
    0
  );
  const settledCount = escrows.filter((e) => e.status === 'RELEASED').length;

  const triggerAutomatedVerify = async (
    vaultAddress: `0x${string}`,
    proofString: string,
    milestoneIndex: number
  ) => {
    try {
      setAutoVerifyInFlight((prev) => ({ ...prev, [vaultAddress.toLowerCase()]: true }));
      setToast('Worker agent submitting proof...');

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultAddress, proofString, milestoneIndex }),
      });

      const payload = await response.json();
      if (!response.ok || payload?.status !== 'success') {
        throw new Error(payload?.error ?? 'Proof verification transaction failed');
      }

      await refetch();
      const refreshed = await getVaultMilestoneProgress({ publicClient: publicClient!, vaultAddress });

      setEscrows((prev) =>
        prev.map((escrow) =>
          escrow.fullHash.toLowerCase() === vaultAddress.toLowerCase()
            ? {
                ...escrow,
                milestonesCompleted: refreshed.completed,
                milestonesTotal: refreshed.total,
                status: refreshed.completed >= refreshed.total ? 'RELEASED' : 'LOCKED',
              }
            : escrow
        )
      );

      setToast('PoT matched. Milestone released.');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Automated worker verify failed:', error);
      setToast('Automated verify failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAutoVerifyInFlight((prev) => ({ ...prev, [vaultAddress.toLowerCase()]: false }));
    }
  };

  const handleLaunch = async () => {
    if (!isConnected) {
      setToast('Please connect your wallet first!');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (!publicClient) {
      setToast('Public client unavailable');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const taskDescription = taskInput.trim();
    if (!taskDescription) {
      setToast('Enter a proof string first');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      const targetAgent = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
      const taskHash = generateProofHash(taskDescription);

      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createVault',
        args: [targetAgent, taskHash],
        value: parseEther('0.01'),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      const latestVault = await getLatestVaultAddress({
        publicClient,
        factoryAddress: FACTORY_ADDRESS,
      });

      await refetch();
      await triggerAutomatedVerify(latestVault, taskDescription, 0);
    } catch (error) {
      console.error('Launch failed:', error);
      setToast('Launch failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed]">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="text-2xl font-bold tracking-tighter">
            <Link href="/" className="hover:opacity-80">
              PayAG<span className="text-indigo-500">.ai</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/landing" className="text-sm text-gray-400 hover:text-white">
              Docs
            </Link>
            <ConnectButton chainStatus="none" showBalance={false} />
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">Agent Settlement Dashboard</h1>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Proof string for milestone 0"
            className="min-w-[280px] rounded-lg border border-gray-700 bg-black/40 px-5 py-4 text-white"
          />
          <button
            onClick={handleLaunch}
            className="rounded-lg bg-indigo-600 px-8 py-4 font-bold text-white hover:bg-indigo-500"
          >
            {isConnected ? 'Launch + Auto Verify' : 'Connect Wallet'}
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
            <div className="mb-1 text-xs uppercase text-gray-500">Total Value Locked</div>
            <div className="text-xl font-bold text-indigo-400">{totalTVL.toFixed(3)} ETH</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
            <div className="mb-1 text-xs uppercase text-gray-500">Settled (On-chain)</div>
            <div className="text-xl font-bold text-green-400">{settledCount}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d0d14]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/40 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {escrows.map((escrow) => {
                const inFlight = autoVerifyInFlight[escrow.fullHash.toLowerCase()] ?? false;
                return (
                  <tr key={escrow.fullHash}>
                    <td className="px-6 py-4 font-mono text-indigo-400">
                      <a
                        href={`https://sepolia.basescan.org/address/${escrow.fullHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {`${escrow.fullHash.slice(0, 6)}...${escrow.fullHash.slice(-4)}`}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">
                        {escrow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-300">
                          {escrow.milestonesCompleted}/{escrow.milestonesTotal} Milestones Complete
                        </span>
                        {escrow.status === 'LOCKED' && (
                          <span className="text-[10px] uppercase text-gray-500">
                            {inFlight ? 'Worker Verifying...' : 'Auto Verification Pending'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {new Date(escrow.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-8 right-8 z-50 rounded-lg border border-indigo-400 bg-indigo-600 px-6 py-3 font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}
