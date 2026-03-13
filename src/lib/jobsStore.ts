import { getDbPool } from '@/lib/db';

export type JobActivity = {
  message: string;
  actor: 'SYSTEM' | 'WORKER' | 'ARBITER' | 'BUYER';
  createdAt: string;
};

export type JobDispute = {
  status: 'NONE' | 'OPEN' | 'RESOLVED_REFUND' | 'RESOLVED_RELEASE';
  reason?: string;
  openedAt?: string;
  openedBy?: `0x${string}`;
  resolvedAt?: string;
  resolutionNote?: string;
  refundTxHash?: `0x${string}`;
};

export type JobRequest = {
  id: string;
  vaultAddress: `0x${string}`;
  buyer: `0x${string}`;
  workerAddress: `0x${string}`;
  listingId?: string;
  service: string;
  requirements: string;
  amount: string;
  currency: string;
  taskHash?: `0x${string}`;
  latestProofPayload?: string;
  proofSubmittedAt?: string;
  status:
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'AWAITING_ARBITER_RELEASE'
    | 'DISPUTED'
    | 'VERIFIED'
    | 'SETTLED'
    | 'REFUNDED';
  dispute: JobDispute;
  activityLog: JobActivity[];
  createdAt: string;
};

let schemaReady = false;

function mapRow(row: any): JobRequest {
  return {
    id: row.id,
    vaultAddress: row.vault_address,
    buyer: row.buyer,
    workerAddress: row.worker_address,
    listingId: row.listing_id ?? undefined,
    service: row.service,
    requirements: row.requirements,
    amount: row.amount,
    currency: row.currency,
    taskHash: row.task_hash ?? undefined,
    latestProofPayload: row.latest_proof_payload ?? undefined,
    proofSubmittedAt: row.proof_submitted_at ? new Date(row.proof_submitted_at).toISOString() : undefined,
    status: row.status,
    dispute: row.dispute ?? { status: 'NONE' },
    activityLog: Array.isArray(row.activity_log) ? row.activity_log : [],
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function ensureJobsSchema() {
  if (schemaReady) return;
  const db = getDbPool();

  await db.query(`
    create table if not exists payag_jobs (
      id text primary key,
      vault_address text not null unique,
      buyer text not null,
      worker_address text not null,
      listing_id text,
      service text not null,
      requirements text not null,
      amount text not null,
      currency text not null,
      task_hash text,
      latest_proof_payload text,
      proof_submitted_at timestamptz,
      status text not null check (status in (
        'OPEN','IN_PROGRESS','AWAITING_ARBITER_RELEASE','DISPUTED','VERIFIED','SETTLED','REFUNDED'
      )),
      dispute jsonb not null default '{"status":"NONE"}'::jsonb,
      activity_log jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    );
  `);

  await db.query(`
    alter table payag_jobs
    add column if not exists listing_id text;
  `);

  await db.query(`
    alter table payag_jobs
    add column if not exists latest_proof_payload text;
  `);

  await db.query(`
    alter table payag_jobs
    add column if not exists proof_submitted_at timestamptz;
  `);

  await db.query(`
    create index if not exists idx_payag_jobs_worker on payag_jobs (lower(worker_address), created_at desc);
  `);

  schemaReady = true;
}

export async function addJob(
  input: Omit<JobRequest, 'id' | 'createdAt' | 'status' | 'activityLog' | 'dispute'> & {
    status?: JobRequest['status'];
  }
): Promise<JobRequest> {
  await ensureJobsSchema();
  const db = getDbPool();
  const now = new Date().toISOString();

  const existing = await getJobByVault(input.vaultAddress);
  if (existing) return existing;

  const job: JobRequest = {
    id: `job_${Math.random().toString(36).slice(2, 10)}`,
    vaultAddress: input.vaultAddress,
    buyer: input.buyer,
    workerAddress: input.workerAddress,
    listingId: input.listingId,
    service: input.service,
    requirements: input.requirements,
    amount: input.amount,
    currency: input.currency,
    taskHash: input.taskHash,
    latestProofPayload: input.latestProofPayload,
    proofSubmittedAt: input.proofSubmittedAt,
    status: input.status ?? 'OPEN',
    dispute: { status: 'NONE' },
    activityLog: [
      {
        message: 'Escrow created and job opened.',
        actor: 'SYSTEM',
        createdAt: now,
      },
    ],
    createdAt: now,
  };

  await db.query(
    `
    insert into payag_jobs (
      id, vault_address, buyer, worker_address, listing_id, service, requirements,
      amount, currency, task_hash, latest_proof_payload, proof_submitted_at,
      status, dispute, activity_log, created_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16
    )
    on conflict (vault_address) do nothing
    `,
    [
      job.id,
      job.vaultAddress,
      job.buyer,
      job.workerAddress,
      job.listingId ?? null,
      job.service,
      job.requirements,
      job.amount,
      job.currency,
      job.taskHash ?? null,
      job.latestProofPayload ?? null,
      job.proofSubmittedAt ?? null,
      job.status,
      JSON.stringify(job.dispute),
      JSON.stringify(job.activityLog),
      job.createdAt,
    ]
  );

  return (await getJobByVault(input.vaultAddress)) ?? job;
}

export async function getJobs(workerAddress?: string): Promise<JobRequest[]> {
  await ensureJobsSchema();
  const db = getDbPool();
  const normalized = workerAddress?.toLowerCase();

  const result = normalized
    ? await db.query(
        `select * from payag_jobs where lower(worker_address) = $1 order by created_at desc`,
        [normalized]
      )
    : await db.query(`select * from payag_jobs order by created_at desc`);

  return result.rows.map(mapRow);
}

export async function getJobByVault(vaultAddress: `0x${string}`): Promise<JobRequest | undefined> {
  await ensureJobsSchema();
  const db = getDbPool();
  const result = await db.query(
    `select * from payag_jobs where lower(vault_address) = lower($1) limit 1`,
    [vaultAddress]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function updateJobStatus(
  vaultAddress: `0x${string}`,
  status: JobRequest['status']
): Promise<JobRequest | undefined> {
  await ensureJobsSchema();
  const db = getDbPool();
  const result = await db.query(
    `update payag_jobs set status = $2 where lower(vault_address) = lower($1) returning *`,
    [vaultAddress, status]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function setJobProofSubmission(
  vaultAddress: `0x${string}`,
  payload: { proofString: string }
): Promise<JobRequest | undefined> {
  await ensureJobsSchema();
  const db = getDbPool();
  const now = new Date().toISOString();
  const result = await db.query(
    `
    update payag_jobs
    set latest_proof_payload = $2,
        proof_submitted_at = $3
    where lower(vault_address) = lower($1)
    returning *
    `,
    [vaultAddress, payload.proofString, now]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function openJobDispute(input: {
  vaultAddress: `0x${string}`;
  buyer: `0x${string}`;
  reason: string;
  maxHours?: number;
}): Promise<{ ok: true; job: JobRequest } | { ok: false; error: string }> {
  const job = await getJobByVault(input.vaultAddress);
  if (!job) return { ok: false, error: 'Job not found' };

  if (job.buyer.toLowerCase() !== input.buyer.toLowerCase()) {
    return { ok: false, error: 'Only buyer can file dispute' };
  }

  if (!job.proofSubmittedAt) {
    return { ok: false, error: 'No proof submission found for dispute' };
  }

  const maxHours = input.maxHours ?? 24;
  const openedMs = Date.parse(job.proofSubmittedAt);
  const nowMs = Date.now();
  if (Number.isFinite(openedMs) && nowMs - openedMs > maxHours * 60 * 60 * 1000) {
    return { ok: false, error: `Dispute window closed (${maxHours}h)` };
  }

  const dispute: JobDispute = {
    status: 'OPEN',
    reason: input.reason,
    openedAt: new Date().toISOString(),
    openedBy: input.buyer,
  };

  const db = getDbPool();
  const result = await db.query(
    `
    update payag_jobs
    set status = 'DISPUTED', dispute = $2::jsonb
    where lower(vault_address) = lower($1)
    returning *
    `,
    [input.vaultAddress, JSON.stringify(dispute)]
  );

  return result.rowCount ? { ok: true, job: mapRow(result.rows[0]) } : { ok: false, error: 'Job not found' };
}

export async function resolveJobAsRefunded(input: {
  vaultAddress: `0x${string}`;
  note?: string;
  refundTxHash?: `0x${string}`;
}): Promise<JobRequest | undefined> {
  const job = await getJobByVault(input.vaultAddress);
  if (!job) return undefined;

  const dispute: JobDispute = {
    ...job.dispute,
    status: 'RESOLVED_REFUND',
    resolvedAt: new Date().toISOString(),
    resolutionNote: input.note,
    refundTxHash: input.refundTxHash,
  };

  const db = getDbPool();
  const result = await db.query(
    `
    update payag_jobs
    set status = 'REFUNDED', dispute = $2::jsonb
    where lower(vault_address) = lower($1)
    returning *
    `,
    [input.vaultAddress, JSON.stringify(dispute)]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function resolveJobAsReleased(input: {
  vaultAddress: `0x${string}`;
  note?: string;
}): Promise<JobRequest | undefined> {
  const job = await getJobByVault(input.vaultAddress);
  if (!job) return undefined;

  const dispute: JobDispute = {
    ...job.dispute,
    status: 'RESOLVED_RELEASE',
    resolvedAt: new Date().toISOString(),
    resolutionNote: input.note,
  };

  const db = getDbPool();
  const result = await db.query(
    `
    update payag_jobs
    set status = 'SETTLED', dispute = $2::jsonb
    where lower(vault_address) = lower($1)
    returning *
    `,
    [input.vaultAddress, JSON.stringify(dispute)]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function addJobActivity(
  vaultAddress: `0x${string}`,
  activity: { message: string; actor: JobActivity['actor'] }
): Promise<JobRequest | undefined> {
  const job = await getJobByVault(vaultAddress);
  if (!job) return undefined;

  const activityLog = [
    {
      message: activity.message,
      actor: activity.actor,
      createdAt: new Date().toISOString(),
    },
    ...(job.activityLog ?? []),
  ];

  const db = getDbPool();
  const result = await db.query(
    `
    update payag_jobs
    set activity_log = $2::jsonb
    where lower(vault_address) = lower($1)
    returning *
    `,
    [vaultAddress, JSON.stringify(activityLog)]
  );
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}
