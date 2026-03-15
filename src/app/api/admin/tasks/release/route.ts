import { NextResponse } from 'next/server';
import { isHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  createWorkerPublicClient,
  createWorkerWalletClient,
  submitProofToChain,
} from '@/lib/payagWorkerAgent';
import { markListingCompleted } from '@/lib/registryStore';
import { getTaskById, markTaskReleased } from '@/lib/taskStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = String(body?.taskId ?? '').trim();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.vaultAddress || !task.proofString) {
      return NextResponse.json({ error: 'Task is missing vaultAddress or proofString' }, { status: 400 });
    }

    const privateKey = process.env.WORKER_PRIVATE_KEY;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

    if (!privateKey || !isHex(privateKey)) {
      return NextResponse.json({ error: 'WORKER_PRIVATE_KEY is missing or invalid' }, { status: 500 });
    }

    const walletClient = createWorkerWalletClient({
      privateKey,
      rpcUrl,
      chain: baseSepolia,
    });
    const publicClient = createWorkerPublicClient({ rpcUrl, chain: baseSepolia });

    const txHash = await submitProofToChain({
      walletClient,
      vaultAddress: task.vaultAddress,
      milestoneIndex: 0,
      proofString: task.proofString,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const updatedTask = await markTaskReleased({
      taskId: task.id,
      releasedTxHash: txHash,
    });

    await markListingCompleted({
      listingId: task.workerListingId,
      workerAddress: task.workerWallet,
      service: task.description,
    });

    return NextResponse.json({
      taskId: task.id,
      status: updatedTask?.status ?? 'RELEASED',
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      releasedAt: updatedTask?.releasedAt ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to release payment' },
      { status: 500 }
    );
  }
}
