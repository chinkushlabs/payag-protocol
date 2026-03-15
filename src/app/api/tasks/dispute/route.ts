import { NextResponse } from 'next/server';
import { disputeTask, getTaskById } from '@/lib/taskStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const taskId = String(body?.taskId ?? '').trim();
    const buyerAgentId = String(body?.buyerAgentId ?? '').trim();
    const reason = String(body?.reason ?? '').trim();

    if (!taskId || !buyerAgentId || !reason) {
      return NextResponse.json(
        { error: 'taskId, buyerAgentId, and reason are required' },
        { status: 400 }
      );
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existing.buyerAgentId !== buyerAgentId) {
      return NextResponse.json({ error: 'buyerAgentId does not match the task owner' }, { status: 403 });
    }

    const task = await disputeTask({ taskId, reason });

    if (!task) {
      return NextResponse.json({ error: 'Failed to dispute task' }, { status: 500 });
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      disputedAt: task.disputedAt ?? null,
      reason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispute task' },
      { status: 500 }
    );
  }
}
