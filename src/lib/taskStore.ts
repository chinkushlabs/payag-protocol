import { randomUUID } from 'crypto';
import { getDbPool } from '@/lib/db';

export type PayagTaskStatus =
  | 'OPEN'
  | 'ACCEPTED'
  | 'SUBMITTED'
  | 'AWAITING_ARBITER_RELEASE'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED';

export type PayagTaskActivity = {
  actor: string;
  message: string;
  createdAt: string;
};

export type PayagTask = {
  id: string;
  vaultAddress?: `0x${string}`;
  buyerAgentId: string;
  workerAgentId?: string;
  workerListingId?: string;
  buyerWallet: `0x${string}`;
  workerWallet: `0x${string}`;
  description: string;
  requirements?: string;
  payment: string;
  token: string;
  status: PayagTaskStatus;
  proofString?: string;
  resultPayload?: unknown;
  disputeReason?: string;
  releasedTxHash?: `0x${string}`;
  refundTxHash?: `0x${string}`;
  createdAt: string;
  acceptedAt?: string;
  submittedAt?: string;
  disputedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  activityLog?: PayagTaskActivity[];
};

function mapTask(row: any): PayagTask {
  return {
    id: row.id,
    vaultAddress: row.vault_address ?? undefined,
    buyerAgentId: row.buyer_agent_id,
    workerAgentId: row.worker_agent_id ?? undefined,
    workerListingId: row.worker_listing_id ?? undefined,
    buyerWallet: row.buyer_wallet,
    workerWallet: row.worker_wallet,
    description: row.description,
    requirements: row.requirements ?? undefined,
    payment: row.payment,
    token: row.token,
    status: row.status,
    proofString: row.proof_string ?? undefined,
    resultPayload: row.result_payload ?? undefined,
    disputeReason: row.dispute_reason ?? undefined,
    releasedTxHash: row.released_tx_hash ?? undefined,
    refundTxHash: row.refund_tx_hash ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : undefined,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : undefined,
    disputedAt: row.disputed_at ? new Date(row.disputed_at).toISOString() : undefined,
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at).toISOString() : undefined,
  };
}

function mapActivity(row: any): PayagTaskActivity {
  return {
    actor: row.actor,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createTask(input: {
  vaultAddress?: `0x${string}`;
  buyerAgentId: string;
  workerListingId?: string;
  buyerWallet: `0x${string}`;
  workerWallet: `0x${string}`;
  description: string;
  requirements?: string;
  payment: string;
  token: string;
  proofString?: string;
}): Promise<PayagTask> {
  const db = getDbPool();
  const id = `task_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date().toISOString();

  await db.query(
    `
    insert into payag_tasks (
      id, vault_address, buyer_agent_id, worker_listing_id, buyer_wallet, worker_wallet,
      description, requirements, payment, token, status, proof_string, created_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'OPEN',$11,$12
    )
    `,
    [
      id,
      input.vaultAddress ?? null,
      input.buyerAgentId,
      input.workerListingId ?? null,
      input.buyerWallet,
      input.workerWallet,
      input.description,
      input.requirements ?? null,
      input.payment,
      input.token,
      input.proofString ?? null,
      now,
    ]
  );

  await addTaskActivity({
    taskId: id,
    actor: 'SYSTEM',
    message: 'Escrow created and task opened.',
  });

  return getTaskById(id) as Promise<PayagTask>;
}

export async function addTaskActivity(input: {
  taskId: string;
  actor: string;
  message: string;
}): Promise<void> {
  const db = getDbPool();
  await db.query(
    `
    insert into payag_task_activity (task_id, actor, message)
    values ($1, $2, $3)
    `,
    [input.taskId, input.actor, input.message]
  );
}

export async function getTaskById(id: string): Promise<PayagTask | undefined> {
  const db = getDbPool();

  const taskResult = await db.query(
    `select * from payag_tasks where id = $1 limit 1`,
    [id]
  );

  if (!taskResult.rowCount) return undefined;

  const task = mapTask(taskResult.rows[0]);

  const activityResult = await db.query(
    `
    select actor, message, created_at
    from payag_task_activity
    where task_id = $1
    order by created_at asc
    `,
    [id]
  );

  task.activityLog = activityResult.rows.map(mapActivity);
  return task;
}

export async function getTaskByVaultAddress(
  vaultAddress: `0x${string}`
): Promise<PayagTask | undefined> {
  const db = getDbPool();

  const taskResult = await db.query(
    `
    select * from payag_tasks
    where lower(vault_address) = lower($1)
    order by created_at desc
    limit 1
    `,
    [vaultAddress]
  );

  if (!taskResult.rowCount) return undefined;
  return getTaskById(taskResult.rows[0].id);
}

export async function acceptTask(input: {
  taskId: string;
  workerAgentId: string;
}): Promise<PayagTask | undefined> {
  const db = getDbPool();

  await db.query(
    `
    update payag_tasks
    set worker_agent_id = $2,
        status = 'ACCEPTED',
        accepted_at = now()
    where id = $1
    `,
    [input.taskId, input.workerAgentId]
  );

  await addTaskActivity({
    taskId: input.taskId,
    actor: 'WORKER',
    message: 'Task accepted by worker agent.',
  });

  return getTaskById(input.taskId);
}

export async function submitTaskResult(input: {
  taskId: string;
  resultPayload: unknown;
}): Promise<PayagTask | undefined> {
  const db = getDbPool();

  await db.query(
    `
    update payag_tasks
    set result_payload = $2::jsonb,
        status = 'AWAITING_ARBITER_RELEASE',
        submitted_at = now()
    where id = $1
    `,
    [input.taskId, JSON.stringify(input.resultPayload)]
  );

  await addTaskActivity({
    taskId: input.taskId,
    actor: 'WORKER',
    message: 'Result submitted. Awaiting arbiter verification.',
  });

  return getTaskById(input.taskId);
}

export async function disputeTask(input: {
  taskId: string;
  reason: string;
}): Promise<PayagTask | undefined> {
  const db = getDbPool();

  await db.query(
    `
    update payag_tasks
    set dispute_reason = $2,
        status = 'DISPUTED',
        disputed_at = now()
    where id = $1
    `,
    [input.taskId, input.reason]
  );

  await addTaskActivity({
    taskId: input.taskId,
    actor: 'BUYER',
    message: `Dispute opened: ${input.reason}`,
  });

  return getTaskById(input.taskId);
}
