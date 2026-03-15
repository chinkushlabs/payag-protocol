import { NextResponse } from 'next/server';
import { getTaskById } from '@/lib/taskStore';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      taskId: task.id,
      vaultAddress: task.vaultAddress ?? null,
      status: task.status,
      buyerAgentId: task.buyerAgentId,
      workerAgentId: task.workerAgentId ?? null,
      workerListingId: task.workerListingId ?? null,
      buyerWallet: task.buyerWallet,
      workerWallet: task.workerWallet,
      description: task.description,
      requirements: task.requirements ?? '',
      payment: task.payment,
      token: task.token,
      proofString: task.proofString ?? null,
      resultPayload: task.resultPayload ?? null,
      disputeReason: task.disputeReason ?? null,
      releasedTxHash: task.releasedTxHash ?? null,
      refundTxHash: task.refundTxHash ?? null,
      createdAt: task.createdAt,
      acceptedAt: task.acceptedAt ?? null,
      submittedAt: task.submittedAt ?? null,
      disputedAt: task.disputedAt ?? null,
      releasedAt: task.releasedAt ?? null,
      refundedAt: task.refundedAt ?? null,
      activityLog: task.activityLog ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
