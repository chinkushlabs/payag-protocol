import type { WalletClient } from 'viem';

const VAULT_PROOF_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'proofString', type: 'string' }],
    name: 'verifyAndRelease',
    outputs: [],
    stateMutability: 'nonpayable',
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
  onTaskComplete: (handler: (proofString: string, vaultAddress: `0x${string}`) => Promise<void>) => () => void;
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
