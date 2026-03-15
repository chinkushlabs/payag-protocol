import { NextResponse } from 'next/server';
import { isHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  createWorkerPublicClient,
  createWorkerWalletClient,
  submitRefundToChain,
} from '@/lib/payagWorkerAgent';
import { getTaskById, markTaskRefunded } from '@/lib/taskStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = String(body?.taskId ?? '').trim();
    const reason = String(body?.reason ?? '').trim();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.vaultAddress) {
      return NextResponse.json({ error: 'Task is missing vaultAddress' }, { status: 400 });
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

    const txHash = await submitRefundToChain({
      walletClient,
      vaultAddress: task.vaultAddress,
      milestoneIndex: 0,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const updatedTask = await markTaskRefunded({
      taskId: task.id,
      refundTxHash: txHash,
      reason: reason || undefined,
    });

    return NextResponse.json({
      taskId: task.id,
      status: updatedTask?.status ?? 'REFUNDED',
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      refundedAt: updatedTask?.refundedAt ?? null,
      reason: reason || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refund buyer' },
      { status: 500 }
    );
  }
}
