export type ArbiterSubmission = {
  id: string;
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
  buyerTaskHash?: `0x${string}`;
  status:
    | 'AWAITING_ARBITER_RELEASE'
    | 'DISPUTED'
    | 'RELEASED'
    | 'REFUNDED'
    | 'FAILED';
  createdAt: string;
  releasedAt?: string;
  disputedAt?: string;
  refundedAt?: string;
  txHash?: `0x${string}`;
  refundTxHash?: `0x${string}`;
  error?: string;
  disputeReason?: string;
};

const submissions: ArbiterSubmission[] = [];

export function enqueueArbiterSubmission(input: {
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
  buyerTaskHash?: `0x${string}`;
}): ArbiterSubmission {
  const existing = submissions.find(
    (row) =>
      row.status === 'AWAITING_ARBITER_RELEASE' &&
      row.vaultAddress.toLowerCase() === input.vaultAddress.toLowerCase() &&
      row.milestoneIndex === input.milestoneIndex
  );

  if (existing) {
    existing.proofString = input.proofString;
    existing.buyerTaskHash = input.buyerTaskHash;
    return existing;
  }

  const submission: ArbiterSubmission = {
    id: `arb_${Math.random().toString(36).slice(2, 10)}`,
    vaultAddress: input.vaultAddress,
    milestoneIndex: input.milestoneIndex,
    proofString: input.proofString,
    buyerTaskHash: input.buyerTaskHash,
    status: 'AWAITING_ARBITER_RELEASE',
    createdAt: new Date().toISOString(),
  };

  submissions.unshift(submission);
  return submission;
}

export function getPendingArbiterSubmissions(): ArbiterSubmission[] {
  return submissions
    .filter((row) => row.status === 'AWAITING_ARBITER_RELEASE' || row.status === 'DISPUTED')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getArbiterSubmissionsByVault(vaultAddress: `0x${string}`): ArbiterSubmission[] {
  return submissions
    .filter((row) => row.vaultAddress.toLowerCase() === vaultAddress.toLowerCase())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getArbiterSubmissionById(id: string): ArbiterSubmission | undefined {
  return submissions.find((row) => row.id === id);
}

export function getArbiterSubmissionByVaultAndMilestone(input: {
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
}): ArbiterSubmission | undefined {
  return submissions.find(
    (row) =>
      row.vaultAddress.toLowerCase() === input.vaultAddress.toLowerCase() &&
      row.milestoneIndex === input.milestoneIndex &&
      (row.status === 'AWAITING_ARBITER_RELEASE' || row.status === 'DISPUTED')
  );
}

export function markArbiterSubmissionDisputed(input: {
  id: string;
  reason: string;
}): ArbiterSubmission | undefined {
  const row = getArbiterSubmissionById(input.id);
  if (!row) return undefined;

  row.status = 'DISPUTED';
  row.disputedAt = new Date().toISOString();
  row.disputeReason = input.reason;
  return row;
}

export function markArbiterSubmissionReleased(input: {
  id: string;
  txHash: `0x${string}`;
}): ArbiterSubmission | undefined {
  const row = getArbiterSubmissionById(input.id);
  if (!row) return undefined;

  row.status = 'RELEASED';
  row.txHash = input.txHash;
  row.releasedAt = new Date().toISOString();
  row.error = undefined;
  return row;
}

export function markArbiterSubmissionRefunded(input: {
  id: string;
  refundTxHash?: `0x${string}`;
}): ArbiterSubmission | undefined {
  const row = getArbiterSubmissionById(input.id);
  if (!row) return undefined;

  row.status = 'REFUNDED';
  row.refundedAt = new Date().toISOString();
  row.refundTxHash = input.refundTxHash;
  row.error = undefined;
  return row;
}

export function markArbiterSubmissionFailed(input: {
  id: string;
  error: string;
}): ArbiterSubmission | undefined {
  const row = getArbiterSubmissionById(input.id);
  if (!row) return undefined;

  row.status = 'FAILED';
  row.error = input.error;
  return row;
}
