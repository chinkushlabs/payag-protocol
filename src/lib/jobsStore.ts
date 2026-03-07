export type JobRequest = {
  id: string;
  vaultAddress: `0x${string}`;
  buyer: `0x${string}`;
  workerAddress: `0x${string}`;
  service: string;
  requirements: string;
  amount: string;
  currency: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'VERIFIED' | 'SETTLED';
  createdAt: string;
};

const jobs: JobRequest[] = [];

export function addJob(input: Omit<JobRequest, 'id' | 'createdAt' | 'status'> & { status?: JobRequest['status'] }): JobRequest {
  const job: JobRequest = {
    id: `job_${Math.random().toString(36).slice(2, 10)}`,
    vaultAddress: input.vaultAddress,
    buyer: input.buyer,
    workerAddress: input.workerAddress,
    service: input.service,
    requirements: input.requirements,
    amount: input.amount,
    currency: input.currency,
    status: input.status ?? 'OPEN',
    createdAt: new Date().toISOString(),
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
