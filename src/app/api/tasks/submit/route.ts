import { NextResponse } from 'next/server';
import { getTaskById, submitTaskResult } from '@/lib/taskStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const taskId = String(body?.taskId ?? '').trim();
    const workerAgentId = String(body?.workerAgentId ?? '').trim();
    const result = body?.result;

    if (!taskId || !workerAgentId || !result) {
      return NextResponse.json(
        { error: 'taskId, workerAgentId, and result are required' },
        { status: 400 }
      );
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = await submitTaskResult({
      taskId,
      resultPayload: {
        workerAgentId,
        ...result,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      submittedAt: task.submittedAt ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit task result' },
      { status: 500 }
    );
  }
}
