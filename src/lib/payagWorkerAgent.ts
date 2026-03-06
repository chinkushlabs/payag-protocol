import {
  type Chain,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const VAULT_PROOF_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'milestoneIndex', type: 'uint256' },
      { internalType: 'string', name: 'proofString', type: 'string' },
    ],
    name: 'verifyAndRelease',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'completedMilestones',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const FACTORY_ABI = [
  {
    inputs: [],
    name: 'getVaults',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export type SubmitProofParams = {
  walletClient: WalletClient;
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
};

export async function submitProofToChain({
  walletClient,
  vaultAddress,
  milestoneIndex,
  proofString,
}: SubmitProofParams): Promise<`0x${string}`> {
  if (!proofString.trim()) throw new Error('proofString cannot be empty');
  if (!walletClient.account) throw new Error('walletClient account is required');

  const hash = await walletClient.writeContract({
    account: walletClient.account,
    chain: walletClient.chain ?? null,
    address: vaultAddress,
    abi: VAULT_PROOF_ABI,
    functionName: 'verifyAndRelease',
    args: [BigInt(milestoneIndex), proofString],
  });

  return hash;
}

export type WorkerTaskListenerOptions = {
  onTaskComplete: (
    handler: (
      proofString: string,
      vaultAddress: `0x${string}`,
      milestoneIndex: number
    ) => Promise<void>
  ) => () => void;
  walletClient: WalletClient;
  onSubmitted?: (txHash: `0x${string}`, vaultAddress: `0x${string}`) => void;
  onError?: (error: unknown, vaultAddress: `0x${string}`) => void;
};

export function createWorkerTaskListener({
  onTaskComplete,
  walletClient,
  onSubmitted,
  onError,
}: WorkerTaskListenerOptions): () => void {
  const unsubscribe = onTaskComplete(async (proofString, vaultAddress, milestoneIndex) => {
    try {
      const txHash = await submitProofToChain({
        walletClient,
        vaultAddress,
        milestoneIndex,
        proofString,
      });
      onSubmitted?.(txHash, vaultAddress);
    } catch (error) {
      onError?.(error, vaultAddress);
    }
  });

  return unsubscribe;
}

export function createWorkerWalletClient({
  privateKey,
  rpcUrl,
  chain = baseSepolia,
}: {
  privateKey: Hex;
  rpcUrl: string;
  chain?: Chain;
}): WalletClient {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

export function createWorkerPublicClient({
  rpcUrl,
  chain = baseSepolia,
}: {
  rpcUrl: string;
  chain?: Chain;
}): PublicClient {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export async function getLatestVaultAddress({
  publicClient,
  factoryAddress,
}: {
  publicClient: PublicClient;
  factoryAddress: `0x${string}`;
}): Promise<`0x${string}`> {
  const vaults = (await publicClient.readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getVaults',
  })) as `0x${string}`[];

  if (vaults.length === 0) {
    throw new Error('No vaults found in factory');
  }

  return vaults[vaults.length - 1];
}

export async function getVaultMilestoneProgress({
  publicClient,
  vaultAddress,
}: {
  publicClient: PublicClient;
  vaultAddress: `0x${string}`;
}): Promise<{ completed: number; total: number }> {
  const [completedRaw, totalRaw] = (await Promise.all([
    publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_PROOF_ABI,
      functionName: 'completedMilestones',
    }),
    publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_PROOF_ABI,
      functionName: 'milestonesCount',
    }),
  ])) as [bigint, bigint];

  return {
    completed: Number(completedRaw),
    total: Number(totalRaw),
  };
}
