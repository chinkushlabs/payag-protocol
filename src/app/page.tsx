'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  usePublicClient,
} from 'wagmi';
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

export default function Home() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [taskInput, setTaskInput] = useState<string>('final-proof-1');
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

      const formatted = await Promise.all(
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

      if (!cancelled) setEscrows(formatted);
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
      const refreshedProgress = await getVaultMilestoneProgress({ publicClient: publicClient!, vaultAddress });

      setEscrows((prev) =>
        prev.map((escrow) =>
          escrow.fullHash.toLowerCase() === vaultAddress.toLowerCase()
            ? {
                ...escrow,
                milestonesCompleted: refreshedProgress.completed,
                milestonesTotal: refreshedProgress.total,
                status:
                  refreshedProgress.completed >= refreshedProgress.total
                    ? 'RELEASED'
                    : 'LOCKED',
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
      const amountInEth = '0.01';
      const taskHash = generateProofHash(taskDescription);

      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createVault',
        args: [targetAgent, taskHash],
        value: parseEther(amountInEth),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      const latestVault = await getLatestVaultAddress({
        publicClient,
        factoryAddress: FACTORY_ADDRESS,
      });

      await refetch();
      setToast('Vault created. Worker auto-verification started...');
      setTimeout(() => setToast(null), 2500);

      await triggerAutomatedVerify(latestVault, taskDescription, 0);
    } catch (error) {
      console.error('Blockchain Error:', error);
      setToast('Launch failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const downloadReceipt = (escrow: EscrowItem) => {
    const text = `PayAG Protocol Receipt\nID: ${escrow.escrowId}\nStatus: ${escrow.status}\nAmount: ${escrow.amount} ETH\nMilestones: ${escrow.milestonesCompleted}/${escrow.milestonesTotal}\nTimestamp: ${new Date(escrow.timestamp).toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayAG-Receipt-${escrow.escrowId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed] font-sans text-left relative">
      <nav className="border-b border-gray-800 px-6 py-4 text-left">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-left">
          <div className="text-2xl font-bold tracking-tighter">
            PayAG<span className="text-indigo-500">.ai</span>
          </div>
          <div className="flex items-center space-x-8">
            <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
              <a href="#protocol" className="hover:text-white transition-colors">
                Protocol
              </a>
              <a href="#agents" className="hover:text-white transition-colors">
                Agents
              </a>
              <a href="#dashboard" className="hover:text-white transition-colors">
                Dashboard
              </a>
            </div>
            <ConnectButton chainStatus="none" showBalance={false} />
          </div>
        </div>
      </nav>

      <section className="px-6 pt-24 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8 uppercase tracking-widest">
            Agent-to-Agent Trust Escrow
          </span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Programmable Trust for AI Agents.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            PayAG is the specialized escrow layer enabling autonomous agents to secure funds,
            verify performance, and settle transactions with zero counterparty risk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Proof string for milestone 0"
              className="px-5 py-4 rounded-lg border border-gray-700 bg-black/40 text-white min-w-[280px]"
            />
            <button
              onClick={handleLaunch}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20"
            >
              {isConnected ? 'Launch + Auto Verify' : 'Connect Wallet'}
            </button>
            <button
              onClick={() =>
                document.getElementById('protocol')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="px-8 py-4 bg-transparent border border-gray-700 hover:border-gray-500 text-white rounded-lg font-bold transition-all"
            >
              Documentation
            </button>
          </div>
        </div>
      </section>

      <section id="dashboard" className="px-6 py-12 max-w-6xl mx-auto border-t border-gray-900">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Escrow Dashboard
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
          <div className="bg-[#0d0d14] border border-gray-800 p-4 rounded-xl">
            <div className="text-gray-500 text-xs uppercase font-mono mb-1">Total Value Locked</div>
            <div className="text-xl font-bold text-indigo-400">{totalTVL.toFixed(3)} ETH</div>
          </div>
          <div className="bg-[#0d0d14] border border-gray-800 p-4 rounded-xl">
            <div className="text-gray-500 text-xs uppercase font-mono mb-1">Settled (On-chain)</div>
            <div className="text-xl font-bold text-green-400">{settledCount}</div>
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          {escrows.length === 0 ? (
            <div className="p-12 text-center text-gray-500 italic">
              No active escrows. Click "Launch + Auto Verify" to begin.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-mono">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {escrows.map((escrow) => {
                  const inFlight = autoVerifyInFlight[escrow.fullHash.toLowerCase()] ?? false;

                  return (
                    <tr key={escrow.fullHash} className="hover:bg-gray-900/30 transition-colors">
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
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                            escrow.status === 'RELEASED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}
                        >
                          {escrow.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-gray-300">
                            {`${escrow.milestonesCompleted}/${escrow.milestonesTotal} Milestones Complete`}
                          </span>
                          {escrow.status === 'LOCKED' && (
                            <span
                              className={`text-[10px] uppercase font-bold border px-3 py-1.5 rounded inline-block ${
                                inFlight
                                  ? 'text-indigo-300 border-indigo-500/40'
                                  : 'text-gray-500 border-gray-700'
                              }`}
                            >
                              {inFlight ? 'Worker Verifying...' : 'Auto Verification Pending'}
                            </span>
                          )}
                          {escrow.status === 'RELEASED' && (
                            <button
                              onClick={() => downloadReceipt(escrow)}
                              className="text-[10px] text-indigo-400 hover:text-white underline text-left"
                            >
                              Download Receipt
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-500 font-mono">
                        {new Date(escrow.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-8 right-8 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-2xl border border-indigo-400 z-50 font-bold">
          {toast}
        </div>
      )}
    </main>
  );
}
