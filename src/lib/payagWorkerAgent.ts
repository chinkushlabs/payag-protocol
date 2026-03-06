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
    inputs: [{ internalType: 'string', name: 'proofString', type: 'string' }],
    name: 'verifyAndRelease',
    outputs: [],
    stateMutability: 'nonpayable',
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
  proofString: string;
};

export async function submitProofToChain({
  walletClient,
  vaultAddress,
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
    args: [proofString],
  });

  return hash;
}

export type WorkerTaskListenerOptions = {
  onTaskComplete: (
    handler: (proofString: string, vaultAddress: `0x${string}`) => Promise<void>
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
  const unsubscribe = onTaskComplete(async (proofString, vaultAddress) => {
    try {
      const txHash = await submitProofToChain({ walletClient, vaultAddress, proofString });
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
