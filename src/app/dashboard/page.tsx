'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { generateProofHash } from '@/lib/payagProof';

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
  {
    inputs: [],
    name: 'completedMilestones',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'milestonesCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

function getStageState(index: number, completed: number, inFlight: boolean): 'Pending' | 'Verifying' | 'Released' {
  if (index < completed) return 'Released';
  if (index === completed && inFlight) return 'Verifying';
  return 'Pending';
}

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [taskInput, setTaskInput] = useState('final-proof-1');
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [autoVerifyInFlight, setAutoVerifyInFlight] = useState<Record<string, boolean>>({});
  const [verifyTxByVault, setVerifyTxByVault] = useState<Record<string, `0x${string}`>>({});
  const [createTxByVault, setCreateTxByVault] = useState<Record<string, `0x${string}`>>({});
  const [demoMode, setDemoMode] = useState(true);

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
            const [buyerResult, releasedResult, completedRaw, totalRaw] = await Promise.all([
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
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'completedMilestones',
              }) as Promise<bigint>,
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'milestonesCount',
              }) as Promise<bigint>,
            ]);

            buyer = buyerResult;
            isReleased = releasedResult;
            milestonesCompleted = Number(completedRaw);
            milestonesTotal = Number(totalRaw);
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

      const txHash = payload?.txHash as `0x${string}` | undefined;
      if (txHash) {
        setVerifyTxByVault((prev) => ({ ...prev, [vaultAddress.toLowerCase()]: txHash }));
      }

      await refetch();

      const [completedRaw, totalRaw] = (await Promise.all([
        publicClient!.readContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'completedMilestones',
        }),
        publicClient!.readContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'milestonesCount',
        }),
      ])) as [bigint, bigint];

      const refreshed = {
        completed: Number(completedRaw),
        total: Number(totalRaw),
      };

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
      setToast(error instanceof Error ? error.message : 'Automated verify failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAutoVerifyInFlight((prev) => ({ ...prev, [vaultAddress.toLowerCase()]: false }));
    }
  };

  const createVaultOnly = async (): Promise<`0x${string}`> => {
    if (!isConnected) throw new Error('Please connect your wallet first');
    if (!publicClient) throw new Error('Public client unavailable');

    const proofPayload = taskInput.trim();
    if (!proofPayload) throw new Error('Enter task proof payload first');

    const targetAgent = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const taskHash = generateProofHash(proofPayload);

    const txHash = await writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createVault',
      args: [targetAgent, taskHash],
      value: parseEther('0.01'),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const vaults = (await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getVaults',
    })) as `0x${string}`[];

    if (vaults.length === 0) throw new Error('No vaults found after creation');

    const latestVault = vaults[vaults.length - 1];
    setCreateTxByVault((prev) => ({ ...prev, [latestVault.toLowerCase()]: txHash }));
    await refetch();

    return latestVault;
  };

  const handleCreateVault = async () => {
    try {
      const latestVault = await createVaultOnly();
      setToast(`Vault created: ${latestVault.slice(0, 8)}...${latestVault.slice(-6)}`);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Create vault failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleVerifyLatest = async () => {
    try {
      if (!publicClient) throw new Error('Public client unavailable');
      const proofPayload = taskInput.trim();
      if (!proofPayload) throw new Error('Enter task proof payload first');

      const vaults = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getVaults',
      })) as `0x${string}`[];

      if (vaults.length === 0) throw new Error('No vault found to verify');
      const latestVault = vaults[vaults.length - 1];
      await triggerAutomatedVerify(latestVault, proofPayload, 0);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Verify failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLaunch = async () => {
    try {
      const latestVault = await createVaultOnly();
      if (demoMode) {
        await triggerAutomatedVerify(latestVault, taskInput.trim(), 0);
      } else {
        setToast('Vault created. Run Verify when agent output is ready.');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Launch failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed]">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="text-2xl font-bold tracking-tighter">
            <Link href="/" className="hover:opacity-80">
              Pay<span className="text-indigo-500">AG</span>
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
        <h1 className="mb-2 text-3xl font-bold">Agent Settlement Dashboard</h1>
        <p className="mb-6 text-sm text-gray-400">
          Agent-to-agent workflow: Create vault with proof hash, then run verify after worker output is ready.
        </p>

        <div className="mb-8 rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
          <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-gray-500">
            Task Proof Payload (JSON/text)
          </label>
          <input
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder='Example: {"jobId":"42","resultHash":"0x..."}'
            className="w-full rounded-lg border border-gray-700 bg-black/40 px-5 py-4 text-white"
          />
          <p className="mt-2 text-xs text-gray-500">
            Must exactly match the payload used to derive task hash for this milestone.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateVault}
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              {isConnected ? 'Create Vault' : 'Connect Wallet'}
            </button>
            <button
              onClick={handleVerifyLatest}
              className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-5 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20"
            >
              Run Verify (Latest Vault)
            </button>
            <button
              onClick={handleLaunch}
              className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-200 hover:border-gray-500"
            >
              Launch + Auto Verify (Demo)
            </button>
            <label className="ml-auto flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
              />
              Demo Mode Auto Verify
            </label>
          </div>
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
                const progressPercent =
                  escrow.milestonesTotal > 0
                    ? Math.round((escrow.milestonesCompleted / escrow.milestonesTotal) * 100)
                    : 0;
                const verifyTx = verifyTxByVault[escrow.fullHash.toLowerCase()];
                const createTx = createTxByVault[escrow.fullHash.toLowerCase()];

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
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-300">
                          {escrow.milestonesCompleted}/{escrow.milestonesTotal} Milestones Complete
                        </span>

                        <div className="h-1.5 w-full overflow-hidden rounded bg-gray-800">
                          <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: escrow.milestonesTotal }).map((_, idx) => {
                            const stageState = getStageState(
                              idx,
                              escrow.milestonesCompleted,
                              inFlight && escrow.status === 'LOCKED'
                            );

                            const stageClass =
                              stageState === 'Released'
                                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                                : stageState === 'Verifying'
                                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                                  : 'border-gray-700 bg-transparent text-gray-500';

                            return (
                              <span
                                key={`${escrow.fullHash}-${idx}`}
                                className={`rounded border px-2 py-0.5 text-[10px] uppercase ${stageClass}`}
                              >
                                M{idx + 1}: {stageState}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex gap-3">
                          {createTx && (
                            <a
                              href={`https://sepolia.basescan.org/tx/${createTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-indigo-400 underline hover:text-indigo-300"
                            >
                              View on BaseScan (Create)
                            </a>
                          )}
                          {verifyTx && (
                            <a
                              href={`https://sepolia.basescan.org/tx/${verifyTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-indigo-400 underline hover:text-indigo-300"
                            >
                              View on BaseScan (Verify)
                            </a>
                          )}
                        </div>
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
