'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { decodeEventLog, parseEther } from 'viem';

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

type RegistryListing = {
  id: string;
  service: string;
  currency: string;
  workerAddress: `0x${string}`;
  price: string;
};

type JobActivity = {
  message: string;
  actor: 'SYSTEM' | 'WORKER' | 'ARBITER' | 'BUYER';
  createdAt: string;
};

type JobItem = {
  id: string;
  vaultAddress: `0x${string}`;
  buyer: `0x${string}`;
  workerAddress: `0x${string}`;
  service: string;
  requirements: string;
  amount: string;
  currency: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'AWAITING_ARBITER_RELEASE' | 'DISPUTED' | 'VERIFIED' | 'SETTLED' | 'REFUNDED';
  createdAt: string;
  taskHash?: `0x${string}`;
  latestProofPayload?: string;
  activityLog?: JobActivity[];
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
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'vaultAddress', type: 'address' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'milestonesTotal', type: 'uint256' },
    ],
    name: 'VaultCreated',
    type: 'event',
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
  {
    inputs: [{ internalType: 'uint256', name: 'milestoneIndex', type: 'uint256' }],
    name: 'getMilestone',
    outputs: [
      { internalType: 'bytes32', name: 'proofHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'payoutAmount', type: 'uint256' },
      { internalType: 'bool', name: 'released', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const PROOF_CACHE_KEY = 'payag_vault_proof_cache';
const LAST_VAULT_KEY = 'payag_last_created_vault';

function readProofCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROOF_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeProofCacheEntry(vaultAddress: `0x${string}`, proofString: string) {
  if (typeof window === 'undefined') return;
  const cache = readProofCache();
  cache[vaultAddress.toLowerCase()] = proofString;
  window.localStorage.setItem(PROOF_CACHE_KEY, JSON.stringify(cache));
  window.localStorage.setItem(LAST_VAULT_KEY, vaultAddress);
}

function getCachedProof(vaultAddress: `0x${string}`): string | undefined {
  return readProofCache()[vaultAddress.toLowerCase()];
}

function getLastCreatedVault(): `0x${string}` | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = window.localStorage.getItem(LAST_VAULT_KEY);
  return value ? (value as `0x${string}`) : undefined;
}

function getStageState(index: number, completed: number, inFlight: boolean): 'Pending' | 'Verifying' | 'Released' {
  if (index < completed) return 'Released';
  if (index === completed && inFlight) return 'Verifying';
  return 'Pending';
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [taskInput, setTaskInput] = useState('');
  const [workerAddress, setWorkerAddress] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [budgetEth, setBudgetEth] = useState('');
  const [listingCurrency, setListingCurrency] = useState('');

  const [listings, setListings] = useState<RegistryListing[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobFilterWorker, setJobFilterWorker] = useState('');

  const [jobStatusByVault, setJobStatusByVault] = useState<Record<string, JobItem['status']>>({});
  const [activityByVault, setActivityByVault] = useState<Record<string, JobActivity[]>>({});
  const [jobByVault, setJobByVault] = useState<Record<string, JobItem>>({});

  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [autoVerifyInFlight, setAutoVerifyInFlight] = useState<Record<string, boolean>>({});
  const [createTxByVault, setCreateTxByVault] = useState<Record<string, `0x${string}`>>({});
  const [demoMode, setDemoMode] = useState(true);
  const [priceLocked, setPriceLocked] = useState(false);

  const { data: allVaults, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getVaults',
  });

  useEffect(() => {
    const loadListings = async () => {
      try {
        const res = await fetch('/api/registry', { cache: 'no-store' });
        const json = await res.json();
        const rows = (Array.isArray(json?.listings) ? json.listings : []) as RegistryListing[];
        setListings(rows);

        setServiceOptions(Array.from(new Set(rows.map((row) => row.service).filter(Boolean))));
        const currencies = Array.from(new Set(rows.map((row) => row.currency).filter(Boolean)));
        setCurrencyOptions(currencies.length > 0 ? currencies : ['ETH']);
      } catch {
        setServiceOptions([]);
        setCurrencyOptions(['ETH']);
      }
    };

    loadListings();
  }, []);

  useEffect(() => {
    const qWorker = searchParams.get('worker');
    const qService = searchParams.get('service');
    const qPrice = searchParams.get('price');
    const qCurrency = searchParams.get('currency');

    if (qWorker) setWorkerAddress(qWorker);
    if (qService) setServiceName(qService);
    if (qPrice) {
      setBudgetEth(qPrice);
      setPriceLocked(true);
    }
    if (qCurrency) setListingCurrency(qCurrency);

    if (qWorker) {
      setJobFilterWorker(qWorker);
    } else if (address) {
      setJobFilterWorker(address);
    }
  }, [searchParams, address]);

  useEffect(() => {
    if (!serviceName) return;
    const match = listings.find((row) => row.service === serviceName);
    if (!match) return;

    if (!workerAddress) setWorkerAddress(match.workerAddress);
    if (!budgetEth) setBudgetEth(match.price);
    if (!listingCurrency) setListingCurrency(match.currency);
  }, [serviceName, listings, workerAddress, budgetEth, listingCurrency]);

  useEffect(() => {
    let mounted = true;

    const loadJobs = async () => {
      if (!jobFilterWorker || !/^0x[a-fA-F0-9]{40}$/.test(jobFilterWorker)) {
        if (mounted) setJobs([]);
        return;
      }

      try {
        const res = await fetch(`/api/jobs?worker=${encodeURIComponent(jobFilterWorker)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!mounted) return;
        setJobs(Array.isArray(json?.jobs) ? json.jobs : []);
      } catch {
        if (mounted) setJobs([]);
      }
    };

    loadJobs();
    const timer = setInterval(loadJobs, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [jobFilterWorker]);

  useEffect(() => {
    let mounted = true;

    const loadAllJobs = async () => {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        const json = await res.json();
        const rows = (Array.isArray(json?.jobs) ? json.jobs : []) as JobItem[];
        if (!mounted) return;

        const statusMap: Record<string, JobItem['status']> = {};
        const activityMap: Record<string, JobActivity[]> = {};
        const jobsMap: Record<string, JobItem> = {};

        rows.forEach((job) => {
          const key = job.vaultAddress.toLowerCase();
          statusMap[key] = job.status;
          activityMap[key] = Array.isArray(job.activityLog) ? job.activityLog : [];
          jobsMap[key] = job;
        });

        setJobStatusByVault((prev) => {
          const next = { ...prev, ...statusMap };

          Object.entries(prev).forEach(([key, value]) => {
            const missingFromPoll = !(key in statusMap);
            const shouldPreserve =
              value === 'AWAITING_ARBITER_RELEASE' || value === 'DISPUTED';

            if (missingFromPoll && shouldPreserve) {
              next[key] = value;
            }
          });

          return next;
        });

        setActivityByVault((prev) => {
          const next = { ...prev, ...activityMap };

          Object.entries(prev).forEach(([key, value]) => {
            const missingFromPoll = !(key in activityMap);
            if (missingFromPoll && Array.isArray(value) && value.length > 0) {
              next[key] = value;
            }
          });

          return next;
        });

        setJobByVault((prev) => ({ ...prev, ...jobsMap }));
      } catch {
        if (!mounted) return;
      }
    };

    loadAllJobs();
    const timer = setInterval(loadAllJobs, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const computedProofPayload = useMemo(
    () =>
      JSON.stringify({
        service: serviceName.trim(),
        requirements: taskInput.trim(),
        budget: budgetEth.trim(),
        currency: listingCurrency.trim(),
        worker: workerAddress.trim(),
      }),
    [serviceName, taskInput, budgetEth, listingCurrency, workerAddress]
  );

  const buildCreatePayload = async () => {
    const response = await fetch('/api/create-vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: serviceName.trim(),
        requirements: taskInput.trim(),
        budget: budgetEth.trim(),
        currency: listingCurrency.trim(),
        worker: workerAddress.trim(),
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.proofString || !payload?.taskHash) {
      throw new Error(payload?.error ?? 'Failed to build vault proof payload');
    }

    return payload as {
      proofString: string;
      taskHash: `0x${string}`;
    };
  };

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
              publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'buyer' }) as Promise<`0x${string}`>,
              publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'isReleased' }) as Promise<boolean>,
              publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'completedMilestones' }) as Promise<bigint>,
              publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'milestonesCount' }) as Promise<bigint>,
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

  const activityFeed = useMemo(() => {
    const entries = Object.entries(activityByVault).flatMap(([vault, logs]) =>
      (logs ?? []).map((log) => ({ ...log, vault }))
    );

    return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 12);
  }, [activityByVault]);

  const adjustBudget = (delta: number) => {
    if (priceLocked) return;
    const current = Number.parseFloat(budgetEth || '0');
    const next = Math.max(0, current + delta);
    setBudgetEth(next.toFixed(3));
  };

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
      if (!response.ok || payload?.status !== 'queued') {
        throw new Error(payload?.error ?? 'Proof submission failed');
      }

      setJobStatusByVault((prev) => ({
        ...prev,
        [vaultAddress.toLowerCase()]: 'AWAITING_ARBITER_RELEASE',
      }));

      setActivityByVault((prev) => {
        const key = vaultAddress.toLowerCase();
        const existing = prev[key] ?? [];
        return {
          ...prev,
          [key]: [
            {
              actor: 'WORKER',
              createdAt: new Date().toISOString(),
              message: 'Agent 2 has submitted completion proof. Awaiting Arbiter verification.',
            },
            ...existing,
          ],
        };
      });

      setToast('Proof submitted. Buyer can now approve or dispute within 24h. Status: AWAITING_ARBITER_RELEASE');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Automated verify failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAutoVerifyInFlight((prev) => ({ ...prev, [vaultAddress.toLowerCase()]: false }));
    }
  };


  const handleFileDispute = async (vaultAddress: `0x${string}`) => {
    try {
      if (!address) throw new Error('Connect buyer wallet first');
      const reason = window.prompt('Dispute reason (24h window):', 'Work does not match requirements')?.trim() || '';
      if (!reason) throw new Error('Dispute reason is required');

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FILE_DISPUTE',
          vaultAddress,
          buyer: address,
          reason,
          milestoneIndex: 0,
        }),
      });

      const payload = await response.json();
      if (!response.ok || payload?.status !== 'DISPUTED') {
        throw new Error(payload?.error ?? 'Failed to file dispute');
      }

      setJobStatusByVault((prev) => ({
        ...prev,
        [vaultAddress.toLowerCase()]: 'DISPUTED',
      }));

      setActivityByVault((prev) => {
        const key = vaultAddress.toLowerCase();
        const existing = prev[key] ?? [];
        return {
          ...prev,
          [key]: [
            {
              actor: 'BUYER',
              createdAt: new Date().toISOString(),
              message: `Buyer filed dispute: ${reason}`,
            },
            ...existing,
          ],
        };
      });

      setToast('Dispute filed. Arbiter review required.');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Dispute failed');
      setTimeout(() => setToast(null), 3000);
    }
  };
  const createVaultOnly = async (): Promise<`0x${string}`> => {
    if (!isConnected) throw new Error('Please connect your wallet first');
    if (!address) throw new Error('Buyer wallet unavailable');
    if (!publicClient) throw new Error('Public client unavailable');

    const requirements = taskInput.trim();
    if (!requirements) throw new Error('Enter job requirements first');
    if (!serviceName.trim()) throw new Error('Select a service');
    if (!listingCurrency.trim()) throw new Error('Select a listing currency');
    if (!budgetEth.trim() || Number.parseFloat(budgetEth) <= 0) throw new Error('Enter a valid amount');
    if (!/^0x[a-fA-F0-9]{40}$/.test(workerAddress.trim())) throw new Error('Worker address invalid');

    const { proofString, taskHash } = await buildCreatePayload();

    const txHash = await writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createVault',
      args: [workerAddress.trim().toLowerCase() as `0x${string}`, taskHash],
      value: parseEther(budgetEth.trim()),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const vaultCreatedLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
    );

    if (!vaultCreatedLog) {
      throw new Error('VaultCreated event not found in transaction receipt');
    }

    const decoded = decodeEventLog({
      abi: FACTORY_ABI,
      data: vaultCreatedLog.data,
      topics: vaultCreatedLog.topics,
    });

    if (decoded.eventName !== 'VaultCreated') {
      throw new Error('Unexpected event while creating vault');
    }

    const latestVault = decoded.args.vaultAddress as `0x${string}`;
    setCreateTxByVault((prev) => ({ ...prev, [latestVault.toLowerCase()]: txHash }));

    const milestone = (await publicClient.readContract({
      address: latestVault,
      abi: VAULT_ABI,
      functionName: 'getMilestone',
      args: [BigInt(0)],
    })) as readonly [`0x${string}`, bigint, boolean];

    if (milestone[0].toLowerCase() !== taskHash.toLowerCase()) {
      throw new Error(
        `Vault created with mismatched proof hash. On-chain: ${milestone[0]}; Expected: ${taskHash}. Refund or recreate.`
      );
    }

    const jobResponse = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: latestVault,
        buyer: address,
        workerAddress: workerAddress.trim(),
        service: serviceName.trim(),
        requirements,
        amount: budgetEth.trim(),
        currency: listingCurrency.trim(),
        taskHash,
        latestProofPayload: proofString,
      }),
    });

    const jobPayload = await jobResponse.json();
    if (!jobResponse.ok || jobPayload?.status !== 'OPEN' || !jobPayload?.job?.latestProofPayload) {
      throw new Error(jobPayload?.error ?? 'Failed to persist original proof payload for this vault');
    }

    const createdJob = jobPayload.job as JobItem;
    const vaultKey = latestVault.toLowerCase();
    writeProofCacheEntry(latestVault, proofString);
    setJobByVault((prev) => ({ ...prev, [vaultKey]: createdJob }));
    setJobStatusByVault((prev) => ({ ...prev, [vaultKey]: createdJob.status }));
    setActivityByVault((prev) => ({
      ...prev,
      [vaultKey]: Array.isArray(createdJob.activityLog) ? createdJob.activityLog : [],
    }));

    await refetch();
    return latestVault;
  };

  const handleCreateVault = async () => {
    try {
      const latestVault = await createVaultOnly();
      setToast(`Vault created for ${serviceName}: ${latestVault.slice(0, 8)}...${latestVault.slice(-6)}`);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Create vault failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleVerifyLatest = async () => {
    try {
      if (!publicClient) throw new Error('Public client unavailable');
      const vaults = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getVaults',
      })) as `0x${string}`[];

      if (vaults.length === 0) throw new Error('No vault found to verify');
      const latestVault = getLastCreatedVault() ?? vaults[vaults.length - 1];
      const latestJob = jobByVault[latestVault.toLowerCase()];
      const proofString = getCachedProof(latestVault) ?? latestJob?.latestProofPayload;

      if (!proofString) {
        throw new Error('Original proof payload not found for this vault');
      }

      await triggerAutomatedVerify(latestVault, proofString, 0);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Verify failed');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLaunch = async () => {
    try {
      const latestVault = await createVaultOnly();
      if (demoMode) {
        const latestJob = jobByVault[latestVault.toLowerCase()];
        const proofString =
          getCachedProof(latestVault) ?? latestJob?.latestProofPayload;
        if (!proofString) {
          throw new Error('Original proof payload not found for this vault');
        }
        await triggerAutomatedVerify(latestVault, proofString, 0);
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
    <main className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-[#ededed]">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-3xl font-bold">Agent Settlement Dashboard</h1>
        <p className="mb-6 text-sm text-gray-400">
          Buyer discovers worker in marketplace, creates escrow, reviews delivered work, then routes release or dispute to arbiter.
        </p>

        <div className="mb-8 rounded-xl border border-gray-800 bg-[#0d0d14] p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-gray-500">Worker Agent Wallet</label>
              <input value={workerAddress} onChange={(e) => setWorkerAddress(e.target.value)} placeholder="0x..." className="w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-gray-500">Service</label>
              <select value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white">
                <option value="">Select service</option>
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-gray-500">Escrow Amount (ETH)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => adjustBudget(-0.001)} disabled={priceLocked} className="rounded border border-gray-700 px-3 py-3 text-sm text-gray-200 hover:border-gray-500 disabled:opacity-40">-</button>
                <input value={budgetEth} onChange={(e) => setBudgetEth(e.target.value)} placeholder="0.010" readOnly={priceLocked} className="w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white" />
                <button type="button" onClick={() => adjustBudget(0.001)} disabled={priceLocked} className="rounded border border-gray-700 px-3 py-3 text-sm text-gray-200 hover:border-gray-500 disabled:opacity-40">+</button>
              </div>
              {priceLocked && <p className="mt-1 text-[11px] text-gray-500">Fixed from marketplace listing.</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-gray-500">Listing Currency</label>
              <select value={listingCurrency} onChange={(e) => setListingCurrency(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white">
                <option value="">Select currency</option>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="mb-2 mt-4 block text-xs uppercase tracking-[0.14em] text-gray-500">Job Requirements</label>
          <textarea value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Describe expected output, acceptance criteria, and delivery format" rows={4} className="w-full rounded-lg border border-gray-700 bg-black/40 px-5 py-4 text-white" />
          <p className="mt-2 text-xs text-gray-500">System hashes an internal proof payload built from worker + service + amount + requirements.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={handleCreateVault} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500">{isConnected ? 'Create Vault' : 'Connect Wallet'}</button>
            <button onClick={handleVerifyLatest} className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-5 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20">Submit Proof For Review</button>
            <button onClick={handleLaunch} className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-200 hover:border-gray-500">Create + Queue Proof (Demo)</button>
            <label className="ml-auto flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
              Demo Mode Auto Queue
            </label>
          </div>
          <p className="mt-2 text-xs text-amber-300">Workflow: Buyer reviews delivery, then either approves release or files dispute within 24 hours for arbiter decision/refund.</p>
        </div>

        <div className="mb-8 rounded-xl border border-gray-800 bg-[#0d0d14] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">My Incoming Jobs</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-gray-500">refresh: 10s</span>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-gray-500">Worker Inbox Address</label>
            <input value={jobFilterWorker} onChange={(e) => setJobFilterWorker(e.target.value)} placeholder="0x..." className="w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white" />
          </div>
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <div className="rounded border border-gray-800 bg-black p-3 text-sm text-gray-500">No incoming jobs yet.</div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded border border-gray-800 bg-black p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{job.service}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-indigo-300">{job.amount} {job.currency}</span>
                      {job.status === 'AWAITING_ARBITER_RELEASE' && (
                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-300">AWAITING_ARBITER_RELEASE</span>
                      )}
                      {job.status === 'DISPUTED' && (
                        <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-red-300">DISPUTED</span>
                      )}
                      {job.status === 'REFUNDED' && (
                        <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-cyan-300">REFUNDED</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">{job.requirements}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span>Buyer: {job.buyer.slice(0, 8)}...{job.buyer.slice(-6)}</span>
                    <a href={`https://sepolia.basescan.org/address/${job.vaultAddress}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">View Vault</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4"><div className="mb-1 text-xs uppercase text-gray-500">Total Value Locked</div><div className="text-xl font-bold text-indigo-400">{totalTVL.toFixed(3)} ETH</div></div>
          <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4"><div className="mb-1 text-xs uppercase text-gray-500">Settled (On-chain)</div><div className="text-xl font-bold text-green-400">{settledCount}</div></div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0d0d14]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-gray-900/40 text-xs uppercase text-gray-400"><tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Progress</th><th className="px-6 py-4">Timestamp</th></tr></thead>
            <tbody className="divide-y divide-gray-800">
              {escrows.map((escrow) => {
                const inFlight = autoVerifyInFlight[escrow.fullHash.toLowerCase()] ?? false;
                const progressPercent = escrow.milestonesTotal > 0 ? Math.round((escrow.milestonesCompleted / escrow.milestonesTotal) * 100) : 0;
                const createTx = createTxByVault[escrow.fullHash.toLowerCase()];
                const arbiterStatus = jobStatusByVault[escrow.fullHash.toLowerCase()];

                return (
                  <tr key={escrow.fullHash}>
                    <td className="px-6 py-4 font-mono text-indigo-400"><a href={`https://sepolia.basescan.org/address/${escrow.fullHash}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{`${escrow.fullHash.slice(0, 6)}...${escrow.fullHash.slice(-4)}`}</a></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">{escrow.status}</span>
                        {arbiterStatus === 'AWAITING_ARBITER_RELEASE' && (
                          <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">AWAITING_ARBITER_RELEASE</span>
                        )}
                        {arbiterStatus === 'DISPUTED' && (
                          <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">DISPUTED</span>
                        )}
                        {arbiterStatus === 'REFUNDED' && (
                          <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">REFUNDED</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-300">{escrow.milestonesCompleted}/{escrow.milestonesTotal} Milestones Complete</span>
                        <div className="h-1.5 w-full overflow-hidden rounded bg-gray-800"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPercent}%` }} /></div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: escrow.milestonesTotal }).map((_, idx) => {
                            const stageState = getStageState(idx, escrow.milestonesCompleted, inFlight && escrow.status === 'LOCKED');
                            const stageClass = stageState === 'Released' ? 'border-green-500/30 bg-green-500/10 text-green-300' : stageState === 'Verifying' ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-gray-700 bg-transparent text-gray-500';
                            return <span key={`${escrow.fullHash}-${idx}`} className={`rounded border px-2 py-0.5 text-[10px] uppercase ${stageClass}`}>M{idx + 1}: {stageState}</span>;
                          })}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {createTx && <a href={`https://sepolia.basescan.org/tx/${createTx}`} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-wide text-indigo-400 underline hover:text-indigo-300">View on BaseScan (Create)</a>}
                          {arbiterStatus === "AWAITING_ARBITER_RELEASE" && address && escrow.buyer && address.toLowerCase() === escrow.buyer.toLowerCase() && (
                            <button onClick={() => handleFileDispute(escrow.fullHash)} className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-200 hover:bg-red-500/20">
                              File Dispute (24h)
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">{new Date(escrow.timestamp).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-gray-800 bg-[#0d0d14] p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Activity Log</h3>
          <div className="space-y-2">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-gray-500">No activity yet.</p>
            ) : (
              activityFeed.map((entry, idx) => (
                <div key={`${entry.vault}-${entry.createdAt}-${idx}`} className="rounded border border-gray-800 bg-black p-2 text-xs text-gray-300">
                  <p className="break-all text-indigo-400">{entry.vault.slice(0, 10)}...{entry.vault.slice(-8)}</p>
                  <p className="mt-1">[{new Date(entry.createdAt).toLocaleTimeString()}] {entry.actor}: {entry.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-indigo-400 bg-indigo-600 px-4 py-3 text-center font-bold text-white shadow-2xl sm:bottom-8 sm:left-auto sm:right-8 sm:px-6">{toast}</div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0a0a0f] p-8 text-[#ededed]">Loading dashboard...</main>}>
      <DashboardContent />
    </Suspense>
  );
}














