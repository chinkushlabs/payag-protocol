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

const jobs: JobRequest[] = [];

export function addJob(
  input: Omit<JobRequest, 'id' | 'createdAt' | 'status' | 'activityLog' | 'dispute'> & {
    status?: JobRequest['status'];
  }
): JobRequest {
  const now = new Date().toISOString();

  const job: JobRequest = {
    id: `job_${Math.random().toString(36).slice(2, 10)}`,
    vaultAddress: input.vaultAddress,
    buyer: input.buyer,
    workerAddress: input.workerAddress,
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

  jobs.push(job);
  return job;
}

export function getJobs(workerAddress?: string): JobRequest[] {
  const normalized = workerAddress?.toLowerCase();
  const filtered = normalized
    ? jobs.filter((job) => job.workerAddress.toLowerCase() === normalized)
    : jobs;

  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getJobByVault(vaultAddress: `0x${string}`): JobRequest | undefined {
  return jobs.find((job) => job.vaultAddress.toLowerCase() === vaultAddress.toLowerCase());
}

export function updateJobStatus(
  vaultAddress: `0x${string}`,
  status: JobRequest['status']
): JobRequest | undefined {
  const job = getJobByVault(vaultAddress);
  if (!job) return undefined;
  job.status = status;
  return job;
}

export function setJobProofSubmission(
  vaultAddress: `0x${string}`,
  payload: { proofString: string }
): JobRequest | undefined {
  const job = getJobByVault(vaultAddress);
  if (!job) return undefined;
  job.latestProofPayload = payload.proofString;
  job.proofSubmittedAt = new Date().toISOString();
  return job;
}

export function openJobDispute(input: {
  vaultAddress: `0x${string}`;
  buyer: `0x${string}`;
  reason: string;
  maxHours?: number;
}): { ok: true; job: JobRequest } | { ok: false; error: string } {
  const job = getJobByVault(input.vaultAddress);
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

  job.status = 'DISPUTED';
  job.dispute = {
    status: 'OPEN',
    reason: input.reason,
    openedAt: new Date().toISOString(),
    openedBy: input.buyer,
  };

  return { ok: true, job };
}

export function resolveJobAsRefunded(input: {
  vaultAddress: `0x${string}`;
  note?: string;
  refundTxHash?: `0x${string}`;
}): JobRequest | undefined {
  const job = getJobByVault(input.vaultAddress);
  if (!job) return undefined;

  job.status = 'REFUNDED';
  job.dispute = {
    ...job.dispute,
    status: 'RESOLVED_REFUND',
    resolvedAt: new Date().toISOString(),
    resolutionNote: input.note,
    refundTxHash: input.refundTxHash,
  };

  return job;
}

export function resolveJobAsReleased(input: {
  vaultAddress: `0x${string}`;
  note?: string;
}): JobRequest | undefined {
  const job = getJobByVault(input.vaultAddress);
  if (!job) return undefined;

  job.dispute = {
    ...job.dispute,
    status: 'RESOLVED_RELEASE',
    resolvedAt: new Date().toISOString(),
    resolutionNote: input.note,
  };

  return job;
}

export function addJobActivity(
  vaultAddress: `0x${string}`,
  activity: { message: string; actor: JobActivity['actor'] }
): JobRequest | undefined {
  const job = getJobByVault(vaultAddress);
  if (!job) return undefined;

  job.activityLog.unshift({
    message: activity.message,
    actor: activity.actor,
    createdAt: new Date().toISOString(),
  });

  return job;
}
