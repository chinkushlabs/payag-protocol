import { NextResponse } from 'next/server';
import { isAddress, isHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  createWorkerPublicClient,
  createWorkerWalletClient,
  submitProofToChain,
} from '@/lib/payagWorkerAgent';

const TREASURY_WALLET = '0x82343e2fed61fca6d2ead64689ff406e29fea7c8' as const;
const PROTOCOL_FEE_BPS = 350;
const BPS_DENOMINATOR = 10000;

const VAULT_READ_ABI = [
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vaultAddress = body?.vaultAddress as `0x${string}` | undefined;
    const proofString = body?.proofString as string | undefined;
    const milestoneIndex = Number(body?.milestoneIndex ?? 0);

    if (!vaultAddress || !proofString || Number.isNaN(milestoneIndex) || milestoneIndex < 0) {
      return NextResponse.json(
        { error: 'vaultAddress, proofString and valid milestoneIndex are required' },
        { status: 400 }
      );
    }

    const privateKey = process.env.WORKER_PRIVATE_KEY;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

    if (!privateKey || !isHex(privateKey)) {
      return NextResponse.json(
        { error: 'WORKER_PRIVATE_KEY is missing or invalid' },
        { status: 500 }
      );
    }

    if (!isAddress(TREASURY_WALLET)) {
      return NextResponse.json({ error: 'Treasury wallet misconfigured' }, { status: 500 });
    }

    const walletClient = createWorkerWalletClient({
      privateKey,
      rpcUrl,
      chain: baseSepolia,
    });

    const publicClient = createWorkerPublicClient({ rpcUrl, chain: baseSepolia });

    const milestone = (await publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_READ_ABI,
      functionName: 'getMilestone',
      args: [BigInt(milestoneIndex)],
    })) as readonly [`0x${string}`, bigint, boolean];

    const grossPayoutWei = milestone[1];
    const protocolFeeWei = (grossPayoutWei * BigInt(PROTOCOL_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
    const workerPayoutWei = grossPayoutWei - protocolFeeWei;

    const txHash = await submitProofToChain({
      walletClient,
      vaultAddress,
      milestoneIndex,
      proofString,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      status: receipt.status,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      milestoneIndex,
      protocolFeeBps: PROTOCOL_FEE_BPS,
      treasuryWallet: TREASURY_WALLET,
      grossPayoutWei: grossPayoutWei.toString(),
      protocolFeeWei: protocolFeeWei.toString(),
      workerPayoutWei: workerPayoutWei.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verify route failed' },
      { status: 500 }
    );
  }
}
