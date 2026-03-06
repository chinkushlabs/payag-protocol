import { NextResponse } from 'next/server';
import { isHex } from 'viem';
import { baseSepolia } from 'viem/chains';

import {
  createWorkerPublicClient,
  createWorkerWalletClient,
  submitProofToChain,
} from '@/lib/payagWorkerAgent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vaultAddress = body?.vaultAddress as `0x${string}` | undefined;
    const proofString = body?.proofString as string | undefined;

    if (!vaultAddress || !proofString) {
      return NextResponse.json(
        { error: 'vaultAddress and proofString are required' },
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

    const walletClient = createWorkerWalletClient({
      privateKey,
      rpcUrl,
      chain: baseSepolia,
    });

    const publicClient = createWorkerPublicClient({ rpcUrl, chain: baseSepolia });

    const txHash = await submitProofToChain({
      walletClient,
      vaultAddress,
      proofString,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      status: receipt.status,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verify route failed' },
      { status: 500 }
    );
  }
}
