import { NextResponse } from 'next/server';
import { acceptTask, getTaskById } from '@/lib/taskStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const taskId = String(body?.taskId ?? '').trim();
    const workerAgentId = String(body?.workerAgentId ?? '').trim();

    if (!taskId || !workerAgentId) {
      return NextResponse.json(
        { error: 'taskId and workerAgentId are required' },
        { status: 400 }
      );
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = await acceptTask({
      taskId,
      workerAgentId,
    });

    if (!task) {
      return NextResponse.json({ error: 'Failed to accept task' }, { status: 500 });
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      workerAgentId: task.workerAgentId ?? null,
      acceptedAt: task.acceptedAt ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept task' },
      { status: 500 }
    );
  }
}
