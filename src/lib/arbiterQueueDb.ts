import { randomUUID } from 'crypto';
import { getDbPool } from '@/lib/db';

let schemaReady = false;

async function ensureArbiterSchema() {
  if (schemaReady) return;
  const db = getDbPool();

  await db.query(`
    create table if not exists payag_arbiter_submissions (
      id text primary key,
      vault_address text not null,
      milestone_index integer not null default 0,
      proof_string text not null,
      buyer_task_hash text,
      status text not null check (status in (
        'AWAITING_ARBITER_RELEASE',
        'DISPUTED',
        'RELEASED',
        'REFUNDED',
        'FAILED'
      )),
      dispute_reason text,
      tx_hash text,
      refund_tx_hash text,
      error text,
      created_at timestamptz not null default now(),
      disputed_at timestamptz,
      released_at timestamptz,
      refunded_at timestamptz
    );
  `);

  await db.query(`
    create index if not exists idx_payag_arbiter_pending
      on payag_arbiter_submissions (status, created_at desc);
  `);

  await db.query(`
    create index if not exists idx_payag_arbiter_vault_milestone
      on payag_arbiter_submissions (lower(vault_address), milestone_index, created_at desc);
  `);

  schemaReady = true;
}

export type ArbiterSubmissionStatus =
  | 'AWAITING_ARBITER_RELEASE'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'FAILED';

export type ArbiterSubmission = {
  id: string;
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
  buyerTaskHash?: `0x${string}`;
  status: ArbiterSubmissionStatus;
  createdAt: string;
  disputedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  txHash?: `0x${string}`;
  refundTxHash?: `0x${string}`;
  disputeReason?: string;
  error?: string;
};

function mapRow(row: any): ArbiterSubmission {
  return {
    id: row.id,
    vaultAddress: row.vault_address,
    milestoneIndex: Number(row.milestone_index ?? 0),
    proofString: row.proof_string,
    buyerTaskHash: row.buyer_task_hash ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    disputedAt: row.disputed_at ? new Date(row.disputed_at).toISOString() : undefined,
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at).toISOString() : undefined,
    txHash: row.tx_hash ?? undefined,
    refundTxHash: row.refund_tx_hash ?? undefined,
    disputeReason: row.dispute_reason ?? undefined,
    error: row.error ?? undefined,
  };
}

export async function enqueueOrUpdateSubmission(input: {
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
  buyerTaskHash?: `0x${string}`;
}): Promise<ArbiterSubmission> {
  await ensureArbiterSchema();
  const db = getDbPool();

  const existing = await db.query(
    `
    select *
    from payag_arbiter_submissions
    where lower(vault_address) = lower($1)
      and milestone_index = $2
      and status in ('AWAITING_ARBITER_RELEASE', 'DISPUTED')
    order by created_at desc
    limit 1
    `,
    [input.vaultAddress, input.milestoneIndex]
  );

  if (existing.rowCount && existing.rows[0]) {
    const updated = await db.query(
      `
      update payag_arbiter_submissions
      set proof_string = $2,
          buyer_task_hash = $3,
          status = 'AWAITING_ARBITER_RELEASE',
          dispute_reason = null,
          disputed_at = null,
          error = null
      where id = $1
      returning *
      `,
      [existing.rows[0].id, input.proofString, input.buyerTaskHash ?? null]
    );
    return mapRow(updated.rows[0]);
  }

  const inserted = await db.query(
    `
    insert into payag_arbiter_submissions
      (id, vault_address, milestone_index, proof_string, buyer_task_hash, status)
    values
      ($1, $2, $3, $4, $5, 'AWAITING_ARBITER_RELEASE')
    returning *
    `,
    [
      `arb_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      input.vaultAddress,
      input.milestoneIndex,
      input.proofString,
      input.buyerTaskHash ?? null,
    ]
  );

  return mapRow(inserted.rows[0]);
}

export async function getPendingSubmissions(): Promise<ArbiterSubmission[]> {
  await ensureArbiterSchema();
  const db = getDbPool();

  const res = await db.query(
    `
    select *
    from payag_arbiter_submissions
    where status in ('AWAITING_ARBITER_RELEASE', 'DISPUTED')
    order by created_at desc
    `
  );

  return res.rows.map(mapRow);
}

export async function getSubmissionById(id: string): Promise<ArbiterSubmission | null> {
  await ensureArbiterSchema();
  const db = getDbPool();

  const res = await db.query(
    `select * from payag_arbiter_submissions where id = $1 limit 1`,
    [id]
  );

  return res.rowCount ? mapRow(res.rows[0]) : null;
}

export async function markSubmissionDisputedByVaultMilestone(input: {
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  reason: string;
}): Promise<ArbiterSubmission | null> {
  await ensureArbiterSchema();
  const db = getDbPool();

  const res = await db.query(
    `
    update payag_arbiter_submissions
    set status = 'DISPUTED',
        dispute_reason = $3,
        disputed_at = now()
    where id = (
      select id
      from payag_arbiter_submissions
      where lower(vault_address) = lower($1)
        and milestone_index = $2
        and status in ('AWAITING_ARBITER_RELEASE', 'DISPUTED')
      order by created_at desc
      limit 1
    )
    returning *
    `,
    [input.vaultAddress, input.milestoneIndex, input.reason]
  );

  return res.rowCount ? mapRow(res.rows[0]) : null;
}

export async function markSubmissionReleased(input: {
  id: string;
  txHash: `0x${string}`;
}): Promise<void> {
  await ensureArbiterSchema();
  const db = getDbPool();

  await db.query(
    `
    update payag_arbiter_submissions
    set status = 'RELEASED',
        tx_hash = $2,
        released_at = now(),
        error = null
    where id = $1
    `,
    [input.id, input.txHash]
  );
}

export async function markSubmissionRefunded(input: {
  id: string;
  refundTxHash?: `0x${string}`;
}): Promise<void> {
  await ensureArbiterSchema();
  const db = getDbPool();

  await db.query(
    `
    update payag_arbiter_submissions
    set status = 'REFUNDED',
        refund_tx_hash = $2,
        refunded_at = now(),
        error = null
    where id = $1
    `,
    [input.id, input.refundTxHash ?? null]
  );
}

export async function markSubmissionFailed(input: {
  id: string;
  error: string;
}): Promise<void> {
  await ensureArbiterSchema();
  const db = getDbPool();

  await db.query(
    `
    update payag_arbiter_submissions
    set status = 'FAILED',
        error = $2
    where id = $1
    `,
    [input.id, input.error]
  );
}
