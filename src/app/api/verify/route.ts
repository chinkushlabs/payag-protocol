import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import {
  addJobActivity,
  getJobByVault,
  setJobProofSubmission,
  updateJobStatus,
} from '@/lib/jobsStore';
import { enqueueOrUpdateSubmission } from '@/lib/arbiterQueueDb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vaultAddress = body?.vaultAddress as `0x${string}` | undefined;
    const proofString = body?.proofString as string | undefined;
    const milestoneIndex = Number(body?.milestoneIndex ?? 0);

    if (!vaultAddress || !proofString || Number.isNaN(milestoneIndex) || milestoneIndex < 0) {
      return NextResponse.json(
        { error: 'vaultAddress, proofString and valid milestoneIndex are required' },
        { status: 400 }
      );
    }

    if (!isAddress(vaultAddress)) {
      return NextResponse.json({ error: 'vaultAddress must be a valid EVM address' }, { status: 400 });
    }

    const linkedJob = await getJobByVault(vaultAddress);

    const submission = await enqueueOrUpdateSubmission({
      vaultAddress,
      milestoneIndex,
      proofString,
      buyerTaskHash: linkedJob?.taskHash,
    });

    await setJobProofSubmission(vaultAddress, { proofString });
    await updateJobStatus(vaultAddress, 'AWAITING_ARBITER_RELEASE');
    await addJobActivity(vaultAddress, {
      actor: 'WORKER',
      message: 'Agent 2 has submitted completion proof. Awaiting Arbiter verification.',
    });

    return NextResponse.json({
      status: 'queued',
      engine: 'db-v3',
      reviewStatus: 'AWAITING_ARBITER_RELEASE',
      submissionId: submission.id,
      vaultAddress,
      milestoneIndex,
      buyerTaskHash: linkedJob?.taskHash ?? null,
      proofPreview: proofString.slice(0, 180),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verify route failed' },
      { status: 500 }
    );
  }
}
