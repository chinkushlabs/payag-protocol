-- === START db/arbiter_queue.sql ===
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

create index if not exists idx_payag_arbiter_pending
  on payag_arbiter_submissions (status, created_at desc);

create index if not exists idx_payag_arbiter_vault_milestone
  on payag_arbiter_submissions (lower(vault_address), milestone_index, created_at desc);
-- === END db/arbiter_queue.sql ===
